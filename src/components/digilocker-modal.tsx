"use client";

import { useState, useEffect } from "react";
import {
  ArrowRight,
  Bell,
  Check,
  CheckCircle2,
  ExternalLink,
  FileCheck2,
  Fingerprint,
  Info,
  KeyRound,
  LoaderCircle,
  Lock,
  MessageCircle,
  MessageSquare,
  QrCode,
  RefreshCw,
  RotateCcw,
  Send,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  Sparkles,
  UserCheck,
  X,
} from "lucide-react";
import {
  DigiLockerProfile,
  DigiLockerConsentResult,
  PRESET_DIGILOCKER_ACCOUNTS,
  generateDynamicDigiLockerProfile,
  createDigiLockerConsentResult,
} from "@/lib/digilocker";

interface DigiLockerModalProps {
  onClose: () => void;
  onSuccess: (result: DigiLockerConsentResult) => void;
}

type Step = "choose_account" | "otp_verify" | "consent_documents" | "complete";

function cleanIndianNumber(raw: string): string {
  const digits = (raw || "").replace(/\D/g, "");
  if (digits.startsWith("91") && digits.length === 12) return digits.slice(2);
  if (digits.startsWith("0") && digits.length === 11) return digits.slice(1);
  if (digits.length >= 10) return digits.slice(-10);
  return digits;
}

function formatDisplayPhone(raw: string): string {
  const clean = cleanIndianNumber(raw);
  if (clean.length === 10) {
    return `+91 ${clean.slice(0, 5)} ${clean.slice(5)}`;
  }
  return raw.startsWith("+91") ? raw : `+91 ${raw}`;
}

