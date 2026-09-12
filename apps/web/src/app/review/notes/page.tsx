"use client";
import { useState } from "react";
import Link from "next/link";
import { Plus, Trash2 } from "lucide-react";
import { Button, Card, Field, Input, Modal, PageHeader, Tabs, Textarea, Empty } from "@/components/ui";
import { api } from "@/lib/api/client";
import { useAttempts, useInvalidate, useNotes } from "@/lib/api/hooks";
import type { Note } from "@/lib/content/practice-types";
import { formatDateTime } from "@/lib/utils/format";

export default function NotesPage() {
  const [tab, setTab] = useState<"notes" | "reviews" | "research">("reviews");
  const { data: notes } = useNotes();
  const { data: attempts } = useAttempts();
  const invalidate = useInvalidate();
  const reviews = attempts?.filter((a) => !!a.review && !!(a.review.wentWell || a.review.toImprove || a.review.toResearch));
  const [editing, setEditing] = useState<Note | null>(null);
  const blank = (): Note => ({ id: "", title: "", body: "", tags: [], createdAt: 0, updatedAt: 0 });
  const research = (reviews ?? []).filter((a) => a.review?.toResearch);

  return (
    <div>
      <PageHeader eyebrow="Review" title="Notes" description="What you wrote after speaking, and free-form notes." actions={<Button onClick={() => setEditing(blank())}><Plus className="h-4 w-4" /> New note</Button>} />
      <Tabs className="mb-4" value={tab} onChange={setTab} items={[{ value: "reviews", label: "From reviews", count: reviews?.length }, { value: "research", label: "To research", count: research.length }, { value: "notes", label: "Notes", count: notes?.length }]} />
      {tab === "reviews" && (reviews?.length ? <div className="space-y-2">{reviews.map((a) => (
        <Card key={a.id} className="p-4 text-sm">
          <Link href={`/review/recordings/${a.id}`} className="font-medium hover:underline">{a.contentTitle}</Link>
          <span className="ml-2 text-xs text-fg-faint">{formatDateTime(a.completedAt)}{a.review?.overall != null && ` · ${a.review.overall}/10`}</span>
          {a.review?.wentWell && <p className="mt-2"><span className="text-xs font-medium text-success">Well · </span>{a.review.wentWell}</p>}
          {a.review?.toImprove && <p className="mt-1"><span className="text-xs font-medium text-warn">Improve · </span>{a.review.toImprove}</p>}
          {a.review?.toResearch && <p className="mt-1"><span className="text-xs font-medium text-fg-muted">Research · </span>{a.review.toResearch}</p>}
        </Card>
      ))}</div> : <Empty title="No review notes yet" />)}
      {tab === "research" && (research.length ? <Card className="divide-y">{research.map((a) => <div key={a.id} className="px-4 py-3 text-sm"><div className="text-xs text-fg-muted">{a.contentTitle}</div>{a.review!.toResearch}</div>)}</Card> : <Empty title="Nothing to research" description="Fill in “What should I research?” after speaking." />)}
      {tab === "notes" && (notes?.length ? <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">{notes.map((n) => <button key={n.id} type="button" onClick={() => setEditing(n)} className="rounded-xl border bg-elev p-4 text-left hover:bg-hover"><div className="font-medium">{n.title || "Untitled"}</div><div className="mt-1 line-clamp-3 text-[13px] text-fg-muted">{n.body}</div><div className="mt-2 text-[11px] text-fg-faint">{formatDateTime(n.updatedAt)}</div></button>)}</div> : <Empty title="No notes" action={<Button onClick={() => setEditing(blank())}>New note</Button>} />)}
      {editing && (
        <Modal open onClose={() => setEditing(null)} title="Note" wide>
          <div className="space-y-3">
            <Field label="Title"><Input value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} autoFocus /></Field>
            <Field label="Body"><Textarea className="min-h-[220px]" value={editing.body} onChange={(e) => setEditing({ ...editing, body: e.target.value })} /></Field>
            <Field label="Tags" hint="comma-separated"><Input value={editing.tags.join(", ")} onChange={(e) => setEditing({ ...editing, tags: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })} /></Field>
            <div className="flex justify-between">
              {editing.id ? <Button variant="danger" onClick={async () => { await api.notes.remove(editing.id); invalidate(); setEditing(null); }}><Trash2 className="h-4 w-4" /> Delete</Button> : <span />}
              <div className="flex gap-2"><Button variant="ghost" onClick={() => setEditing(null)}>Cancel</Button><Button variant="primary" onClick={async () => { const body = { title: editing.title, body: editing.body, tags: editing.tags }; if (editing.id) await api.notes.update(editing.id, body); else await api.notes.create(body); invalidate(); setEditing(null); }}>Save</Button></div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
