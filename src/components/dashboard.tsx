"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import dynamic from "next/dynamic";
import { Activity, AlarmClock, LogOut, ArrowDownWideNarrow, ArrowRight, ArrowUpRight, Bell, BellRing, Building2, Camera, Check, CheckCircle2, ChevronDown, ChevronRight, CircleHelp, ClipboardList, Clock3, Copy, Grid2X2, HardHat, Heart, IdCard, LayoutDashboard, List, LoaderCircle, LocateFixed, Mail, Map, MapPin, Menu, MessageSquare, Phone, Plus, Radio, Search, Settings, ShieldCheck, SlidersHorizontal, Sparkles, ThumbsUp, Users, Wrench, X } from "lucide-react";
import { CATEGORIES, reportNumber, slaInfo, STATUSES, STATUS_LABELS, timeAgo, type CivicReport, type Preferences, type ReportStatus, type View } from "@/lib/types";
import { Avatar, Brand, CategoryIcon, EmptyState, Modal, SlaBadge, StatCard, StatusBadge, Toast } from "@/components/ui";
import type { SessionUser } from "@/lib/auth";
import ReportForm from "@/components/report-form";
import ReportDetail from "@/components/report-detail";
import { ActivityFeed, HelpPage, SettingsPage } from "@/components/workspace-pages";
import MapLoading from "@/components/map-loading";
import { getAllWards, getWardPersonnel } from "@/lib/jurisdiction";
import EmployeeIdScanner from "@/components/employee-id-scanner";

/** Unresolved issues first, ordered by how soon (or how long ago) their deadline is. */
function deadlineRank(report: CivicReport) {
  if (report.status === "resolved") return Number.MAX_SAFE_INTEGER;
  return report.dueAt ? new Date(report.dueAt).getTime() : Number.MAX_SAFE_INTEGER - 1;
}

const CivicMap = dynamic(() => import("@/components/civic-map"), { ssr: false, loading: MapLoading });
const CITIZEN_VIEW_NAMES: Record<View, string> = { overview: "Community overview", reports: "Community reports", map: "Community map", "my-reports": "My reports", authority: "Authority workspace", activity: "Activity & updates", help: "How it works", settings: "Settings" };
const CITIZEN_VIEW_DESCRIPTIONS: Record<View, string> = { overview: "A better neighborhood starts with all of us.", reports: "See what’s happening. Find an issue. Make a difference.", map: "A clearer picture of what’s happening around you.", "my-reports": "Your voice is helping make your neighborhood better.", authority: "Turn community reports into meaningful local action.", activity: "Every update is a step toward a better neighborhood.", help: "Everything you need to become a neighborhood changemaker.", settings: "Your profile, your neighborhood, your preferences." };

const AUTHORITY_VIEW_NAMES: Record<View, string> = { overview: "Authority workspace", reports: "Authority workspace", map: "Issue map", "my-reports": "Authority workspace", authority: "Authority workspace", activity: "Activity audit log", help: "Operations guidelines", settings: "Staff account settings" };
const AUTHORITY_VIEW_DESCRIPTIONS: Record<View, string> = { overview: "Review community reports and coordinate municipal resolutions.", reports: "Review community reports and coordinate municipal resolutions.", map: "Spatial overview of reported civic issues and SLA deadlines.", "my-reports": "Review community reports and coordinate municipal resolutions.", authority: "Review community reports, manage SLA deadlines, and coordinate local resolutions.", activity: "Complete audit history of civic reports and field updates.", help: "Official standard operating procedures for BBMP municipal teams.", settings: "Authority staff credentials and session management." };

function ReportTabs({ reports, value, onChange }: { reports: CivicReport[]; value: string; onChange: (status: string) => void }) {
  return <div className="report-tabs" role="tablist" aria-label="Filter reports by status"><button role="tab" aria-selected={value === "all"} className={value === "all" ? "active" : ""} onClick={() => onChange("all")}>All reports<span>{reports.length}</span></button>{STATUSES.map((status) => <button key={status} role="tab" aria-selected={value === status} className={value === status ? "active" : ""} onClick={() => onChange(status)}>{STATUS_LABELS[status]}<span>{reports.filter((report) => report.status === status).length}</span></button>)}</div>;
}

function ReportCard({ report, preferences, onOpen, onVote, busy }: { report: CivicReport; preferences: Preferences; onOpen: (id: number) => void; onVote: (id: number) => void; busy: boolean }) {
  const supported = preferences.voted.includes(report.id);
  return <article className="report-card"><button className="report-photo" onClick={() => onOpen(report.id)} aria-label={`View ${report.title}`}><img src={report.imageUrl} alt={report.title} loading="lazy" /><span className="photo-category"><CategoryIcon category={report.category} size={13} />{report.category}</span><StatusBadge status={report.status} /><span className="photo-count"><Camera size={12} />1 photo</span>{report.priority === "high" && <span className="photo-priority"><i />High priority</span>}</button><div className="report-card-body"><div className="report-card-meta"><span>{reportNumber(report.id)}</span><span><Clock3 size={11} />{timeAgo(report.createdAt)}</span></div><SlaBadge report={report} compact /><h3><button onClick={() => onOpen(report.id)}>{report.title}</button></h3><div className="location-line"><MapPin size={13} /><span>{report.locality}, Bengaluru</span></div><div className="report-card-footer"><span className="card-reporter"><Avatar name={report.reporterName} small color={report.id} /><span>{report.reporterName.split(" ")[0]} {report.reporterName.split(" ")[1]?.[0]}.</span></span><div className="card-community"><button className={supported ? "supported" : ""} disabled={busy} onClick={() => onVote(report.id)} title={supported ? "Remove your support" : "Support this issue"} aria-label={`${supported ? "Remove support from" : "Support"} ${report.title}`}><ThumbsUp size={14} /><span>{report.upvotes}</span></button><button onClick={() => onOpen(report.id)} title="View progress and updates" aria-label={`View updates for ${report.title}`}><MessageSquare size={14} /><span>{report.updates.length}</span></button></div></div></div></article>;
}

