// Sign-in regression test for every way the app is opened:
//   1. embedded in a cross-site HTTPS iframe (how hosted previews show the app)
//   2. the same, with third-party cookies blocked by the browser
//   3. a direct HTTPS tab
//   4. plain-HTTP localhost (npm run dev / npm run start)
// Starts a throwaway HTTPS proxy in front of the running app. Usage: node scripts/login-test.mjs
import { chromium } from "@playwright/test";
import { execSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import http from "node:http";
import https from "node:https";

const target = new URL(process.env.PREVIEW_URL || "http://localhost:3000");
const dir = mkdtempSync(join(tmpdir(), "civicfix-tls-"));
execSync(`openssl req -x509 -newkey rsa:2048 -nodes -keyout ${dir}/key.pem -out ${dir}/cert.pem -subj /CN=localhost -days 2`, { stdio: "ignore" });
// Two different sites on the same local proxy: "preview-host.example" embeds "civicfix-app.example" in an iframe.
const HOST_SITE = "preview-host.example";
const APP_SITE = "civicfix-app.example";
const resolver = `--host-resolver-rules=MAP ${HOST_SITE} 127.0.0.1, MAP ${APP_SITE} 127.0.0.1`;
const proxy = https.createServer({ key: readFileSync(`${dir}/key.pem`), cert: readFileSync(`${dir}/cert.pem`) }, (req, res) => {
  if (req.headers.host?.startsWith(HOST_SITE)) { res.writeHead(200, { "content-type": "text/html" }); res.end(`<iframe src="https://${APP_SITE}:3443/login" style="width:100%;height:860px;border:0"></iframe>`); return; }
  const upstream = http.request({ host: target.hostname === "localhost" ? "127.0.0.1" : target.hostname, port: target.port || 80, path: req.url, method: req.method, headers: { ...req.headers, "x-forwarded-proto": "https", "x-forwarded-host": req.headers.host } }, (up) => { res.writeHead(up.statusCode ?? 502, up.headers); up.pipe(res); });
  upstream.on("error", () => { res.writeHead(502); res.end(); });
  req.pipe(upstream);
});
await new Promise((resolve) => proxy.listen(3443, resolve));
const secureUrl = `https://${APP_SITE}:3443`;
const results = [];
const record = (name, ok, detail = "") => { results.push(ok); console.log(`${ok ? "PASS" : "FAIL"}: ${name}${detail ? ` — ${detail}` : ""}`); };

async function signIn(scope) {
  await scope.getByRole("button", { name: "Use demo account" }).click();
  await scope.getByRole("button", { name: /^Sign in/ }).click();
  return scope.getByRole("heading", { name: "Community overview", exact: true }).waitFor({ timeout: 15000 }).then(() => true, () => false);
}
async function describe(scope) {
  const alert = await scope.locator("[role=alert]").first().innerText({ timeout: 1000 }).catch(() => "");
  const heading = await scope.locator("h1,h2").first().innerText({ timeout: 1000 }).catch(() => "?");
  return `stuck on "${heading.replace(/\n/g, " ")}"${alert ? `, message: "${alert}"` : ""}`;
}

async function embedded(name, args) {
  const browser = await chromium.launch({ headless: true, args: ["--no-sandbox", resolver, ...args] });
  const page = await (await browser.newContext({ ignoreHTTPSErrors: true, viewport: { width: 1300, height: 900 } })).newPage();
  let cookie = "";
  page.on("response", async (r) => { if (r.url().includes("/api/auth/login")) cookie = ((await r.allHeaders())["set-cookie"] || "none").replace(/=[a-f0-9]{64}/, "=…").replace(/Expires=[^;]+; /, ""); });
  await page.goto(`https://${HOST_SITE}:3443/`);
  const frame = page.frameLocator("iframe");
  const ok = await signIn(frame);
  record(name, ok, ok ? `cookie: ${cookie}` : `${await describe(frame)}; cookie: ${cookie}`);
  if (ok) {
    await frame.locator(".logout-button").click();
    const out = await frame.getByRole("heading", { name: "Welcome back", exact: true }).waitFor({ timeout: 15000 }).then(() => true, () => false);
    record(`${name}: sign out`, out);
  }
  await browser.close();
}

await embedded("embedded cross-site HTTPS iframe", []);
await embedded("embedded iframe with third-party cookies blocked", ["--test-third-party-cookie-phaseout"]);

const browser = await chromium.launch({ headless: true, args: ["--no-sandbox", resolver] });
for (const [name, url] of [["direct HTTPS tab", secureUrl], ["plain-HTTP localhost", target.origin]]) {
  const page = await (await browser.newContext({ ignoreHTTPSErrors: true })).newPage();
  await page.goto(`${url}/login`);
  const ok = await signIn(page);
  record(name, ok, ok ? "" : await describe(page));
  if (ok) { await page.reload(); record(`${name}: stays signed in after reload`, await page.getByRole("heading", { name: "Community overview", exact: true }).waitFor({ timeout: 15000 }).then(() => true, () => false)); }
}
await browser.close();
proxy.close();
if (results.includes(false)) { console.log("LOGIN TESTS FAILED"); process.exit(1); }
console.log("ALL LOGIN TESTS PASSED");
