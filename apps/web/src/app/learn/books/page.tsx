"use client";
import { useState } from "react";
import { Plus } from "lucide-react";
import { Badge, Button, CardLink, Empty, Field, Input, Modal, PageHeader, Progress, Select } from "@/components/ui";
import { api } from "@/lib/api/client";
import { useBooks, useInvalidate } from "@/lib/api/hooks";
import { BOOK_STATUS, type BookStatus } from "@/lib/content/types";
import { titleCase } from "@/lib/utils/format";

export default function BooksPage() {
  const books = useBooks();
  const invalidate = useInvalidate();
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [status, setStatus] = useState<BookStatus>("reading");
  const [chapters, setChapters] = useState("");

  const add = async () => {
    if (!title.trim()) return;
    await api.books.create({ title: title.trim(), author: author.trim() || undefined, status, totalChapters: chapters ? Number(chapters) : undefined });
    invalidate();
    setAdding(false);
    setTitle(""); setAuthor(""); setChapters("");
  };

  const groups: BookStatus[] = ["reading", "want_to_read", "finished", "abandoned"];
  return (
    <div>
      <PageHeader eyebrow="Learn" title="Books" description="Not a tracker. After each chapter, explain it without looking." actions={<Button onClick={() => setAdding(true)}><Plus className="h-4 w-4" /> Add book</Button>} />
      {books.data && books.data.length === 0 && <Empty title="No books yet" action={<Button onClick={() => setAdding(true)}>Add your first book</Button>} />}
      {groups.map((g) => {
        const list = books.data?.filter((b) => b.status === g) ?? [];
        if (!list.length) return null;
        return (
          <section key={g} className="mb-6">
            <h2 className="mb-2 text-[13px] font-semibold uppercase tracking-wider text-fg-muted">{titleCase(g)}</h2>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {list.map((b) => (
                <CardLink key={b.id} href={`/learn/books/${b.id}`} className="p-4">
                  <div className="text-[15px] font-medium leading-snug">{b.title}</div>
                  {b.author && <div className="text-[13px] text-fg-muted">{b.author}</div>}
                  <div className="mt-2 flex items-center gap-2 text-xs text-fg-muted">
                    {b.totalChapters ? <>Chapter {b.currentChapter}/{b.totalChapters}</> : <>Chapter {b.currentChapter}</>}
                    <Badge>{b.ideas.length} ideas</Badge>
                    <Badge>{b.quotes.length} quotes</Badge>
                  </div>
                  {b.totalChapters ? <Progress value={(b.currentChapter / b.totalChapters) * 100} className="mt-2" tone="neutral" /> : null}
                </CardLink>
              ))}
            </div>
          </section>
        );
      })}
      <Modal open={adding} onClose={() => setAdding(false)} title="Add book">
        <div className="space-y-3">
          <Field label="Title"><Input value={title} onChange={(e) => setTitle(e.target.value)} autoFocus /></Field>
          <Field label="Author"><Input value={author} onChange={(e) => setAuthor(e.target.value)} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Status"><Select value={status} onChange={(e) => setStatus(e.target.value as BookStatus)}>{BOOK_STATUS.map((s) => <option key={s} value={s}>{titleCase(s)}</option>)}</Select></Field>
            <Field label="Total chapters"><Input type="number" value={chapters} onChange={(e) => setChapters(e.target.value)} /></Field>
          </div>
          <div className="flex justify-end gap-2"><Button variant="ghost" onClick={() => setAdding(false)}>Cancel</Button><Button variant="primary" onClick={add}>Add</Button></div>
        </div>
      </Modal>
    </div>
  );
}
