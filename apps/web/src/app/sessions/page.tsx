"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Clock, Play, Plus, Trash2 } from "lucide-react";
import { AccentButton, Button, Card, Field, Input, Modal, PageHeader, Select, Textarea, useToast } from "@/components/ui";
import { api } from "@/lib/api/client";
import { useInvalidate, useRuns, useTemplates } from "@/lib/api/hooks";
import { CONTENT_TYPES, CONTENT_TYPE_LABELS } from "@/lib/content/types";
import type { SessionStep, SessionTemplate } from "@/lib/content/practice-types";
import { newId } from "@/lib/utils/id";
import { formatDateTime } from "@/lib/utils/format";

export default function SessionsPage() {
  const router = useRouter();
  const toast = useToast();
  const invalidate = useInvalidate();
  const templates = useTemplates();
  const runs = useRuns();
  const [editing, setEditing] = useState<SessionTemplate | null>(null);

  const start = async (t: SessionTemplate) => {
    try {
      const run = await api.sessions.startRun({ templateId: t.id });
      router.push(`/sessions/run?id=${run.id}`);
    } catch (e) {
      toast.push((e as Error).message, "danger");
    }
  };

  const newTemplate = (): SessionTemplate => ({
    id: "", name: "My session", description: "", estimatedMinutes: 15, builtIn: 0,
    steps: [{ id: newId(), label: "Speaking topic", kind: "practice", types: ["speaking_topic"] }], createdAt: 0, updatedAt: 0,
  });

  const duplicate = async (t: SessionTemplate) => {
    const c = await api.sessions.duplicateTemplate(t.id);
    invalidate();
    setEditing(c);
  };

  return (
    <div>
      <PageHeader eyebrow="Practice" title="Sessions" description="Structured workouts. Each step is filled by the random engine when you start." actions={<Button onClick={() => setEditing(newTemplate())}><Plus className="h-4 w-4" /> Custom session</Button>} />
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {templates.data?.map((t) => (
          <Card key={t.id} className="flex flex-col p-4">
            <div className="flex items-start justify-between gap-2">
              <div><div className="text-[15px] font-medium">{t.name}</div>{t.description && <div className="mt-0.5 text-[13px] text-fg-muted">{t.description}</div>}</div>
              <span className="inline-flex shrink-0 items-center gap-1 text-xs text-fg-faint"><Clock className="h-3 w-3" /> ~{t.estimatedMinutes} min</span>
            </div>
            <ol className="mt-3 flex-1 space-y-1 text-[13px] text-fg-muted">{t.steps.map((s, i) => <li key={s.id}><span className="mr-1.5 tabular-nums text-fg-faint">{i + 1}.</span>{s.label}</li>)}</ol>
            <div className="mt-4 flex gap-2">
              <AccentButton size="sm" onClick={() => start(t)}><Play className="h-3.5 w-3.5" /> Start</AccentButton>
              {t.builtIn ? <Button size="sm" variant="ghost" onClick={() => duplicate(t)}>Duplicate & edit</Button> : <Button size="sm" variant="ghost" onClick={() => setEditing(t)}>Edit</Button>}
              {!t.builtIn && <Button size="sm" variant="ghost" onClick={async () => { await api.sessions.removeTemplate(t.id); invalidate(); }}><Trash2 className="h-3.5 w-3.5" /></Button>}
            </div>
          </Card>
        ))}
      </div>

      {runs.data && runs.data.length > 0 && (
        <div className="mt-8">
          <h2 className="mb-3 text-[13px] font-semibold uppercase tracking-wider text-fg-muted">Recent sessions</h2>
          <Card className="divide-y">
            {runs.data.map((r) => (
              <div key={r.id} className="flex items-center gap-3 px-4 py-3 text-sm">
                <div className="min-w-0 flex-1"><div className="font-medium">{r.templateName}</div><div className="text-xs text-fg-muted">{formatDateTime(r.startedAt)} · {r.attemptIds.length}/{r.stepContentIds.filter(Boolean).length} steps</div></div>
                {!r.completedAt ? <Button size="sm" href={`/sessions/run?id=${r.id}`}>Continue</Button> : <span className="text-xs text-success">Completed</span>}
              </div>
            ))}
          </Card>
        </div>
      )}

      {editing && <TemplateEditor template={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}

function TemplateEditor({ template, onClose }: { template: SessionTemplate; onClose: () => void }) {
  const [t, setT] = useState(template);
  const invalidate = useInvalidate();
  const setStep = (i: number, patch: Partial<SessionStep>) => setT((x) => ({ ...x, steps: x.steps.map((s, j) => (j === i ? { ...s, ...patch } : s)) }));
  const save = async () => {
    const body = { name: t.name, description: t.description, estimatedMinutes: t.estimatedMinutes, steps: t.steps };
    if (t.id) await api.sessions.updateTemplate(t.id, body);
    else await api.sessions.createTemplate(body);
    invalidate();
    onClose();
  };
  return (
    <Modal open onClose={onClose} title="Session template" wide>
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Field label="Name" className="sm:col-span-2"><Input value={t.name} onChange={(e) => setT({ ...t, name: e.target.value })} /></Field>
          <Field label="Estimated minutes"><Input type="number" value={t.estimatedMinutes} onChange={(e) => setT({ ...t, estimatedMinutes: Number(e.target.value) })} /></Field>
        </div>
        <Field label="Description"><Textarea value={t.description ?? ""} onChange={(e) => setT({ ...t, description: e.target.value })} className="min-h-[60px]" /></Field>
        <div>
          <div className="mb-2 text-[13px] font-medium">Steps</div>
          <div className="space-y-2">
            {t.steps.map((s, i) => (
              <div key={s.id} className="grid grid-cols-1 gap-2 rounded-xl border p-3 sm:grid-cols-12">
                <Input className="sm:col-span-4" value={s.label} onChange={(e) => setStep(i, { label: e.target.value })} placeholder="Label" />
                <Select className="sm:col-span-2" value={s.kind} onChange={(e) => setStep(i, { kind: e.target.value as SessionStep["kind"] })}><option value="practice">Practice</option><option value="learn">Learn</option><option value="reflect">Reflect</option></Select>
                <Select className="sm:col-span-3" value={s.types[0] ?? ""} onChange={(e) => setStep(i, { types: e.target.value ? [e.target.value] : [] })} disabled={s.kind === "reflect"}><option value="">Any type</option>{CONTENT_TYPES.map((ct) => <option key={ct} value={ct}>{CONTENT_TYPE_LABELS[ct]}</option>)}</Select>
                <Input className="sm:col-span-2" value={s.category ?? ""} onChange={(e) => setStep(i, { category: e.target.value || undefined })} placeholder="Category" disabled={s.kind === "reflect"} />
                <button type="button" className="text-fg-faint hover:text-danger sm:col-span-1" onClick={() => setT((x) => ({ ...x, steps: x.steps.filter((_, j) => j !== i) }))}><Trash2 className="mx-auto h-4 w-4" /></button>
              </div>
            ))}
          </div>
          <Button size="sm" className="mt-2" onClick={() => setT((x) => ({ ...x, steps: [...x.steps, { id: newId(), label: "New step", kind: "practice", types: [] }] }))}><Plus className="h-3.5 w-3.5" /> Add step</Button>
        </div>
        <div className="flex justify-end gap-2"><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant="primary" onClick={save}>Save template</Button></div>
      </div>
    </Modal>
  );
}
