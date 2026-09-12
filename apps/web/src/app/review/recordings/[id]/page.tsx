"use client";
import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Download, Trash2 } from "lucide-react";
import { AccentButton, Badge, Button, Card, useToast } from "@/components/ui";
import { ReviewForm } from "@/components/practice/ReviewForm";
import { LearnPanel } from "@/components/practice/LearnPanel";
import { api, recordingStreamUrl } from "@/lib/api/client";
import { useAttempt, useAttempts, useContent, useInvalidate } from "@/lib/api/hooks";
import { useQuery } from "@tanstack/react-query";
import { retryDueAt } from "@/lib/engine/retry";
import { RATING_LABELS, REVIEW_FLAG_LABELS, type RatingDimension, type ReviewFlag } from "@/lib/content/practice-types";
import { formatDateTime, formatMinutes } from "@/lib/utils/format";

export default function AttemptPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const invalidate = useInvalidate();
  const attemptQ = useAttempt(id);
  const attempt = attemptQ.data;
  const recording = useQuery({ queryKey: ["recording", attempt?.recordingId], queryFn: () => api.recordings.get(attempt!.recordingId!), enabled: !!attempt?.recordingId });
  const content = useContent(attempt?.contentId ?? null);
  const others = useAttempts({ contentId: attempt?.contentId ?? undefined });
  const [editing, setEditing] = useState(false);

  if (attemptQ.isLoading) return null;
  if (!attempt) return <p className="text-sm text-fg-muted">Attempt not found.</p>;
  const r = attempt.review;
  const rated = r ? (Object.entries(r.ratings) as [RatingDimension, number][]).filter(([, v]) => v) : [];
  const rec = recording.data;
  const url = attempt.recordingId ? recordingStreamUrl(attempt.recordingId) : null;

  return (
    <div className="space-y-5">
      <Link href="/review/recordings" className="inline-flex items-center gap-1 text-[13px] text-fg-muted hover:text-fg"><ArrowLeft className="h-3.5 w-3.5" /> Recordings</Link>
      <div>
        <div className="flex flex-wrap items-center gap-2 text-xs text-fg-muted">{formatDateTime(attempt.completedAt)} · {formatMinutes(attempt.durationSeconds)} · pass {attempt.pass}{attempt.variant && ` · ${attempt.variant}`}</div>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">{attempt.contentTitle}</h1>
        {content.data && <p className="mt-1 text-sm text-fg-muted">{content.data.prompt}</p>}
      </div>

      {url ? (
        <Card className="p-4">
          {attempt.recordingKind === "video" ? <video src={url} controls playsInline className="aspect-video w-full rounded-xl bg-black" /> : <audio src={url} controls className="w-full" />}
          <div className="mt-2 flex items-center justify-between text-xs text-fg-faint">
            <span>{rec ? `${(rec.sizeBytes / 1024 / 1024).toFixed(1)} MB · ${rec.mimeType}` : ""}</span>
            <a href={url} download className="inline-flex items-center gap-1 hover:text-fg"><Download className="h-3 w-3" /> Download</a>
          </div>
        </Card>
      ) : <Card className="p-4 text-sm text-fg-muted">No recording for this attempt (timer only).</Card>}

      <Card className="p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold tracking-tight">Self-review</h2>
          <div className="flex items-center gap-2">
            {r?.overall != null && <Badge tone={r.overall < 6 ? "warn" : "success"}>{r.overall}/10</Badge>}
            <Button size="sm" variant="ghost" onClick={() => setEditing((e) => !e)}>{editing ? "Cancel" : r ? "Edit" : "Add review"}</Button>
          </div>
        </div>
        {editing ? (
          <div className="mt-4"><ReviewForm contentType={attempt.contentType} initial={r ?? undefined} onSubmit={async (rev) => { await api.attempts.review(attempt.id, rev); invalidate(); setEditing(false); toast.push("Review saved", "success"); }} /></div>
        ) : r ? (
          <div className="mt-4 space-y-4 text-sm">
            {rated.length > 0 && <div className="grid grid-cols-2 gap-x-6 gap-y-1 sm:grid-cols-3">{rated.map(([k, v]) => <div key={k} className="flex justify-between"><span className="text-fg-muted">{RATING_LABELS[k]}</span><span className="tabular-nums">{v}</span></div>)}</div>}
            {r.flags.length > 0 && <div className="flex flex-wrap gap-1">{r.flags.map((f) => <Badge key={f} tone="warn">{REVIEW_FLAG_LABELS[f as ReviewFlag]}</Badge>)}</div>}
            {r.wentWell && <div><div className="text-xs font-medium text-fg-muted">Went well</div><p>{r.wentWell}</p></div>}
            {r.toImprove && <div><div className="text-xs font-medium text-fg-muted">To improve</div><p>{r.toImprove}</p></div>}
            {r.toResearch && <div><div className="text-xs font-medium text-fg-muted">To research</div><p>{r.toResearch}</p></div>}
            {r.wordsToLearn && <div><div className="text-xs font-medium text-fg-muted">Words to learn</div><p>{r.wordsToLearn}</p></div>}
          </div>
        ) : <p className="mt-2 text-sm text-fg-muted">Not reviewed.</p>}
      </Card>

      {others.data && others.data.length > 1 && (
        <Card className="p-4">
          <div className="text-[12px] font-semibold uppercase tracking-wider text-fg-muted">All attempts on this topic</div>
          <div className="mt-2 flex flex-wrap gap-2">
            {[...others.data].sort((a, b) => a.completedAt - b.completedAt).map((o) => <Link key={o.id} href={`/review/recordings/${o.id}`} className={`rounded-lg border px-2.5 py-1 text-xs ${o.id === attempt.id ? "border-fg" : "hover:bg-hover"}`}>{formatDateTime(o.completedAt)} · {o.review?.overall ?? "–"}</Link>)}
          </div>
        </Card>
      )}

      {content.data && <LearnPanel item={content.data} collapsible />}

      <div className="flex flex-wrap gap-2">
        {content.data && <AccentButton size="md" href={`/practice/run?content=${content.data.id}&pass=${attempt.pass + 1}${attempt.variant ? `&variant=${encodeURIComponent(attempt.variant)}` : ""}`}>Practice again now</AccentButton>}
        {attempt.contentId && <Button onClick={async () => { await api.retry.add({ contentId: attempt.contentId!, dueAt: retryDueAt("next_week"), attemptId: attempt.id, reason: r?.toImprove ?? undefined }); invalidate(); toast.push("Added to retry queue", "success"); }}>Retry next week</Button>}
        <Button variant="ghost" className="text-danger" onClick={async () => { if (confirm("Delete this attempt and its recording?")) { await api.attempts.remove(attempt.id); invalidate(); router.push("/review/recordings"); } }}><Trash2 className="h-4 w-4" /> Delete</Button>
      </div>
    </div>
  );
}
