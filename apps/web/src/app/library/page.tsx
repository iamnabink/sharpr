"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { Archive, Copy, Download, FolderPlus, Plus, Search, Upload } from "lucide-react";
import { Badge, Button, Card, Chip, Empty, Field, Input, Modal, PageHeader, Select, Tabs, Textarea, useToast } from "@/components/ui";
import { ContentRow } from "@/components/library/ContentCard";
import { api } from "@/lib/api/client";
import { useCollections, useContentList, useHistoryIndex, useInvalidate } from "@/lib/api/hooks";
import { downloadJson } from "@/lib/content/export";
import { CONTENT_TYPES, CONTENT_TYPE_LABELS, DIFFICULTIES, type Collection, type ContentType } from "@/lib/content/types";

export default function LibraryPage() {
  const toast = useToast();
  const [tab, setTab] = useState<"content" | "collections">("content");
  const { data: all } = useContentList({ status: "all" });
  const { data: collections } = useCollections();
  const { data: history } = useHistoryIndex();
  const invalidate = useInvalidate();
  const [q, setQ] = useState("");
  const [type, setType] = useState<ContentType | "">("");
  const [difficulty, setDifficulty] = useState("");
  const [status, setStatus] = useState<"active" | "archived">("active");
  const [tag, setTag] = useState("");
  const [source, setSource] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [colModal, setColModal] = useState<Collection | null>(null);

  const tags = useMemo(() => { const m = new Map<string, number>(); for (const c of all ?? []) for (const t of c.tags) m.set(t, (m.get(t) ?? 0) + 1); return Array.from(m.entries()).sort((a, b) => b[1] - a[1]).slice(0, 30); }, [all]);
  const sources = useMemo(() => Array.from(new Set((all ?? []).map((c) => c.source))), [all]);

  const list = useMemo(() => (all ?? []).filter((c) =>
    c.status === status && (!type || c.type === type) && (!difficulty || c.difficulty === difficulty) && (!tag || c.tags.includes(tag)) && (!source || c.source === source) &&
    (!q || [c.title, c.prompt, c.category, c.subcategory ?? "", ...c.tags].join(" ").toLowerCase().includes(q.toLowerCase()))
  ).sort((a, b) => b.updatedAt - a.updatedAt), [all, status, type, difficulty, tag, source, q]);

  const toggle = (id: string) => setSelected((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const bulk = async (action: "archive" | "unarchive" | "duplicate") => { await api.content.bulk(Array.from(selected), action); invalidate(); setSelected(new Set()); };

  return (
    <div>
      <PageHeader title="Library" description="Everything you've created or imported. Tag it, group it, archive it, export it." actions={<><Button href="/library/import"><Upload className="h-4 w-4" /> Import</Button><Button onClick={async () => { downloadJson(`sharpr-export-${new Date().toISOString().slice(0, 10)}.json`, await api.importing.exportJson()); }}><Download className="h-4 w-4" /> Export JSON</Button><Button variant="primary" href="/library/new"><Plus className="h-4 w-4" /> New</Button></>} />
      <Tabs className="mb-4" value={tab} onChange={setTab} items={[{ value: "content", label: "Content", count: all?.filter((c) => c.status === "active").length }, { value: "collections", label: "Collections", count: collections?.length }]} />

      {tab === "content" && (
        <>
          <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
            <div className="relative col-span-2"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-faint" /><Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…" className="pl-9" /></div>
            <Select value={type} onChange={(e) => setType(e.target.value as ContentType | "")}><option value="">All types</option>{CONTENT_TYPES.map((t) => <option key={t} value={t}>{CONTENT_TYPE_LABELS[t]}</option>)}</Select>
            <Select value={difficulty} onChange={(e) => setDifficulty(e.target.value)}><option value="">Any difficulty</option>{DIFFICULTIES.map((d) => <option key={d} value={d}>{d}</option>)}</Select>
            <Select value={source} onChange={(e) => setSource(e.target.value)}><option value="">Any source</option>{sources.map((s) => <option key={s} value={s}>{s}</option>)}</Select>
          </div>
          <div className="mb-4 flex flex-wrap gap-1.5">
            <Chip active={status === "active"} onClick={() => setStatus("active")}>Active</Chip>
            <Chip active={status === "archived"} onClick={() => setStatus("archived")}>Archived</Chip>
            <span className="mx-1 border-l" />
            {tags.map(([t, n]) => <Chip key={t} active={tag === t} onClick={() => setTag(tag === t ? "" : t)} className="h-7 text-[12px]">{t} <span className="text-fg-faint tabular-nums">{n}</span></Chip>)}
          </div>

          {selected.size > 0 && (
            <Card className="mb-3 flex flex-wrap items-center gap-2 px-3 py-2 text-sm">
              <span className="font-medium">{selected.size} selected</span>
              <Button size="sm" onClick={() => bulk(status === "active" ? "archive" : "unarchive")}><Archive className="h-3.5 w-3.5" /> {status === "active" ? "Archive" : "Unarchive"}</Button>
              <Button size="sm" onClick={() => bulk("duplicate")}><Copy className="h-3.5 w-3.5" /> Duplicate</Button>
              <Button size="sm" onClick={async () => { downloadJson("sharpr-selection.json", await api.importing.exportJson(Array.from(selected))); }}><Download className="h-3.5 w-3.5" /> Export selected</Button>
              <Select className="h-8 w-48 py-0 text-xs" value="" onChange={async (e) => { const col = collections?.find((c) => c.id === e.target.value); if (!col) return; await api.collections.update(col.id, { addContentIds: Array.from(selected) }); invalidate(); toast.push(`Added to ${col.name}`, "success"); setSelected(new Set()); }}><option value="">Add to collection…</option>{collections?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select>
              <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>Clear</Button>
            </Card>
          )}

          {all && all.length === 0 ? <Empty title="Library is empty" action={<Button href="/library/import">Import content</Button>} /> : list.length === 0 ? <Empty title="No matches" /> : (
            <div className="space-y-2">
              <div className="flex items-center gap-2 px-1 text-xs text-fg-muted"><input type="checkbox" className="h-3.5 w-3.5 accent-[var(--accent)]" checked={list.length > 0 && list.every((c) => selected.has(c.id))} onChange={(e) => setSelected(e.target.checked ? new Set(list.map((c) => c.id)) : new Set())} /> {list.length} items</div>
              {list.map((c) => { const h = history?.[c.id]; return (
                <div key={c.id} className="flex items-start gap-2">
                  <input type="checkbox" className="mt-4 h-3.5 w-3.5 shrink-0 accent-[var(--accent)]" checked={selected.has(c.id)} onChange={() => toggle(c.id)} />
                  <div className="min-w-0 flex-1"><ContentRow item={c} lastPracticed={h?.last} rating={h?.rating} compact /></div>
                </div>
              ); })}
            </div>
          )}
        </>
      )}

      {tab === "collections" && (
        <div className="space-y-3">
          <div className="flex justify-end"><Button onClick={() => setColModal({ id: "", name: "", description: "", contentIds: [], createdAt: 0, updatedAt: 0 })}><FolderPlus className="h-4 w-4" /> New collection</Button></div>
          {collections?.length === 0 && <Empty title="No collections" description="Group content into programs like “CTO Preparation” or “Become Better at Flutter”." />}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {collections?.map((col) => {
              const items = (all ?? []).filter((c) => col.contentIds.includes(c.id));
              const byType = new Map<string, number>(); for (const i of items) byType.set(i.type, (byType.get(i.type) ?? 0) + 1);
              return (
                <Card key={col.id} className="p-4">
                  <div className="flex items-start justify-between gap-2"><div><div className="text-[15px] font-medium">{col.name}</div>{col.description && <div className="text-[13px] text-fg-muted">{col.description}</div>}</div><Button size="sm" variant="ghost" onClick={() => setColModal(col)}>Edit</Button></div>
                  <div className="mt-3 flex flex-wrap gap-1">{Array.from(byType.entries()).map(([t, n]) => <Badge key={t}>{n} {CONTENT_TYPE_LABELS[t as ContentType]?.toLowerCase()}</Badge>)}{items.length === 0 && <span className="text-xs text-fg-faint">empty · select items in Content and “Add to collection”</span>}</div>
                  <div className="mt-3 flex gap-2"><Link href={`/practice/random?collection=${col.id}`} className="text-sm font-medium underline-offset-2 hover:underline">Practice from this</Link></div>
                </Card>
              );
            })}
          </div>
          {colModal && (
            <Modal open onClose={() => setColModal(null)} title={colModal.id ? "Edit collection" : "New collection"}>
              <div className="space-y-3">
                <Field label="Name"><Input value={colModal.name} onChange={(e) => setColModal({ ...colModal, name: e.target.value })} autoFocus /></Field>
                <Field label="Description"><Textarea className="min-h-[60px]" value={colModal.description ?? ""} onChange={(e) => setColModal({ ...colModal, description: e.target.value })} /></Field>
                <p className="text-xs text-fg-muted">{colModal.contentIds.length} items. Add more by selecting items in the Content tab.</p>
                <div className="flex justify-between">
                  {colModal.id ? <Button variant="danger" onClick={async () => { await api.collections.remove(colModal.id); invalidate(); setColModal(null); }}>Delete</Button> : <span />}
                  <div className="flex gap-2"><Button variant="ghost" onClick={() => setColModal(null)}>Cancel</Button><Button variant="primary" onClick={async () => { if (!colModal.name.trim()) return; const body = { name: colModal.name, description: colModal.description }; if (colModal.id) await api.collections.update(colModal.id, body); else await api.collections.create(body); invalidate(); setColModal(null); }}>Save</Button></div>
                </div>
              </div>
            </Modal>
          )}
        </div>
      )}
    </div>
  );
}
