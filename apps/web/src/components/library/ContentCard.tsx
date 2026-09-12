"use client";
import Link from "next/link";
import { Bookmark, Clock, Play } from "lucide-react";
import { Badge, difficultyTone } from "@/components/ui";
import { CONTENT_TYPE_LABELS, type ContentItem } from "@/lib/content/types";
import { cn, formatMinutes } from "@/lib/utils/format";
import { api } from "@/lib/api/client";
import { useInvalidatingMutation } from "@/lib/api/hooks";

export function ContentMeta({ item, showType = true, className }: { item: ContentItem; showType?: boolean; className?: string }) {
  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", className)}>
      {showType && <Badge tone="accent">{CONTENT_TYPE_LABELS[item.type]}</Badge>}
      <Badge>{item.category}{item.subcategory ? ` · ${item.subcategory}` : ""}</Badge>
      <Badge tone={difficultyTone(item.difficulty)}>{item.difficulty}</Badge>
      <span className="inline-flex items-center gap-1 text-[11px] text-fg-faint">
        <Clock className="h-3 w-3" />
        {formatMinutes(item.durationSeconds)}
      </span>
    </div>
  );
}

export function useToggleBookmark() {
  return useInvalidatingMutation((item: ContentItem) => api.content.update(item.id, { bookmarked: item.bookmarked ? 0 : 1 }));
}

export function ContentRow({ item, href, lastPracticed, rating, compact }: { item: ContentItem; href?: string; lastPracticed?: number; rating?: number | null; compact?: boolean }) {
  const detail = href ?? `/library/${item.id}`;
  const toggle = useToggleBookmark();
  return (
    <div className={cn("group flex items-start gap-3 rounded-xl border bg-elev px-3 py-3 transition-colors hover:bg-hover", compact && "py-2.5")}>
      <div className="min-w-0 flex-1">
        <Link href={detail} className="block">
          <div className="truncate text-[14px] font-medium leading-5">{item.title}</div>
          {!compact && <div className="mt-0.5 line-clamp-2 text-[13px] text-fg-muted">{item.prompt}</div>}
        </Link>
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          <ContentMeta item={item} showType={false} />
          {rating !== undefined && rating !== null && <Badge tone={rating < 6 ? "warn" : "success"}>last {rating}/10</Badge>}
          {lastPracticed === undefined && <span className="text-[11px] text-fg-faint">never practiced</span>}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <button
          type="button"
          onClick={() => toggle(item)}
          className={cn("flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-muted", item.bookmarked ? "text-accent" : "text-fg-faint opacity-0 group-hover:opacity-100")}
          title="Bookmark"
        >
          <Bookmark className={cn("h-4 w-4", item.bookmarked && "fill-current")} />
        </button>
        <Link href={`/practice/run?content=${item.id}`} className="flex h-8 w-8 items-center justify-center rounded-lg text-fg-muted transition-colors hover:bg-fg hover:text-bg" title="Practice">
          <Play className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}

export function PromptCard({ item, eyebrow, action, className }: { item: ContentItem; eyebrow?: string; action?: React.ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-2xl border bg-elev p-5 shadow-card", className)}>
      {eyebrow && <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-fg-faint">{eyebrow}</div>}
      <div className="text-[17px] font-medium leading-snug tracking-tight">{item.prompt}</div>
      <div className="mt-3">
        <ContentMeta item={item} />
      </div>
      {action && <div className="mt-4 flex flex-wrap gap-2">{action}</div>}
    </div>
  );
}
