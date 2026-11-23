export const dynamic = "force-dynamic";

interface SendOtpBody {
  phone?: string;
  otp?: string;
  name?: string;
}

export async function POST(request: Request) {
  try {
    const body: SendOtpBody = await request.json().catch(() => ({}));
    const rawPhone = typeof body.phone === "string" ? body.phone.trim() : "";
    const otp = typeof body.otp === "string" ? body.otp.trim() : Math.floor(100000 + Math.random() * 900000).toString();
    const name = typeof body.name === "string" ? body.name.trim() : "Municipal Officer";

    // Clean Indian 10-digit mobile number
    const digits = rawPhone.replace(/\D/g, "");
    let cleanMobile = digits;
    if (digits.startsWith("91") && digits.length === 12) {
      cleanMobile = digits.slice(2);
    } else if (digits.startsWith("0") && digits.length === 11) {
      cleanMobile = digits.slice(1);
    } else if (digits.length >= 10) {
      cleanMobile = digits.slice(-10);
    }

    if (cleanMobile.length !== 10) {
      return Response.json(
        { error: "Please provide a valid 10-digit Indian mobile number." },
        { status: 400 }
      );
    }

    const formattedNumber = `+91 ${cleanMobile.slice(0, 5)} ${cleanMobile.slice(5)}`;
    const smsMessage = `[CivicFix - Digital India] Your DigiLocker UIDAI verification OTP for ${name} is: ${otp}. Valid for 10 minutes.`;

    let deliveredVia = "simulated_gateway";
    let realSmsSuccess = false;
    let telecomProvider = "None (Simulated Local Gateway)";

    // 1. Check for Fast2SMS Indian SMS gateway API Key
    const fast2smsKey = process.env.FAST2SMS_API_KEY;
    if (fast2smsKey) {
      try {
        const smsRes = await fetch("https://www.fast2sms.com/dev/bulkV2", {
          method: "POST",
          headers: {
            authorization: fast2smsKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            route: "otp",
            variables_values: otp,
            numbers: cleanMobile,
          }),
        });
        const smsResult = await smsRes.json().catch(() => ({}));
        if (smsRes.ok && smsResult.return) {
          deliveredVia = "fast2sms_telecom";
          telecomProvider = "Fast2SMS India Telecom Gateway";
          realSmsSuccess = true;
        }
      } catch (smsErr) {
        console.warn("Fast2SMS gateway error:", smsErr);
      }
    }

    // 2. Check for Twilio SMS configuration
    const twilioSid = process.env.TWILIO_ACCOUNT_SID;
    const twilioToken = process.env.TWILIO_AUTH_TOKEN;
    const twilioPhone = process.env.TWILIO_PHONE_NUMBER;
    if (!realSmsSuccess && twilioSid && twilioToken && twilioPhone) {
      try {
        const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`;
        const auth = Buffer.from(`${twilioSid}:${twilioToken}`).toString("base64");
        const params = new URLSearchParams({
          To: `+91${cleanMobile}`,
          From: twilioPhone,
          Body: smsMessage,
        });

        const twilioRes = await fetch(twilioUrl, {
          method: "POST",
          headers: {
            Authorization: `Basic ${auth}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: params.toString(),
        });
        if (twilioRes.ok) {
          deliveredVia = "twilio_telecom";
          telecomProvider = "Twilio International Carrier Gateway";
          realSmsSuccess = true;
        }
      } catch (twErr) {
        console.warn("Twilio gateway error:", twErr);
      }
    }

    // 3. Check for MSG91 Indian SMS Gateway
    const msg91AuthKey = process.env.MSG91_AUTH_KEY;
    const msg91TemplateId = process.env.MSG91_TEMPLATE_ID;
    if (!realSmsSuccess && msg91AuthKey) {
      try {
        const msg91Url = `https://control.msg91.com/api/v5/otp?template_id=${msg91TemplateId || "default"}&mobile=91${cleanMobile}&authkey=${msg91AuthKey}&otp=${otp}`;
        const msgRes = await fetch(msg91Url, { method: "POST" });
        if (msgRes.ok) {
          deliveredVia = "msg91_telecom";
          telecomProvider = "MSG91 DLT India Gateway";
          realSmsSuccess = true;
        }
      } catch (mErr) {
        console.warn("MSG91 gateway error:", mErr);
      }
    }

    console.log(`[CivicFix OTP Gateway] Target: ${formattedNumber} | Code: ${otp} | Channel: ${deliveredVia}`);

    const whatsappUrl = `https://wa.me/91${cleanMobile}?text=${encodeURIComponent(smsMessage)}`;
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(whatsappUrl)}`;

    return Response.json({
      success: true,
      deliveredVia,
      realSmsSuccess,
      telecomProvider,
      phone: formattedNumber,
      cleanMobile,
      otp,
      whatsappUrl,
      qrCodeUrl,
      timestamp: new Date().toISOString(),
      message: realSmsSuccess
        ? `Official OTP sent to ${formattedNumber} via ${telecomProvider}.`
        : `OTP generated for ${formattedNumber}. Use the QR code or WhatsApp button to receive directly on your phone.`,
    });
  } catch (err) {
    console.error("OTP dispatch failed:", err);
    return Response.json({ error: "Failed to dispatch OTP." }, { status: 500 });
  }
}
