"use client";

import { useMemo, useState, type FormEvent } from "react";
import {
  ArrowRight,
  Award,
  Bell,
  Building2,
  Camera,
  Check,
  CheckCircle2,
  ChevronDown,
  CircleHelp,
  Clock3,
  FileCheck2,
  HardHat,
  HeartHandshake,
  IdCard,
  LoaderCircle,
  LogOut,
  Mail,
  MapPin,
  MessageSquare,
  Phone,
  Radio,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  UserCheck,
} from "lucide-react";
import {
  AUTHORITY_DEPARTMENTS,
  AUTHORITY_DESIGNATIONS,
  AUTHORITY_ZONES,
  ON_CALL_STATUSES,
  timeAgo,
  type CivicReport,
  type Preferences,
} from "@/lib/types";
import { Avatar, EmptyState } from "@/components/ui";
import type { SessionUser } from "@/lib/auth";

export function ActivityFeed({ reports, following = [], onSelect, compact = false }: { reports: CivicReport[]; following?: number[]; onSelect: (id: number) => void; compact?: boolean }) {
  const [filter, setFilter] = useState("all");
  const [limit, setLimit] = useState(10);
  const updates = useMemo(() => reports.flatMap((report) => report.updates.map((update) => ({ ...update, report }))).filter((update) => filter === "all" || following.includes(update.reportId)).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()), [reports, filter, following]);
  return <div className={`activity-feed ${compact ? "compact-feed" : ""}`}>
    {!compact && <div className="activity-filter-tabs"><button className={filter === "all" ? "active" : ""} onClick={() => setFilter("all")}>All activity</button><button className={filter === "following" ? "active" : ""} onClick={() => setFilter("following")}><Bell size={14} />Following</button></div>}
    {updates.length === 0 ? <EmptyState title="You’re all caught up" description="Follow a report to see its progress here." /> : <div className="activity-list">{updates.slice(0, compact ? 3 : limit).map((update) => <button className="activity-item" key={update.id} onClick={() => onSelect(update.reportId)}><span className={`activity-icon ${update.status || "reported"}`}>{update.status === "resolved" ? <CheckCircle2 size={16} /> : update.status === "in_progress" ? <Clock3 size={16} /> : <MessageSquare size={16} />}</span><div className="activity-item-content"><div className="activity-item-meta"><strong>{update.status === "resolved" ? "A little better. Issue resolved." : update.status === "in_progress" ? "Progress is being made" : "A neighbor spoke up"}</strong><span>{timeAgo(update.createdAt)}</span></div><p className="activity-report-title">{update.report.title}</p>{!compact && <p className="activity-message">{update.message}</p>}<span className="activity-author">{update.authorName}</span></div>{!compact && <ArrowRight size={16} className="activity-arrow" />}</button>)}</div>}
    {!compact && updates.length > limit && <div className="load-more-wrap"><button className="button button-secondary" onClick={() => setLimit(limit + 10)}>Load more activity<ChevronDown size={15} /></button></div>}
  </div>;
}

