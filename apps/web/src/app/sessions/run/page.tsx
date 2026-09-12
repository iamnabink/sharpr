"use client";
import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Check } from "lucide-react";
import { AccentButton, Button, Card, Textarea } from "@/components/ui";
import { PracticeRunner } from "@/components/practice/PracticeRunner";
import { LearnPanel } from "@/components/practice/LearnPanel";
import { api } from "@/lib/api/client";
import { useContent, useInvalidate, useRun } from "@/lib/api/hooks";
import { cn } from "@/lib/utils/format";

function Runner() {
  const params = useSearchParams();
  const router = useRouter();
  const invalidate = useInvalidate();
  const id = params.get("id");
  const run = useRun(id);
  const [reflection, setReflection] = useState("");
  const r = run.data;
  const stepIndex = r?.currentStep ?? 0;
  const contentId = r?.stepContentIds[stepIndex] ?? null;
  const item = useContent(contentId);

  if (!id) return <p className="text-sm text-fg-muted">No session.</p>;
  if (run.isLoading) return <p className="text-sm text-fg-faint">Loading…</p>;
  if (!r) return <p className="text-sm text-fg-muted">Session not found.</p>;

  const steps = r.steps;
  const step = steps[stepIndex];
  const done = stepIndex >= steps.length;

  const advance = async (attemptId?: string) => {
    await api.sessions.updateRun(r.id, { currentStep: stepIndex + 1, appendAttemptId: attemptId });
    invalidate();
  };
  const finishSession = async () => {
    await api.sessions.updateRun(r.id, { completedAt: Date.now(), reflection });
    invalidate();
    router.push("/progress");
  };

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <Link href="/sessions" className="inline-flex items-center gap-1 text-[13px] text-fg-muted hover:text-fg"><ArrowLeft className="h-3.5 w-3.5" /> {r.templateName}</Link>
        <div className="flex items-center gap-1">{steps.map((s, i) => <span key={s.id} className={cn("h-1.5 w-6 rounded-full", i < stepIndex ? "bg-fg" : i === stepIndex ? "bg-accent" : "bg-muted")} />)}</div>
      </div>

      {done ? (
        <Card className="p-6 text-center">
          <Check className="mx-auto h-6 w-6 text-success" />
          <h1 className="mt-2 text-xl font-semibold tracking-tight">Session complete</h1>
          <p className="mt-1 text-sm text-fg-muted">{r.attemptIds.length} attempts recorded.</p>
          <AccentButton className="mt-5" onClick={finishSession}>Finish</AccentButton>
        </Card>
      ) : step.kind === "reflect" ? (
        <Card className="p-6">
          <div className="text-[12px] font-semibold uppercase tracking-wider text-fg-muted">Step {stepIndex + 1} of {steps.length}</div>
          <h1 className="mt-1 text-xl font-semibold tracking-tight">Reflection</h1>
          <p className="mt-1 text-sm text-fg-muted">What was hardest today? What pattern do you notice across attempts? What will you do differently tomorrow?</p>
          <Textarea className="mt-4 min-h-[140px]" value={reflection} onChange={(e) => setReflection(e.target.value)} />
          <div className="mt-4 flex justify-end"><AccentButton size="md" onClick={() => advance()}>Continue</AccentButton></div>
        </Card>
      ) : contentId && item.isLoading ? (
        <p className="text-sm text-fg-faint">Loading…</p>
      ) : step.kind === "learn" && item.data ? (
        <div className="space-y-4">
          <div className="text-[12px] font-semibold uppercase tracking-wider text-fg-muted">Step {stepIndex + 1} of {steps.length} · {step.label}</div>
          <Card className="p-5"><h1 className="text-xl font-semibold tracking-tight">{item.data.title}</h1><p className="mt-1 text-sm text-fg-muted">Read, then move on. You can practice this topic later from the Library.</p></Card>
          <LearnPanel item={item.data} />
          <div className="flex justify-end gap-2"><Button href={`/practice/run?content=${item.data.id}`}>Explain it now</Button><AccentButton size="md" onClick={() => advance()}>Continue</AccentButton></div>
        </div>
      ) : item.data ? (
        <div>
          <div className="mb-3 text-[12px] font-semibold uppercase tracking-wider text-fg-muted">Step {stepIndex + 1} of {steps.length} · {step.label}</div>
          <PracticeRunner key={`${r.id}:${stepIndex}`} content={item.data} sessionRunId={r.id} onComplete={(a) => advance(a.id)} />
        </div>
      ) : (
        <Card className="p-6"><p className="text-sm text-fg-muted">No content matched this step.</p><Button className="mt-3" onClick={() => advance()}>Skip step</Button></Card>
      )}
    </div>
  );
}

export default function SessionRunPage() {
  return (
    <Suspense fallback={null}>
      <Runner />
    </Suspense>
  );
}
