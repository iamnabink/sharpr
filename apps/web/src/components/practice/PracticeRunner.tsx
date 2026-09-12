"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Bookmark, ChevronRight, Eye, Mic, Pause, Play, Square, Video, VolumeX } from "lucide-react";
import { AccentButton, Badge, Button, Card, difficultyTone, useToast } from "@/components/ui";
import { ReviewForm } from "./ReviewForm";
import { LearnPanel } from "./LearnPanel";
import { api } from "@/lib/api/client";
import { useInvalidate, useSettings } from "@/lib/api/hooks";
import { useToggleBookmark } from "@/components/library/ContentCard";
import { useRecorder, recorderSupported, type RecorderMode } from "@/lib/recording/useRecorder";
import { retryDueAt, shouldRecommendRetry, suggestedRetryWhen, type RetryWhen } from "@/lib/engine/retry";
import { CONTENT_TYPE_LABELS, TECH_AUDIENCES, type ContentItem, type VocabularyItem } from "@/lib/content/types";
import type { Attempt, Review } from "@/lib/content/practice-types";
import { cn, formatClock, formatMinutes } from "@/lib/utils/format";

type Phase = "brief" | "prep" | "speak" | "review" | "done";

export interface PracticeRunnerProps {
  content: ContentItem;
  pass?: number;
  variant?: string;
  sessionRunId?: string;
  /** In session mode the runner hands control back instead of offering navigation. */
  onComplete?: (attempt: Attempt) => void;
  /** Called when the user wants a different item (random mode) */
  onAnother?: () => void;
}

const RETRY_OPTIONS: { v: RetryWhen; label: string }[] = [
  { v: "tomorrow", label: "Tomorrow" },
  { v: "three_days", label: "In 3 days" },
  { v: "next_week", label: "Next week" },
  { v: "two_weeks", label: "In 2 weeks" },
  { v: "someday", label: "Someday" },
];

