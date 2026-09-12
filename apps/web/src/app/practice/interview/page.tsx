"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Shuffle, Users } from "lucide-react";
import { AccentButton, Button, Card, Chip, Modal, PageHeader, Select, Field, useToast } from "@/components/ui";
import { ContentRow } from "@/components/library/ContentCard";
import { api } from "@/lib/api/client";
import { useContentByType, useHistoryIndex } from "@/lib/api/hooks";
import { INTERVIEW_TRACKS, INTERVIEW_TRACK_LABELS, type InterviewTrack } from "@/lib/content/types";

export default function InterviewPage() {
  const router = useRouter();
  const toast = useToast();
  const [track, setTrack] = useState<InterviewTrack | null>(null);
  const [sub, setSub] = useState<string | null>(null);
  const [mock, setMock] = useState(false);
  const [mockCount, setMockCount] = useState(5);
  const [mockTrack, setMockTrack] = useState<InterviewTrack | "mixed">("mixed");
  const { data: history } = useHistoryIndex();
  const { data: items } = useContentByType("interview_question");

  const byTrack = new Map<string, number>();
  const subs = new Map<string, number>();
  for (const it of items ?? []) {
    byTrack.set(it.track ?? "other", (byTrack.get(it.track ?? "other") ?? 0) + 1);
    if (!track || it.track === track) subs.set(it.subcategory ?? "General", (subs.get(it.subcategory ?? "General") ?? 0) + 1);
  }
  const filtered = (items ?? []).filter((it) => (!track || it.track === track) && (!sub || (it.subcategory ?? "General") === sub));

  const random = async () => {
    const r = await api.engine.random({ type: ["interview_question"], track: track ?? undefined, category: sub ?? undefined });
    if (r.pick) router.push(`/practice/run?content=${r.pick.item.id}`);
  };

  const startMock = async () => {
    const picks = await api.engine.many(mockCount, { type: ["interview_question"], track: mockTrack === "mixed" ? undefined : mockTrack });
    if (!picks.length) return toast.push("No questions match", "danger");
    const run = await api.sessions.startRun({ templateName: `Mock interview · ${mockTrack === "mixed" ? "Mixed" : INTERVIEW_TRACK_LABELS[mockTrack]}`, contentIds: picks.map((p) => p.item.id) });
    router.push(`/sessions/run?id=${run.id}`);
  };

  return (
    <div>
      <PageHeader
        eyebrow="Practice"
        title="Interview"
        description="Seven tracks. Answer out loud, then compare with what a strong answer covers."
        actions={
          <>
            <Button onClick={() => setMock(true)}><Users className="h-4 w-4" /> Mock interview</Button>
            <AccentButton size="md" onClick={random}><Shuffle className="h-4 w-4" /> Random question</AccentButton>
          </>
        }
      />
      <div className="mb-3 flex flex-wrap gap-1.5">
        <Chip active={!track} onClick={() => { setTrack(null); setSub(null); }}>All tracks</Chip>
        {INTERVIEW_TRACKS.map((t) => (
          <Chip key={t} active={track === t} onClick={() => { setTrack(track === t ? null : t); setSub(null); }}>
            {INTERVIEW_TRACK_LABELS[t]} <span className="text-fg-faint tabular-nums">{byTrack.get(t) ?? 0}</span>
          </Chip>
        ))}
      </div>
      <div className="mb-5 flex flex-wrap gap-1.5">
        {Array.from(subs.entries()).sort((a, b) => a[0].localeCompare(b[0])).map(([s, n]) => (
          <Chip key={s} active={sub === s} onClick={() => setSub(sub === s ? null : s)} className="h-7 text-[12px]">
            {s} <span className="text-fg-faint tabular-nums">{n}</span>
          </Chip>
        ))}
      </div>
      <div className="space-y-2">
        {filtered.map((it) => { const h = history?.[it.id]; return <ContentRow key={it.id} item={it} lastPracticed={h?.last} rating={h?.rating} compact />; })}
        {items && filtered.length === 0 && <Card className="p-5 text-sm text-fg-muted">No questions match.</Card>}
      </div>

      <Modal open={mock} onClose={() => setMock(false)} title="Mock interview session">
        <div className="space-y-4">
          <Field label="Track">
            <Select value={mockTrack} onChange={(e) => setMockTrack(e.target.value as InterviewTrack | "mixed")}>
              <option value="mixed">Mixed</option>
              {INTERVIEW_TRACKS.map((t) => <option key={t} value={t}>{INTERVIEW_TRACK_LABELS[t]}</option>)}
            </Select>
          </Field>
          <Field label="Number of questions">
            <Select value={mockCount} onChange={(e) => setMockCount(Number(e.target.value))}>{[3, 5, 8, 10].map((n) => <option key={n} value={n}>{n}</option>)}</Select>
          </Field>
          <p className="text-xs text-fg-muted">Questions are chosen by the random engine: unpracticed and low-rated first. Each answer gets its own review.</p>
          <div className="flex justify-end gap-2"><Button variant="ghost" onClick={() => setMock(false)}>Cancel</Button><AccentButton size="md" onClick={startMock}>Start</AccentButton></div>
        </div>
      </Modal>
    </div>
  );
}
