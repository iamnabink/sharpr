"use client";
import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Badge, Button, Card, Empty, Field, Input, Modal, PageHeader, Progress, Select, Stat, Tabs } from "@/components/ui";
import { api } from "@/lib/api/client";
import { useAttempts, useGoals, useInvalidate, useRecordingUsage, useRuns, useStats, useVocabulary } from "@/lib/api/hooks";
import { CONTENT_TYPE_LABELS, type ContentType } from "@/lib/content/types";
import { GOAL_METRICS, GOAL_METRIC_LABELS, type GoalMetric, type GoalPeriod } from "@/lib/content/practice-types";
import { cn, formatDateTime, formatMinutes } from "@/lib/utils/format";

export default function ProgressPage() {
  const [tab, setTab] = useState<"stats" | "goals" | "history">("stats");
  const stats = useStats();
  const goals = useGoals();
  const attempts = useAttempts();
  const runs = useRuns();
  const vocab = useVocabulary();
  const usage = useRecordingUsage();
  const invalidate = useInvalidate();
  const [adding, setAdding] = useState(false);
  const [gTitle, setGTitle] = useState("");
  const [gMetric, setGMetric] = useState<GoalMetric>("speaking_minutes");
  const [gTarget, setGTarget] = useState(20);
  const [gPeriod, setGPeriod] = useState<GoalPeriod>("day");

  if (!stats.data) return null;
  const s = stats.data.stats;
  const maxDaily = Math.max(60, ...s.daily.map((d) => d.seconds));
  const dayLabel = (key: string) => new Date(key + "T12:00:00").toLocaleDateString(undefined, { weekday: "narrow" });

  const addGoal = async () => {
    await api.goals.create({ title: gTitle.trim() || `${GOAL_METRIC_LABELS[gMetric]}: ${gTarget} per ${gPeriod}`, metric: gMetric, target: gTarget, period: gPeriod, active: 1 });
    invalidate();
    setAdding(false);
    setGTitle("");
  };

  return (
    <div>
      <PageHeader title="Progress" description="Honest numbers. No badges." />
      <Tabs className="mb-6" value={tab} onChange={setTab} items={[{ value: "stats", label: "Statistics" }, { value: "goals", label: "Goals", count: goals.data?.filter((g) => g.active).length }, { value: "history", label: "History" }]} />

      {tab === "stats" && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Practice days" value={s.practiceDays} sub={`streak ${s.currentStreak} · best ${s.longestStreak}`} />
            <Stat label="Speaking time" value={formatMinutes(s.totalSeconds)} sub={`${formatMinutes(s.weekSeconds)} this week`} />
            <Stat label="Attempts" value={s.totalAttempts} sub={`${s.recordingsCreated} recordings · ${((usage.data?.bytes ?? 0) / 1024 / 1024).toFixed(0)} MB`} />
            <Stat label="Average rating" value={s.avgRating ? s.avgRating.toFixed(1) : "–"} sub="self-rated, 1–10" />
            <Stat label="Topics completed" value={s.topicsCompleted} sub={`${s.topicsRetried} retried`} />
            <Stat label="Categories practiced" value={s.byCategory.length} />
            <Stat label="Books" value={stats.data.books} sub={`${stats.data.pagesRead} pages logged`} />
            <Stat label="Vocabulary" value={vocab.data?.length ?? 0} />
          </div>

          <Card className="p-5">
            <div className="mb-3 text-[12px] font-semibold uppercase tracking-wider text-fg-muted">Speaking minutes · last 14 days</div>
            <div className="flex h-32 items-end gap-1.5">
              {s.daily.map((d) => (
                <div key={d.key} className="group flex flex-1 flex-col items-center gap-1" title={`${d.key}: ${formatMinutes(d.seconds)}, ${d.attempts} attempts`}>
                  <div className="flex w-full flex-1 items-end"><div className={cn("w-full rounded-t-md transition-[height]", d.seconds ? "bg-fg" : "bg-muted")} style={{ height: `${Math.max(3, (d.seconds / maxDaily) * 100)}%` }} /></div>
                  <div className="text-[10px] text-fg-faint">{dayLabel(d.key)}</div>
                </div>
              ))}
            </div>
          </Card>

          {s.ratingTrend.length > 1 && (
            <Card className="p-5">
              <div className="mb-3 text-[12px] font-semibold uppercase tracking-wider text-fg-muted">Self-rating trend · last {s.ratingTrend.length} reviewed attempts</div>
              <svg viewBox={`0 0 ${Math.max(100, s.ratingTrend.length * 20)} 60`} className="h-24 w-full" preserveAspectRatio="none">
                <line x1="0" y1="30" x2="100%" y2="30" stroke="var(--border)" strokeDasharray="2 2" />
                <polyline fill="none" stroke="var(--accent)" strokeWidth="1.5" vectorEffect="non-scaling-stroke" points={s.ratingTrend.map((p, i) => `${i * 20 + 10},${60 - (p.overall / 10) * 56 - 2}`).join(" ")} />
                {s.ratingTrend.map((p, i) => <circle key={i} cx={i * 20 + 10} cy={60 - (p.overall / 10) * 56 - 2} r="2" fill="var(--accent)" />)}
              </svg>
              <div className="mt-1 flex justify-between text-[10px] text-fg-faint"><span>{formatDateTime(s.ratingTrend[0].at)}</span><span>10 = top · dashed = 5</span><span>{formatDateTime(s.ratingTrend[s.ratingTrend.length - 1].at)}</span></div>
            </Card>
          )}

          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <CatList title="Strongest" items={s.strongest} empty="Rate at least two attempts per category." />
            <CatList title="Weakest" items={s.weakest} empty="Rate at least two attempts per category." tone="warn" />
            <CatList title="Most practiced" items={s.mostPracticed} empty="No attempts yet." showCount />
          </div>

          {Object.keys(s.byType).length > 0 && (
            <Card className="p-5">
              <div className="mb-3 text-[12px] font-semibold uppercase tracking-wider text-fg-muted">By activity type</div>
              <div className="space-y-2">
                {Object.entries(s.byType).sort((a, b) => b[1] - a[1]).map(([t, n]) => (
                  <div key={t} className="flex items-center gap-3 text-sm"><span className="w-40 shrink-0 text-fg-muted">{CONTENT_TYPE_LABELS[t as ContentType] ?? t}</span><Progress value={(n / s.totalAttempts) * 100} tone="neutral" /><span className="w-8 text-right tabular-nums">{n}</span></div>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}

      {tab === "goals" && (
        <div className="space-y-4">
          <div className="flex justify-end"><Button onClick={() => setAdding(true)}><Plus className="h-4 w-4" /> New goal</Button></div>
          {!goals.data?.length ? <Empty title="No goals" /> : (
            <Card className="divide-y">
              {goals.data.map((g) => {
                const p = stats.data.goals.find((x) => x.goalId === g.id) ?? { value: 0, target: g.target, pct: 0 };
                return (
                  <div key={g.id} className={cn("px-4 py-3", !g.active && "opacity-50")}>
                    <div className="flex items-center gap-3">
                      <div className="min-w-0 flex-1"><div className="text-sm font-medium">{g.title}</div><div className="text-xs text-fg-muted">{GOAL_METRIC_LABELS[g.metric]} · per {g.period}</div></div>
                      <span className={cn("text-sm tabular-nums", p.pct >= 100 ? "text-success" : "text-fg-muted")}>{p.value} / {p.target}</span>
                      <Button size="sm" variant="ghost" onClick={async () => { await api.goals.update(g.id, { active: g.active ? 0 : 1 }); invalidate(); }}>{g.active ? "Pause" : "Resume"}</Button>
                      <Button size="sm" variant="ghost" onClick={async () => { await api.goals.remove(g.id); invalidate(); }}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                    <Progress value={p.pct} className="mt-2" tone={p.pct >= 100 ? "success" : "accent"} />
                  </div>
                );
              })}
            </Card>
          )}
          <Modal open={adding} onClose={() => setAdding(false)} title="New goal">
            <div className="space-y-3">
              <Field label="Title (optional)"><Input value={gTitle} onChange={(e) => setGTitle(e.target.value)} placeholder="Speak for 20 minutes every day" /></Field>
              <div className="grid grid-cols-3 gap-3">
                <Field label="Metric" className="col-span-3 sm:col-span-1"><Select value={gMetric} onChange={(e) => setGMetric(e.target.value as GoalMetric)}>{GOAL_METRICS.map((m) => <option key={m} value={m}>{GOAL_METRIC_LABELS[m]}</option>)}</Select></Field>
                <Field label="Target"><Input type="number" value={gTarget} onChange={(e) => setGTarget(Number(e.target.value))} /></Field>
                <Field label="Per"><Select value={gPeriod} onChange={(e) => setGPeriod(e.target.value as GoalPeriod)}><option value="day">day</option><option value="week">week</option></Select></Field>
              </div>
              <div className="flex justify-end gap-2"><Button variant="ghost" onClick={() => setAdding(false)}>Cancel</Button><Button variant="primary" onClick={addGoal}>Add goal</Button></div>
            </div>
          </Modal>
        </div>
      )}

      {tab === "history" && (
        <div className="space-y-4">
          {runs.data && runs.data.length > 0 && (
            <Card className="divide-y">
              {runs.data.map((r) => <div key={r.id} className="flex items-center gap-3 px-4 py-3 text-sm"><div className="min-w-0 flex-1"><div className="font-medium">{r.templateName}</div><div className="text-xs text-fg-muted">{formatDateTime(r.startedAt)} · {r.attemptIds.length} attempts{r.reflection ? ` · “${r.reflection.slice(0, 80)}${r.reflection.length > 80 ? "…" : ""}”` : ""}</div></div>{r.completedAt ? <Badge tone="success">done</Badge> : <Button size="sm" href={`/sessions/run?id=${r.id}`}>Continue</Button>}</div>)}
            </Card>
          )}
          <Card className="divide-y">
            {(attempts.data ?? []).slice(0, 100).map((a) => <div key={a.id} className="flex items-center gap-3 px-4 py-2.5 text-sm"><span className="w-28 shrink-0 text-xs text-fg-faint">{formatDateTime(a.completedAt)}</span><span className="min-w-0 flex-1 truncate">{a.contentTitle}</span><span className="text-xs text-fg-muted">{formatMinutes(a.durationSeconds)}</span>{a.review?.overall != null && <span className="w-10 text-right text-xs tabular-nums">{a.review.overall}</span>}</div>)}
            {attempts.data?.length === 0 && <div className="p-6 text-center text-sm text-fg-muted">No history yet.</div>}
          </Card>
        </div>
      )}
    </div>
  );
}

function CatList({ title, items, empty, tone, showCount }: { title: string; items: { category: string; attempts: number; avgRating?: number | null }[]; empty: string; tone?: "warn"; showCount?: boolean }) {
  return (
    <Card className="p-4">
      <div className="mb-2 text-[12px] font-semibold uppercase tracking-wider text-fg-muted">{title}</div>
      {items.length === 0 ? <p className="text-xs text-fg-faint">{empty}</p> : (
        <ul className="space-y-1.5 text-sm">{items.map((c) => <li key={c.category} className="flex items-center justify-between"><span className="truncate">{c.category}</span>{showCount ? <span className="text-xs text-fg-muted tabular-nums">{c.attempts}</span> : <Badge tone={tone ?? "success"}>{c.avgRating?.toFixed(1)}</Badge>}</li>)}</ul>
      )}
    </Card>
  );
}
