"use client";
import { useMemo, useState } from "react";
import { Check, ExternalLink, Plus, Trash2 } from "lucide-react";
import { Badge, Button, Card, Chip, Empty, Field, Input, Modal, PageHeader, Select, Textarea } from "@/components/ui";
import { api } from "@/lib/api/client";
import { useContentList, useInvalidate, useResources } from "@/lib/api/hooks";
import { RESOURCE_TYPES, type LearningResource, type ResourceType } from "@/lib/content/types";
import { cn } from "@/lib/utils/format";

export default function ResourcesPage() {
  const { data: resources } = useResources();
  const { data: content } = useContentList({ status: "all" });
  const invalidate = useInvalidate();
  const [type, setType] = useState<ResourceType | null>(null);
  const [q, setQ] = useState("");
  const [showDone, setShowDone] = useState(true);
  const [editing, setEditing] = useState<LearningResource | null>(null);
  const titleOf = useMemo(() => new Map((content ?? []).map((c) => [c.id, c.title])), [content]);

  const list = (resources ?? []).filter((r) => (!type || r.type === type) && (showDone || !r.completed) && (!q || [r.title, r.description ?? "", ...r.tags].join(" ").toLowerCase().includes(q.toLowerCase())));

  const blank = (): LearningResource => ({ id: "", type: "article", title: "", tags: [], topicIds: [], completed: 0, createdAt: 0, updatedAt: 0 });

  return (
    <div>
      <PageHeader eyebrow="Learn" title="Resources" description="Many-to-many with topics. One resource can support several." actions={<Button onClick={() => setEditing(blank())}><Plus className="h-4 w-4" /> Add resource</Button>} />
      <div className="mb-4 space-y-2">
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search resources…" />
        <div className="flex flex-wrap gap-1.5">
          <Chip active={!type} onClick={() => setType(null)}>All</Chip>
          {RESOURCE_TYPES.map((t) => <Chip key={t} active={type === t} onClick={() => setType(type === t ? null : t)}>{t}</Chip>)}
          <Chip active={!showDone} onClick={() => setShowDone((s) => !s)}>hide completed</Chip>
        </div>
      </div>
      {resources && resources.length === 0 ? <Empty title="No resources yet" description="Resources arrive with imported topics, or add them here." /> : (
        <div className="space-y-2">
          {list.map((r) => (
            <Card key={r.id} className="flex items-start gap-3 px-4 py-3">
              <button type="button" onClick={async () => { await api.resources.update(r.id, { completed: r.completed ? 0 : 1 }); invalidate(); }} className={cn("mt-1 flex h-4 w-4 shrink-0 items-center justify-center rounded border", r.completed ? "border-success bg-success text-white" : "border-border-strong")}>{r.completed ? <Check className="h-3 w-3" /> : null}</button>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  {r.url ? <a href={r.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[14px] font-medium underline-offset-2 hover:underline">{r.title}<ExternalLink className="h-3 w-3 text-fg-faint" /></a> : <span className="text-[14px] font-medium">{r.title}</span>}
                  <Badge>{r.type}</Badge>
                  {r.author && <span className="text-xs text-fg-muted">{r.author}</span>}
                </div>
                {r.description && <div className="mt-0.5 text-[13px] text-fg-muted">{r.description}</div>}
                {r.topicIds.length > 0 && <div className="mt-1.5 flex flex-wrap gap-1">{r.topicIds.map((id) => titleOf.get(id)).filter(Boolean).map((t) => <Badge key={t} tone="accent">{t}</Badge>)}</div>}
              </div>
              <Button size="sm" variant="ghost" onClick={() => setEditing(r)}>Edit</Button>
            </Card>
          ))}
        </div>
      )}
      {editing && <ResourceEditor resource={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}

function ResourceEditor({ resource, onClose }: { resource: LearningResource; onClose: () => void }) {
  const [r, setR] = useState(resource);
  const [topicQuery, setTopicQuery] = useState("");
  const { data: content } = useContentList({ status: "all" });
  const invalidate = useInvalidate();
  const matches = (content ?? []).filter((c) => topicQuery && c.title.toLowerCase().includes(topicQuery.toLowerCase())).slice(0, 6);
  const isNew = !resource.id;
  const save = async () => {
    if (!r.title.trim()) return;
    const body = { type: r.type, title: r.title, url: r.url, author: r.author, description: r.description, body: r.body, tags: r.tags, topicIds: r.topicIds, completed: r.completed };
    if (isNew) await api.resources.create(body);
    else await api.resources.update(r.id, body);
    invalidate();
    onClose();
  };
  const remove = async () => {
    await api.resources.remove(r.id);
    invalidate();
    onClose();
  };
  return (
    <Modal open onClose={onClose} title={isNew ? "Add resource" : "Edit resource"} wide>
      <div className="space-y-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Field label="Title" className="sm:col-span-2"><Input value={r.title} onChange={(e) => setR({ ...r, title: e.target.value })} autoFocus /></Field>
          <Field label="Type"><Select value={r.type} onChange={(e) => setR({ ...r, type: e.target.value as ResourceType })}>{RESOURCE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}</Select></Field>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="URL"><Input value={r.url ?? ""} onChange={(e) => setR({ ...r, url: e.target.value || undefined })} placeholder="https://" /></Field>
          <Field label="Author"><Input value={r.author ?? ""} onChange={(e) => setR({ ...r, author: e.target.value || undefined })} /></Field>
        </div>
        <Field label="Description"><Input value={r.description ?? ""} onChange={(e) => setR({ ...r, description: e.target.value || undefined })} /></Field>
        <Field label="Body / notes / cheatsheet"><Textarea value={r.body ?? ""} onChange={(e) => setR({ ...r, body: e.target.value || undefined })} /></Field>
        <Field label="Tags" hint="comma-separated"><Input value={r.tags.join(", ")} onChange={(e) => setR({ ...r, tags: e.target.value.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean) })} /></Field>
        <div>
          <div className="mb-1.5 text-[13px] font-medium">Linked topics</div>
          <div className="mb-2 flex flex-wrap gap-1">
            {r.topicIds.map((id) => { const c = content?.find((x) => x.id === id); return c ? <button key={id} type="button" onClick={() => setR({ ...r, topicIds: r.topicIds.filter((x) => x !== id) })}><Badge tone="accent">{c.title} ×</Badge></button> : null; })}
          </div>
          <Input value={topicQuery} onChange={(e) => setTopicQuery(e.target.value)} placeholder="Search topics to link…" />
          {matches.length > 0 && <div className="mt-1 rounded-xl border bg-elev">{matches.map((c) => <button key={c.id} type="button" className="block w-full px-3 py-2 text-left text-sm hover:bg-hover" onClick={() => { if (!r.topicIds.includes(c.id)) setR({ ...r, topicIds: [...r.topicIds, c.id] }); setTopicQuery(""); }}>{c.title} <span className="text-xs text-fg-faint">{c.category}</span></button>)}</div>}
        </div>
        <div className="flex justify-between">
          {!isNew ? <Button variant="danger" onClick={remove}><Trash2 className="h-4 w-4" /> Delete</Button> : <span />}
          <div className="flex gap-2"><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant="primary" onClick={save}>Save</Button></div>
        </div>
      </div>
    </Modal>
  );
}
