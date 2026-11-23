import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { drizzle } from "drizzle-orm/node-postgres";
import { sql } from "drizzle-orm";
import pg from "pg";
import dotenv from "dotenv";

dotenv.config();
const baseURL = process.env.PREVIEW_URL || "http://localhost:3000";
const testTitle = `CivicFix smoke test ${Date.now()}: waste collection`;
const browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, geolocation: { latitude: 12.9345, longitude: 77.6266 }, permissions: ["geolocation", "clipboard-read", "clipboard-write"] });
const page = await context.newPage();
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
let originalPreferences;
let originalReport;
let createdId;

async function login(ctx, email, password) {
  const response = await ctx.request.post(`${baseURL}/api/auth/login`, { data: { email, password } });
  assert.ok(response.ok(), `login ${email}: ${await response.text()}`);
}
async function api(path, options = {}) {
  const response = await context.request.fetch(`${baseURL}${path}`, { method: options.method || "GET", headers: options.headers, data: options.body });
  const data = await response.json();
  assert.ok(response.ok(), `${path}: ${JSON.stringify(data)}`);
  return data;
}
async function patchReport(id, body) { return api(`/api/reports/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }); }
async function noOverflow(target) { assert.ok(await target.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), "Page must not overflow horizontally"); }
async function closeDialog() { await page.getByRole("button", { name: "Close dialog", exact: true }).click(); await page.getByRole("dialog").waitFor({ state: "hidden" }); }
async function nav(label) { await page.locator(".sidebar").getByRole("button", { name: new RegExp(`^${label}`) }).click(); }

try {
  // Unauthenticated visitors are redirected to the login page and API calls are rejected.
  await page.goto(baseURL, { waitUntil: "domcontentloaded" });
  await page.getByRole("heading", { name: "Welcome back", exact: true }).waitFor();
  assert.equal((await context.request.get(`${baseURL}/api/reports`)).status(), 401);
  await page.getByRole("tab", { name: "Authority" }).click();
  await page.getByLabel("Email address").fill("alex@civicfix.demo");
  await page.getByLabel("Password").fill("Citizen@123");
  await page.getByRole("button", { name: /Enter authority workspace/ }).click();
  await page.getByText("This account does not have authority access.").waitFor();
  await page.getByRole("tab", { name: "Citizen" }).click();
  await page.getByRole("button", { name: "Use demo account" }).click();
  await page.getByRole("button", { name: /^Sign in/ }).click();
  await page.waitForURL(`${baseURL}/`);
  console.log("PASS: login gate, citizen blocked from authority portal, citizen sign-in");

  const initial = await api("/api/reports");
  originalPreferences = initial.preferences;
  originalReport = initial.reports[0];
  assert.ok(initial.reports.length >= 12);
  await page.goto(baseURL, { waitUntil: "domcontentloaded" });
  await page.getByRole("heading", { name: "Community overview", exact: true }).waitFor();
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(1800);
  assert.equal(await page.locator(".report-card").count(), 4);
  await noOverflow(page);
  await page.screenshot({ path: "/tmp/civicfix-dashboard.png", fullPage: true });
  console.log("PASS: dashboard, fonts, four report cards, and desktop layout");

  await page.getByRole("tab", { name: /^In progress/ }).click();
  assert.equal(await page.locator(".report-card").count(), 4);
  await page.getByRole("textbox", { name: "Search community reports" }).fill("water leak");
  assert.equal(await page.locator(".report-card").count(), 1);
  await page.getByRole("button", { name: "Clear report search" }).click();
  await page.getByRole("tab", { name: /^All reports/ }).click();
  await page.locator(".report-card h3 button").first().click();
  await page.getByRole("dialog").waitFor();
  await page.getByRole("button", { name: /Support this issue/ }).click();
  await page.getByRole("button", { name: /Supported/}).waitFor();
  await page.getByRole("button", { name: "Follow", exact: true }).click();
  await page.getByRole("button", { name: "Following", exact: true }).waitFor();
  await closeDialog();
  console.log("PASS: status/search filters, persistent support, and following");

  await nav("My reports");
  await page.getByRole("heading", { name: "My reports", exact: true }).waitFor();
  await page.locator(".report-issue-button").click();
  await page.getByRole("button", { name: "Waste management", exact: true }).click();
  await page.getByLabel(/Give your report a title/).fill(testTitle);
  await page.getByLabel(/Tell us a little more/).fill("The public bins near the community entrance need collection. This report was created by the automated smoke test.");
  await page.getByRole("radio", { name: "High", exact: true }).click();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.locator('input[type="file"]').setInputFiles("public/images/waste.jpg");
  await page.getByAltText("Your civic issue photo preview").waitFor();
  await page.getByRole("button", { name: "Use my GPS location", exact: true }).click();
  await page.getByText(/Location confirmed/).waitFor();
  await page.getByLabel(/Street address or landmark/).fill("5th Block community entrance, test location");
  await page.getByLabel(/Neighborhood/).fill("Koramangala");
  await page.getByRole("button", { name: "Submit report", exact: true }).click();
  await page.getByRole("dialog", { name: testTitle, exact: true }).waitFor();
  const afterCreate = await api("/api/reports");
  const created = afterCreate.reports.find((report) => report.title === testTitle);
  assert.ok(created?.isMine);
  assert.ok(created.imageUrl.startsWith("data:image/jpeg;base64,"));
  assert.ok(Math.abs(created.latitude - 12.9345) < 0.001);
  createdId = created.id;
  await closeDialog();
  console.log("PASS: two-step photo upload, GPS capture, report submission, and database persistence");

  // Citizens never see the authority workspace and the server rejects authority actions.
  assert.equal(await page.locator(".sidebar").getByRole("button", { name: /^Authority workspace/ }).count(), 0);
  const forbidden = await context.request.fetch(`${baseURL}/api/reports/${createdId}`, { method: "PATCH", data: { action: "status", status: "resolved", message: "Trying to resolve as a citizen." } });
  assert.equal(forbidden.status(), 403);
  const forbiddenDeadline = await context.request.fetch(`${baseURL}/api/reports/${createdId}`, { method: "PATCH", data: { action: "deadline", dueAt: new Date(Date.now() + 86400000).toISOString() } });
  assert.equal(forbiddenDeadline.status(), 403);
  await page.goto(`${baseURL}/?view=authority`);
  await page.getByRole("heading", { name: "Community overview", exact: true }).waitFor();
  assert.ok(created.dueAt, "new reports get a resolution deadline");
  console.log("PASS: citizen cannot see or use authority access (UI hidden, API 403)");

  await page.locator(".logout-button").click();
  await page.waitForURL(`${baseURL}/login`);
  await page.getByRole("tab", { name: "Authority" }).click();
  await page.getByRole("button", { name: "Use demo account" }).click();
  await page.getByRole("button", { name: /Enter authority workspace/ }).click();
  await page.waitForURL(/view=authority/);
  await page.getByRole("heading", { name: "Authority workspace", exact: true }).waitFor();
  await page.getByRole("textbox", { name: "Search community reports" }).fill(testTitle);
  assert.equal(await page.locator(".authority-table tbody tr").count(), 1);
  await page.getByRole("button", { name: "Manage", exact: true }).click();
  await page.getByRole("button", { name: "+3d", exact: true }).click();
  await page.getByRole("button", { name: "Save deadline", exact: true }).click();
  await page.getByText(/Resolution deadline set to/).first().waitFor();
  await page.getByLabel("Resolution status", { exact: true }).selectOption("in_progress");
  await page.getByLabel("Update for the community", { exact: true }).fill("The community team has inspected the bins and scheduled a collection visit.");
  await page.getByRole("button", { name: "Update status & post", exact: true }).click();
  await page.locator(".detail-category .status-badge.in_progress").waitFor();
  await page.getByLabel("Resolution status", { exact: true }).selectOption("resolved");
  await page.getByLabel("Update for the community", { exact: true }).fill("The bins have been emptied and the area cleaned. The smoke test resolution is complete.");
  await page.getByRole("button", { name: "Update status & post", exact: true }).click();
  await page.locator(".resolved-notice").waitFor();
  const resolved = (await api(`/api/reports/${createdId}`)).report;
  assert.equal(resolved.status, "resolved");
  assert.equal(resolved.updates.length, 4);
  assert.ok(resolved.resolvedAt, "resolution time is recorded");
  await closeDialog();
  console.log("PASS: authority sign-in, deadline setting, status changes, and resolution history");
  await page.locator(".logout-button").click();
  await page.waitForURL(`${baseURL}/login`);
  await page.getByRole("button", { name: "Use demo account" }).click();
  await page.getByRole("button", { name: /^Sign in/ }).click();
  await page.waitForURL(`${baseURL}/`);

  await nav("Settings");
  await page.getByRole("switch", { name: "Community notifications" }).click();
  await page.getByRole("button", { name: "Save preferences", exact: true }).click();
  await page.getByText("Your preferences are saved. Make yourself at home!", { exact: true }).waitFor();
  assert.equal((await api("/api/reports")).preferences.notifications, !originalPreferences.notifications);
  await page.getByRole("switch", { name: "Community notifications" }).click();
  await page.getByRole("button", { name: "Save preferences", exact: true }).click();
  await page.waitForTimeout(500);
  await nav("Help & getting started");
  await page.getByRole("button", { name: "What happens after I report an issue?", exact: true }).click();
  assert.equal(await page.getByRole("button", { name: "What happens after I report an issue?", exact: true }).getAttribute("aria-expanded"), "true");
  console.log("PASS: saved profile preferences, notification toggle, and help accordion");

  await nav("Community map");
  await page.locator(".full-map .leaflet-container").waitFor();
  await page.waitForTimeout(1200);
  assert.ok(await page.locator(".full-map .issue-map-pin").count() >= 12);
  await page.locator(".full-map .issue-map-pin").last().dispatchEvent("click");
  await page.locator(".leaflet-popup .map-popup").waitFor();
  await page.locator(".leaflet-popup .map-popup").getByRole("button", { name: "View report →", exact: true }).click();
  await page.getByRole("dialog").waitFor();
  await closeDialog();
  await noOverflow(page);
  await page.locator(".neighbor-card").getByRole("button", { name: "Invite a neighbor", exact: true }).click();
  await page.getByRole("dialog", { name: "Invite a neighbor", exact: true }).waitFor();
  assert.equal(await page.getByRole("dialog").count(), 1);
  await page.locator(".invite-copy-button").click();
  assert.equal(await page.evaluate(() => navigator.clipboard.readText()), baseURL);
  await closeDialog();
  console.log("PASS: interactive map pins, report popups, and clipboard invitations");

  const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  await login(mobile, "alex@civicfix.demo", "Citizen@123");
  const mobilePage = await mobile.newPage();
  mobilePage.on("pageerror", (error) => errors.push(error.message));
  await mobilePage.goto(baseURL, { waitUntil: "domcontentloaded" });
  await mobilePage.getByRole("heading", { name: "Community overview", exact: true }).waitFor();
  await noOverflow(mobilePage);
  await mobilePage.screenshot({ path: "/tmp/civicfix-mobile.png", fullPage: true });
  await mobilePage.getByRole("button", { name: "Open navigation", exact: true }).click();
  await mobilePage.locator(".sidebar").getByRole("button", { name: "Community map", exact: true }).click();
  await mobilePage.getByRole("heading", { name: "Community map", exact: true }).waitFor();
  await mobilePage.locator(".full-map .leaflet-container").waitFor();
  await noOverflow(mobilePage);
  await mobile.close();
  assert.deepEqual(errors, [], `Browser errors: ${errors.join("; ")}`);
  console.log("PASS: mobile navigation, responsive map, no horizontal overflow, and no browser exceptions");
  console.log("ALL CIVICFIX SMOKE TESTS PASSED");
} catch (error) {
  console.error("BROWSER EXCEPTIONS:", errors);
  throw error;
} finally {
  if (originalReport) {
    if ((await api("/api/reports")).preferences.voted.includes(originalReport.id) !== originalPreferences.voted.includes(originalReport.id)) await patchReport(originalReport.id, { action: "vote" });
    const latest = await api("/api/reports");
    if (latest.preferences.following.includes(originalReport.id) !== originalPreferences.following.includes(originalReport.id)) await patchReport(originalReport.id, { action: "follow" });
  }
  if (originalPreferences) await api("/api/preferences", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(originalPreferences) });
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool);
  await db.execute(sql`delete from civic_reports where title = ${testTitle}`);
  await pool.end();
  await browser.close();
}
