"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Play, Shuffle, X } from "lucide-react";
import { AccentButton, Badge, Button, Card, Empty, Input, PageHeader } from "@/components/ui";
import { api } from "@/lib/api/client";
import { useContentList, useInvalidate, useRetryQueue } from "@/lib/api/hooks";
import type { RetryItem } from "@/lib/content/practice-types";
import type { ContentItem } from "@/lib/content/types";
import { relativeDay } from "@/lib/utils/format";

export default function RetryPage() {
  const router = useRouter();
  const invalidate = useInvalidate();
  const retry = useRetryQueue("pending");
  const content = useContentList();
  const [editing, setEditing] = useState<string | null>(null);
  const [nowTs] = useState(() => Date.now());
  const byId = new Map((content.data ?? []).map((c) => [c.id, c]));
  const rows = (retry.data ?? []).map((r) => ({ r, c: byId.get(r.contentId) })).filter((x): x is { r: RetryItem; c: ContentItem } => !!x.c);
  const due = rows.filter((x) => x.r.dueAt <= nowTs);
  const later = rows.filter((x) => x.r.dueAt > nowTs);

  const randomDue = async () => {
    const res = await api.engine.random({ onlyRetryQueue: true });
    if (res.pick) router.push(`/practice/run?content=${res.pick.item.id}`);
  };

  const Row = ({ r, c }: { r: RetryItem; c: ContentItem }) => (
    <div className="flex items-center gap-3 px-4 py-3">
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium">{c.title}</div>
        <div className="truncate text-xs text-fg-muted">{r.reason || c.category}</div>
      </div>
      {editing === r.id ? (
        <Input type="date" className="w-40" defaultValue={new Date(r.dueAt).toISOString().slice(0, 10)} onChange={async (e) => { const t = new Date(e.target.value).getTime(); if (t) { await api.retry.update(r.id, { dueAt: t }); invalidate(); setEditing(null); } }} />
      ) : (
        <button type="button" onClick={() => setEditing(r.id)} title="Change date"><Badge tone={r.dueAt <= nowTs ? "warn" : "neutral"}>{relativeDay(r.dueAt)}</Badge></button>
      )}
      <Button size="sm" href={`/practice/run?content=${c.id}`}><Play className="h-3.5 w-3.5" /></Button>
      <Button size="sm" variant="ghost" title="Dismiss" onClick={async () => { await api.retry.update(r.id, { status: "dismissed" }); invalidate(); }}><X className="h-3.5 w-3.5" /></Button>
    </div>
  );

  return (
    <div>
      <PageHeader eyebrow="Review" title="Retry queue" description="Deterministic resurfacing. Items also weigh more in random picks once due." actions={<AccentButton size="md" onClick={randomDue} disabled={!due.length}><Shuffle className="h-4 w-4" /> Random due item</AccentButton>} />
      {retry.data && retry.data.length === 0 && <Empty title="Queue is empty" description="After a weak attempt, choose “Practice again later”. Items rated under 6 are recommended automatically." />}
      {due.length > 0 && <section className="mb-6"><h2 className="mb-2 text-[13px] font-semibold uppercase tracking-wider text-fg-muted">Due now · {due.length}</h2><Card className="divide-y">{due.map((x) => <Row key={x.r.id} {...x} />)}</Card></section>}
      {later.length > 0 && <section><h2 className="mb-2 text-[13px] font-semibold uppercase tracking-wider text-fg-muted">Scheduled · {later.length}</h2><Card className="divide-y">{later.map((x) => <Row key={x.r.id} {...x} />)}</Card></section>}
    </div>
  );
}