export function PracticeRunner({ content, pass = 1, variant: initialVariant, sessionRunId, onComplete, onAnother }: PracticeRunnerProps) {
  const router = useRouter();
  const toast = useToast();
  const [phase, setPhase] = useState<Phase>("brief");
  const [modeOverride, setModeOverride] = useState<RecorderMode | null>(null);
  const [audience, setAudience] = useState<string | undefined>(initialVariant && content.type === "technical_topic" ? initialVariant : undefined);
  const [side, setSide] = useState<"defend" | "oppose" | undefined>(() =>
    initialVariant === "defend" || initialVariant === "oppose" ? initialVariant : content.type === "debate" ? (Math.random() < 0.5 ? "defend" : "oppose") : undefined,
  );
  const [useVocab, setUseVocab] = useState(false);
  const [vocab, setVocab] = useState<VocabularyItem[]>([]);
  const [prepLeft, setPrepLeft] = useState(content.preparationSeconds);
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [review, setReview] = useState<Review | undefined>();
  const [playbackUrl, setPlaybackUrl] = useState<string | null>(null);
  const [retryAdded, setRetryAdded] = useState<RetryWhen | null>(null);
  const [revealed, setRevealed] = useState(0);
  const [uploading, setUploading] = useState(false);
  const startedAtRef = useRef(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const supported = useMemo(() => recorderSupported(), []);
  const settings = useSettings();
  const settingsMode = (settings.data?.recordingMode as RecorderMode | undefined) ?? "audio";
  const mode: RecorderMode = modeOverride ?? (supported ? settingsMode : "none");
  const setMode = setModeOverride;
  const rec = useRecorder(mode);
  const invalidate = useInvalidate();
  const toggleBookmark = useToggleBookmark();

  const variant = content.type === "technical_topic" ? audience : content.type === "debate" ? side : initialVariant;
  const target = content.durationSeconds;
  const over = rec.elapsed > target;
  const isDebate = content.type === "debate";
  const isPodcast = content.type === "podcast_topic";
  const isTech = content.type === "technical_topic";
  const isScenario = content.type === "scenario";

  const toggleVocab = async (on: boolean) => {
    setUseVocab(on);
    if (!on) return setVocab([]);
    const all = await api.vocabulary.list();
    setVocab([...all].sort(() => Math.random() - 0.5).slice(0, 3));
  };

  const beginSpeaking = async () => {
    startedAtRef.current = Date.now();
    setPhase("speak");
    await rec.start();
  };

  // live camera preview
  useEffect(() => {
    if (videoRef.current && rec.stream && mode === "video") {
      videoRef.current.srcObject = rec.stream;
      videoRef.current.play().catch(() => {});
    }
  }, [rec.stream, mode, phase]);

  // prep countdown
  useEffect(() => {
    if (phase !== "prep") return;
    const t = setTimeout(() => {
      if (prepLeft <= 1) beginSpeaking();
      else setPrepLeft((p) => p - 1);
    }, 1000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, prepLeft]);

  useEffect(() => () => {
    if (playbackUrl) URL.revokeObjectURL(playbackUrl);
  }, [playbackUrl]);

  const chooseMode = async (m: RecorderMode) => {
    setMode(m);
    await api.settings.set("recordingMode", m);
  };

  const startPrep = async () => {
    if (mode !== "none") {
      const ok = await rec.prepare();
      if (!ok) {
        toast.push("Could not access microphone. Continuing without recording.", "danger");
        setMode("none");
      }
    }
    setPrepLeft(content.preparationSeconds);
    if (content.preparationSeconds > 0) setPhase("prep");
    else beginSpeaking();
  };

  const finish = async () => {
    const result = await rec.stop();
    const duration = rec.durationSeconds.current;
    if (duration < 3) {
      toast.push("Too short to save. Try again.", "warn");
      rec.reset();
      setPhase("brief");
      return;
    }
    let saved: Attempt;
    try {
      saved = await api.attempts.create({
        contentId: content.id,
        variant,
        pass,
        recordingKind: result ? mode : "none",
        durationSeconds: duration,
        startedAt: startedAtRef.current,
        vocabularyIds: vocab.map((v) => v.id),
        sessionRunId,
      });
    } catch (e) {
      toast.push(`Could not save attempt: ${(e as Error).message}`, "danger");
      rec.reset();
      setPhase("brief");
      return;
    }
    if (result && result.blob.size > 0) {
      setPlaybackUrl(URL.createObjectURL(result.blob));
      setUploading(true);
      try {
        const info = await api.attempts.uploadRecording(saved.id, result.blob, result.durationSeconds);
        saved = { ...saved, recordingId: info.id, recordingKind: info.kind };
      } catch (e) {
        toast.push(`Recording upload failed: ${(e as Error).message}`, "danger");
      } finally {
        setUploading(false);
      }
    }
    setAttempt(saved);
    invalidate();
    setPhase("review");
  };

  const submitReview = async (r: Review) => {
    if (!attempt) return;
    const updated = await api.attempts.review(attempt.id, r);
    setReview(updated.review ?? r);
    setAttempt(updated);
    invalidate();
    setPhase("done");
  };

  const skipReview = () => setPhase("done");

  const addRetry = async (when: RetryWhen) => {
    await api.retry.add({ contentId: content.id, dueAt: retryDueAt(when), attemptId: attempt?.id, reason: review?.toImprove || undefined });
    invalidate();
    setRetryAdded(when);
    toast.push("Added to retry queue", "success");
  };

  const explainAgain = () => {
    const params = new URLSearchParams({ content: content.id, pass: String(pass + 1) });
    if (variant) params.set("variant", variant);
    if (sessionRunId) params.set("session", sessionRunId);
    router.push(`/practice/run?${params.toString()}`);
  };

  const another = async () => {
    if (onAnother) return onAnother();
    const r = await api.engine.random({ type: [content.type], exclude: [content.id] });
    if (r.pick) router.push(`/practice/run?content=${r.pick.item.id}`);
    else router.push("/practice");
  };

  const counterFor = (content.counterarguments ?? []).filter((c) => c.against === side);

  /* ---------------- render ---------------- */
  return (
    <div className="space-y-5">
      {/* header */}
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone="accent">{CONTENT_TYPE_LABELS[content.type]}</Badge>
        <Badge>{content.category}{content.subcategory ? ` · ${content.subcategory}` : ""}</Badge>
        <Badge tone={difficultyTone(content.difficulty)}>{content.difficulty}</Badge>
        {pass > 1 && <Badge tone="success">Explain again · pass {pass}</Badge>}
        <div className="ml-auto flex items-center gap-1">
          <button type="button" onClick={() => toggleBookmark(content)} className={cn("flex h-8 w-8 items-center justify-center rounded-lg hover:bg-hover", content.bookmarked ? "text-accent" : "text-fg-faint")} title="Bookmark">
            <Bookmark className={cn("h-4 w-4", content.bookmarked && "fill-current")} />
          </button>
        </div>
      </div>

      {/* prompt */}
      <Card className="p-6">
        {isScenario && content.role && <div className="mb-2 text-[13px] font-medium text-fg-muted">{content.role}</div>}
        {isDebate && content.position && (
          <div className="mb-2 text-[13px] font-medium uppercase tracking-wider text-fg-faint">Position</div>
        )}
        <h1 className="text-xl font-semibold leading-snug tracking-tight sm:text-2xl">{isDebate && content.position ? content.position : content.prompt}</h1>
        {isDebate && side && (
          <div className="mt-3 text-[15px] text-fg-muted">
            You <span className="font-medium text-fg">{side}</span> this position.
          </div>
        )}
        {isScenario && content.situation && <p className="mt-3 text-[15px] leading-relaxed text-fg-muted">{content.situation}</p>}
        {isTech && audience && (
          <div className="mt-3 text-[15px] text-fg-muted">
            Explain it to a <span className="font-medium text-fg">{audience}</span>.
          </div>
        )}
        {isPodcast && content.openingQuestion && (
          <div className="mt-4 rounded-xl bg-muted p-4">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-fg-faint">Host opens with</div>
            <div className="mt-1 text-[15px]">{content.openingQuestion}</div>
          </div>
        )}
        {vocab.length > 0 && (
          <div className="mt-4 flex flex-wrap items-center gap-1.5">
            <span className="text-[12px] text-fg-muted">Use these words:</span>
            {vocab.map((v) => (
              <Badge key={v.id} tone="accent" className="text-[12px]">
                {v.word}
              </Badge>
            ))}
          </div>
        )}
      </Card>

      {/* BRIEF */}
      {phase === "brief" && (
        <div className="space-y-4 animate-fade-up">
          <Card className="p-5">
            <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
              <div>
                <div className="text-xs text-fg-muted">Preparation</div>
                <div className="mt-0.5 font-medium tabular-nums">{content.preparationSeconds ? `${content.preparationSeconds}s` : "None"}</div>
              </div>
              <div>
                <div className="text-xs text-fg-muted">Speak for</div>
                <div className="mt-0.5 font-medium tabular-nums">{formatMinutes(content.durationSeconds)}</div>
              </div>
              <div className="col-span-2">
                <div className="text-xs text-fg-muted">Recording</div>
                <div className="mt-1 flex gap-1">
                  {(
                    [
                      ["audio", Mic, "Audio"],
                      ["video", Video, "Video"],
                      ["none", VolumeX, "None"],
                    ] as const
                  ).map(([m, Icon, label]) => (
                    <button
                      key={m}
                      type="button"
                      disabled={m !== "none" && !supported}
                      onClick={() => chooseMode(m)}
                      className={cn(
                        "inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-[13px] font-medium transition-colors disabled:opacity-40",
                        mode === m ? "border-fg bg-fg text-bg" : "bg-elev text-fg-muted hover:bg-hover",
                      )}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {isTech && (
              <div className="mt-5">
                <div className="mb-1.5 text-xs text-fg-muted">Explain to</div>
                <div className="flex flex-wrap gap-1.5">
                  {(content.audiences?.length ? content.audiences : TECH_AUDIENCES).map((a) => (
                    <button key={a} type="button" onClick={() => setAudience(a)} className={cn("h-8 rounded-full border px-3 text-[13px] font-medium", audience === a ? "border-fg bg-fg text-bg" : "bg-elev text-fg-muted hover:bg-hover")}>
                      {a}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {isDebate && (
              <div className="mt-5">
                <div className="mb-1.5 text-xs text-fg-muted">Your side</div>
                <div className="flex gap-1.5">
                  {(["defend", "oppose"] as const).map((s) => (
                    <button key={s} type="button" onClick={() => setSide(s)} className={cn("h-8 rounded-full border px-3 text-[13px] font-medium capitalize", side === s ? "border-fg bg-fg text-bg" : "bg-elev text-fg-muted hover:bg-hover")}>
                      {s}
                    </button>
                  ))}
                  <button type="button" onClick={() => setSide(Math.random() < 0.5 ? "defend" : "oppose")} className="h-8 rounded-full border bg-elev px-3 text-[13px] font-medium text-fg-muted hover:bg-hover">
                    Random
                  </button>
                </div>
              </div>
            )}

            <label className="mt-5 flex cursor-pointer items-center gap-2 text-sm">
              <input type="checkbox" checked={useVocab} onChange={(e) => toggleVocab(e.target.checked)} className="h-4 w-4 accent-[var(--accent)]" />
              Use 3 random saved words in this challenge
            </label>
          </Card>

          {content.guidingQuestions?.length ? (
            <Card className="p-5">
              <div className="mb-2 text-[12px] font-semibold uppercase tracking-wider text-fg-muted">Guiding questions</div>
              <ul className="space-y-1.5 text-[14px]">
                {content.guidingQuestions.map((q, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="text-fg-faint tabular-nums">{i + 1}.</span>
                    {q}
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}

          {content.framework && (
            <div className="text-sm text-fg-muted">
              Suggested framework: <span className="font-medium text-fg">{content.framework}</span>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <AccentButton onClick={startPrep} disabled={isTech && !audience}>
              <Play className="h-4 w-4" />
              {content.preparationSeconds ? "Start preparation" : "Start speaking"}
            </AccentButton>
            {pass === 1 && (content.learning || content.modelAnswerNotes) && (
              <span className="text-xs text-fg-faint">Speak first. Learning material is revealed after you finish.</span>
            )}
          </div>
        </div>
      )}

      {/* PREP */}
      {phase === "prep" && (
        <Card className="p-8 text-center animate-fade-up">
          <div className="text-[12px] font-semibold uppercase tracking-wider text-fg-muted">Prepare</div>
          <div className="mt-2 font-mono text-6xl font-semibold tabular-nums tracking-tight">{prepLeft}</div>
          <p className="mx-auto mt-3 max-w-md text-sm text-fg-muted">Structure your answer. Decide your opening line and your conclusion.</p>
          {content.guidingQuestions?.length ? (
            <ul className="mx-auto mt-5 max-w-md space-y-1 text-left text-[13px] text-fg-muted">
              {content.guidingQuestions.map((q, i) => (
                <li key={i}>· {q}</li>
              ))}
            </ul>
          ) : null}
          <div className="mt-6 flex justify-center gap-2">
            <Button variant="primary" onClick={beginSpeaking}>
              I&apos;m ready
            </Button>
            <Button variant="ghost" onClick={() => setPrepLeft((p) => p + 30)}>
              +30s
            </Button>
          </div>
        </Card>
      )}

      {/* SPEAK */}
      {phase === "speak" && (
        <div className="space-y-4 animate-fade-up">
          <Card className="p-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className={cn("h-2.5 w-2.5 rounded-full", rec.state === "recording" ? "bg-danger animate-pulse-dot" : "bg-fg-faint")} />
                <div className={cn("font-mono text-5xl font-semibold tabular-nums tracking-tight", over && "text-warn")}>{formatClock(rec.elapsed)}</div>
                <div className="text-sm text-fg-muted">/ {formatClock(target)}</div>
              </div>
              <div className="flex items-center gap-2">
                {rec.state === "recording" ? (
                  <Button onClick={rec.pause}>
                    <Pause className="h-4 w-4" /> Pause
                  </Button>
                ) : (
                  <Button onClick={rec.resume}>
                    <Play className="h-4 w-4" /> Resume
                  </Button>
                )}
                <Button variant="primary" onClick={finish}>
                  <Square className="h-4 w-4" /> Finish
                </Button>
              </div>
            </div>
            <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div className={cn("h-full rounded-full transition-[width] duration-300", over ? "bg-warn" : "bg-fg")} style={{ width: `${Math.min(100, (rec.elapsed / target) * 100)}%` }} />
            </div>
            {mode === "video" && (
              <video ref={videoRef} muted playsInline className="mt-4 aspect-video w-full rounded-xl bg-black object-cover" />
            )}
            {mode === "none" && <p className="mt-3 text-xs text-fg-faint">Timer only — nothing is being recorded.</p>}
          </Card>

          {isDebate && counterFor.length > 0 && (
            <Card className="p-5">
              <div className="mb-2 flex items-center justify-between">
                <div className="text-[12px] font-semibold uppercase tracking-wider text-fg-muted">Counterarguments ({revealed}/{counterFor.length})</div>
                <Button size="sm" onClick={() => setRevealed((r) => Math.min(counterFor.length, r + 1))} disabled={revealed >= counterFor.length}>
                  <Eye className="h-3.5 w-3.5" /> Reveal next
                </Button>
              </div>
              {revealed === 0 ? (
                <p className="text-sm text-fg-muted">Make your opening argument. Then reveal a counterargument and respond to it.</p>
              ) : (
                <ol className="space-y-2">
                  {counterFor.slice(0, revealed).map((c, i) => (
                    <li key={i} className="animate-fade-up rounded-xl bg-muted p-3 text-[14px]">
                      <span className="mr-2 text-fg-faint tabular-nums">{i + 1}.</span>
                      {c.text}
                    </li>
                  ))}
                </ol>
              )}
            </Card>
          )}

          {isPodcast && (
            <Card className="p-5">
              <div className="mb-2 flex items-center justify-between">
                <div className="text-[12px] font-semibold uppercase tracking-wider text-fg-muted">Host&apos;s follow-ups ({revealed}/{content.followUpQuestions?.length ?? 0})</div>
                <Button size="sm" onClick={() => setRevealed((r) => Math.min(content.followUpQuestions?.length ?? 0, r + 1))} disabled={revealed >= (content.followUpQuestions?.length ?? 0)}>
                  <ChevronRight className="h-3.5 w-3.5" /> Next question
                </Button>
              </div>
              {content.discussionPoints?.length ? (
                <div className="mb-3 text-[13px] text-fg-muted">
                  <span className="font-medium text-fg">Discussion points:</span> {content.discussionPoints.join(" · ")}
                </div>
              ) : null}
              <ol className="space-y-2">
                {(content.followUpQuestions ?? []).slice(0, revealed).map((q, i) => (
                  <li key={i} className="animate-fade-up rounded-xl bg-muted p-3 text-[14px]">
                    {q}
                  </li>
                ))}
              </ol>
              {content.controversialAngle && revealed >= (content.followUpQuestions?.length ?? 0) && (
                <div className="mt-3 animate-fade-up rounded-xl border border-warn/30 bg-warn-soft p-3 text-[14px]">
                  <span className="font-medium">Host pushes:</span> {content.controversialAngle}
                </div>
              )}
              {content.closingQuestion && revealed >= (content.followUpQuestions?.length ?? 0) && (
                <div className="mt-2 animate-fade-up text-[14px] text-fg-muted">
                  <span className="font-medium text-fg">Closing:</span> {content.closingQuestion}
                </div>
              )}
            </Card>
          )}

          {content.guidingQuestions?.length && !isDebate && !isPodcast ? (
            <div className="px-1 text-[13px] text-fg-muted">{content.guidingQuestions.join("  ·  ")}</div>
          ) : null}
        </div>
      )}

      {/* REVIEW */}
      {phase === "review" && attempt && (
        <div className="space-y-4 animate-fade-up">
          <Card className="p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="text-[12px] font-semibold uppercase tracking-wider text-fg-muted">Recorded</div>
                <div className="mt-0.5 text-sm">
                  You spoke for <span className="font-medium tabular-nums">{formatMinutes(attempt.durationSeconds)}</span>
                  {attempt.durationSeconds > target * 1.2 && <span className="text-warn"> · over target</span>}
                  {attempt.durationSeconds < target * 0.5 && <span className="text-warn"> · well under target</span>}
                  {uploading && <span className="text-fg-faint"> · uploading recording…</span>}
                </div>
              </div>
            </div>
            {playbackUrl && (
              <div className="mt-4">
                {mode === "video" ? <video src={playbackUrl} controls playsInline className="aspect-video w-full rounded-xl bg-black" /> : <audio src={playbackUrl} controls className="w-full" />}
                <p className="mt-2 text-xs text-fg-faint">Listen back before rating. Be honest — the ratings drive what resurfaces.</p>
              </div>
            )}
          </Card>
          <Card className="p-5">
            <ReviewForm contentType={content.type} onSubmit={submitReview} onSkip={skipReview} />
          </Card>
        </div>
      )}

      {/* DONE */}
      {phase === "done" && attempt && (
        <div className="space-y-4 animate-fade-up">
          <Card className="p-5">
            <div className="flex flex-wrap items-center gap-4">
              <div>
                <div className="text-[12px] font-semibold uppercase tracking-wider text-fg-muted">Result</div>
                <div className="mt-0.5 text-2xl font-semibold tabular-nums tracking-tight">{review?.overall !== undefined ? `${review.overall}/10` : "Not rated"}</div>
              </div>
              <div className="text-sm text-fg-muted">
                {formatMinutes(attempt.durationSeconds)} · {attempt.recordingId ? "recording saved" : "no recording"}
              </div>
              {shouldRecommendRetry(review) && !retryAdded && (
                <Badge tone="warn" className="ml-auto">
                  Recommended: add to retry queue
                </Badge>
              )}
            </div>
            <div className="mt-4">
              <div className="mb-1.5 text-xs text-fg-muted">{retryAdded ? "In your retry queue" : "Practice again later"}</div>
              <div className="flex flex-wrap gap-1.5">
                {RETRY_OPTIONS.map((o) => (
                  <button
                    key={o.v}
                    type="button"
                    onClick={() => addRetry(o.v)}
                    className={cn(
                      "h-8 rounded-full border px-3 text-[13px] font-medium transition-colors",
                      retryAdded === o.v ? "border-fg bg-fg text-bg" : suggestedRetryWhen(review?.overall) === o.v && !retryAdded ? "border-accent text-accent" : "bg-elev text-fg-muted hover:bg-hover",
                    )}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </div>
          </Card>

          <LearnPanel item={content} />

          <div className="flex flex-wrap gap-2">
            {onComplete ? (
              <AccentButton onClick={() => onComplete(attempt)}>
                Next step <ChevronRight className="h-4 w-4" />
              </AccentButton>
            ) : (
              <>
                {(content.learning || content.modelAnswerNotes || content.resourceIds.length > 0) && (
                  <AccentButton onClick={explainAgain}>Explain again</AccentButton>
                )}
                <Button size="lg" onClick={another}>
                  Another {CONTENT_TYPE_LABELS[content.type].toLowerCase()}
                </Button>
                <Button size="lg" variant="ghost" href="/">
                  Back to Today
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
