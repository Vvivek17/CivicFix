"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { AlarmClock, Armchair, ArrowUpRight, Check, CircleCheck, CircleAlert, Construction, Droplets, Lightbulb, MapPin, SearchX, Trash2, Trees, X, type LucideIcon } from "lucide-react";
import { slaInfo, STATUS_LABELS, type CivicReport, type ReportStatus } from "@/lib/types";

export function Brand() {
  return <div className="brand"><span className="brand-symbol"><svg viewBox="0 0 36 36" fill="none" aria-hidden="true"><path d="M18 5C11.4 5 6 10.3 6 17c0 8.5 12 16 12 16s12-7.5 12-16C30 10.3 24.6 5 18 5Z" stroke="currentColor" strokeWidth="1.8"/><path d="M18 12v9m-4.5-4.5h9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg></span><span>CivicFix<span className="brand-dot">.</span></span></div>;
}

export function CategoryIcon({ category, size = 17 }: { category: string; size?: number }) {
  const icons: Record<string, LucideIcon> = { "Roads & potholes": Construction, "Waste management": Trash2, "Streetlights": Lightbulb, "Water & drainage": Droplets, "Parks & trees": Trees, "Public spaces": Armchair };
  const Icon = icons[category] || Construction;
  return <Icon size={size} strokeWidth={1.7} />;
}

export function StatusBadge({ status }: { status: ReportStatus }) {
  return <span className={`status-badge ${status}`}><i />{STATUS_LABELS[status]}</span>;
}

export function Avatar({ name, small = false, color = 0 }: { name: string; small?: boolean; color?: number }) {
  return <span className={`avatar ${small ? "small" : ""} avatar-color-${color % 5}`}>{name.split(" ").map((part) => part[0]).slice(0, 2).join("")}</span>;
}

export function StatCard({ label, value, note, icon: Icon, color = "green", onClick }: { label: string; value: string | number; note: string; icon: LucideIcon; color?: string; onClick?: () => void }) {
  return <button className={`stat-card ${color}`} onClick={onClick}><div className="stat-top"><span>{label}</span><span className="stat-icon"><Icon size={19} strokeWidth={1.7} /></span></div><div className="stat-bottom"><div><strong>{typeof value === "number" ? <CountUp value={value} /> : value}</strong><span className="stat-note">{color === "green" && <ArrowUpRight size={12} />}{note}</span></div><svg className="sparkline" width="78" height="32" viewBox="0 0 78 32" fill="none" aria-hidden="true"><path d="M2 27 12 22 22 25 32 15 42 19 52 9 62 12 76 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M2 27 12 22 22 25 32 15 42 19 52 9 62 12 76 3V32H2V27Z" fill="currentColor" opacity=".07"/></svg></div></button>;
}

export function Modal({ children, onClose, label, className = "" }: { children: ReactNode; onClose: () => void; label: string; className?: string }) {
  const panel = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panel.current?.querySelector<HTMLElement>("button, input, select, textarea, a[href]")?.focus();
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeRef.current();
      if (event.key === "Tab") {
        const elements = Array.from(panel.current?.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex="0"]') || []).filter((element) => element.offsetParent !== null);
        const first = elements[0]; const last = elements[elements.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }
    };
    document.addEventListener("keydown", handler);
    return () => { document.body.style.overflow = overflow; document.removeEventListener("keydown", handler); previous?.focus(); };
  }, []);
  return <div className={`modal-backdrop ${className.includes("drawer") ? "drawer-backdrop" : ""}`} style={className.includes("invite-modal") ? { zIndex: 120 } : undefined} onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><div className={`modal-panel ${className}`} role="dialog" aria-modal="true" aria-label={label} ref={panel}><button className="icon-button modal-close" onClick={onClose} aria-label="Close dialog"><X size={20} /></button>{children}</div></div>;
}

export function EmptyState({ title = "No reports found", description = "Try a different search or clear your filters.", action }: { title?: string; description?: string; action?: ReactNode }) {
  return <div className="empty-state"><span className="empty-icon"><SearchX size={27} /></span><h3>{title}</h3><p>{description}</p>{action}</div>;
}

export function LocationLine({ address, locality }: { address: string; locality: string }) {
  return <div className="location-line"><MapPin size={14} /><span>{address === locality ? locality : `${locality}, Bengaluru`}</span></div>;
}

export function Toast({ message, error = false, onClose }: { message: string; error?: boolean; onClose: () => void }) {
  useEffect(() => { const timeout = setTimeout(onClose, 5000); return () => clearTimeout(timeout); }, [message, onClose]);
  return <div className={`toast ${error ? "error" : ""}`} role="status"><span className="toast-check">{error ? <X size={16} /> : <Check size={16} />}</span><span>{message}</span><button onClick={onClose} aria-label="Dismiss notification"><X size={16} /></button></div>;
}

/** Animates a number from 0 to its value; respects reduced-motion preferences. */
export function CountUp({ value, duration = 900 }: { value: number; duration?: number }) {
  const [display, setDisplay] = useState(value);
  const previous = useRef(0);
  useEffect(() => {
    const from = previous.current;
    previous.current = value;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || from === value) { setDisplay(value); return; }
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      setDisplay(Math.round(from + (value - from) * (1 - Math.pow(1 - t, 3))));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, duration]);
  return <>{display}</>;
}

/** Re-renders every 30 seconds so deadline countdowns stay current. */
export function useNow(interval = 30000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), interval); return () => clearInterval(id); }, [interval]);
  return now;
}

export function SlaBadge({ report, compact = false }: { report: Pick<CivicReport, "status" | "createdAt" | "dueAt" | "resolvedAt">; compact?: boolean }) {
  const now = useNow();
  const info = slaInfo(report, now);
  if (!report.dueAt) return null;
  const Icon = info.state === "met" ? CircleCheck : info.state === "overdue" || info.state === "missed" ? CircleAlert : AlarmClock;
  return <span className={`sla-badge ${info.state} ${compact ? "compact" : ""}`} title={`Resolution deadline: ${new Date(report.dueAt).toLocaleString()}`}><Icon size={compact ? 11 : 12} />{info.label}</span>;
}

export function SlaProgress({ report }: { report: Pick<CivicReport, "status" | "createdAt" | "dueAt" | "resolvedAt"> }) {
  const now = useNow();
  const info = slaInfo(report, now);
  const [width, setWidth] = useState(0);
  useEffect(() => { const id = requestAnimationFrame(() => setWidth(info.progress * 100)); return () => cancelAnimationFrame(id); }, [info.progress]);
  if (!report.dueAt) return null;
  return <div className={`sla-panel ${info.state}`}>
    <div className="sla-panel-top"><span><AlarmClock size={15} />Resolution deadline</span><SlaBadge report={report} /></div>
    <div className="sla-track"><span style={{ width: `${width}%` }} /></div>
    <div className="sla-panel-bottom"><span>Reported {new Date(report.createdAt).toLocaleDateString(undefined, { day: "numeric", month: "short" })}</span><span>Due {new Date(report.dueAt).toLocaleString(undefined, { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}</span></div>
  </div>;
}
