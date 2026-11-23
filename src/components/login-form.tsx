"use client";

import { useState, type FormEvent } from "react";
import { ArrowRight, Camera, Clock3, IdCard, LoaderCircle, Lock, MapPin, ShieldCheck, Users } from "lucide-react";
import { Brand } from "@/components/ui";
import EmployeeIdScanner from "@/components/employee-id-scanner";

type Portal = "citizen" | "authority";

export default function LoginForm() {
  const [portal, setPortal] = useState<Portal>("citizen");
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [authMode, setAuthMode] = useState<"signin" | "register_id">("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [cookieBlocked, setCookieBlocked] = useState(false);

  function switchPortal(next: Portal) {
    setPortal(next);
    setMode("signin");
    setAuthMode("signin");
    setError("");
    setPassword("");
  }
  function fillDemo() {
    if (portal === "authority") { setEmail("officer@civicfix.demo"); setPassword("Authority@123"); }
    else { setEmail("alex@civicfix.demo"); setPassword("Citizen@123"); }
    setMode("signin"); setError("");
  }

  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError(""); setCookieBlocked(false);
    try {
      const signup = portal === "citizen" && mode === "signup";
      const response = await fetch(signup ? "/api/auth/register" : "/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(signup ? { name, email, password } : { email, password, portal }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Something went wrong.");
      // The password was accepted; make sure the browser really stored the session before moving on.
      const session = await fetch("/api/auth/session", { cache: "no-store" });
      if (!session.ok) { setCookieBlocked(true); setBusy(false); return; }
      window.location.href = data.user.role === "authority" ? "/?view=authority" : "/";
    } catch (err) { setError(err instanceof Error ? err.message : "Something went wrong."); setBusy(false); }
  }

  const authority = portal === "authority";
  return <main className={`login-page ${authority ? "authority-portal" : ""}`}>
    <div className="login-orb orb-one" /><div className="login-orb orb-two" /><div className="login-orb orb-three" />
    <section className="login-story">
      <div className="login-brand animate-rise"><Brand /></div>
      <h1 className="animate-rise delay-1">{authority ? <>From report<br />to resolution.</> : <>See it. Report it.<br />Get it fixed.</>}</h1>
      <p className="animate-rise delay-2">{authority ? "The secure workspace for municipal teams to prioritize, resolve, and meet every resolution deadline." : "Report civic issues with a photo and GPS location, and follow them until they are resolved — on time."}</p>
      <ul className="login-features">
        {(authority ? [{ icon: ShieldCheck, text: "Role-protected authority workspace" }, { icon: Clock3, text: "Deadline tracking for every issue" }, { icon: Users, text: "Keep citizens updated in real time" }] : [{ icon: Camera, text: "Photo & GPS reports in two steps" }, { icon: Clock3, text: "Every issue gets a resolution deadline" }, { icon: MapPin, text: "Live community map of your neighborhood" }]).map((item, index) => <li key={item.text} className={`animate-rise delay-${index + 3}`}><span><item.icon size={17} /></span>{item.text}</li>)}
      </ul>
    </section>
    <section className="login-card animate-pop" key={portal}>
      <div className="portal-switch" role="tablist" aria-label="Choose portal">
        <button role="tab" aria-selected={!authority} className={!authority ? "active" : ""} onClick={() => switchPortal("citizen")}><Users size={15} />Citizen</button>
        <button role="tab" aria-selected={authority} className={authority ? "active" : ""} onClick={() => switchPortal("authority")}><ShieldCheck size={15} />Authority</button>
        <span className="portal-indicator" style={{ transform: authority ? "translateX(100%)" : "translateX(0)" }} />
      </div>
      {authority && authMode === "register_id" ? (
        <EmployeeIdScanner
          onCancel={() => { setAuthMode("signin"); setError(""); }}
          onSuccess={() => { window.location.href = "/?view=authority"; }}
        />
      ) : (
        <>
          <div className="login-card-heading">
            <span className="login-card-icon">{authority ? <Lock size={22} /> : <Users size={22} />}</span>
            <h2>{authority ? "Authority sign in" : mode === "signup" ? "Create your account" : "Welcome back"}</h2>
            <p>{authority ? "Restricted to verified municipal staff accounts." : mode === "signup" ? "Join your neighbors in making the city better." : "Sign in to report and follow civic issues."}</p>
          </div>
          <form onSubmit={submit} className="login-form">
            {!authority && mode === "signup" && <label className="field-label">Full name<input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" required minLength={2} maxLength={100} placeholder="e.g. Priya Sharma" /></label>}
            <label className="field-label">Email address<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required placeholder={authority ? "officer@municipality.gov" : "you@example.com"} /></label>
            <label className="field-label">Password<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={mode === "signup" ? "new-password" : "current-password"} required minLength={mode === "signup" ? 8 : 1} placeholder={mode === "signup" ? "At least 8 characters" : "Your password"} /></label>
            {error && <div className="form-error shake" role="alert">{error}</div>}
            {cookieBlocked && <div className="form-error shake" role="alert">Your details are correct, but this browser blocked the sign-in cookie — usually because the app is shown inside an embedded preview. <a href="/login" target="_blank" rel="noreferrer">Open CivicFix in a new tab</a> and sign in there.</div>}
            <button className="button button-primary login-submit" disabled={busy}>{busy ? <LoaderCircle size={16} className="spin" /> : null}{busy ? "Please wait…" : authority ? "Enter authority workspace" : mode === "signup" ? "Create account" : "Sign in"}{!busy && <ArrowRight size={16} />}</button>
          </form>
          {!authority && <p className="login-switch">{mode === "signup" ? "Already have an account?" : "New to CivicFix?"} <button onClick={() => { setMode(mode === "signup" ? "signin" : "signup"); setError(""); }}>{mode === "signup" ? "Sign in" : "Create an account"}</button></p>}
          {authority && (
            <div className="login-switch authority-note authority-register-toggle">
              <IdCard size={15} />
              <span>New municipal employee?</span>
              <button type="button" onClick={() => { setAuthMode("register_id"); setError(""); }}>
                Scan & register with Identity Card
              </button>
            </div>
          )}
          <div className="demo-credentials"><span>Demo {authority ? "authority" : "citizen"} account</span><code>{authority ? "officer@civicfix.demo · Authority@123" : "alex@civicfix.demo · Citizen@123"}</code><button type="button" onClick={fillDemo}>Use demo account</button></div>
        </>
      )}
    </section>
  </main>;
}
