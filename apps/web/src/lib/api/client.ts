/**
 * Typed HTTP client for the Sharpr API. All JSON is camelCase and matches the types in lib/content/*.
 */
import type { Book, Collection, ContentItem, LearningResource, VocabularyItem } from "@/lib/content/types";
import type { Attempt, Goal, Note, RetryItem, Review, SessionRun, SessionTemplate } from "@/lib/content/practice-types";

export const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "").replace(/\/$/, "");
const BASE = `${API_URL}/api/v1`;

export class ApiError extends Error {
  constructor(public status: number, message: string, public detail?: unknown) {
    super(message);
  }
}

type Query = Record<string, string | number | boolean | string[] | undefined | null>;

function qs(q?: Query): string {
  if (!q) return "";
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(q)) {
    if (v === undefined || v === null || v === "" || v === false) continue;
    if (Array.isArray(v)) v.forEach((x) => p.append(k, String(x)));
    else p.set(k, String(v));
  }
  const s = p.toString();
  return s ? `?${s}` : "";
}

export const onUnauthorized: { handler: (() => void) | null } = { handler: null };

async function request<T>(method: string, path: string, body?: unknown, opts: { raw?: boolean } = {}): Promise<T> {
  const init: RequestInit = { method, credentials: "include", headers: {} };
  if (body instanceof FormData) init.body = body;
  else if (body !== undefined) {
    init.body = JSON.stringify(body);
    (init.headers as Record<string, string>)["Content-Type"] = "application/json";
  }
  const res = await fetch(`${BASE}${path}`, init);
  if (res.status === 401) onUnauthorized.handler?.();
  if (!res.ok) {
    let detail: unknown;
    let message = res.statusText;
    try {
      detail = await res.json();
      const d = (detail as { detail?: unknown }).detail;
      if (typeof d === "string") message = d;
      else if (d && typeof d === "object" && "errors" in (d as object)) message = ((d as { errors: string[] }).errors ?? []).join("\n");
      else if (Array.isArray(d)) message = d.map((x: { loc?: unknown[]; msg?: string }) => `${(x.loc ?? []).join(".")}: ${x.msg}`).join("\n");
    } catch {}
    throw new ApiError(res.status, message, detail);
  }
  if (res.status === 204 || opts.raw) return undefined as T;
  return (await res.json()) as T;
}

const get = <T>(path: string, q?: Query) => request<T>("GET", `${path}${qs(q)}`);
const post = <T>(path: string, body?: unknown, q?: Query) => request<T>("POST", `${path}${qs(q)}`, body);
const patch = <T>(path: string, body?: unknown) => request<T>("PATCH", path, body);
const put = <T>(path: string, body?: unknown) => request<T>("PUT", path, body);
const del = (path: string) => request<void>("DELETE", path);

/* ---------- types only used by the API ---------- */
export interface User { id: string; email: string; name: string; role: "user" | "admin"; createdAt: number }
export interface Pick { item: ContentItem; weight: number; reasons: string[] }
export interface HistoryEntry { last: number; count: number; rating?: number | null }
export interface RecordingInfo { id: string; attemptId: string; kind: "audio" | "video"; mimeType: string; sizeBytes: number; durationSeconds: number; createdAt: number; url: string }
export interface ImportSummary { content: number; resources: number; vocabulary: number; collections: number; books: number; skipped_duplicates: number; errors: string[] }
export interface StatsResponse {
  stats: {
    totalAttempts: number; totalSeconds: number; practiceDays: number; currentStreak: number; longestStreak: number; topicsCompleted: number;
    topicsRetried: number; avgRating: number | null; recordingsCreated: number;
    byCategory: { category: string; attempts: number; seconds: number; avgRating: number | null }[];
    strongest: { category: string; attempts: number; avgRating: number | null }[];
    weakest: { category: string; attempts: number; avgRating: number | null }[];
    mostPracticed: { category: string; attempts: number; avgRating: number | null }[];
    byType: Record<string, number>;
    daily: { key: string; seconds: number; attempts: number }[];
    ratingTrend: { at: number; overall: number }[];
    todaySeconds: number; weekSeconds: number;
  };
  goals: { goalId: string; value: number; target: number; pct: number }[];
  pagesRead: number;
  books: number;
}

