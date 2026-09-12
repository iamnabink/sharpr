"use client";
import { useMemo, useState } from "react";
import { Plus, Shuffle, Trash2 } from "lucide-react";
import { Badge, Button, Card, Chip, Empty, Field, Input, Modal, PageHeader, Select, Textarea } from "@/components/ui";
import { api } from "@/lib/api/client";
import { useAttempts, useInvalidate, useVocabulary } from "@/lib/api/hooks";
import { VOCAB_CATEGORIES, type VocabularyItem } from "@/lib/content/types";

export default function VocabularyPage() {
  const { data: items } = useVocabulary();
  const { data: attempts } = useAttempts();
  const inbox = useMemo(() => {
    const words = new Set<string>();
    for (const a of attempts ?? []) for (const w of (a.review?.wordsToLearn ?? "").split(/[,\n]/)) if (w.trim()) words.add(w.trim());
    return Array.from(words);
  }, [attempts]);
  const [cat, setCat] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<VocabularyItem | null>(null);
  const [drill, setDrill] = useState<VocabularyItem[] | null>(null);

  const existing = useMemo(() => new Set((items ?? []).map((i) => i.word.toLowerCase())), [items]);
  const inboxNew = (inbox ?? []).filter((w) => !existing.has(w.toLowerCase()));
  const list = (items ?? []).filter((i) => (!cat || i.category === cat) && (!q || [i.word, i.meaning, i.example ?? ""].join(" ").toLowerCase().includes(q.toLowerCase())));
  const cats = new Map<string, number>();
  for (const i of items ?? []) cats.set(i.category, (cats.get(i.category) ?? 0) + 1);

  const blank = (word = ""): VocabularyItem => ({ id: "", word, meaning: "", synonyms: [], category: "professional phrase", timesUsed: 0, createdAt: 0, updatedAt: 0 });

  const pickThree = () => {
    const pool = [...(items ?? [])].sort(() => Math.random() - 0.5).slice(0, 3);
    setDrill(pool);
  };

  return (
    <div>
      <PageHeader eyebrow="Learn" title="Vocabulary" description="Natural professional phrases over complicated words. Use them out loud." actions={<><Button onClick={pickThree} disabled={!items?.length}><Shuffle className="h-4 w-4" /> 3 random words</Button><Button variant="primary" onClick={() => setEditing(blank())}><Plus className="h-4 w-4" /> Add</Button></>} />

      {inboxNew.length > 0 && (
        <Card className="mb-5 p-4">
          <div className="text-[12px] font-semibold uppercase tracking-wider text-fg-muted">From your reviews</div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {inboxNew.map((w) => <button key={w} type="button" onClick={() => setEditing(blank(w))} className="rounded-full border px-3 py-1 text-[13px] hover:bg-hover">{w} +</button>)}
          </div>
        </Card>
      )}

      <div className="mb-4 space-y-2">
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search words…" />
        <div className="flex flex-wrap gap-1.5">
          <Chip active={!cat} onClick={() => setCat(null)}>All <span className="text-fg-faint tabular-nums">{items?.length ?? 0}</span></Chip>
          {Array.from(cats.entries()).map(([c, n]) => <Chip key={c} active={cat === c} onClick={() => setCat(cat === c ? null : c)}>{c} <span className="text-fg-faint tabular-nums">{n}</span></Chip>)}
        </div>
      </div>

      {items && items.length === 0 ? <Empty title="No vocabulary yet" description="Add phrases you hear in meetings, podcasts and books." /> : (
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
          {list.map((v) => (
            <button key={v.id} type="button" onClick={() => setEditing(v)} className="rounded-xl border bg-elev p-4 text-left transition-colors hover:bg-hover">
              <div className="flex items-start justify-between gap-2">
                <div className="text-[15px] font-medium">{v.word}</div>
                <Badge>{v.category}</Badge>
              </div>
              {v.pronunciation && <div className="text-xs text-fg-faint">{v.pronunciation}</div>}
              <div className="mt-1 text-[13px] text-fg-muted">{v.meaning || <span className="italic">no meaning yet</span>}</div>
              {v.example && <div className="mt-1.5 text-[13px] italic text-fg-muted">“{v.example}”</div>}
              {v.timesUsed > 0 && <div className="mt-1.5 text-[11px] text-fg-faint">used in {v.timesUsed} challenge{v.timesUsed === 1 ? "" : "s"}</div>}
            </button>
          ))}
        </div>
      )}

      {editing && <VocabEditor item={editing} isNew={!editing.id} onClose={() => setEditing(null)} />}

      <Modal open={!!drill} onClose={() => setDrill(null)} title="Use these three words">
        <div className="space-y-3">
          {drill?.map((v) => <div key={v.id} className="rounded-xl bg-muted p-3"><div className="font-medium">{v.word}</div><div className="text-sm text-fg-muted">{v.meaning}</div></div>)}
          <p className="text-xs text-fg-muted">Start any speaking challenge and tick “Use 3 random saved words” to be assigned words automatically.</p>
          <div className="flex justify-end gap-2"><Button variant="ghost" onClick={() => setDrill(null)}>Close</Button><Button variant="primary" href="/practice/random">Go to Random</Button></div>
        </div>
      </Modal>
    </div>
  );
}

