// scripts/verify-authority-and-updates.mjs
async function run() {
  console.log("=== Testing Authority Login, Profile Fields, and Issue Updates ===");

  // 1. Authority Login
  const loginRes = await fetch("http://localhost:3000/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "officer@civicfix.demo", password: "Authority@123" }),
  });
  console.log("1. Authority login status:", loginRes.status);
  const cookie = loginRes.headers.get("set-cookie");
  if (!cookie) throw new Error("No cookie received from login");

  // 2. Load dashboard reports
  const reportsRes = await fetch("http://localhost:3000/api/reports", {
    headers: { Cookie: cookie },
  });
  console.log("2. GET /api/reports status:", reportsRes.status);
  const reportsData = await reportsRes.json();
  console.log(`   Fetched ${reportsData.reports.length} reports. Initial preferences:`, {
    name: reportsData.preferences.name,
    email: reportsData.preferences.email,
    department: reportsData.preferences.department,
    designation: reportsData.preferences.designation,
    badgeId: reportsData.preferences.badgeId,
    kgidNumber: reportsData.preferences.kgidNumber,
  });

  const targetReport = reportsData.reports[0];
  console.log(`   Target report #${targetReport.id} current status: "${targetReport.status}", updates count: ${targetReport.updates.length}`);

  // 3. Test Issue Status Change
  const newStatus = targetReport.status === "in_progress" ? "resolved" : "in_progress";
  console.log(`3. Updating report #${targetReport.id} status to "${newStatus}"...`);
  const statusUpdateRes = await fetch(`http://localhost:3000/api/reports/${targetReport.id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: JSON.stringify({
      action: "status",
      status: newStatus,
      message: `Field crew inspected site. Status transitioned to ${newStatus}.`,
    }),
  });
  console.log("   PATCH /api/reports/:id status code:", statusUpdateRes.status);
  const statusUpdateData = await statusUpdateRes.json();
  if (!statusUpdateRes.ok) {
    console.error("   Error updating status:", statusUpdateData);
    process.exit(1);
  }
  console.log(`   Updated report status: "${statusUpdateData.report.status}", latest update: "${statusUpdateData.report.updates[0]?.message}"`);
  if (statusUpdateData.report.status !== newStatus) {
    throw new Error(`Expected status "${newStatus}" but got "${statusUpdateData.report.status}"`);
  }

  // 4. Test Deadline Update
  const newDeadline = new Date(Date.now() + 48 * 3600000).toISOString();
  console.log(`4. Updating resolution deadline for report #${targetReport.id}...`);
  const deadlineRes = await fetch(`http://localhost:3000/api/reports/${targetReport.id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: JSON.stringify({
      action: "deadline",
      dueAt: newDeadline,
      message: "Urgent procurement approved for road patching material.",
    }),
  });
  console.log("   PATCH deadline status code:", deadlineRes.status);
  const deadlineData = await deadlineRes.json();
  if (!deadlineRes.ok) {
    console.error("   Error updating deadline:", deadlineData);
    process.exit(1);
  }
  console.log(`   Updated dueAt: "${deadlineData.report.dueAt}", latest update: "${deadlineData.report.updates[0]?.message}"`);

  // 5. Test Authority Profile Update with all required fields
  console.log("5. Updating Authority Profile with required municipal fields...");
  const prefUpdateRes = await fetch("http://localhost:3000/api/preferences", {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: JSON.stringify({
      name: "BBMP Community Team",
      email: "officer@civicfix.demo",
      neighborhood: "South Zone Central",
      notifications: true,
      department: "Ward Infrastructure & Engineering",
      designation: "Assistant Executive Engineer (AEE)",
      badgeId: "BBMP-W151-8302",
      kgidNumber: "KGID-884920",
      ward: "Ward 151 - Koramangala",
      zone: "South Zone",
      phone: "+91 94806 88120",
      officeAddress: "BBMP Sub-Division Office, 8th Main Rd, 4th Block, Koramangala, Bengaluru - 560034",
      controlRoomHotline: "080-22660000 / 1533 (Toll Free)",
      onCallStatus: "Active Duty",
      governmentGuaranteeReference: "Verified Municipal Officer · Gazetted Order KA-HUD-2024-918",
    }),
  });
  console.log("   PATCH /api/preferences status code:", prefUpdateRes.status);
  const prefData = await prefUpdateRes.json();
  if (!prefUpdateRes.ok) {
    console.error("   Error updating preferences:", prefData);
    process.exit(1);
  }
  console.log("   Saved Authority Preferences:", {
    department: prefData.preferences.department,
    designation: prefData.preferences.designation,
    badgeId: prefData.preferences.badgeId,
    kgidNumber: prefData.preferences.kgidNumber,
    ward: prefData.preferences.ward,
    zone: prefData.preferences.zone,
    phone: prefData.preferences.phone,
    onCallStatus: prefData.preferences.onCallStatus,
    governmentGuaranteeReference: prefData.preferences.governmentGuaranteeReference,
  });

  // 6. Verify that subsequent GET /api/reports reflects both updated issue and updated authority profile
  console.log("6. Verifying state synchronization on GET /api/reports...");
  const verifyRes = await fetch("http://localhost:3000/api/reports", {
    headers: { Cookie: cookie },
  });
  const verifyData = await verifyRes.json();
  const verifiedReport = verifyData.reports.find((r) => r.id === targetReport.id);
  console.log(`   Report #${targetReport.id} on GET /api/reports: status = "${verifiedReport.status}", updates = ${verifiedReport.updates.length}`);
  console.log("   Authority profile on GET /api/reports: badgeId =", verifyData.preferences.badgeId, ", designation =", verifyData.preferences.designation);

  if (verifiedReport.status !== newStatus) {
    throw new Error(`Report status verification failed! Expected "${newStatus}", got "${verifiedReport.status}"`);
  }
  if (verifyData.preferences.badgeId !== "BBMP-W151-8302") {
    throw new Error("Authority badgeId verification failed!");
  }

  console.log("=== ALL TESTS PASSED SUCCESSFULLY! ===");
}

run().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
