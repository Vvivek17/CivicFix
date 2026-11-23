import assert from "node:assert/strict";

const BASE_URL = "http://localhost:3000";

async function main() {
  console.log("=== Testing DigiLocker Municipal Employee Registration Flow ===");

  const timestamp = Date.now();
  const testEmail = `digilocker.officer.${timestamp}@bbmp.gov.in`;
  const testBadgeId = `BBMP-ENG-15104`;
  const testKgid = `KGID-884920`;
  const testAadhaar = `XXXX-XXXX-8921`;
  const testTxn = `DL-GOI-UIDAI-2026-${Math.floor(100000 + Math.random() * 900000)}`;

  // 1. Test POST /api/auth/register-authority with DigiLocker payload
  console.log("1. Registering authority employee with DigiLocker credentials...");
  const regRes = await fetch(`${BASE_URL}/api/auth/register-authority`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Origin": BASE_URL,
    },
    body: JSON.stringify({
      name: "Kavitha N. Rao",
      email: testEmail,
      password: "Authority@123",
      badgeId: testBadgeId,
      kgidNumber: testKgid,
      aadhaarNumber: testAadhaar,
      designation: "Assistant Engineer (Road Infrastructure)",
      department: "Engineering & Infrastructure Division",
      ward: "Koramangala",
      phone: "+91 94806 88120",
      citizenGuaranteeConfirmed: true,
      digilockerVerified: true,
      digilockerTxnId: testTxn,
      digilockerDocUri: "in.gov.uidai:aadhaar:8921",
    }),
  });

  const regData = await regRes.json();
  console.log("Registration status:", regRes.status);
  assert.equal(regRes.status, 201, `Expected 201, got ${regRes.status}: ${JSON.stringify(regData)}`);
  assert.equal(regData.user.role, "authority");
  assert.equal(regData.governmentGuarantee.status, "AUTHENTICATED & GUARANTEED");
  assert.equal(regData.governmentGuarantee.citizenship, "Citizen of India");
  assert.equal(regData.digilocker.verified, true);
  assert.equal(regData.digilocker.txnId, testTxn);
  assert.ok(regData.digilocker.issuer.includes("National Digital Locker System"));
  console.log("✓ Registration succeeded with authentic DigiLocker Government Guarantee!");

  // 2. Extract session cookie and test /api/auth/session
  const setCookie = regRes.headers.get("set-cookie");
  assert.ok(setCookie, "Expected session cookie to be set");
  const cookieVal = setCookie.split(";")[0];

  console.log("2. Verifying authenticated session role...");
  const sessRes = await fetch(`${BASE_URL}/api/auth/session`, {
    headers: { Cookie: cookieVal },
  });
  const sessData = await sessRes.json();
  assert.equal(sessRes.status, 200);
  assert.equal(sessData.user.role, "authority");
  console.log("✓ Verified: Employee session is 'authority'.");

  // 3. Test that citizen portal rejects authority actions (strict separation check)
  console.log("3. Verifying authority cannot post reports to citizen endpoint...");
  const reportPostRes = await fetch(`${BASE_URL}/api/reports`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Origin": BASE_URL,
      Cookie: cookieVal,
    },
    body: JSON.stringify({
      title: "Test Authority Report Attempt",
      description: "Should be blocked",
      category: "Roads & potholes",
      location: "Koramangala",
      latitude: 12.9352,
      longitude: 77.6245,
      imageUrl: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
    }),
  });
  assert.equal(reportPostRes.status, 403, `Expected 403, got ${reportPostRes.status}`);
  console.log("✓ Verified: 403 Forbidden properly enforced for authority on citizen report creation.");

  // 4. Verify login page defaults for smoke test compatibility
  console.log("4. Verifying /login page headings and smoke test elements...");
  const loginRes = await fetch(`${BASE_URL}/login`);
  const loginHtml = await loginRes.text();
  assert.ok(loginHtml.includes("CivicFix"), "Expected CivicFix brand in login HTML");
  console.log("✓ Login page is online and ready.");

  console.log("\nALL DIGILOCKER TESTS PASSED SUCCESSFULLY! 🚀");
}

main().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});

