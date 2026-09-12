"use client";
import { useState } from "react";
import Link from "next/link";
import { Mic, Video } from "lucide-react";
import { Badge, Chip, Empty, Input, PageHeader } from "@/components/ui";
import { useAttempts } from "@/lib/api/hooks";
import { CONTENT_TYPE_LABELS, type ContentType } from "@/lib/content/types";
import { formatDateTime, formatMinutes } from "@/lib/utils/format";

export default function RecordingsPage() {
  const { data: attempts } = useAttempts();
  const [type, setType] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [onlyRecorded, setOnlyRecorded] = useState(false);
  const types = new Map<string, number>();
  for (const a of attempts ?? []) types.set(a.contentType, (types.get(a.contentType) ?? 0) + 1);
  const list = (attempts ?? []).filter((a) => (!type || a.contentType === type) && (!onlyRecorded || a.recordingId) && (!q || a.contentTitle.toLowerCase().includes(q.toLowerCase())));
  return (
    <div>
      <PageHeader eyebrow="Review" title="Recordings" description="Your practice history. Open one to listen and re-read your review." />
      <div className="mb-4 space-y-2">
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by title…" />
        <div className="flex flex-wrap gap-1.5">
          <Chip active={!type} onClick={() => setType(null)}>All</Chip>
          {Array.from(types.entries()).map(([t, n]) => <Chip key={t} active={type === t} onClick={() => setType(type === t ? null : t)}>{CONTENT_TYPE_LABELS[t as ContentType] ?? t} <span className="text-fg-faint tabular-nums">{n}</span></Chip>)}
          <Chip active={onlyRecorded} onClick={() => setOnlyRecorded((v) => !v)}>with recording</Chip>
        </div>
      </div>
      {attempts && attempts.length === 0 ? <Empty title="No attempts yet" description="Your recordings and reviews will appear here." /> : (
        <div className="divide-y rounded-2xl border bg-elev">
          {list.map((a) => (
            <Link key={a.id} href={`/review/recordings/${a.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-hover">
              <span className="text-fg-faint">{a.recordingKind === "video" ? <Video className="h-4 w-4" /> : a.recordingKind === "audio" ? <Mic className="h-4 w-4" /> : <span className="block h-4 w-4" />}</span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{a.contentTitle}{a.pass > 1 && <span className="ml-1.5 text-xs text-success">pass {a.pass}</span>}{a.variant && <span className="ml-1.5 text-xs text-fg-faint">· {a.variant}</span>}</div>
                <div className="text-xs text-fg-muted">{CONTENT_TYPE_LABELS[a.contentType as ContentType] ?? a.contentType} · {a.category} · {formatMinutes(a.durationSeconds)} · {formatDateTime(a.completedAt)}</div>
              </div>
              {a.review?.overall != null ? <Badge tone={a.review.overall < 6 ? "warn" : "success"}>{a.review.overall}/10</Badge> : <Badge>unrated</Badge>}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
