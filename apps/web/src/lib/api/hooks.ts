"use client";
import { useMutation, useQuery, useQueryClient, type UseQueryOptions } from "@tanstack/react-query";
import { api, type RandomParams } from "./client";
import type { ContentItem } from "@/lib/content/types";

/** Keys are coarse on purpose: after any mutation we invalidate everything. The data set is small. */
export const keys = {
  me: ["me"] as const,
  content: (q?: object) => ["content", q ?? {}] as const,
  contentOne: (id?: string | null) => ["content", "one", id] as const,
  resources: (topicId?: string) => ["resources", topicId ?? "all"] as const,
  collections: ["collections"] as const,
  vocabulary: ["vocabulary"] as const,
  books: ["books"] as const,
  book: (id: string) => ["books", id] as const,
  notes: ["notes"] as const,
  goals: ["goals"] as const,
  settings: ["settings"] as const,
  attempts: (q?: object) => ["attempts", q ?? {}] as const,
  attempt: (id: string) => ["attempts", "one", id] as const,
  history: ["attempts", "history"] as const,
  retry: (status: string) => ["retry", status] as const,
  templates: ["templates"] as const,
  runs: ["runs"] as const,
  run: (id: string) => ["runs", id] as const,
  stats: ["stats"] as const,
  daily: (slot: string) => ["daily", slot] as const,
  recordingUsage: ["recordings", "usage"] as const,
};

type Opts<T> = Omit<UseQueryOptions<T>, "queryKey" | "queryFn">;

export const useMe = () => useQuery({ queryKey: keys.me, queryFn: api.auth.me, retry: false, staleTime: 5 * 60_000 });

export const useContentList = (q?: Parameters<typeof api.content.list>[0], opts?: Opts<ContentItem[]>) =>
  useQuery({ queryKey: keys.content(q), queryFn: () => api.content.list(q), ...opts });
export const useContentByType = (type: string | string[]) => useContentList({ type: Array.isArray(type) ? type : [type] });
export const useContent = (id?: string | null) =>
  useQuery({ queryKey: keys.contentOne(id), queryFn: () => api.content.get(id!), enabled: !!id });
export const useResources = (topicId?: string) => useQuery({ queryKey: keys.resources(topicId), queryFn: () => api.resources.list(topicId) });
export const useResourcesFor = (content?: ContentItem | null) => useResources(content?.id);
export const useCollections = () => useQuery({ queryKey: keys.collections, queryFn: api.collections.list });
export const useVocabulary = () => useQuery({ queryKey: keys.vocabulary, queryFn: api.vocabulary.list });
export const useBooks = () => useQuery({ queryKey: keys.books, queryFn: api.books.list });
export const useBook = (id: string) => useQuery({ queryKey: keys.book(id), queryFn: () => api.books.get(id) });
export const useNotes = () => useQuery({ queryKey: keys.notes, queryFn: api.notes.list });
export const useGoals = () => useQuery({ queryKey: keys.goals, queryFn: api.goals.list });
export const useSettings = () => useQuery({ queryKey: keys.settings, queryFn: api.settings.all });
export const useAttempts = (q?: Parameters<typeof api.attempts.list>[0]) => useQuery({ queryKey: keys.attempts(q), queryFn: () => api.attempts.list(q) });
export const useAttempt = (id: string) => useQuery({ queryKey: keys.attempt(id), queryFn: () => api.attempts.get(id) });
export const useHistoryIndex = () => useQuery({ queryKey: keys.history, queryFn: api.attempts.history });
export const useRetryQueue = (status: "pending" | "all" = "pending") => useQuery({ queryKey: keys.retry(status), queryFn: () => api.retry.list(status) });
export const useTemplates = () => useQuery({ queryKey: keys.templates, queryFn: api.sessions.templates });
export const useRuns = () => useQuery({ queryKey: keys.runs, queryFn: () => api.sessions.runs() });
export const useRun = (id?: string | null) => useQuery({ queryKey: keys.run(id ?? ""), queryFn: () => api.sessions.run(id!), enabled: !!id });
export const useStats = () => useQuery({ queryKey: keys.stats, queryFn: api.engine.stats });
export const useDaily = (slot: string, p: RandomParams) => useQuery({ queryKey: keys.daily(slot), queryFn: () => api.engine.daily(slot, p), staleTime: 60 * 60_000 });
export const useRecordingUsage = () => useQuery({ queryKey: keys.recordingUsage, queryFn: api.recordings.usage });

/** Generic mutation that invalidates every query on success. */
export function useInvalidatingMutation<TArgs extends unknown[], TResult>(fn: (...args: TArgs) => Promise<TResult>) {
  const qc = useQueryClient();
  const m = useMutation({ mutationFn: (args: TArgs) => fn(...args), onSuccess: () => qc.invalidateQueries() });
  return Object.assign((...args: TArgs) => m.mutateAsync(args), { pending: m.isPending, error: m.error });
}

export function useInvalidate() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries();
}
