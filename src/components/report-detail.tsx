"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Bell, BellRing, Check, CheckCircle2, Clock3, Copy, ExternalLink, LoaderCircle, Mail, MapPin, MessageSquare, Phone, Radio, Send, Share2, ShieldCheck, ThumbsUp, Wrench, X } from "lucide-react";
import { reportNumber, SLA_LABELS, STATUSES, STATUS_LABELS, timeAgo, type CivicReport, type Preferences, type ReportStatus } from "@/lib/types";
import { Avatar, CategoryIcon, Modal, SlaProgress, StatusBadge } from "@/components/ui";
import { getDispatchInfo } from "@/lib/jurisdiction";

export default function ReportDetail({ report, preferences, authority, onClose, onAction, onViewMap, onToast }: { report: CivicReport; preferences: Preferences; authority: boolean; onClose: () => void; onAction: (id: number, body: Record<string, unknown>) => Promise<void>; onViewMap: (id: number) => void; onToast?: (toast: { message: string; error?: boolean }) => void }) {
  const [status, setStatus] = useState<ReportStatus>(report.status);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [communityOpen, setCommunityOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [showAllUpdates, setShowAllUpdates] = useState(false);
  const [pinged, setPinged] = useState(false);
  const [deadline, setDeadline] = useState(() => toLocalInput(report.dueAt));
  const [deadlineNote, setDeadlineNote] = useState("");
  useEffect(() => { setStatus(report.status); }, [report.status]);
  useEffect(() => { setDeadline(toLocalInput(report.dueAt)); }, [report.dueAt]);
  const voted = preferences.voted.includes(report.id);
  const followed = preferences.following.includes(report.id);
  const dispatchInfo = getDispatchInfo(report.locality, report.createdAt);

  async function act(action: string, extra: Record<string, unknown> = {}) {
    setBusy(action); setError("");
    try { await onAction(report.id, { action, ...extra }); if (action === "status" || action === "update") setMessage(""); }
    catch (err) { setError(err instanceof Error ? err.message : "Unable to save your change."); }
    finally { setBusy(""); }
  }

  const shareUrl = typeof window !== "undefined"
    ? `${window.location.origin}/?report=${report.id}`
    : `/?report=${report.id}`;

  async function copyText(text: string) {
    let success = false;
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        success = true;
      }
    } catch {
      // Fallback below
    }
    if (!success && typeof document !== "undefined") {
      try {
        const textarea = document.createElement("textarea");
        textarea.value = text;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        textarea.style.left = "-9999px";
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        success = document.execCommand("copy");
        document.body.removeChild(textarea);
      } catch {
        success = false;
      }
    }
    return success;
  }

  async function handleShareClick() {
    setShareOpen(true);
    const success = await copyText(shareUrl);
    if (success) {
      setCopied(true);
      onToast?.({ message: `Report link for ${reportNumber(report.id)} copied to clipboard!` });
      setTimeout(() => setCopied(false), 3500);
    }
  }

  async function handleNativeShare() {
    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({
          title: `CivicFix: ${report.title}`,
          text: `Review civic report ${reportNumber(report.id)}: ${report.title} on CivicFix.`,
          url: shareUrl,
        });
      }
    } catch {
      // User dismissed share dialog
    }
  }

  function postUpdate(event: FormEvent) { event.preventDefault(); void act(authority ? "status" : "update", { status, message }); }

  return <Modal label={report.title} onClose={onClose} className="detail-drawer drawer">
    <div className="detail-scroll">
      <div className="detail-photo"><img src={report.imageUrl} alt={report.title} /><span className="photo-report-id">{reportNumber(report.id)}</span></div>
      <div className="detail-content">
        <div className="detail-category"><span><CategoryIcon category={report.category} />{report.category}</span><StatusBadge status={report.status} /></div>
        <h2>{report.title}</h2>
        <div className="detail-location"><MapPin size={18} /><div><strong>{report.address}</strong><span>{report.locality}, Bengaluru</span></div><button className="icon-button" title="View location on map" aria-label="View location on map" onClick={() => onViewMap(report.id)}><ExternalLink size={16} /></button></div>
        <div className="detail-description"><h3>What’s happening</h3><p>{report.description}</p></div>
        <div className="detail-reporter"><Avatar name={report.reporterName} small /><div><strong>{report.reporterName}{report.isMine && !authority && <span className="you-label">You</span>}</strong><span>Reported {timeAgo(report.createdAt)}</span></div><span className={`priority-badge ${report.priority}`}><i />{report.priority} priority</span></div>
        {!authority ? (
          <div className="detail-community-actions">
            <button className={`button ${voted ? "button-supported" : "button-secondary"}`} disabled={Boolean(busy)} onClick={() => void act("vote")}><ThumbsUp size={16} />{voted ? "Supported" : "Support this issue"}<span>{report.upvotes}</span></button>
            <button className={`button ${followed ? "button-following" : "button-secondary"}`} disabled={Boolean(busy)} onClick={() => void act("follow")}>{followed ? <BellRing size={16} /> : <Bell size={16} />}{followed ? "Following" : "Follow"}</button>
            <button className={`button ${copied ? "button-supported" : "button-secondary"} share-button`} onClick={() => void handleShareClick()} aria-label="Copy report link" title="Share report">
              {copied ? <Check size={16} /> : <Share2 size={16} />}
              {copied && <span>Copied!</span>}
            </button>
          </div>
        ) : (
          <div className="detail-authority-actions-bar">
            <span className="authority-ref-badge"><ShieldCheck size={15} />Municipal Case {reportNumber(report.id)}</span>
            <button className={`button ${copied ? "button-supported" : "button-secondary"} share-button`} onClick={() => void handleShareClick()} aria-label="Copy report link" title="Share report">
              {copied ? <Check size={16} /> : <Share2 size={16} />}
              <span>{copied ? "Link copied!" : "Share report"}</span>
            </button>
          </div>
        )}

        {shareOpen && (
          <div className="detail-share-box">
            <div className="share-box-header">
              <div className="share-box-title">
                <Share2 size={14} />
                <strong>Share Case {reportNumber(report.id)}</strong>
              </div>
              <button type="button" className="icon-button share-box-close" onClick={() => setShareOpen(false)} aria-label="Close share options">
                <X size={14} />
              </button>
            </div>
            <p className="share-box-desc">
              Anyone with this link can view this {report.category.toLowerCase()} report and its updates.
            </p>
            <div className="share-link-input-row">
              <input
                value={shareUrl}
                readOnly
                onFocus={(e) => e.target.select()}
                aria-label="Direct report link"
              />
              <button
                type="button"
                className="button button-primary share-copy-btn"
                onClick={() => void handleShareClick()}
              >
                {copied ? <Check size={13} /> : <Copy size={13} />}
                <span>{copied ? "Copied!" : "Copy"}</span>
              </button>
            </div>
            <div className="share-channels-row">
              <a
                href={`mailto:?subject=${encodeURIComponent(`[CivicFix ${reportNumber(report.id)}] ${report.title}`)}&body=${encodeURIComponent(`Hi,\n\nPlease review this civic issue report:\n\nTitle: ${report.title}\nCategory: ${report.category}\nLocation: ${report.address}, ${report.locality}\nStatus: ${report.status}\nLink: ${shareUrl}\n\nCivicFix Platform`)}`}
                className="button button-secondary share-channel-btn"
                title="Share via Email"
              >
                <Mail size={13} />
                <span>Email report</span>
              </a>
              <a
                href={`https://api.whatsapp.com/send?text=${encodeURIComponent(`*CivicFix Report ${reportNumber(report.id)}*: ${report.title}\n📍 ${report.locality}\n🔗 ${shareUrl}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="button button-secondary share-channel-btn"
                title="Share on WhatsApp"
              >
                <ExternalLink size={13} />
                <span>WhatsApp</span>
              </a>
              {typeof navigator !== "undefined" && typeof navigator.share === "function" && (
                <button
                  type="button"
                  className="button button-secondary share-channel-btn"
                  onClick={() => void handleNativeShare()}
                >
                  <Share2 size={13} />
                  <span>Device share</span>
                </button>
              )}
            </div>
          </div>
        )}
        {authority && (
          <section className="authority-dispatch-card">
            <div className="dispatch-card-header">
              <div className="dispatch-card-title">
                <Radio size={16} className="dispatch-live-icon" />
                <strong>Ward Personnel & Proximity Dispatch</strong>
              </div>
              <span className="dispatch-jurisdiction-tag">
                {dispatchInfo.wardNumber} ({dispatchInfo.wardName}) · {dispatchInfo.zone}
              </span>
            </div>

            <div className="dispatch-alert-banner">
              <CheckCircle2 size={14} />
              <span>
                Geo-alert dispatched automatically on report submission ({dispatchInfo.notificationTimestamp})
              </span>
            </div>

            <div className="dispatch-personnel-grid">
              <div className="dispatch-person-box">
                <div className="dispatch-person-top">
                  <span className="dispatch-person-badge manager">WARD MANAGER</span>
                  <span className="dispatch-badge-id">{dispatchInfo.manager.badgeId}</span>
                </div>
                <strong className="dispatch-person-name">{dispatchInfo.manager.name}</strong>
                <span className="dispatch-person-role">{dispatchInfo.manager.role}</span>
                <div className="dispatch-person-contacts">
                  <a href={`tel:${dispatchInfo.manager.phone}`} className="dispatch-contact-link" title="Call Ward Manager">
                    <Phone size={12} /> {dispatchInfo.manager.phone}
                  </a>
                  <a href={`mailto:${dispatchInfo.manager.email}`} className="dispatch-contact-link" title="Email Ward Manager">
                    <Mail size={12} /> {dispatchInfo.manager.email}
                  </a>
                </div>
                <span className="dispatch-person-station">{dispatchInfo.headquarters}</span>
              </div>

              <div className="dispatch-person-box">
                <div className="dispatch-person-top">
                  <span className="dispatch-person-badge worker">FIELD CREW LEAD</span>
                  <span className="dispatch-proximity-badge">
                    <MapPin size={11} /> {dispatchInfo.worker.proximityKm} km away
                  </span>
                </div>
                <strong className="dispatch-person-name">{dispatchInfo.worker.name}</strong>
                <span className="dispatch-person-role">{dispatchInfo.worker.role} · {dispatchInfo.worker.unit}</span>
                <div className="dispatch-person-contacts">
                  <a href={`tel:${dispatchInfo.worker.phone}`} className="dispatch-contact-link" title="Call Field Lead">
                    <Phone size={12} /> {dispatchInfo.worker.phone}
                  </a>
                  <span className="dispatch-vehicle-tag">
                    <Wrench size={12} /> {dispatchInfo.worker.vehicleNumber}
                  </span>
                </div>
                <div className="dispatch-status-row">
                  <span className="live-dot" />
                  <span>Status: <b>{dispatchInfo.worker.status === "dispatched" ? "Dispatched / En Route" : "On duty nearby"}</b> · Ping: {dispatchInfo.worker.lastPing}</span>
                </div>
              </div>
            </div>

            <div className="dispatch-actions-footer">
              <button
                type="button"
                className="button button-secondary dispatch-ping-btn"
                disabled={pinged}
                onClick={() => {
                  setPinged(true);
                  setTimeout(() => setPinged(false), 3500);
                }}
              >
                <Radio size={13} />
                {pinged ? "Alert re-broadcasted via radio & SMS!" : "Re-notify crew & manager"}
              </button>
              <small className="dispatch-auto-note">
                Assigned based on proximity to {report.locality}
              </small>
            </div>
          </section>
        )}
        {/* 3-Stage Lifecycle Stepper clarifying the only 3 resolution stages */}
        <div className="report-lifecycle-stepper">
          <div className="lifecycle-track">
            <div
              className="lifecycle-track-fill"
              style={{ width: report.status === "resolved" ? "100%" : report.status === "in_progress" ? "50%" : "0%" }}
            />
          </div>
          <div className="lifecycle-steps">
            <div className={`lifecycle-step complete ${report.status === "reported" ? "current" : ""}`}>
              <span className="lifecycle-step-circle"><CheckCircle2 size={13} /></span>
              <span className="lifecycle-step-label">1. Reported</span>
            </div>
            <div className={`lifecycle-step ${report.status === "in_progress" || report.status === "resolved" ? "complete" : ""} ${report.status === "in_progress" ? "current" : ""}`}>
              <span className="lifecycle-step-circle"><Clock3 size={13} /></span>
              <span className="lifecycle-step-label">2. In Progress</span>
            </div>
            <div className={`lifecycle-step ${report.status === "resolved" ? "complete current" : ""}`}>
              <span className="lifecycle-step-circle"><Check size={13} /></span>
              <span className="lifecycle-step-label">3. Resolved</span>
            </div>
          </div>
        </div>

        <SlaProgress report={report} />{!authority && report.status !== "resolved" && <p className="sla-explainer">{report.priority.charAt(0).toUpperCase() + report.priority.slice(1)}-priority issues should be resolved within {SLA_LABELS[report.priority]}.</p>}{report.status === "resolved" && <div className="resolved-notice"><CheckCircle2 size={21} /><div><strong>A little better, thanks to you.</strong><p>This issue has been marked as resolved.</p></div></div>}
        {authority && report.status !== "resolved" && <form className="authority-form deadline-form" onSubmit={(event) => { event.preventDefault(); void act("deadline", { dueAt: new Date(deadline).toISOString(), message: deadlineNote }).then(() => setDeadlineNote("")); }}><div className="authority-form-heading"><Clock3 size={17} /><h3>Resolution deadline</h3><span>Default: {SLA_LABELS[report.priority]}</span></div><div className="deadline-quick">{[24, 72, 168].map((hours) => <button type="button" key={hours} onClick={() => setDeadline(toLocalInput(new Date(Date.now() + hours * 3600000).toISOString()))}>+{hours < 48 ? `${hours}h` : `${hours / 24}d`}</button>)}</div><label className="field-label">Complete by<input type="datetime-local" value={deadline} onChange={(event) => setDeadline(event.target.value)} required /></label><label className="field-label">Reason (optional)<input value={deadlineNote} onChange={(event) => setDeadlineNote(event.target.value)} maxLength={500} placeholder="e.g. Awaiting materials from the road department" /></label><button className="button button-secondary" disabled={Boolean(busy)}>{busy === "deadline" ? <LoaderCircle size={15} className="spin" /> : <Clock3 size={15} />}Save deadline</button></form>}{authority && <form className="authority-form" onSubmit={postUpdate}><div className="authority-form-heading"><ShieldCheck size={17} /><h3>Authority actions</h3><span>Staff only</span></div><label className="field-label">Resolution status<select aria-label="Resolution status" value={status} onChange={(event) => setStatus(event.target.value as ReportStatus)}>{STATUSES.map((item) => <option key={item} value={item}>{STATUS_LABELS[item]}</option>)}</select></label><label className="field-label">Update for the community <small>(optional when updating status)</small><textarea value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Share an inspection update, work scheduled, or resolution details…" rows={3} maxLength={2000} /></label><button className="button button-primary" disabled={Boolean(busy)}>{busy === "status" ? <LoaderCircle size={15} className="spin" /> : <Send size={15} />}{status === report.status ? "Post update" : "Update status & post"}</button></form>}
        <div className="detail-timeline-heading"><h3>Activity & progress log <span>{report.updates.length}</span></h3>{!authority && <button onClick={() => setCommunityOpen(!communityOpen)}><MessageSquare size={14} />Add an update</button>}</div>
        {!authority && communityOpen && <form className="community-update-form" onSubmit={postUpdate}><textarea value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Have more details to share with the team?" rows={3} required minLength={5} maxLength={2000} /><button className="button button-primary" disabled={Boolean(busy)}>{busy === "update" ? <LoaderCircle size={15} className="spin" /> : <Send size={14} />}Post update</button></form>}
        <div className="timeline">
          {(showAllUpdates ? report.updates : report.updates.slice(0, 3)).map((update, index) => <div className="timeline-item" key={update.id}><span className={`timeline-dot ${update.status || "reported"}`}>{update.status === "resolved" ? <Check size={11} /> : update.status === "in_progress" ? <Clock3 size={11} /> : <span />}</span><div><div className="timeline-meta"><strong>{update.authorName}</strong><span>{timeAgo(update.createdAt)}</span></div><p>{update.message}</p>{index === 0 && update.status && <StatusBadge status={update.status as ReportStatus} />}</div></div>)}
        </div>
        {report.updates.length > 3 && (
          <button type="button" className="text-button show-more-updates-btn" onClick={() => setShowAllUpdates(!showAllUpdates)}>
            {showAllUpdates ? "Show latest 3 entries" : `Show all ${report.updates.length} activity entries`}
          </button>
        )}
        {error && <div className="form-error" role="alert">{error}</div>}
        <p className="detail-bottom-note">Every report is a step toward a better neighborhood.</p>
      </div>
    </div>
  </Modal>;
}

function toLocalInput(iso: string | null) {
  const date = iso ? new Date(iso) : new Date(Date.now() + 72 * 3600000);
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