function VocabEditor({ item, isNew, onClose }: { item: VocabularyItem; isNew: boolean; onClose: () => void }) {
  const [v, setV] = useState(item);
  const invalidate = useInvalidate();
  const save = async () => {
    if (!v.word.trim()) return;
    const body = { word: v.word.trim(), meaning: v.meaning, example: v.example, pronunciation: v.pronunciation, synonyms: v.synonyms, category: v.category, discoveredIn: v.discoveredIn, personalExample: v.personalExample };
    if (isNew) await api.vocabulary.create(body);
    else await api.vocabulary.update(v.id, body);
    invalidate();
    onClose();
  };
  return (
    <Modal open onClose={onClose} title={isNew ? "Add word or phrase" : "Edit"}>
      <div className="space-y-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Word / phrase"><Input value={v.word} onChange={(e) => setV({ ...v, word: e.target.value })} autoFocus /></Field>
          <Field label="Category"><Select value={v.category} onChange={(e) => setV({ ...v, category: e.target.value })}>{VOCAB_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}</Select></Field>
        </div>
        <Field label="Meaning"><Input value={v.meaning} onChange={(e) => setV({ ...v, meaning: e.target.value })} /></Field>
        <Field label="Example"><Textarea className="min-h-[60px]" value={v.example ?? ""} onChange={(e) => setV({ ...v, example: e.target.value || undefined })} /></Field>
        <Field label="My own sentence"><Textarea className="min-h-[60px]" value={v.personalExample ?? ""} onChange={(e) => setV({ ...v, personalExample: e.target.value || undefined })} /></Field>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Pronunciation"><Input value={v.pronunciation ?? ""} onChange={(e) => setV({ ...v, pronunciation: e.target.value || undefined })} /></Field>
          <Field label="Synonyms" hint="comma-separated"><Input value={v.synonyms.join(", ")} onChange={(e) => setV({ ...v, synonyms: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })} /></Field>
        </div>
        <Field label="Where I discovered it"><Input value={v.discoveredIn ?? ""} onChange={(e) => setV({ ...v, discoveredIn: e.target.value || undefined })} /></Field>
        <div className="flex justify-between">
          {!isNew ? <Button variant="danger" onClick={async () => { await api.vocabulary.remove(v.id); invalidate(); onClose(); }}><Trash2 className="h-4 w-4" /> Delete</Button> : <span />}
          <div className="flex gap-2"><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant="primary" onClick={save}>Save</Button></div>
        </div>
      </div>
    </Modal>
  );
}
