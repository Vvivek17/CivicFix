export const CATEGORIES = ["Roads & potholes", "Waste management", "Streetlights", "Water & drainage", "Parks & trees", "Public spaces"] as const;
export const STATUSES = ["reported", "in_progress", "resolved"] as const;
export const PRIORITIES = ["low", "medium", "high"] as const;
export type ReportStatus = (typeof STATUSES)[number];
export type Priority = (typeof PRIORITIES)[number];
export type View = "overview" | "reports" | "map" | "my-reports" | "authority" | "activity" | "help" | "settings";

export interface ReportUpdate {
  id: number;
  reportId: number;
  message: string;
  authorName: string;
  status: string | null;
  createdAt: string;
}

export interface CivicReport {
  id: number;
  title: string;
  description: string;
  category: string;
  status: ReportStatus;
  priority: Priority;
  address: string;
  locality: string;
  latitude: number;
  longitude: number;
  imageUrl: string;
  reporterName: string;
  reporterEmail: string;
  isMine: boolean;
  upvotes: number;
  dueAt: string | null;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
  updates: ReportUpdate[];
}

export interface Preferences {
  name: string;
  email: string;
  neighborhood: string;
  notifications: boolean;
  following: number[];
  voted: number[];
}

export const STATUS_LABELS: Record<ReportStatus, string> = {
  reported: "Reported",
  in_progress: "In progress",
  resolved: "Resolved",
};

export const CATEGORY_IMAGES: Record<string, string> = {
  "Roads & potholes": "/images/road.jpg",
  "Waste management": "/images/waste.jpg",
  "Streetlights": "/images/streetlight.jpg",
  "Water & drainage": "/images/water.jpg",
  "Parks & trees": "/images/park.jpg",
  "Public spaces": "/images/public-space.jpg",
};

export function reportNumber(id: number) { return `CF-${String(id).padStart(4, "0")}`; }
export function timeAgo(date: string) {
  const hours = Math.max(0, Math.floor((Date.now() - new Date(date).getTime()) / 3600000));
  if (hours < 1) return "Just now";
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

/** Resolution deadline (service level) per priority, in hours. */
export const SLA_HOURS: Record<Priority, number> = { high: 48, medium: 120, low: 240 };
export const SLA_LABELS: Record<Priority, string> = { high: "48 hours", medium: "5 days", low: "10 days" };

export type SlaState = "on_track" | "due_soon" | "overdue" | "met" | "missed";

export function slaInfo(report: Pick<CivicReport, "status" | "createdAt" | "dueAt" | "resolvedAt">, now = Date.now()) {
  const due = report.dueAt ? new Date(report.dueAt).getTime() : null;
  const start = new Date(report.createdAt).getTime();
  if (!due) return { state: "on_track" as SlaState, label: "No deadline", progress: 0, remainingMs: 0 };
  const total = Math.max(1, due - start);
  if (report.status === "resolved") {
    const done = report.resolvedAt ? new Date(report.resolvedAt).getTime() : now;
    const met = done <= due;
    return { state: (met ? "met" : "missed") as SlaState, label: met ? "Resolved on time" : `Resolved ${formatDuration(done - due)} late`, progress: 1, remainingMs: due - done };
  }
  const remainingMs = due - now;
  const progress = Math.min(1, Math.max(0, (now - start) / total));
  if (remainingMs <= 0) return { state: "overdue" as SlaState, label: `Overdue by ${formatDuration(-remainingMs)}`, progress: 1, remainingMs };
  return { state: (remainingMs < 24 * 3600000 ? "due_soon" : "on_track") as SlaState, label: `${formatDuration(remainingMs)} left`, progress, remainingMs };
}

export function formatDuration(ms: number) {
  const minutes = Math.max(1, Math.floor(Math.abs(ms) / 60000));
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 48) return `${hours}h ${minutes % 60}m`;
  return `${Math.floor(hours / 24)}d ${hours % 24}h`;
}
