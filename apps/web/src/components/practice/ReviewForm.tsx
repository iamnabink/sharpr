"use client";
import { useMemo, useState } from "react";
import { Button, Checkbox, Field, Textarea } from "@/components/ui";
import { RATING_DIMENSIONS, RATING_LABELS, REVIEW_FLAGS, REVIEW_FLAG_LABELS, type Review, type ReviewFlag, type RatingDimension } from "@/lib/content/practice-types";
import { computeOverall } from "@/lib/content/review";
import { cn } from "@/lib/utils/format";

const DIMENSIONS_BY_TYPE: Record<string, RatingDimension[]> = {
  speaking_topic: ["fluency", "confidence", "clarity", "vocabulary", "organization", "persuasiveness", "conciseness"],
  quick_speaking: ["fluency", "confidence", "clarity", "conciseness"],
  interview_question: ["clarity", "organization", "knowledge", "technicalAccuracy", "conciseness", "confidence"],
  technical_topic: ["clarity", "knowledge", "technicalAccuracy", "organization", "conciseness"],
  storytelling_prompt: ["storytelling", "fluency", "confidence", "vocabulary", "organization"],
  podcast_topic: ["fluency", "confidence", "clarity", "knowledge", "persuasiveness", "vocabulary"],
  debate: ["persuasiveness", "clarity", "organization", "confidence", "knowledge"],
  scenario: ["clarity", "confidence", "organization", "knowledge", "conciseness"],
  book_prompt: ["knowledge", "clarity", "organization", "vocabulary"],
  knowledge_topic: ["knowledge", "clarity", "organization", "fluency"],
};

export function ReviewForm({
  contentType,
  initial,
  onSubmit,
  onSkip,
  submitLabel = "Save review",
}: {
  contentType: string;
  initial?: Review;
  onSubmit: (r: Review) => void;
  onSkip?: () => void;
  submitLabel?: string;
}) {
  const suggested = DIMENSIONS_BY_TYPE[contentType] ?? RATING_DIMENSIONS.slice(0, 6);
  const [showAll, setShowAll] = useState(false);
  const dims = showAll ? RATING_DIMENSIONS : suggested;
  const [ratings, setRatings] = useState<Review["ratings"]>(initial?.ratings ?? {});
  const [flags, setFlags] = useState<ReviewFlag[]>(initial?.flags ?? []);
  const [wentWell, setWentWell] = useState(initial?.wentWell ?? "");
  const [toImprove, setToImprove] = useState(initial?.toImprove ?? "");
  const [toResearch, setToResearch] = useState(initial?.toResearch ?? "");
  const [words, setWords] = useState(initial?.wordsToLearn ?? "");
  const overall = useMemo(() => computeOverall(ratings), [ratings]);

  const toggleFlag = (f: ReviewFlag, v: boolean) => setFlags((fs) => (v ? [...fs, f] : fs.filter((x) => x !== f)));

  return (
    <div className="space-y-6">
      <div>
        <div className="mb-2 flex items-center justify-between">
          <div className="text-[13px] font-semibold uppercase tracking-wider text-fg-muted">Rate yourself</div>
          <div className="flex items-center gap-3">
            {overall !== undefined && <span className="text-sm font-medium tabular-nums">Overall {overall}/10</span>}
            <button type="button" className="text-xs text-fg-muted underline-offset-2 hover:underline" onClick={() => setShowAll((s) => !s)}>
              {showAll ? "Fewer dimensions" : "All dimensions"}
            </button>
          </div>
        </div>
        <div className="space-y-2">
          {dims.map((d) => (
            <RatingRow key={d} label={RATING_LABELS[d]} value={ratings[d]} onChange={(v) => setRatings((r) => ({ ...r, [d]: v }))} />
          ))}
        </div>
      </div>

      <div>
        <div className="mb-2 text-[13px] font-semibold uppercase tracking-wider text-fg-muted">What happened</div>
        <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
          {REVIEW_FLAGS.map((f) => (
            <Checkbox key={f} label={REVIEW_FLAG_LABELS[f]} checked={flags.includes(f)} onChange={(v) => toggleFlag(f, v)} />
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="What went well?">
          <Textarea value={wentWell} onChange={(e) => setWentWell(e.target.value)} placeholder="Strong opening, good example about…" />
        </Field>
        <Field label="What should improve?">
          <Textarea value={toImprove} onChange={(e) => setToImprove(e.target.value)} placeholder="Lost the thread halfway; conclusion was vague…" />
        </Field>
        <Field label="What should I research?">
          <Textarea value={toResearch} onChange={(e) => setToResearch(e.target.value)} placeholder="Concepts, facts or arguments I was unsure about" />
        </Field>
        <Field label="Words I want to learn" hint="Comma-separated. These become a note you can move to Vocabulary.">
          <Textarea value={words} onChange={(e) => setWords(e.target.value)} placeholder="tradeoff, to hedge, in hindsight…" />
        </Field>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2">
        {onSkip && (
          <Button variant="ghost" onClick={onSkip}>
            Skip review
          </Button>
        )}
        <Button variant="primary" onClick={() => onSubmit({ ratings, overall, flags, wentWell, toImprove, toResearch, wordsToLearn: words })}>
          {submitLabel}
        </Button>
      </div>
    </div>
  );
}

function RatingRow({ label, value, onChange }: { label: string; value?: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-32 shrink-0 text-[13px] text-fg-muted sm:w-40">{label}</div>
      <div className="flex flex-1 gap-1">
        {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className={cn(
              "h-7 flex-1 rounded-md border text-[11px] font-medium tabular-nums transition-colors",
              value === n ? "border-fg bg-fg text-bg" : value !== undefined && n < value ? "border-transparent bg-muted text-fg-faint" : "border-border bg-elev text-fg-muted hover:bg-hover",
            )}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}
