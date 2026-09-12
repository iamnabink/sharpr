"use client";
import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Bookmark, Play } from "lucide-react";
import { AccentButton, Badge, Button, Card, PageHeader } from "@/components/ui";
import { ContentEditor } from "@/components/library/ContentEditor";
import { ContentMeta } from "@/components/library/ContentCard";
import { LearnPanel } from "@/components/practice/LearnPanel";
import { useAttempts, useContent } from "@/lib/api/hooks";
import { useToggleBookmark } from "@/components/library/ContentCard";
import { formatDateTime, formatMinutes, cn } from "@/lib/utils/format";

export default function ContentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const itemQ = useContent(id);
  const item = itemQ.data;
  const { data: attempts } = useAttempts({ contentId: id });
  const toggleBookmark = useToggleBookmark();
  const [edit, setEdit] = useState(false);
  if (itemQ.isLoading) return null;
  if (!item) return <p className="text-sm text-fg-muted">Not found.</p>;

  if (edit) return (
    <div>
      <PageHeader eyebrow="Library" title="Edit content" actions={<Button variant="ghost" onClick={() => setEdit(false)}>Back</Button>} />
      <ContentEditor initial={item} />
    </div>
  );

  return (
    <div className="space-y-5">
      <Link href="/library" className="inline-flex items-center gap-1 text-[13px] text-fg-muted hover:text-fg"><ArrowLeft className="h-3.5 w-3.5" /> Library</Link>
      <Card className="p-6">
        <ContentMeta item={item} />
        <h1 className="mt-3 text-2xl font-semibold tracking-tight">{item.title}</h1>
        <p className="mt-2 text-[15px] leading-relaxed">{item.prompt}</p>
        {item.position && <p className="mt-2 text-sm text-fg-muted">Position: {item.position}</p>}
        {item.role && <p className="mt-2 text-sm text-fg-muted">{item.role}. {item.situation}</p>}
        {item.guidingQuestions?.length ? <ul className="mt-3 space-y-1 text-sm text-fg-muted">{item.guidingQuestions.map((g, i) => <li key={i}>· {g}</li>)}</ul> : null}
        <div className="mt-3 flex flex-wrap gap-1">{item.tags.map((t) => <Badge key={t}>{t}</Badge>)}{item.status === "archived" && <Badge tone="warn">archived</Badge>}<Badge>{item.source}</Badge></div>
        <div className="mt-5 flex flex-wrap gap-2">
          <AccentButton size="md" href={`/practice/run?content=${item.id}`}><Play className="h-4 w-4" /> Practice</AccentButton>
          <Button onClick={() => setEdit(true)}>Edit</Button>
          <Button variant="ghost" onClick={() => toggleBookmark(item)} className={cn(item.bookmarked && "text-accent")}><Bookmark className={cn("h-4 w-4", item.bookmarked && "fill-current")} /> {item.bookmarked ? "Bookmarked" : "Bookmark"}</Button>
        </div>
      </Card>

      <LearnPanel item={item} collapsible />

      <Card className="p-5">
        <div className="text-[12px] font-semibold uppercase tracking-wider text-fg-muted">Attempts · {attempts?.length ?? 0}</div>
        {attempts?.length ? <div className="mt-2 divide-y">{attempts.map((a) => <Link key={a.id} href={`/review/recordings/${a.id}`} className="flex items-center justify-between py-2 text-sm hover:text-fg"><span>{formatDateTime(a.completedAt)} · pass {a.pass}{a.variant ? ` · ${a.variant}` : ""}</span><span className="text-fg-muted">{formatMinutes(a.durationSeconds)}{a.review?.overall != null ? ` · ${a.review.overall}/10` : ""}</span></Link>)}</div> : <p className="mt-1 text-sm text-fg-muted">Never practiced.</p>}
      </Card>
    </div>
  );
}
