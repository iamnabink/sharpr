"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Flame, Shuffle } from "lucide-react";
import { AccentButton, Badge, Button, Card, CardLink, Progress, SectionTitle, Stat } from "@/components/ui";
import { PromptCard } from "@/components/library/ContentCard";
import { useAttempts, useContentList, useDaily, useGoals, useRetryQueue, useStats } from "@/lib/api/hooks";
import type { ContentItem } from "@/lib/content/types";
import { formatMinutes, relativeDay, cn } from "@/lib/utils/format";

export default function TodayPage() {
  const challenge = useDaily("challenge", { type: ["speaking_topic", "debate", "scenario", "quick_speaking"] });
  const topic = useDaily("topic", { type: ["technical_topic"] });
  const interview = useDaily("interview", { type: ["interview_question"] });
  const story = useDaily("story", { type: ["storytelling_prompt"] });
  const knowledge = useDaily("knowledge", { type: ["knowledge_topic"] });
  const stats = useStats();
  const retry = useRetryQueue("pending");
  const goals = useGoals();
  const recent = useAttempts({ limit: 5 });
  const content = useContentList();
  const [nowTs] = useState(() => Date.now());
  const due = useMemo(() => (retry.data ?? []).filter((r) => r.dueAt <= nowTs), [retry.data, nowTs]);
  const dueContent = useMemo(() => {
    const top = due.slice(0, 4);
    return (content.data ?? []).filter((c) => top.some((r) => r.contentId === c.id));
  }, [content.data, due]);

  const s = stats.data?.stats;
  const today = new Date();

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-xs font-medium uppercase tracking-wider text-fg-faint">{today.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}</div>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">Today</h1>
        </div>
        <div className="flex gap-2">
          <AccentButton size="md" href="/practice/random">
            <Shuffle className="h-4 w-4" /> Start random session
          </AccentButton>
          <Button href="/sessions">Structured session</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Speaking today" value={formatMinutes(s?.todaySeconds ?? 0)} sub={`${formatMinutes(s?.weekSeconds ?? 0)} this week`} />
        <Stat
          label="Streak"
          value={
            <span className="inline-flex items-center gap-1.5">
              {s?.currentStreak ?? 0}
              {(s?.currentStreak ?? 0) >= 3 && <Flame className="h-5 w-5 text-accent" />}
            </span>
          }
          sub={`${s?.practiceDays ?? 0} practice days total`}
        />
        <Stat label="Waiting for review" value={due.length} sub={`${retry.data?.length ?? 0} in retry queue`} />
        <Stat label="Average rating" value={s?.avgRating ? s.avgRating.toFixed(1) : "–"} sub={`${s?.totalAttempts ?? 0} attempts`} />
      </div>

      {challenge.data?.item && (
        <PromptCard
          item={challenge.data.item}
          eyebrow="Today's challenge"
          action={
            <>
              <AccentButton size="md" href={`/practice/run?content=${challenge.data.item.id}`}>
                Speak now
              </AccentButton>
              <Button href="/practice/random">Something else</Button>
            </>
          }
        />
      )}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {topic.data?.item && <MiniPrompt eyebrow="Tech talk of the day" item={topic.data.item} />}
        {interview.data?.item && <MiniPrompt eyebrow="Interview question" item={interview.data.item} />}
        {story.data?.item && <MiniPrompt eyebrow="Storytelling prompt" item={story.data.item} />}
        {knowledge.data?.item && <MiniPrompt eyebrow="Knowledge topic" item={knowledge.data.item} />}
      </div>

      {dueContent.length > 0 && (
        <section>
          <SectionTitle action={<Link href="/review/retry" className="text-xs text-fg-muted hover:text-fg">All</Link>}>Topics waiting for review</SectionTitle>
          <div className="space-y-2">
            {dueContent.map((c) => {
              const r = due.find((x) => x.contentId === c.id);
              return (
                <CardLink key={c.id} href={`/practice/run?content=${c.id}`} className="flex items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{c.title}</div>
                    <div className="mt-0.5 truncate text-xs text-fg-muted">{r?.reason || c.category}</div>
                  </div>
                  <Badge tone="warn">{r ? relativeDay(r.dueAt) : ""}</Badge>
                  <ArrowRight className="h-4 w-4 text-fg-faint" />
                </CardLink>
              );
            })}
          </div>
        </section>
      )}

      {goals.data && goals.data.filter((g) => g.active).length > 0 && (
        <section>
          <SectionTitle action={<Link href="/progress" className="text-xs text-fg-muted hover:text-fg">Progress</Link>}>Goals</SectionTitle>
          <Card className="divide-y">
            {goals.data.filter((g) => g.active).map((g) => {
              const p = stats.data?.goals.find((x) => x.goalId === g.id) ?? { value: 0, target: g.target, pct: 0 };
              return (
                <div key={g.id} className="px-4 py-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{g.title}</span>
                    <span className={cn("tabular-nums text-fg-muted", p.pct >= 100 && "text-success")}>
                      {p.value} / {p.target}
                    </span>
                  </div>
                  <Progress value={p.pct} className="mt-2" tone={p.pct >= 100 ? "success" : "accent"} />
                </div>
              );
            })}
          </Card>
        </section>
      )}

      <section>
        <SectionTitle action={<Link href="/review/recordings" className="text-xs text-fg-muted hover:text-fg">History</Link>}>Recently practiced</SectionTitle>
        {recent.data && recent.data.length === 0 ? (
          <Card className="p-5 text-sm text-fg-muted">
            Nothing yet. {content.data?.length ?? "Your"} prompts are ready. Press <span className="font-medium text-fg">Start random session</span> and speak.
          </Card>
        ) : (
          <Card className="divide-y">
            {recent.data?.map((a) => (
              <Link key={a.id} href={`/review/recordings/${a.id}`} className="flex items-center gap-3 px-4 py-3 text-sm hover:bg-hover">
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{a.contentTitle}</div>
                  <div className="text-xs text-fg-muted">
                    {a.category} · {formatMinutes(a.durationSeconds)} · {relativeDay(a.completedAt)}
                  </div>
                </div>
                {a.review?.overall != null && <Badge tone={a.review.overall < 6 ? "warn" : "success"}>{a.review.overall}/10</Badge>}
              </Link>
            ))}
          </Card>
        )}
      </section>
    </div>
  );
}

function MiniPrompt({ eyebrow, item }: { eyebrow: string; item: ContentItem }) {
  return (
    <CardLink href={`/practice/run?content=${item.id}`} className="p-4">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-fg-faint">{eyebrow}</div>
      <div className="mt-1.5 line-clamp-2 text-[15px] font-medium leading-snug">{item.prompt}</div>
      <div className="mt-2 text-xs text-fg-muted">
        {item.category} · {formatMinutes(item.durationSeconds)}
      </div>
    </CardLink>
  );
}