export interface RandomParams {
  type?: string[]; category?: string; tag?: string[]; difficulty?: string[]; minDuration?: number; maxDuration?: number; track?: string;
  onlyBookmarked?: boolean; onlyNeverPracticed?: boolean; onlyLowRated?: boolean; onlyRetryQueue?: boolean; collectionId?: string; bookId?: string;
  exclude?: string[];
}

export const recordingStreamUrl = (id: string) => `${BASE}/recordings/${id}/stream`;

export const api = {
  auth: {
    config: () => get<{ allowRegistration: boolean; hasUsers: boolean }>("/auth/config"),
    me: () => get<User>("/auth/me"),
    login: (email: string, password: string) => post<{ accessToken: string; user: User }>("/auth/login", { email, password }),
    register: (email: string, password: string, name: string) => post<{ accessToken: string; user: User }>("/auth/register", { email, password, name }),
    logout: () => post<{ ok: boolean }>("/auth/logout"),
  },
  content: {
    list: (q?: { type?: string[]; status?: string; category?: string; track?: string; tag?: string; difficulty?: string; bookmarked?: boolean; bookId?: string; q?: string }) =>
      get<ContentItem[]>("/content", q),
    get: (id: string) => get<ContentItem>(`/content/${id}`),
    create: (body: Partial<ContentItem>) => post<ContentItem>("/content", body),
    update: (id: string, body: Partial<ContentItem>) => patch<ContentItem>(`/content/${id}`, body),
    remove: (id: string) => del(`/content/${id}`),
    duplicate: (id: string) => post<ContentItem>(`/content/${id}/duplicate`),
    bulk: (ids: string[], action: "archive" | "unarchive" | "delete" | "duplicate" | "bookmark" | "unbookmark") => post<{ affected: number }>("/content/bulk", { ids, action }),
  },
  resources: {
    list: (topicId?: string) => get<LearningResource[]>("/resources", { topicId }),
    create: (body: Partial<LearningResource>) => post<LearningResource>("/resources", body),
    update: (id: string, body: Partial<LearningResource>) => patch<LearningResource>(`/resources/${id}`, body),
    remove: (id: string) => del(`/resources/${id}`),
  },
  collections: {
    list: () => get<Collection[]>("/collections"),
    create: (body: Partial<Collection>) => post<Collection>("/collections", body),
    update: (id: string, body: Partial<Collection> & { addContentIds?: string[]; removeContentIds?: string[] }) => patch<Collection>(`/collections/${id}`, body),
    remove: (id: string) => del(`/collections/${id}`),
  },
  vocabulary: {
    list: () => get<VocabularyItem[]>("/vocabulary"),
    create: (body: Partial<VocabularyItem>) => post<VocabularyItem>("/vocabulary", body),
    update: (id: string, body: Partial<VocabularyItem>) => patch<VocabularyItem>(`/vocabulary/${id}`, body),
    remove: (id: string) => del(`/vocabulary/${id}`),
  },
  books: {
    list: () => get<Book[]>("/books"),
    get: (id: string) => get<Book>(`/books/${id}`),
    create: (body: Partial<Book>) => post<Book>("/books", body),
    update: (id: string, body: Partial<Book>) => patch<Book>(`/books/${id}`, body),
    remove: (id: string) => del(`/books/${id}`),
  },
  notes: {
    list: () => get<Note[]>("/notes"),
    create: (body: Partial<Note>) => post<Note>("/notes", body),
    update: (id: string, body: Partial<Note>) => patch<Note>(`/notes/${id}`, body),
    remove: (id: string) => del(`/notes/${id}`),
  },
  goals: {
    list: () => get<Goal[]>("/goals"),
    create: (body: Partial<Goal>) => post<Goal>("/goals", body),
    update: (id: string, body: Partial<Goal>) => patch<Goal>(`/goals/${id}`, body),
    remove: (id: string) => del(`/goals/${id}`),
  },
  settings: {
    all: () => get<Record<string, unknown>>("/settings"),
    set: (key: string, value: unknown) => put<Record<string, unknown>>(`/settings/${key}`, { value }),
  },
  attempts: {
    list: (q?: { contentId?: string; sessionRunId?: string; limit?: number }) => get<Attempt[]>("/attempts", q),
    history: () => get<Record<string, HistoryEntry>>("/attempts/history"),
    get: (id: string) => get<Attempt>(`/attempts/${id}`),
    create: (body: { contentId: string; variant?: string; pass: number; recordingKind: string; durationSeconds: number; startedAt: number; vocabularyIds?: string[]; sessionRunId?: string }) =>
      post<Attempt>("/attempts", { ...body, durationSeconds: Math.round(body.durationSeconds), startedAt: Math.round(body.startedAt) }),
    review: (id: string, review: Review) => patch<Attempt>(`/attempts/${id}`, { review }),
    remove: (id: string) => del(`/attempts/${id}`),
    uploadRecording: (id: string, blob: Blob, durationSeconds: number) => {
      const fd = new FormData();
      const ext = blob.type.includes("mp4") ? "mp4" : "webm";
      fd.append("file", blob, `recording.${ext}`);
      return post<RecordingInfo>(`/attempts/${id}/recording`, fd, { durationSeconds: Math.round(durationSeconds) });
    },
  },
  recordings: {
    get: (id: string) => get<RecordingInfo>(`/recordings/${id}`),
    usage: () => get<{ count: number; bytes: number }>("/recordings"),
    remove: (id: string) => del(`/recordings/${id}`),
    removeAll: () => del("/recordings"),
  },
  retry: {
    list: (status: "pending" | "all" = "pending") => get<RetryItem[]>("/retry", { status }),
    add: (body: { contentId: string; dueAt: number; attemptId?: string; reason?: string }) => post<RetryItem>("/retry", body),
    update: (id: string, body: Partial<RetryItem>) => patch<RetryItem>(`/retry/${id}`, body),
    remove: (id: string) => del(`/retry/${id}`),
  },
  sessions: {
    templates: () => get<SessionTemplate[]>("/session-templates"),
    createTemplate: (body: Partial<SessionTemplate>) => post<SessionTemplate>("/session-templates", body),
    updateTemplate: (id: string, body: Partial<SessionTemplate>) => patch<SessionTemplate>(`/session-templates/${id}`, body),
    duplicateTemplate: (id: string) => post<SessionTemplate>(`/session-templates/${id}/duplicate`),
    removeTemplate: (id: string) => del(`/session-templates/${id}`),
    runs: (limit = 20) => get<SessionRun[]>("/session-runs", { limit }),
    run: (id: string) => get<SessionRun>(`/session-runs/${id}`),
    startRun: (body: { templateId?: string; templateName?: string; contentIds?: string[] }) => post<SessionRun>("/session-runs", body),
    updateRun: (id: string, body: { currentStep?: number; appendAttemptId?: string; completedAt?: number; reflection?: string }) => patch<SessionRun>(`/session-runs/${id}`, body),
  },
  engine: {
    random: (p?: RandomParams) => get<{ pick: Pick | null; candidates: number }>("/random", p as Query),
    many: (n: number, p?: RandomParams) => get<Pick[]>("/random/many", { n, ...(p as Query) }),
    daily: (slot: string, p?: RandomParams) => get<{ item: ContentItem | null }>("/daily", { slot, date: localDate(), ...(p as Query) }),
    stats: () => get<StatsResponse>("/stats", { tzOffset: new Date().getTimezoneOffset() }),
  },
  importing: {
    validate: (body: unknown) => post<{ ok: boolean; counts: Record<string, number> }>("/import/validate", body),
    importJson: (body: unknown, skipDuplicates: boolean, source: string) => post<ImportSummary>("/import", body, { skip_duplicates: skipDuplicates, source }),
    importFile: (file: File, skipDuplicates: boolean) => {
      const fd = new FormData();
      fd.append("file", file);
      return post<ImportSummary>("/import/file", fd, { skip_duplicates: skipDuplicates });
    },
    reseed: () => post<ImportSummary>("/seed"),
    exportJson: (ids?: string[]) => get<unknown>("/export", { ids: ids?.join(",") }),
    exportBackup: () => get<unknown>("/export/backup"),
  },
};

export function localDate(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