export default function Dashboard({ initialReports, initialPreferences, user }: { initialReports: CivicReport[]; initialPreferences: Preferences; user: SessionUser }) {
  const isAuthority = user.role === "authority";
  const viewNames = isAuthority ? AUTHORITY_VIEW_NAMES : CITIZEN_VIEW_NAMES;
  const viewDescriptions = isAuthority ? AUTHORITY_VIEW_DESCRIPTIONS : CITIZEN_VIEW_DESCRIPTIONS;
  const [reports, setReports] = useState(initialReports);
  const [preferences, setPreferences] = useState(initialPreferences);
  const [view, setView] = useState<View>(isAuthority ? "authority" : "overview");
  const [query, setQuery] = useState("");
  const [globalQuery, setGlobalQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [status, setStatus] = useState("all");
  const [category, setCategory] = useState("all");
  const [neighborhood, setNeighborhood] = useState("");
  const [priority, setPriority] = useState("all");
  const [sort, setSort] = useState("latest");
  const [layout, setLayout] = useState("grid");
  const [visibleCount, setVisibleCount] = useState(4);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [mapFocusId, setMapFocusId] = useState<number | null>(null);
  const [busyVote, setBusyVote] = useState<number | null>(null);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [readThrough, setReadThrough] = useState(0);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteCopied, setInviteCopied] = useState(false);
  const [rosterOpen, setRosterOpen] = useState(false);
  const [employeeRegisterOpen, setEmployeeRegisterOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string; error?: boolean } | null>(null);
  const allWards = useMemo(() => getAllWards(), []);
  const globalSearch = useRef<HTMLInputElement>(null);
  const inviteOpenRef = useRef(false);
  inviteOpenRef.current = inviteOpen;
  const closeToast = useCallback(() => setToast(null), []);

  const navigate = useCallback((requested: View) => {
    let next: View;
    if (isAuthority) {
      const allowed: View[] = ["authority", "map", "activity", "help", "settings"];
      next = allowed.includes(requested) ? requested : "authority";
    } else {
      const allowed: View[] = ["overview", "reports", "map", "my-reports", "activity", "help", "settings"];
      next = allowed.includes(requested) ? requested : "overview";
    }
    setView(next); setMobileNav(false); setQuery(""); setGlobalQuery(""); setStatus("all"); setCategory("all"); setNeighborhood(""); setPriority("all"); setFiltersOpen(false); setVisibleCount(next === "overview" ? 4 : 6); setNotificationsOpen(false); setSearchFocused(false);
    window.history.pushState({}, "", (isAuthority && next === "authority") || (!isAuthority && next === "overview") ? "/" : `/?view=${next}`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [isAuthority]);

  useEffect(() => {
    function readLocation() {
      const params = new URLSearchParams(window.location.search);
      const requestedView = params.get("view");
      if (isAuthority) {
        const allowed: View[] = ["authority", "map", "activity", "help", "settings"];
        if (requestedView && allowed.includes(requestedView as View)) setView(requestedView as View);
        else setView("authority");
      } else {
        const allowed: View[] = ["overview", "reports", "map", "my-reports", "activity", "help", "settings"];
        if (requestedView && allowed.includes(requestedView as View)) setView(requestedView as View);
        else setView("overview");
      }
      const reportId = Number(params.get("report"));
      setSelectedId(reportId > 0 ? reportId : null);
    }
    readLocation();
    setReadThrough(Number(localStorage.getItem("civicfix-read-through") || 0));
    window.addEventListener("popstate", readLocation);
    const interval = setInterval(async () => { try { const response = await fetch("/api/reports", { cache: "no-store" }); if (response.status === 401) { window.location.href = "/login"; return; } if (response.ok) { const data = await response.json(); setReports(data.reports); setPreferences(data.preferences); } } catch { /* Keep the current dashboard available while offline. */ } }, 60000);
    return () => { window.removeEventListener("popstate", readLocation); clearInterval(interval); };
  }, [isAuthority]);

  useEffect(() => {
    function keyboard(event: KeyboardEvent) {
      const target = event.target as HTMLElement;
      if (event.key === "/" && !["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) { event.preventDefault(); globalSearch.current?.focus(); }
      if (event.key === "Escape") { setFiltersOpen(false); setNotificationsOpen(false); setSearchFocused(false); setMobileNav(false); }
    }
    window.addEventListener("keydown", keyboard);
    return () => window.removeEventListener("keydown", keyboard);
  }, []);

  const overdueCount = reports.filter((report) => slaInfo(report).state === "overdue").length;
  const mine = reports.filter((report) => report.isMine);
  const counts = { total: reports.length, progress: reports.filter((report) => report.status === "in_progress").length, resolved: reports.filter((report) => report.status === "resolved").length, neighbors: new Set(reports.map((report) => report.reporterName)).size };
  const baseReports = view === "my-reports" ? mine : reports;
  const filteredReports = reports.filter((report) => (view !== "my-reports" || report.isMine) && (status === "all" || report.status === status) && (category === "all" || report.category === category) && (!neighborhood || report.locality === neighborhood) && (priority === "all" || report.priority === priority) && `${report.title} ${report.description} ${report.address} ${report.locality} ${report.category} ${reportNumber(report.id)}`.toLowerCase().includes(query.toLowerCase())).sort((a, b) => sort === "popular" ? b.upvotes - a.upvotes : sort === "deadline" ? deadlineRank(a) - deadlineRank(b) : new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const globalResults = reports.filter((report) => `${report.title} ${report.locality} ${report.address} ${reportNumber(report.id)}`.toLowerCase().includes(globalQuery.toLowerCase())).slice(0, 4);
  const selectedReport = reports.find((report) => report.id === selectedId);
  const updates = useMemo(() => reports.flatMap((report) => report.updates.map((update) => ({ ...update, report }))).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()), [reports]);
  const latestUpdateId = updates[0]?.id || 0;
  const neighborhoods = [...new Set(reports.map((report) => report.locality))].sort();
  const activeFilterCount = [category, neighborhood, priority].filter((value) => value && value !== "all").length;

  function clearFilters() { setQuery(""); setStatus("all"); setCategory("all"); setNeighborhood(""); setPriority("all"); setVisibleCount(view === "overview" ? 4 : 6); }
  function openReport(id: number) { if (inviteOpenRef.current) return; setInviteOpen(false); setReportOpen(false); setSelectedId(id); setSearchFocused(false); setNotificationsOpen(false); const params = new URLSearchParams(window.location.search); params.set("report", String(id)); window.history.replaceState({}, "", `/?${params}`); }
  function closeReport() { setSelectedId(null); const params = new URLSearchParams(window.location.search); params.delete("report"); window.history.replaceState({}, "", `/?${params}`); }
  async function logout() { await fetch("/api/auth/logout", { method: "POST" }); window.location.href = "/login"; }
  function openInvite() { inviteOpenRef.current = true; closeReport(); setReportOpen(false); setInviteCopied(false); setInviteOpen(true); }
  function closeInvite() { inviteOpenRef.current = false; setInviteOpen(false); setSelectedId(null); setReportOpen(false); }

  async function performAction(id: number, body: Record<string, unknown>) {
    const response = await fetch(`/api/reports/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Unable to save your change.");
    setReports((current) => current.map((report) => report.id === id ? data.report : report)); setPreferences(data.preferences);
    if (body.action === "follow") setToast({ message: data.preferences.following.includes(id) ? "You’re following this report. Stay in the loop!" : "You’ve unfollowed this report." });
    if (body.action === "status" || body.action === "update") setToast({ message: body.action === "status" ? "Status updated. The community is in the loop." : "Your update has been posted." });
    if (body.action === "deadline") setToast({ message: "Resolution deadline updated successfully." });
  }

  async function vote(id: number) {
    setBusyVote(id);
    try { await performAction(id, { action: "vote" }); }
    catch (err) { setToast({ message: err instanceof Error ? err.message : "Unable to save your support.", error: true }); }
    finally { setBusyVote(null); }
  }

  async function savePreferences(next: Preferences) {
    const response = await fetch("/api/preferences", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(next) });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Unable to save your preferences.");
    setPreferences(data.preferences); setReports((current) => current.map((report) => report.isMine ? { ...report, reporterName: next.name, reporterEmail: next.email } : report)); setToast({ message: "Your preferences are saved. Make yourself at home!" });
  }

  async function copyInvite() {
    try { await navigator.clipboard.writeText(window.location.origin); setInviteCopied(true); setToast({ message: "Invite link copied. Better neighborhoods, together!" }); }
    catch { setToast({ message: "Select and copy the invitation link below.", error: true }); }
  }

  function searchAll(event: FormEvent) { event.preventDefault(); navigate(isAuthority ? "authority" : "reports"); setQuery(globalQuery); setGlobalQuery(globalQuery); }

  const stats = <div className="stats-grid"><StatCard label="Total reports" value={counts.total} note={`${reports.filter((report) => Date.now() - new Date(report.createdAt).getTime() < 7 * 86400000).length} this week`} icon={ClipboardList} color="green" onClick={() => navigate(isAuthority ? "authority" : "reports")} /><StatCard label="In progress" value={counts.progress} note="Getting things done" icon={Clock3} color="blue" onClick={() => { navigate(isAuthority ? "authority" : "reports"); setStatus("in_progress"); }} /><StatCard label="Resolved issues" value={counts.resolved} note="A little better, every day" icon={CheckCircle2} color="green" onClick={() => { navigate(isAuthority ? "authority" : "reports"); setStatus("resolved"); }} />{isAuthority ? <StatCard label="Past deadline" value={overdueCount} note={overdueCount ? "Needs attention now" : "All on schedule"} icon={AlarmClock} color={overdueCount ? "red" : "green"} onClick={() => { navigate("authority"); setSort("deadline"); }} /> : <StatCard label="Community voices" value={counts.neighbors} note="Better, together" icon={Users} color="amber" onClick={openInvite} />}</div>;

  function toolbar() {
    return <><div className="report-toolbar"><label className="report-search"><Search size={16} /><input placeholder="Search reports…" value={query} onChange={(event) => { setQuery(event.target.value); setVisibleCount(view === "overview" ? 4 : 6); }} aria-label="Search community reports" />{query && <button onClick={() => setQuery("")} aria-label="Clear report search"><X size={13} /></button>}</label><label className="category-select"><select value={category} onChange={(event) => setCategory(event.target.value)} aria-label="Filter by category"><option value="all">All categories</option>{CATEGORIES.map((item) => <option key={item}>{item}</option>)}</select><ChevronDown size={13} /></label><div className="filter-control"><button className={`filter-button ${activeFilterCount ? "has-filters" : ""}`} onClick={() => setFiltersOpen(!filtersOpen)} aria-expanded={filtersOpen}><SlidersHorizontal size={14} /><span>Filters</span>{activeFilterCount > 0 && <b>{activeFilterCount}</b>}</button>{filtersOpen && <div className="filter-popover"><div className="popover-heading"><strong>Make it your view</strong><button onClick={() => setFiltersOpen(false)} aria-label="Close filters"><X size={15} /></button></div><label className="field-label">Neighborhood<select value={neighborhood} onChange={(event) => setNeighborhood(event.target.value)}><option value="">All neighborhoods</option>{neighborhoods.map((item) => <option key={item}>{item}</option>)}</select></label><label className="field-label">Priority<select value={priority} onChange={(event) => setPriority(event.target.value)}><option value="all">All priorities</option><option value="high">High priority</option><option value="medium">Medium priority</option><option value="low">Low priority</option></select></label><div className="filter-popover-footer"><button className="text-button" onClick={clearFilters}>Reset filters</button><button className="button button-primary" onClick={() => setFiltersOpen(false)}>Done<Check size={14} /></button></div></div>}</div><label className="sort-select"><ArrowDownWideNarrow size={14} /><select value={sort} onChange={(event) => setSort(event.target.value)} aria-label="Sort reports"><option value="latest">Newest first</option><option value="popular">Most supported</option><option value="deadline">Deadline first</option></select><ChevronDown size={12} /></label><div className="view-toggle"><button className={layout === "grid" ? "active" : ""} onClick={() => setLayout("grid")} aria-label="Grid view" aria-pressed={layout === "grid"}><Grid2X2 size={15} /></button><button className={layout === "list" ? "active" : ""} onClick={() => setLayout("list")} aria-label="List view" aria-pressed={layout === "list"}><List size={16} /></button></div></div>{activeFilterCount > 0 && <div className="active-filter-row">{category !== "all" && <button onClick={() => setCategory("all")}>{category}<X size={11} /></button>}{neighborhood && <button onClick={() => setNeighborhood("")}>{neighborhood}<X size={11} /></button>}{priority !== "all" && <button onClick={() => setPriority("all")}>{priority} priority<X size={11} /></button>}<button className="clear-all" onClick={clearFilters}>Clear all</button></div>}</>;
  }

  function reportResults() {
    return <>{filteredReports.length === 0 ? <EmptyState title={view === "my-reports" && !mine.length ? "Your first report starts here" : "No reports found"} description={view === "my-reports" && !mine.length ? "Spot something that could be better? Let’s get it sorted." : "Try a different search or clear your filters."} action={<button className="button button-secondary" onClick={view === "my-reports" && !mine.length ? () => setReportOpen(true) : clearFilters}>{view === "my-reports" && !mine.length ? "Report an issue" : "Clear filters"}</button>} /> : <div className={`reports-grid ${layout === "list" ? "reports-list" : ""}`}>{filteredReports.slice(0, visibleCount).map((report) => <ReportCard key={report.id} report={report} preferences={preferences} onOpen={openReport} onVote={(id) => void vote(id)} busy={busyVote === report.id} />)}</div>}{filteredReports.length > 0 && <div className="reports-bottom"><span>Showing {Math.min(visibleCount, filteredReports.length)} of {filteredReports.length} reports</span>{view === "overview" ? <button className="text-button" onClick={() => navigate("reports")}>View all reports<ArrowRight size={14} /></button> : visibleCount < filteredReports.length ? <button className="button button-secondary" onClick={() => setVisibleCount(visibleCount + 6)}>Load more reports<ChevronDown size={14} /></button> : <span className="caught-up"><Check size={13} />You’re all caught up</span>}</div>}</>;
  }

  return <div className="app-shell">
    {mobileNav && <button className="mobile-nav-scrim" onClick={() => setMobileNav(false)} aria-label="Close navigation" />}
    <aside className={`sidebar ${mobileNav ? "mobile-open" : ""}`}>
      <div className="sidebar-brand">
        <button onClick={() => navigate(isAuthority ? "authority" : "overview")} aria-label={isAuthority ? "CivicFix authority portal" : "CivicFix overview"}>
          {isAuthority ? (
            <div className="brand authority-sidebar-brand">
              <span className="brand-symbol"><ShieldCheck size={28} /></span>
              <span>CivicFix<span className="brand-dot">.</span><small className="authority-brand-tag">STAFF</small></span>
            </div>
          ) : (
            <Brand />
          )}
        </button>
        <button className="icon-button mobile-sidebar-close" onClick={() => setMobileNav(false)} aria-label="Close navigation"><X size={20} /></button>
      </div>

      <button className="community-picker" onClick={() => navigate("map")}>
        <span className="community-picker-icon">{isAuthority ? <ShieldCheck size={18} /> : <Building2 size={18} />}</span>
        <span>
          <small>{isAuthority ? "JURISDICTION" : "YOUR COMMUNITY"}</small>
          <strong>{isAuthority ? "BBMP Bengaluru" : "Bengaluru"}</strong>
        </span>
        <ChevronDown size={14} />
      </button>

      {isAuthority ? (
        <div className="sidebar-nav-group">
          <span className="nav-group-label">MUNICIPAL DESK</span>
          <nav aria-label="Authority navigation">
            <button className={`nav-item ${view === "authority" ? "active" : ""}`} onClick={() => navigate("authority")}>
              <ShieldCheck size={18} strokeWidth={1.7} />
              <span>Issue queue</span>
              {overdueCount > 0 && <b className="nav-count overdue-count">{overdueCount}</b>}
              {view === "authority" && <span className="nav-active-dot" />}
            </button>
            <button className={`nav-item ${view === "map" ? "active" : ""}`} onClick={() => navigate("map")}>
              <Map size={18} strokeWidth={1.7} />
              <span>Issue map</span>
              {view === "map" && <span className="nav-active-dot" />}
            </button>
            <button className={`nav-item ${view === "activity" ? "active" : ""}`} onClick={() => navigate("activity")}>
              <Activity size={18} strokeWidth={1.7} />
              <span>Activity audit</span>
              {view === "activity" && <span className="nav-active-dot" />}
            </button>
          </nav>
        </div>
      ) : (
        <>
          <div className="sidebar-nav-group">
            <span className="nav-group-label">COMMUNITY</span>
            <nav aria-label="Community navigation">
              {[
                { id: "overview", label: "Overview", icon: LayoutDashboard },
                { id: "reports", label: "Report an issue", icon: Plus },
                { id: "map", label: "Community map", icon: Map },
                { id: "my-reports", label: "My reports", icon: ClipboardList }
              ].map((item) => <button key={item.id} className={`nav-item ${view === item.id ? "active" : ""}`} onClick={() => item.id === "reports" ? setReportOpen(true) : navigate(item.id as View)}><item.icon size={18} strokeWidth={1.7} /><span>{item.label}</span>{item.id === "my-reports" && <b className="nav-count">{mine.length}</b>}{view === item.id && <span className="nav-active-dot" />}</button>)}
            </nav>
          </div>
          <div className="sidebar-nav-group workspace-nav">
            <span className="nav-group-label">WORKSPACE</span>
            <nav aria-label="Workspace navigation">
              <button className={`nav-item ${view === "activity" ? "active" : ""}`} onClick={() => navigate("activity")}>
                <Activity size={18} strokeWidth={1.7} />
                <span>Activity & updates</span>
                {view === "activity" && <span className="nav-active-dot" />}
              </button>
            </nav>
          </div>
        </>
      )}

      <div className="sidebar-bottom">
        {isAuthority ? (
          <div className="authority-desk-card">
            <div className="authority-desk-top">
              <span className="authority-desk-icon"><ShieldCheck size={18} strokeWidth={1.7} /></span>
              <span className="authority-desk-pill">BBMP</span>
            </div>
            <h3>Operations Team</h3>
            <p>Ward Operations · Bengaluru</p>
            <div className="authority-desk-stats">
              <div><span>Open</span><strong>{counts.total - counts.resolved}</strong></div>
              <div><span>Overdue</span><strong className={overdueCount > 0 ? "text-danger" : ""}>{overdueCount}</strong></div>
            </div>
          </div>
        ) : (
          <div className="neighbor-card">
            <div className="neighbor-card-top"><span className="neighbor-icon"><Heart size={18} strokeWidth={1.7} /></span><span className="little-sparkle">✧</span></div>
            <h3>Better, together.</h3>
            <p>Good neighborhoods start with neighbors who care.</p>
            <div className="avatar-stack"><Avatar name="Priya Sharma" small color={1} /><Avatar name="Rahul Kumar" small color={2} /><Avatar name="Meera Iyer" small color={3} /><span>+{Math.max(0, counts.neighbors - 3)}</span></div>
            <button onClick={openInvite}>Invite a neighbor<ArrowUpRight size={15} /></button>
          </div>
        )}

        <div className="sidebar-support">
          <button className={`nav-item ${view === "help" ? "active" : ""}`} onClick={() => navigate("help")}>
            <CircleHelp size={18} strokeWidth={1.7} />
            <span>{isAuthority ? "Staff guidelines" : "Help & getting started"}</span>
          </button>
          <button className={`nav-item ${view === "settings" ? "active" : ""}`} onClick={() => navigate("settings")}>
            <Settings size={18} strokeWidth={1.7} />
            <span>{isAuthority ? "Staff settings" : "Settings"}</span>
          </button>
        </div>
        <button className="nav-item logout-button" onClick={() => void logout()}>
          <LogOut size={18} strokeWidth={1.7} />
          <span>Sign out</span>
        </button>
        <div className="sidebar-status">
          <span className="live-dot" />
          {isAuthority ? "Signed in as Authority staff" : "Signed in as citizen"}
        </div>
      </div>
    </aside>

    <div className="workspace">
      <header className="topbar">
        <div className="topbar-breadcrumb">
          <button className="icon-button sidebar-menu-button" onClick={() => setMobileNav(true)} aria-label="Open navigation"><Menu size={20} /></button>
          <span className="breadcrumb-home">{isAuthority ? <ShieldCheck size={16} /> : <LayoutDashboard size={16} />}</span>
          <span>{isAuthority ? "Authority Portal" : "Workspace"}</span>
          <ChevronRight size={13} />
          <strong>{viewNames[view]}</strong>
        </div>
        <div className="global-search-wrap">
          <form className={`global-search ${searchFocused ? "focused" : ""}`} onSubmit={searchAll}>
            <Search size={16} />
            <input ref={globalSearch} placeholder={isAuthority ? "Search issues by title, street or ID…" : "Search issues or locations…"} value={globalQuery} onChange={(event) => setGlobalQuery(event.target.value)} onFocus={() => setSearchFocused(true)} onBlur={() => setTimeout(() => setSearchFocused(false), 180)} aria-label="Search all issues and locations" />
            <kbd>/</kbd>
          </form>
          {searchFocused && globalQuery && (
            <div className="global-search-results">
              <span className="search-results-label">{isAuthority ? "MATCHING MUNICIPAL REPORTS" : "REPORTS IN YOUR COMMUNITY"}</span>
              {globalResults.length ? globalResults.map((report) => <button key={report.id} onMouseDown={(event) => event.preventDefault()} onClick={() => openReport(report.id)}><img src={report.imageUrl} alt="" /><span><strong>{report.title}</strong><small>{report.locality} · {reportNumber(report.id)}</small></span><ChevronRight size={14} /></button>) : <p>No matching reports. Try a street or neighborhood.</p>}
              <button className="search-all-link" onMouseDown={(event) => event.preventDefault()} onClick={() => { navigate(isAuthority ? "authority" : "reports"); setQuery(globalQuery); }}>{isAuthority ? "Search in issue queue" : "Search all reports"}<ArrowRight size={14} /></button>
            </div>
          )}
        </div>
        <div className="topbar-actions">
          <button className="topbar-location" onClick={() => navigate("map")}><MapPin size={14} /><span>{isAuthority ? "BBMP Central" : "Bengaluru"}</span><ChevronDown size={12} /></button>
          <span className="topbar-divider" />
          <div className="notifications-wrap">
            <button className={`icon-button notification-button ${notificationsOpen ? "active" : ""}`} onClick={() => setNotificationsOpen(!notificationsOpen)} aria-label="Open notifications" aria-expanded={notificationsOpen}>
              <Bell size={19} strokeWidth={1.7} />
              {preferences.notifications && latestUpdateId > readThrough && <span className="notification-dot" />}
            </button>
            {notificationsOpen && (
              <div className="notification-popover">
                <div className="popover-heading">
                  <strong>{isAuthority ? "Operations feed" : "Community updates"}</strong>
                  <button onClick={() => { setReadThrough(latestUpdateId); localStorage.setItem("civicfix-read-through", String(latestUpdateId)); }} disabled={latestUpdateId <= readThrough}>Mark all read</button>
                </div>
                {preferences.notifications ? updates.slice(0, 4).map((update) => <button className="notification-item" key={update.id} onClick={() => openReport(update.reportId)}><span className={`activity-icon ${update.status || "reported"}`}>{update.status === "resolved" ? <CheckCircle2 size={16} /> : <Clock3 size={16} />}</span><span><strong>{update.report.title}</strong><small>{update.status === "resolved" ? "This issue is now resolved" : update.status === "in_progress" ? "The team is working on it" : "Your report has been received"}</small><em>{timeAgo(update.createdAt)}</em></span>{update.id > readThrough && <i className="unread-dot" />}</button>) : <div className="notifications-paused"><Bell size={24} /><strong>Notifications are paused</strong><p>You can turn them back on in settings.</p><button className="text-button" onClick={() => navigate("settings")}>Open settings<ArrowRight size={14} /></button></div>}
                <button className="notification-view-all" onClick={() => navigate("activity")}>View all activity<ArrowRight size={14} /></button>
              </div>
            )}
          </div>
          <div className="profile-wrap">
            <button className={`profile-button ${profileOpen ? "active" : ""}`} onClick={() => setProfileOpen(!profileOpen)} aria-label="Open your profile" aria-expanded={profileOpen}>
              <Avatar name={preferences.name} />
              <span>
                <strong>{preferences.name}</strong>
                <small>{isAuthority ? "Authority staff" : "Community member"}</small>
              </span>
              <ChevronDown size={13} />
            </button>
            {profileOpen && (
              <div className="profile-popover">
                <div className="profile-popover-header">
                  <Avatar name={preferences.name} />
                  <div>
                    <strong>{preferences.name}</strong>
                    <small>{user.email}</small>
                    <span className="profile-role-inline">{isAuthority ? "Authority staff" : "Community member"}</span>
                  </div>
                </div>
                <div className="profile-popover-divider" />
                <button className="profile-popover-item" onClick={() => { setProfileOpen(false); navigate("settings"); }}>
                  <Settings size={15} />
                  <span>Profile & preferences</span>
                </button>
                <button className="profile-popover-item profile-popover-logout" onClick={() => { setProfileOpen(false); void logout(); }}>
                  <LogOut size={15} />
                  <span>Sign out</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="main-content view-enter" key={view}>
        <div className="page-heading">
          <div>
            <div className="page-title-line">
              <h1>{viewNames[view]}</h1>
              {isAuthority && <span className="demo-badge"><ShieldCheck size={12} />Authority access</span>}
            </div>
            <p>{viewDescriptions[view]}</p>
          </div>
          <div className="page-heading-actions">
            {isAuthority ? (
              <span className="authority-live-badge"><ShieldCheck size={14} />BBMP Operations Live</span>
            ) : (
              <>
                <span className="community-live"><span className="live-dot" />Your community, connected</span>
                <button className="button button-primary report-issue-button" onClick={() => setReportOpen(true)}><Plus size={17} />Report an issue</button>
              </>
            )}
          </div>
        </div>

        {view === "overview" && !isAuthority && (
          <>
            <section className="community-banner"><div className="banner-content"><span className="eyebrow">GOOD NEIGHBORS. GREAT NEIGHBORHOODS.</span><h2>See it. Report it. Get it fixed.</h2><p>A small report from you can make a big difference for everyone.</p><button className="text-button" onClick={() => navigate("help")}>How CivicFix works<ArrowUpRight size={14} /></button></div><img className="neighborhood-illustration" src="/images/neighborhood.svg" alt="A welcoming neighborhood with green spaces, homes, and a neighbor reporting an issue" /><span className="banner-community-tag"><span className="live-dot" />Made for neighbors, by neighbors</span></section>
            {stats}
            <div className="dashboard-columns">
              <section className="recent-reports-section">
                <div className="section-heading"><h2>Recent reports<span className="section-count">{reports.length}</span></h2><button className="text-button" onClick={() => navigate("reports")}>View all reports<ArrowUpRight size={14} /></button></div>
                <ReportTabs reports={reports} value={status} onChange={(value) => { setStatus(value); setVisibleCount(4); }} />
                {toolbar()}
                {reportResults()}
              </section>
              <aside className="right-rail">
                <section className="map-card"><div className="map-card-heading"><div><h2>Neighborhood map</h2><p>Around your community</p></div><button className="icon-button" onClick={() => navigate("map")} aria-label="Expand neighborhood map"><ArrowUpRight size={18} /></button></div><div className="mini-map"><CivicMap reports={reports} compact onSelect={openReport} /><span className="map-nearby-badge"><span className="live-dot" />{reports.length} community reports</span></div><div className="map-legend">{STATUSES.map((item) => <span key={item}><i className={item} />{STATUS_LABELS[item]}</span>)}</div><button className="map-explore-link" onClick={() => navigate("map")}>Explore community map<ArrowRight size={14} /></button></section>
                <section className="activity-card"><div className="section-heading"><h2>Latest activity</h2><button className="icon-button" onClick={() => navigate("activity")} aria-label="View all activity"><ArrowUpRight size={17} /></button></div><ActivityFeed reports={reports} following={preferences.following} onSelect={openReport} compact /><button className="activity-view-all" onClick={() => navigate("activity")}>View all updates<ArrowRight size={14} /></button></section>
                <div className="local-love-note"><span><Heart size={16} /></span><p>Thanks for looking out<br />for your neighborhood.</p><Sparkles size={18} /></div>
              </aside>
            </div>
          </>
        )}

        {(view === "reports" || view === "my-reports") && !isAuthority && (
          <section className="all-reports-page">
            {view === "my-reports" && <div className="my-reports-banner"><span><ClipboardList size={25} /></span><div><h2>{mine.length ? `${mine.length} reports. One better neighborhood.` : "Your neighborhood is waiting for your voice."}</h2><p>{mine.filter((report) => report.status === "resolved").length} resolved · {mine.filter((report) => report.status === "in_progress").length} in progress · Every report makes a difference.</p></div><Heart size={25} /></div>}
            <ReportTabs reports={baseReports} value={status} onChange={setStatus} />
            {toolbar()}
            {reportResults()}
          </section>
        )}

        {view === "authority" && isAuthority && (
          <>
            <section className="authority-banner"><span className="authority-banner-icon"><ShieldCheck size={29} strokeWidth={1.6} /></span><div><h2>From report to resolution.</h2><p>Review, prioritize, and keep your community in the loop.</p></div><span className="authority-demo-tag"><span className="live-dot" />Shared demo workspace</span></section>
            {stats}

            <section className="authority-roster-section">
              <div className="section-heading">
                <div>
                  <h2 className="roster-heading-title"><Radio size={16} className="dispatch-live-icon" />Ward Personnel & Proximity Dispatch</h2>
                  <p className="roster-subtitle">Local Ward Managers and Field Crew Leads are automatically alerted via SMS & Radio when issues occur nearby.</p>
                </div>
                <div className="roster-heading-actions">
                  <button className="button button-secondary roster-toggle-btn" onClick={() => setRosterOpen(!rosterOpen)}>
                    <Users size={14} />
                    {rosterOpen ? "Collapse ward roster" : "View ward personnel roster (7 zones)"}
                    <ChevronDown size={14} style={{ transform: rosterOpen ? "rotate(180deg)" : "none", transition: "transform .2s" }} />
                  </button>
                  <button className="button button-primary roster-register-btn" onClick={() => setEmployeeRegisterOpen(true)}>
                    <IdCard size={14} />
                    <span>Onboard employee (ID Card)</span>
                  </button>
                </div>
              </div>

              {rosterOpen && (
                <div className="ward-roster-grid">
                  {allWards.map((w) => {
                    const activeCount = reports.filter((r) => r.status !== "resolved" && w.coverageLocalities.some((loc) => r.locality.toLowerCase().includes(loc.toLowerCase()))).length;
                    return (
                      <div key={w.id} className="ward-roster-card">
                        <div className="ward-roster-photo-wrap">
                          <img src={w.photoUrl} alt={`${w.wardName} location`} className="ward-roster-photo" loading="lazy" />
                          <div className="ward-photo-overlay">
                            <span className="ward-photo-landmark"><MapPin size={11} />{w.landmark}</span>
                          </div>
                        </div>
                        <div className="ward-roster-head">
                          <div>
                            <strong>{w.wardNumber} · {w.wardName}</strong>
                            <span className="ward-zone-label">{w.zone}</span>
                          </div>
                          <span className={`ward-active-pill ${activeCount > 0 ? "has-issues" : ""}`}>
                            {activeCount} active {activeCount === 1 ? "issue" : "issues"}
                          </span>
                        </div>
                        <div className="ward-coverage-chips">
                          {w.coverageLocalities.map((loc) => <span key={loc}>{loc}</span>)}
                        </div>
                        <div className="ward-staff-list">
                          <div className="ward-staff-row">
                            <span className="staff-role-badge mgr">MANAGER</span>
                            <div className="ward-staff-details">
                              <strong>{w.manager.name}</strong>
                              <small>{w.manager.role}</small>
                              <div className="ward-staff-links">
                                <a href={`tel:${w.manager.phone}`}><Phone size={11} />{w.manager.phone}</a>
                                <a href={`mailto:${w.manager.email}`}><Mail size={11} />{w.manager.email}</a>
                              </div>
                            </div>
                          </div>
                          <div className="ward-staff-row">
                            <span className="staff-role-badge wrk">FIELD CREW</span>
                            <div className="ward-staff-details">
                              <strong>{w.worker.name}</strong>
                              <small>{w.worker.role} · {w.worker.unit}</small>
                              <div className="ward-staff-links">
                                <a href={`tel:${w.worker.phone}`}><Phone size={11} />{w.worker.phone}</a>
                                <span><Wrench size={11} />{w.worker.vehicleNumber}</span>
                              </div>
                              <span className="ward-worker-proximity">
                                <span className="live-dot" />Proximity: ~{w.worker.proximityKm} km from ward center
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            <section className="authority-reports">
              <div className="section-heading"><h2>Community issue queue<span className="section-count">{reports.length}</span></h2><span className="authority-updated"><span className="live-dot" />Auto-dispatch active</span></div>
              <ReportTabs reports={reports} value={status} onChange={setStatus} />
              {toolbar()}
              {filteredReports.length ? (
                <div className="authority-table-wrap">
                  <table className="authority-table">
                    <thead><tr><th>Issue</th><th>Location</th><th>Assigned Personnel & Dispatch</th><th>Priority</th><th>Status</th><th>Reported</th><th>Deadline</th><th /></tr></thead>
                    <tbody>
                      {filteredReports.map((report) => {
                        const ward = getWardPersonnel(report.locality);
                        return (
                          <tr key={report.id}>
                            <td><div className="table-issue"><img src={report.imageUrl} alt="" /><div><button onClick={() => openReport(report.id)}>{report.title}</button><span>{reportNumber(report.id)} · {report.category}</span></div></div></td>
                            <td><span className="table-locality"><MapPin size={12} />{report.locality}</span></td>
                            <td>
                              <div className="table-personnel">
                                <div className="table-personnel-worker">
                                  <HardHat size={12} />
                                  <strong>{ward.worker.name}</strong>
                                  <small>({ward.worker.proximityKm} km)</small>
                                </div>
                                <span className="table-personnel-mgr">Mgr: {ward.manager.name} · {ward.wardNumber}</span>
                                <span className="table-notified-tag"><span className="live-dot" />Auto-alert sent</span>
                              </div>
                            </td>
                            <td><span className={`priority-badge ${report.priority}`}><i />{report.priority}</span></td>
                            <td><StatusBadge status={report.status} /></td>
                            <td className="table-time">{timeAgo(report.createdAt)}</td>
                            <td><SlaBadge report={report} /></td>
                            <td><button className="table-manage-button" onClick={() => openReport(report.id)}>Manage<ArrowRight size={14} /></button></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <EmptyState action={<button className="button button-secondary" onClick={clearFilters}>Clear filters</button>} />
              )}
            </section>
          </>
        )}

        {view === "map" && (
          <section className="map-page">
            <div className="map-page-filters">
              <div className="map-status-filters"><button className={status === "all" ? "active" : ""} onClick={() => setStatus("all")}>All reports<span>{reports.length}</span></button>{STATUSES.map((item) => <button key={item} className={status === item ? "active" : ""} onClick={() => setStatus(item)}><i className={item} />{STATUS_LABELS[item]}</button>)}</div>
              <label className="category-select"><select value={neighborhood} onChange={(event) => setNeighborhood(event.target.value)} aria-label="Filter map by neighborhood"><option value="">All neighborhoods</option>{neighborhoods.map((item) => <option key={item}>{item}</option>)}</select><ChevronDown size={14} /></label>
            </div>
            <div className="map-page-grid">
              <div className="map-report-list">
                <div className="map-list-heading"><h2>{isAuthority ? "City reports queue" : "In your neighborhood"}<span className="section-count">{filteredReports.length}</span></h2><label className="report-search"><Search size={15} /><input placeholder="Find a report…" value={query} onChange={(event) => setQuery(event.target.value)} aria-label="Search map reports" /></label></div>
                <div className="map-list-scroll">{filteredReports.length ? filteredReports.map((report) => {
                  const ward = getWardPersonnel(report.locality);
                  return (
                    <button className="map-list-item" key={report.id} onClick={() => { setMapFocusId(report.id); openReport(report.id); }}>
                      <img src={report.imageUrl} alt="" />
                      <div>
                        <span className="map-list-report-id">{reportNumber(report.id)}</span>
                        <strong>{report.title}</strong>
                        <span className="location-line"><MapPin size={12} />{report.locality}</span>
                        {isAuthority && (
                          <span className="map-list-personnel">
                            <HardHat size={11} />
                            {ward.worker.name} (Notified · {ward.wardNumber})
                          </span>
                        )}
                        <StatusBadge status={report.status} />
                      </div>
                      <ChevronRight size={15} />
                    </button>
                  );
                }) : <EmptyState title="No nearby reports" description="Try another neighborhood or status." action={<button className="text-button" onClick={clearFilters}>Clear filters</button>} />}</div>
              </div>
              <div className="full-map-panel">
                <div className="full-map">
                  <CivicMap reports={filteredReports} onSelect={openReport} focusId={mapFocusId} />
                  <span className="full-map-city-label"><MapPin size={14} />{isAuthority ? "Bengaluru · Automated Proximity Dispatch Active" : "Bengaluru, Karnataka"}</span>
                  <div className="full-map-legend map-legend">{STATUSES.map((item) => <span key={item}><i className={item} />{STATUS_LABELS[item]}</span>)}</div>
                </div>
                <div className="full-map-footer"><LocateFixed size={14} /><span>Click a pin to see the report. Every pin has a story.</span><span>{filteredReports.length} reports on the map</span></div>
              </div>
            </div>
          </section>
        )}

        {view === "activity" && (
          <section className="activity-page-card">
            <div className="section-heading"><h2>{isAuthority ? "Municipal activity & audit trail" : "Your community, in motion"}</h2><span className="community-live"><span className="live-dot" />{isAuthority ? "Live audit stream" : "Latest community updates"}</span></div>
            <ActivityFeed reports={reports} following={preferences.following} onSelect={openReport} />
          </section>
        )}

        {view === "help" && <HelpPage onReport={() => setReportOpen(true)} onReports={() => navigate(isAuthority ? "authority" : "reports")} isAuthority={isAuthority} />}

        {view === "settings" && <SettingsPage preferences={preferences} onSave={savePreferences} user={user} onLogout={() => void logout()} />}

        <footer className="main-footer"><span><Heart size={12} />Made for better neighborhoods.</span><span>CivicFix © 2026<span className="footer-dot">·</span>Better, together.</span></footer>
      </main>
    </div>

    {filtersOpen && <button className="popover-dismiss" aria-label="Close report filters" onClick={() => setFiltersOpen(false)} />}
    {notificationsOpen && <button className="popover-dismiss notification-dismiss" aria-label="Close notifications" onClick={() => setNotificationsOpen(false)} />}
    {profileOpen && <button className="popover-dismiss profile-dismiss" aria-label="Close profile menu" onClick={() => setProfileOpen(false)} />}
    {reportOpen && !isAuthority && <ReportForm preferences={preferences} onClose={() => setReportOpen(false)} onCreated={(report) => { setReports((current) => [report, ...current]); setReportOpen(false); navigate("my-reports"); openReport(report.id); setToast({ message: "Report submitted. Your neighborhood thanks you!" }); }} />}
    {selectedReport && !reportOpen && !inviteOpen && <ReportDetail key={selectedReport.id} report={selectedReport} preferences={preferences} authority={isAuthority} onClose={closeReport} onAction={performAction} onViewMap={(id) => { closeReport(); setMapFocusId(id); navigate("map"); }} onToast={setToast} />}
    {selectedId && !selectedReport && <Modal onClose={closeReport} label="Report not found" className="small-modal"><EmptyState title="This report isn’t available" description="It may have moved. Explore your community’s latest reports instead." action={<button className="button button-primary" onClick={closeReport}>Back to the community</button>} /></Modal>}
    {inviteOpen && !isAuthority && <Modal onClose={closeInvite} label="Invite a neighbor" className="invite-modal"><span className="invite-icon"><Users size={30} strokeWidth={1.6} /></span><span className="eyebrow">BETTER, TOGETHER</span><h2>Good neighbors.<br />Great neighborhoods.</h2><p>Invite someone to help make your community a little better. Change starts with us.</p><label className="field-label">Your community invite link<div className="invite-link-box"><input value={typeof window !== "undefined" ? window.location.origin : ""} readOnly onFocus={(event) => event.target.select()} aria-label="Community invitation link" /><button onClick={() => void copyInvite()} aria-label="Copy invite link">{inviteCopied ? <Check size={17} /> : <Copy size={17} />}</button></div></label><button className="button button-primary invite-copy-button" onClick={() => void copyInvite()}>{inviteCopied ? <Check size={16} /> : <Copy size={16} />}{inviteCopied ? "Link copied!" : "Copy invite link"}</button><div className="invite-divider"><span />or<span /></div><a className="button button-secondary" href={`mailto:?subject=${encodeURIComponent("Let’s make our neighborhood better with CivicFix")}&body=${encodeURIComponent(`Hi neighbor! Join me on CivicFix to report local issues and help make our neighborhood a little better: ${typeof window !== "undefined" ? window.location.origin : ""}`)}`}><Mail size={16} />Invite by email<ArrowUpRight size={14} /></a><div className="invite-community-note"><div className="avatar-stack"><Avatar name="Priya Sharma" small color={1} /><Avatar name="Rahul Kumar" small color={2} /><Avatar name="Meera Iyer" small color={3} /></div><span>Join {counts.neighbors} neighbors making a difference.</span></div></Modal>}
    {employeeRegisterOpen && isAuthority && (
      <Modal label="Municipal Employee ID Registration" onClose={() => setEmployeeRegisterOpen(false)} className="employee-register-modal">
        <EmployeeIdScanner
          isInApp={true}
          onCancel={() => setEmployeeRegisterOpen(false)}
          onSuccess={(data) => {
            setEmployeeRegisterOpen(false);
            setToast({ message: `Employee ${data.user.name} registered and granted authority access!` });
          }}
        />
      </Modal>
    )}
    {toast && <Toast message={toast.message} error={toast.error} onClose={closeToast} />}
  </div>;
}