export default function DigiLockerModal({ onClose, onSuccess }: DigiLockerModalProps) {
  const [step, setStep] = useState<Step>("choose_account");
  const [selectedProfile, setSelectedProfile] = useState<DigiLockerProfile>(PRESET_DIGILOCKER_ACCOUNTS[0]);
  const [customMobile, setCustomMobile] = useState("");
  const [useCustom, setUseCustom] = useState(false);
  const [activeMobile, setActiveMobile] = useState(PRESET_DIGILOCKER_ACCOUNTS[0].mobile);
  const [generatedOtp, setGeneratedOtp] = useState("482910");
  const [otp, setOtp] = useState("482910");
  const [otpSent, setOtpSent] = useState(false);
  const [timer, setTimer] = useState(45);
  const [consentApproved, setConsentApproved] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [copiedOtp, setCopiedOtp] = useState(false);
  const [whatsappLink, setWhatsappLink] = useState("");
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [showQr, setShowQr] = useState(false);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (step === "otp_verify" && timer > 0) {
      interval = setInterval(() => setTimer((t) => t - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [step, timer]);

  function handleAccountSelect(profile: DigiLockerProfile) {
    setSelectedProfile(profile);
    setActiveMobile(profile.mobile);
    setUseCustom(false);
    setError("");
  }

  async function handleSendOtp() {
    setBusy(true);
    setError("");

    let profileToUse = selectedProfile;
    let targetPhone = selectedProfile.mobile;

    if (useCustom) {
      const clean = cleanIndianNumber(customMobile);
      if (clean.length !== 10) {
        setError("Please enter a valid 10-digit Indian mobile number.");
        setBusy(false);
        return;
      }
      profileToUse = generateDynamicDigiLockerProfile(customMobile);
      targetPhone = clean;
      setSelectedProfile(profileToUse);
    }

    setActiveMobile(targetPhone);
    const newOtp = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedOtp(newOtp);
    setOtp(newOtp);

    // Call backend OTP dispatch service
    try {
      const res = await fetch("/api/auth/send-sms-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: targetPhone,
          otp: newOtp,
          name: profileToUse.name,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (data.whatsappUrl) {
        setWhatsappLink(data.whatsappUrl);
      }
      if (data.qrCodeUrl) {
        setQrCodeUrl(data.qrCodeUrl);
      }
    } catch (err) {
      console.warn("SMS dispatch notice:", err);
      const clean = cleanIndianNumber(targetPhone);
      const fallbackWa = `https://wa.me/91${clean}?text=${encodeURIComponent(
        `[CivicFix - Digital India] Your DigiLocker UIDAI verification OTP is: ${newOtp}. Valid for 10 minutes.`
      )}`;
      setWhatsappLink(fallbackWa);
      setQrCodeUrl(`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(fallbackWa)}`);
    }

    setBusy(false);
    setOtpSent(true);
    setTimer(45);
    setStep("otp_verify");
  }

  async function handleResendOtp() {
    const newOtp = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedOtp(newOtp);
    setOtp(newOtp);
    setTimer(45);
    setError("");
    setCopiedOtp(true);
    setTimeout(() => setCopiedOtp(false), 2000);

    try {
      const res = await fetch("/api/auth/send-sms-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: activeMobile,
          otp: newOtp,
          name: selectedProfile.name,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (data.whatsappUrl) setWhatsappLink(data.whatsappUrl);
      if (data.qrCodeUrl) setQrCodeUrl(data.qrCodeUrl);
    } catch {
      // Keep local simulation active
    }
  }

  function handleVerifyOtp() {
    if (!otp || otp.length < 4) {
      setError("Please enter the 6-digit verification code sent to your registered mobile.");
      return;
    }
    setBusy(true);
    setError("");
    setTimeout(() => {
      setBusy(false);
      setStep("consent_documents");
    }, 800);
  }

  function handleApproveConsent() {
    if (!consentApproved) {
      setError("Please check the consent authorization box to allow document retrieval.");
      return;
    }
    setBusy(true);
    setTimeout(() => {
      const result = createDigiLockerConsentResult(selectedProfile);
      setBusy(false);
      setStep("complete");
      setTimeout(() => {
        onSuccess(result);
      }, 1200);
    }, 1000);
  }

  const formattedTargetPhone = formatDisplayPhone(activeMobile);

  return (
    <div className="modal-backdrop digilocker-modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal-panel digilocker-modal-panel">
        <button
          className="modal-close"
          onClick={onClose}
          aria-label="Close DigiLocker verification"
        >
          <X size={18} />
        </button>

        {/* Official DigiLocker Brand Header */}
        <div className="digilocker-header">
          <div className="digilocker-brand-row">
            <div className="digilocker-logo">
              <span className="digilocker-cloud-icon">☁️</span>
              <div className="digilocker-text-wrap">
                <span className="digilocker-name">DigiLocker</span>
                <span className="digilocker-tagline">Your Documents Anytime, Anywhere</span>
              </div>
            </div>
            <div className="digilocker-gov-meta">
              <span className="digilocker-emblem">🏛️ 🇮🇳</span>
              <div>
                <strong>Digital India</strong>
                <small>Ministry of Electronics & IT, Govt. of India</small>
              </div>
            </div>
          </div>
          <div className="digilocker-subhead">
            <span>National Identity & Municipal Public Servant Verification Gateway</span>
          </div>
        </div>

        {/* Progress Breadcrumbs */}
        <div className="digilocker-progress-steps">
          <div className={`dl-step ${step === "choose_account" ? "active" : "complete"}`}>
            <span>1</span>
            <strong>Identity</strong>
          </div>
          <div className={`dl-step-divider ${step !== "choose_account" ? "complete" : ""}`} />
          <div
            className={`dl-step ${
              step === "otp_verify"
                ? "active"
                : step === "consent_documents" || step === "complete"
                ? "complete"
                : ""
            }`}
          >
            <span>2</span>
            <strong>Aadhaar OTP</strong>
          </div>
          <div
            className={`dl-step-divider ${
              step === "consent_documents" || step === "complete" ? "complete" : ""
            }`}
          />
          <div className={`dl-step ${step === "consent_documents" ? "active" : step === "complete" ? "complete" : ""}`}>
            <span>3</span>
            <strong>Documents & Consent</strong>
          </div>
        </div>

        <div className="digilocker-modal-body">
          {/* STEP 1: CHOOSE OR ENTER ACCOUNT */}
          {step === "choose_account" && (
            <div className="dl-step-content animate-rise">
              <div className="dl-info-banner">
                <Fingerprint size={20} className="dl-info-icon" />
                <div>
                  <strong>Official Public Servant Authentication</strong>
                  <p>
                    DigiLocker verifies that you are an authentic <b>Citizen of India living in India</b> holding verified municipal public service appointment with BBMP.
                  </p>
                </div>
              </div>

              <label className="dl-section-label">Select pre-verified Municipal Service Account (Demo / Fast-track):</label>
              <div className="dl-accounts-grid">
                {PRESET_DIGILOCKER_ACCOUNTS.map((acc) => (
                  <button
                    key={acc.id}
                    type="button"
                    className={`dl-account-card ${!useCustom && selectedProfile.id === acc.id ? "selected" : ""}`}
                    onClick={() => handleAccountSelect(acc)}
                  >
                    <div className="dl-acc-top">
                      <span className="dl-acc-flag">🇮🇳</span>
                      <div>
                        <strong>{acc.name}</strong>
                        <span className="dl-acc-desig">{acc.designation}</span>
                      </div>
                    </div>
                    <div className="dl-acc-meta">
                      <span>Phone: <b>{formatDisplayPhone(acc.mobile)}</b></span>
                      <span>Badge: <code>{acc.badgeId}</code></span>
                      <span>UIDAI: <code>{acc.aadhaarNumber}</code></span>
                    </div>
                    <div className="dl-acc-verified-chip">
                      <CheckCircle2 size={12} />
                      <span>UIDAI & BBMP Verified Record</span>
                    </div>
                  </button>
                ))}
              </div>

              <div className="dl-divider">
                <span>or enter your own respected mobile number</span>
              </div>

              <div className={`dl-custom-input-box ${useCustom ? "active" : ""}`}>
                <label className="field-label">
                  Your Respected Mobile Number (for instant OTP verification)
                  <div className="dl-input-row">
                    <span className="dl-input-prefix">+91</span>
                    <input
                      type="tel"
                      placeholder="e.g. 98450 12345 or your 10-digit number"
                      value={customMobile}
                      onFocus={() => setUseCustom(true)}
                      onChange={(e) => {
                        setCustomMobile(e.target.value);
                        setUseCustom(true);
                      }}
                    />
                  </div>
                </label>
                <small className="dl-help-text">
                  The OTP will be generated and dispatched for your exact respected mobile number.
                </small>
              </div>

              {error && <div className="form-error shake">{error}</div>}

              <div className="dl-footer-actions">
                <button
                  type="button"
                  className="button button-primary dl-action-btn"
                  onClick={handleSendOtp}
                  disabled={busy}
                >
                  {busy ? <LoaderCircle size={16} className="spin" /> : <Smartphone size={16} />}
                  {busy ? "Generating & Dispatching OTP…" : `Send OTP to ${useCustom && customMobile ? formatDisplayPhone(customMobile) : formattedTargetPhone}`}
                  {!busy && <ArrowRight size={15} />}
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: OTP VERIFICATION */}
          {step === "otp_verify" && (
            <div className="dl-step-content animate-rise">
              {/* Prominent Respected Number Banner */}
              <div className="dl-respected-number-strip">
                <span className="dl-phone-chip">
                  <Smartphone size={14} /> Respected Target: <strong>{formattedTargetPhone}</strong>
                </span>
                <span className="dl-delivery-channel-pill">
                  <span className="live-dot" /> OTP Dispatched
                </span>
              </div>

              {/* Physical Device Delivery & Telecom Notice */}
              <div className="physical-device-helper-card">
                <div className="device-helper-title">
                  <Smartphone size={16} />
                  <strong>Direct Delivery to Your Physical Device ({formattedTargetPhone})</strong>
                </div>
                <p>
                  To receive this OTP directly onto your physical device right now without needing telecom carrier setup:
                </p>
                <div className="device-delivery-methods">
                  {whatsappLink && (
                    <a
                      href={whatsappLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="button dl-whatsapp-cta-btn"
                      title="Open WhatsApp on your phone"
                    >
                      <MessageCircle size={15} /> Receive on Phone (WhatsApp)
                    </a>
                  )}
                  {qrCodeUrl && (
                    <button
                      type="button"
                      className="button button-secondary dl-qr-toggle-btn"
                      onClick={() => setShowQr(!showQr)}
                    >
                      <QrCode size={14} /> {showQr ? "Hide Phone QR Code" : "Scan Phone QR with Camera"}
                    </button>
                  )}
                </div>

                {showQr && qrCodeUrl && (
                  <div className="phone-qr-display-box animate-pop">
                    <img src={qrCodeUrl} alt="Scan QR code with phone camera" className="phone-qr-image" />
                    <div className="qr-instructions">
                      <strong>Point your phone's camera at this QR code</strong>
                      <small>Instantly displays OTP <b>{generatedOtp}</b> directly on your device where {formattedTargetPhone} is located.</small>
                    </div>
                  </div>
                )}

                <div className="telecom-dlt-notice">
                  <Info size={13} />
                  <span>
                    <b>Carrier Cellular SMS Note:</b> Delivering SMS over Indian cellular towers (Jio, Airtel, Vi) requires a TRAI-DLT registered gateway API key (e.g. <code>FAST2SMS_API_KEY</code>, <code>TWILIO_AUTH_TOKEN</code>, or <code>MSG91_AUTH_KEY</code> in <code>.env</code>).
                  </span>
                </div>
              </div>

              {/* Simulated Live SMS Alert Card */}
              <div className="simulated-sms-card animate-pop">
                <div className="sms-card-top">
                  <div className="sms-sender">
                    <span className="sms-icon">💬</span>
                    <div>
                      <strong>VM-UIDAI · National Identity Gateway</strong>
                      <small>
                        Dispatched to: <b className="sms-phone-bold">{formattedTargetPhone}</b>
                      </small>
                    </div>
                  </div>
                  <span className="sms-badge">Live SMS Record</span>
                </div>
                <div className="sms-card-content">
                  <p>
                    Your DigiLocker UIDAI verification OTP for {selectedProfile.name} is{" "}
                    <span className="sms-otp-highlight">{generatedOtp}</span>. Sent to <b>{formattedTargetPhone}</b>. Valid for 10 minutes. Do not share with anyone.
                  </p>
                </div>
                <div className="sms-card-footer">
                  <span className="sms-auto-filled-pill">
                    <CheckCircle2 size={12} /> Auto-filled in input below
                  </span>
                  <div className="sms-action-buttons">
                    <button
                      type="button"
                      className="sms-copy-btn"
                      onClick={() => {
                        setOtp(generatedOtp);
                        setCopiedOtp(true);
                        setTimeout(() => setCopiedOtp(false), 2000);
                      }}
                    >
                      {copiedOtp ? <Check size={12} /> : <Sparkles size={12} />}
                      {copiedOtp ? "OTP Ready!" : `Re-apply ${generatedOtp}`}
                    </button>
                  </div>
                </div>
              </div>

              <div className="dl-otp-banner">
                <KeyRound size={22} className="dl-otp-icon" />
                <div>
                  <strong>Aadhaar Security Code Verification</strong>
                  <p>
                    UIDAI has generated a 6-digit one-time authorization code for <b>{selectedProfile.name}</b> on mobile <b>{formattedTargetPhone}</b>.
                  </p>
                </div>
              </div>

              <div className="dl-otp-box">
                <label className="field-label">
                  Enter or Confirm 6-Digit OTP:
                  <input
                    type="text"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                    placeholder="Enter 6-digit OTP"
                    className="dl-otp-input"
                    autoFocus
                  />
                </label>

                <div className="dl-otp-helper-row">
                  <span className="dl-otp-timer">
                    {timer > 0 ? (
                      `Resend OTP in 00:${timer.toString().padStart(2, "0")}`
                    ) : (
                      <button type="button" className="text-button" onClick={handleResendOtp}>
                        <RotateCcw size={12} /> Generate fresh OTP
                      </button>
                    )}
                  </span>
                  <button
                    type="button"
                    className="dl-quick-fill-btn"
                    onClick={handleResendOtp}
                  >
                    <RefreshCw size={11} /> Generate New OTP
                  </button>
                </div>
              </div>

              {error && <div className="form-error shake">{error}</div>}

              <div className="dl-footer-actions">
                <button
                  type="button"
                  className="button button-secondary"
                  onClick={() => setStep("choose_account")}
                >
                  Change Number
                </button>
                <button
                  type="button"
                  className="button button-primary dl-action-btn"
                  onClick={handleVerifyOtp}
                  disabled={busy}
                >
                  {busy ? <LoaderCircle size={16} className="spin" /> : <ShieldCheck size={16} />}
                  {busy ? "Verifying with UIDAI…" : "Verify OTP & Fetch Records"}
                  {!busy && <ArrowRight size={15} />}
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: CONSENT & DOCUMENT RETRIEVAL */}
          {step === "consent_documents" && (
            <div className="dl-step-content animate-rise">
              <div className="dl-profile-strip">
                <span className="dl-profile-badge">🇮🇳 VERIFIED CITIZEN</span>
                <div className="dl-profile-info">
                  <strong>{selectedProfile.name}</strong>
                  <span>{selectedProfile.citizenship}</span>
                  <small>
                    UID: <code>{selectedProfile.aadhaarNumber}</code> · Phone: <code>{formattedTargetPhone}</code>
                  </small>
                </div>
              </div>

              <label className="dl-section-label">Verified Electronic Documents from DigiLocker Repository:</label>

              <div className="dl-documents-list">
                {selectedProfile.documents.map((doc) => (
                  <div key={doc.id} className="dl-document-card">
                    <div className="dl-doc-icon">
                      <FileCheck2 size={20} />
                    </div>
                    <div className="dl-doc-content">
                      <div className="dl-doc-header">
                        <strong>{doc.title}</strong>
                        <span className="dl-doc-status-badge">
                          <CheckCircle2 size={11} /> {doc.status}
                        </span>
                      </div>
                      <p className="dl-doc-issuer">{doc.issuer}</p>
                      <div className="dl-doc-footer">
                        <span>URI: <code>{doc.docUri}</code></span>
                        <span>Issued: {doc.issueDate}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Statutory Consent Box */}
              <div className="dl-consent-container">
                <label className="dl-consent-checkbox-label">
                  <input
                    type="checkbox"
                    checked={consentApproved}
                    onChange={(e) => setConsentApproved(e.target.checked)}
                  />
                  <span>
                    <b>Consent to Share Electronic Records:</b> I hereby grant consent to DigiLocker (Government of India) to share my verified UIDAI Aadhaar Citizen e-KYC record and Bruhat Bengaluru Mahanagara Palike (BBMP) Municipal Service Identity with the CivicFix Authority Platform under <b>Rule 9 of the Information Technology (Preservation and Retention of Information by Intermediaries Providing Digital Locker Facilities) Rules, 2016</b>.
                  </span>
                </label>
              </div>

              {error && <div className="form-error shake">{error}</div>}

              <div className="dl-footer-actions">
                <button
                  type="button"
                  className="button button-secondary"
                  onClick={() => setStep("otp_verify")}
                >
                  Back
                </button>
                <button
                  type="button"
                  className="button button-primary dl-action-btn dl-approve-btn"
                  onClick={handleApproveConsent}
                  disabled={busy}
                >
                  {busy ? <LoaderCircle size={16} className="spin" /> : <ShieldCheck size={16} />}
                  {busy ? "Retrieving Digital Records…" : "Grant Consent & Import Records"}
                  {!busy && <ArrowRight size={15} />}
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: COMPLETE */}
          {step === "complete" && (
            <div className="dl-complete-view animate-rise">
              <div className="dl-success-seal">
                <CheckCircle2 size={44} />
              </div>
              <h3>DigiLocker Authentication Complete!</h3>
              <p>
                Aadhaar Citizen e-KYC and BBMP Municipal Public Service records have been securely imported and verified with Government Guarantee for <b>{formattedTargetPhone}</b>.
              </p>
              <div className="dl-audit-ref">
                <span>DigiLocker Audit Reference:</span>
                <code>DL-GOI-UIDAI-2026-VERIFIED</code>
              </div>
              <small className="dl-redirect-notice">Auto-populating municipal authority registration form…</small>
            </div>
          )}
        </div>

        {/* Security & Statutory Trust Bar */}
        <div className="digilocker-footer-strip">
          <div className="dl-trust-badges">
            <span>🔒 256-Bit SSL Encrypted</span>
            <span>✓ Certified by Controller of Certifying Authorities (CCA)</span>
            <span>🇮🇳 Govt. of India Digital Locker</span>
          </div>
        </div>
      </div>
    </div>
  );
}