export function SettingsPage({ preferences, onSave, user, onLogout }: { preferences: Preferences; onSave: (preferences: Preferences) => Promise<void>; user?: SessionUser; onLogout?: () => void }) {
  const isAuthority = user?.role === "authority";

  // Common fields
  const [name, setName] = useState(preferences.name || (isAuthority ? "BBMP Community Team" : "Alex Morgan"));
  const [email, setEmail] = useState(preferences.email || (isAuthority ? "officer@civicfix.demo" : "alex@civicfix.demo"));
  const [neighborhood, setNeighborhood] = useState(preferences.neighborhood || (isAuthority ? "South Zone Central" : "Koramangala"));
  const [notifications, setNotifications] = useState(preferences.notifications);

  // Authority Required Fields
  const [department, setDepartment] = useState(preferences.department || "Ward Infrastructure & Engineering");
  const [designation, setDesignation] = useState(preferences.designation || "Assistant Executive Engineer (AEE)");
  const [badgeId, setBadgeId] = useState(preferences.badgeId || "BBMP-W151-8302");
  const [kgidNumber, setKgidNumber] = useState(preferences.kgidNumber || "KGID-884920");
  const [ward, setWard] = useState(preferences.ward || "Ward 151 - Koramangala");
  const [zone, setZone] = useState(preferences.zone || "South Zone");
  const [phone, setPhone] = useState(preferences.phone || "+91 94806 88120");
  const [officeAddress, setOfficeAddress] = useState(preferences.officeAddress || "BBMP Sub-Division Office, 8th Main Rd, 4th Block, Koramangala, Bengaluru - 560034");
  const [controlRoomHotline, setControlRoomHotline] = useState(preferences.controlRoomHotline || "080-22660000 / 1533 (Toll Free)");
  const [onCallStatus, setOnCallStatus] = useState(preferences.onCallStatus || "Active Duty");
  const [governmentGuaranteeReference, setGovernmentGuaranteeReference] = useState(preferences.governmentGuaranteeReference || "Verified Municipal Officer · Gazetted Order KA-HUD-2024-918");

  const [busy, setBusy] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [error, setError] = useState("");
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      if (onLogout) {
        onLogout();
      } else {
        await fetch("/api/auth/logout", { method: "POST" });
        window.location.href = "/login";
      }
    } catch {
      setLoggingOut(false);
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setSavedSuccess(false);
    try {
      await onSave({
        ...preferences,
        name,
        email,
        neighborhood,
        notifications,
        ...(isAuthority ? {
          department,
          designation,
          badgeId,
          kgidNumber,
          ward,
          zone,
          phone,
          officeAddress,
          controlRoomHotline,
          onCallStatus,
          governmentGuaranteeReference,
        } : {}),
      });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 4000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save your preferences.");
    } finally {
      setBusy(false);
    }
  }

  const roleLabel = isAuthority ? "Municipal Authority Staff" : "Community member";

  return <div className="settings-layout">
    <div className="settings-main-column">
      {isAuthority ? (
        <form className="settings-card authority-settings-card" onSubmit={submit}>
          {/* Official Officer Identity Card Header */}
          <div className="authority-officer-badge-card">
            <div className="officer-badge-top">
              <div className="officer-emblem-badge">
                <ShieldCheck size={20} />
                <span>STATE MUNICIPAL CORPORATION</span>
              </div>
              <span className={`authority-duty-pill ${onCallStatus === "Active Duty" ? "active-duty" : "on-field"}`}>
                <span className="live-dot" />
                {onCallStatus}
              </span>
            </div>

            <div className="officer-profile-row">
              <Avatar name={name || "BBMP Community Team"} />
              <div className="officer-profile-text">
                <h3>{name || "Municipal Officer"}</h3>
                <span className="officer-rank-tag">{designation} · {department}</span>
                <div className="officer-id-chips">
                  <span className="officer-badge-chip"><IdCard size={12} /> {badgeId}</span>
                  <span className="officer-kgid-chip"><FileCheck2 size={12} /> {kgidNumber}</span>
                  <span className="officer-ward-chip"><MapPin size={12} /> {ward} ({zone})</span>
                </div>
              </div>
            </div>
          </div>

          <div className="settings-section-heading">
            <h2>Official Authority Credentials &amp; Verification</h2>
            <p>All fields marked with an asterisk (<span className="field-req">*</span>) are mandatory official municipal credentials required for audit and dispatch authorization.</p>
          </div>

          {/* Section 1: Official Officer Identity */}
          <div className="settings-subheading">
            <UserCheck size={16} />
            <span>1. Officer Identity &amp; Government ID</span>
          </div>
          <div className="form-two-columns">
            <label className="field-label">
              Full legal officer name <span className="field-req">*</span>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                minLength={2}
                maxLength={100}
                required
                placeholder="e.g. BBMP Community Team / Officer Name"
              />
            </label>
            <label className="field-label">
              Official municipal email <span className="field-req">*</span>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                maxLength={160}
                required
                placeholder="officer@civicfix.demo or official gov email"
              />
            </label>
          </div>

          <div className="form-two-columns">
            <label className="field-label">
              Official Employee Badge ID <span className="field-req">*</span>
              <input
                value={badgeId}
                onChange={(event) => setBadgeId(event.target.value)}
                minLength={2}
                maxLength={60}
                required
                placeholder="e.g. BBMP-W151-8302"
              />
            </label>
            <label className="field-label">
              KGID / HRMS Government Registration No. <span className="field-req">*</span>
              <input
                value={kgidNumber}
                onChange={(event) => setKgidNumber(event.target.value)}
                minLength={2}
                maxLength={60}
                required
                placeholder="e.g. KGID-884920"
              />
            </label>
          </div>

          <div className="settings-divider" />

          {/* Section 2: Department & Designation */}
          <div className="settings-subheading">
            <Building2 size={16} />
            <span>2. Department, Rank &amp; Duty Availability</span>
          </div>

          <div className="form-two-columns">
            <label className="field-label">
              Municipal Department / Division <span className="field-req">*</span>
              <select
                value={department}
                onChange={(event) => setDepartment(event.target.value)}
                required
                aria-label="Municipal Department"
              >
                {AUTHORITY_DEPARTMENTS.map((dept) => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
            </label>

            <label className="field-label">
              Official Rank / Designation <span className="field-req">*</span>
              <select
                value={designation}
                onChange={(event) => setDesignation(event.target.value)}
                required
                aria-label="Official Rank"
              >
                {AUTHORITY_DESIGNATIONS.map((rank) => (
                  <option key={rank} value={rank}>{rank}</option>
                ))}
              </select>
            </label>
          </div>

          <div className="form-two-columns">
            <label className="field-label">
              On-Call / Duty Availability Status <span className="field-req">*</span>
              <select
                value={onCallStatus}
                onChange={(event) => setOnCallStatus(event.target.value)}
                required
                aria-label="Duty Availability Status"
              >
                {ON_CALL_STATUSES.map((st) => (
                  <option key={st} value={st}>{st}</option>
                ))}
              </select>
            </label>

            <label className="field-label">
              Official Duty Mobile / Phone <span className="field-req">*</span>
              <input
                type="tel"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                minLength={5}
                maxLength={40}
                required
                placeholder="+91 94806 88120"
              />
            </label>
          </div>

          <div className="settings-divider" />

          {/* Section 3: Jurisdiction & Headquarters */}
          <div className="settings-subheading">
            <MapPin size={16} />
            <span>3. Jurisdiction &amp; Physical Office Headquarters</span>
          </div>

          <div className="form-two-columns">
            <label className="field-label">
              Assigned Municipal Ward <span className="field-req">*</span>
              <input
                value={ward}
                onChange={(event) => setWard(event.target.value)}
                minLength={2}
                maxLength={100}
                required
                placeholder="e.g. Ward 151 - Koramangala"
              />
            </label>

            <label className="field-label">
              Administrative Municipal Zone <span className="field-req">*</span>
              <select
                value={zone}
                onChange={(event) => setZone(event.target.value)}
                required
                aria-label="Administrative Municipal Zone"
              >
                {AUTHORITY_ZONES.map((zn) => (
                  <option key={zn} value={zn}>{zn}</option>
                ))}
              </select>
            </label>
          </div>

          <label className="field-label">
            Physical Sub-Division Ward Office / Depot Address <span className="field-req">*</span>
            <input
              value={officeAddress}
              onChange={(event) => setOfficeAddress(event.target.value)}
              minLength={5}
              maxLength={300}
              required
              placeholder="e.g. BBMP Sub-Division Office, 8th Main Road, 4th Block, Koramangala, Bengaluru - 560034"
            />
          </label>

          <label className="field-label">
            Municipal Emergency Control Room Hotline <span className="field-req">*</span>
            <input
              value={controlRoomHotline}
              onChange={(event) => setControlRoomHotline(event.target.value)}
              minLength={3}
              maxLength={80}
              required
              placeholder="080-22660000 / 1533 (Toll Free Control Room)"
            />
          </label>

          <div className="settings-divider" />

          {/* Section 4: Government Guarantee & Audit Reference */}
          <div className="settings-subheading">
            <Award size={16} />
            <span>4. Government Verification &amp; Gazette Reference</span>
          </div>

          <label className="field-label">
            Government Guarantee / Gazette Reference Number <span className="field-req">*</span>
            <input
              value={governmentGuaranteeReference}
              onChange={(event) => setGovernmentGuaranteeReference(event.target.value)}
              minLength={5}
              maxLength={120}
              required
              placeholder="e.g. Verified Municipal Officer · Gazetted Order KA-HUD-2024-918"
            />
          </label>

          <div className="government-guarantee-box">
            <ShieldCheck size={20} className="guarantee-icon" />
            <div>
              <strong>Government of Karnataka Municipal Verification Guarantee</strong>
              <p>This profile is registered with official state e-Governance e-KYC compliance and binds issue dispatch decisions to the Karnataka Municipal Corporations Act.</p>
            </div>
          </div>

          <div className="notification-setting">
            <span className="notification-setting-icon"><Bell size={20} /></span>
            <div>
              <strong>Critical incident notifications</strong>
              <p>Receive immediate alerts for high-priority hazards, SLA deadlines, and community updates.</p>
            </div>
            <button
              type="button"
              className={`toggle ${notifications ? "on" : ""}`}
              role="switch"
              aria-checked={notifications}
              aria-label="Critical notifications"
              onClick={() => setNotifications(!notifications)}
            >
              <span />
            </button>
          </div>

          {error && <div className="form-error" role="alert">{error}</div>}
          {savedSuccess && (
            <div className="form-success-banner" role="status">
              <CheckCircle2 size={16} />
              <span>Authority credentials and official profile successfully updated and verified.</span>
            </div>
          )}

          <div className="settings-footer">
            <span>All official changes are immutably logged for civic auditing.</span>
            <button className="button button-primary" disabled={busy}>
              {busy ? <LoaderCircle size={16} className="spin" /> : <CheckCircle2 size={16} />}
              {busy ? "Saving credentials…" : "Save official credentials"}
            </button>
          </div>
        </form>
      ) : (
        <form className="settings-card" onSubmit={submit}>
          <div className="settings-section-heading">
            <h2>Your community profile</h2>
            <p>A familiar face makes a neighborhood feel like home.</p>
          </div>
          <div className="profile-preview">
            <Avatar name={name || "Alex Morgan"} />
            <div>
              <strong>{name || "Your name"}</strong>
              <span>{neighborhood}, Bengaluru</span>
            </div>
            <span className="profile-role">{roleLabel}</span>
          </div>
          <div className="form-two-columns">
            <label className="field-label">
              Full name
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                minLength={2}
                maxLength={100}
                required
              />
            </label>
            <label className="field-label">
              Email address
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                maxLength={160}
                required
              />
            </label>
          </div>
          <label className="field-label">
            Your neighborhood
            <input
              value={neighborhood}
              onChange={(event) => setNeighborhood(event.target.value)}
              minLength={2}
              maxLength={80}
              required
            />
            <small>We’ll use this as the default location for your reports.</small>
          </label>
          <div className="settings-divider" />
          <div className="settings-section-heading">
            <h2>Stay in the loop</h2>
            <p>The right updates, at the right time.</p>
          </div>
          <div className="notification-setting">
            <span className="notification-setting-icon"><Bell size={20} /></span>
            <div>
              <strong>Community notifications</strong>
              <p>See report progress and updates in your notification center.</p>
            </div>
            <button
              type="button"
              className={`toggle ${notifications ? "on" : ""}`}
              role="switch"
              aria-checked={notifications}
              aria-label="Community notifications"
              onClick={() => setNotifications(!notifications)}
            >
              <span />
            </button>
          </div>
          {error && <div className="form-error" role="alert">{error}</div>}
          {savedSuccess && (
            <div className="form-success-banner" role="status">
              <CheckCircle2 size={16} />
              <span>Preferences saved successfully.</span>
            </div>
          )}
          <div className="settings-footer">
            <span>Changes apply to this demo community account.</span>
            <button className="button button-primary" disabled={busy}>
              {busy ? <LoaderCircle size={16} className="spin" /> : <CheckCircle2 size={16} />}
              {busy ? "Saving…" : "Save preferences"}
            </button>
          </div>
        </form>
      )}

      <div className="settings-card settings-logout-card">
        <div className="settings-section-heading">
          <h2>Account &amp; session</h2>
          <p>Manage your active session or sign out on this device.</p>
        </div>
        <div className="account-logout-card">
          <div className="account-logout-info">
            <span className="account-logout-icon"><LogOut size={18} /></span>
            <div>
              <strong>Signed in as {user?.email || email || preferences.email}</strong>
              <p>Role: <span className="profile-role-inline">{roleLabel}</span></p>
            </div>
          </div>
          <button
            type="button"
            className="button button-logout-action"
            onClick={() => void handleLogout()}
            disabled={loggingOut}
            aria-label="Sign out of CivicFix"
          >
            {loggingOut ? <LoaderCircle size={15} className="spin" /> : <LogOut size={15} />}
            <span>{loggingOut ? "Signing out…" : "Sign out"}</span>
          </button>
        </div>
      </div>
    </div>

    <aside className="settings-note">
      {isAuthority ? (
        <>
          <ShieldCheck size={28} />
          <h3>Municipal Officer Protocol &amp; Security</h3>
          <p>
            Official credentials verify your authority to triage issues, adjust SLA deadlines, dispatch proximity field crews, and officially close municipal incident reports.
          </p>
          <div className="authority-protocol-card">
            <HardHat size={16} />
            <span>Field crews in 7 zones are alerted directly when you verify local reports.</span>
          </div>
          <div className="demo-account-note">
            <Sparkles size={16} />
            <span>Exploring BBMP Municipal Authority workspace. All actions are simulated and safely sandboxed.</span>
          </div>
        </>
      ) : (
        <>
          <ShieldCheck size={25} />
          <h3>Your neighborhood. Your information.</h3>
          <p>
            Your report photos and locations are shared with the community to help resolve issues. Your email is never shown on a report.
          </p>
          <div className="demo-account-note">
            <Sparkles size={16} />
            <span>You’re exploring a shared demo account. No sign-up is required.</span>
          </div>
        </>
      )}
    </aside>
  </div>;
}

const FAQS = [
  { question: "How do I report a civic issue?", answer: "Click “Report an issue,” choose a category, and describe what needs attention. Add a clear photo, use your GPS or drop a pin on the map, and confirm the street address. Your report will appear in the community immediately." },
  { question: "What happens after I report an issue?", answer: "Your report starts as “Reported.” The neighborhood team reviews it, changes the status to “In progress” when work is scheduled, and posts updates as the issue is resolved. You can follow your report to keep track of every update." },
  { question: "Can I support a report that already exists?", answer: "Absolutely. Search for the issue and tap the thumbs-up to support it. You can also follow the report to see its progress in the Following activity feed. Avoid creating duplicate reports when an existing one covers the same issue." },
  { question: "How do authorities manage and resolve reports?", answer: "Open “Authority workspace” in the sidebar to explore the demo authority view. Review an issue, set its resolution status, and leave a clear update for the community. Every change is saved in the report’s progress history. This is a shared demonstration, not a live municipal service." },
  { question: "What should I include in a report photo?", answer: "Take a clear photo that shows the issue and a little of the surrounding area. Avoid including faces, number plates, private documents, or the inside of someone’s home. Never put yourself at risk to take a photo." },
  { question: "Is CivicFix an emergency reporting service?", answer: "No. CivicFix is for non-emergency neighborhood issues. If there is an immediate threat to life or safety, contact your local emergency services first. For urgent municipal hazards, also contact your local authority directly." },
];

const AUTHORITY_FAQS = [
  { question: "How are field workers and ward managers notified of nearby issues?", answer: "Whenever a citizen submits a report, CivicFix identifies the incident's geographic ward and coordinates. Automated dispatch notifications (SMS & municipal radio alerts) are broadcast immediately to the designated Ward Manager and on-duty Field Crew Lead assigned to that locality, providing them with the exact GPS pin, priority, photo evidence, and SLA deadline." },
  { question: "How are resolution deadlines (SLA) calculated?", answer: "Deadlines are automatically assigned upon report submission based on urgency: High priority gets 48 hours, Medium priority gets 5 days, and Low priority gets 10 days. An overdue badge automatically flags lapsed reports." },
  { question: "When should an authority officer adjust a deadline?", answer: "If field resolution requires procurement, department escalation, or specialized contractor scheduling, use the deadline adjustment tool (+24h, +3d, or custom date up to 90 days) and specify an audit reason for transparency." },
  { question: "What is required before marking an issue resolved?", answer: "Confirm that field repairs or street works are completed and post a descriptive resolution note. The citizen reporter and community followers will receive an automatic status update." },
  { question: "How is report authenticity verified?", answer: "All citizen reports include photographic evidence, location coordinates, and timestamps. Officers should cross-reference verified street coordinates on the Issue Map before dispatching crew." },
];

export function HelpPage({ onReport, onReports, isAuthority = false }: { onReport: () => void; onReports: () => void; isAuthority?: boolean }) {
  const [open, setOpen] = useState<number | null>(0);
  const steps = isAuthority ? [
    { icon: MapPin, title: "Triage & verify", text: "Review citizen reports, verified GPS coordinates, and photos. Identify jurisdiction and urgency." },
    { icon: Clock3, title: "SLA & assignment", text: "Ensure strict compliance with resolution deadlines (48h high, 5d medium, 10d low). Adjust deadlines if awaiting supplies." },
    { icon: ShieldCheck, title: "Resolve & document", text: "Execute field repairs with municipal teams. Update status to In Progress, then Resolved with official notes." },
  ] : [
    { icon: MapPin, title: "Spot it", text: "A broken light, a blocked drain, or a road that needs some love. Notice something that could be better." },
    { icon: Camera, title: "Report it", text: "Snap a photo, add the location, and share a few details. It only takes a couple of minutes." },
    { icon: HeartHandshake, title: "Make it better", text: "The right team takes action. Follow the progress and see your neighborhood become a little better." },
  ];

  const faqs = isAuthority ? AUTHORITY_FAQS : FAQS;

  return <div className="help-page">
    <div className="how-it-works-banner">
      <span className="eyebrow">{isAuthority ? "MUNICIPAL OPERATIONS PROTOCOL" : "BETTER NEIGHBORHOODS, TOGETHER"}</span>
      <h2>{isAuthority ? "Accountability. Precision. Resolution." : "A little action goes a long way."}</h2>
      <p>{isAuthority ? "Standard operating procedures for BBMP ward officers and municipal maintenance crews." : "You don’t need to be an expert. Just a neighbor who cares."}</p>
    </div>
    <div className="how-steps">
      {steps.map((step, index) => <div className="how-step" key={step.title}><span className="how-step-icon"><step.icon size={25} strokeWidth={1.6} /></span><span className="how-step-number">0{index + 1}</span><h3>{step.title}</h3><p>{step.text}</p></div>)}
    </div>
    <div className="help-bottom-grid">
      <section className="faq-card">
        <h2>{isAuthority ? "Operational guidelines & questions" : "A few things you might be wondering"}</h2>
        <div className="faq-list">
          {faqs.map((faq, index) => <div className={`faq-item ${open === index ? "open" : ""}`} key={faq.question}><button onClick={() => setOpen(open === index ? null : index)} aria-expanded={open === index}><span>{faq.question}</span><ChevronDown size={17} /></button>{open === index && <p>{faq.answer}</p>}</div>)}
        </div>
      </section>
      <aside className="help-cta-card">
        <span className="help-cta-icon">{isAuthority ? <ShieldCheck size={28} /> : <CircleHelp size={28} />}</span>
        <h3>{isAuthority ? "Review pending queue" : "Ready to make a difference?"}</h3>
        <p>{isAuthority ? "Open the authority workspace to triage new reports and update active resolutions." : "Your first report could be the start of something better for everyone."}</p>
        {!isAuthority && <button className="button button-primary" onClick={onReport}>Report an issue<ArrowRight size={16} /></button>}
        <button className={isAuthority ? "button button-primary" : "text-button"} onClick={onReports}>
          {isAuthority ? "Open authority queue" : "Explore community reports"}
          <ArrowRight size={14} />
        </button>
      </aside>
    </div>
  </div>;
}
