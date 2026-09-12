"use client";
import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Mic, Minus, Plus, Trash2 } from "lucide-react";
import { AccentButton, Badge, Button, Card, Field, Input, Select, Textarea, useToast } from "@/components/ui";
import { api } from "@/lib/api/client";
import { useBook, useContentList, useInvalidate } from "@/lib/api/hooks";
import { BOOK_CHAPTER_PROMPTS, BOOK_STATUS, type Book, type BookStatus } from "@/lib/content/types";
import { titleCase } from "@/lib/utils/format";

function ListEditor({ label, items, onChange, placeholder }: { label: string; items: string[]; onChange: (v: string[]) => void; placeholder?: string }) {
  const [draft, setDraft] = useState("");
  const add = () => { if (!draft.trim()) return; onChange([...items, draft.trim()]); setDraft(""); };
  return (
    <div>
      <div className="mb-1.5 text-[13px] font-medium">{label}</div>
      <ul className="mb-2 space-y-1">
        {items.map((it, i) => (
          <li key={i} className="group flex items-start gap-2 rounded-lg bg-muted px-3 py-2 text-[14px]">
            <span className="flex-1">{it}</span>
            <button type="button" onClick={() => onChange(items.filter((_, j) => j !== i))} className="text-fg-faint opacity-0 hover:text-danger group-hover:opacity-100"><Trash2 className="h-3.5 w-3.5" /></button>
          </li>
        ))}
      </ul>
      <div className="flex gap-2">
        <Input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={placeholder} onKeyDown={(e) => e.key === "Enter" && add()} />
        <Button onClick={add}><Plus className="h-4 w-4" /></Button>
      </div>
    </div>
  );
}

export default function BookPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const bookQ = useBook(id);
  const book = bookQ.data;
  const invalidate = useInvalidate();
  const { data: prompts } = useContentList({ type: ["book_prompt"], bookId: id });
  const [notesDraft, setNotesDraft] = useState<string | null>(null);

  if (bookQ.isLoading) return null;
  if (!book) return <p className="text-sm text-fg-muted">Book not found.</p>;

  const patch = async (p: Partial<Book>) => {
    await api.books.update(book.id, p);
    invalidate();
  };

  const speak = async (prompt: string) => {
    // find or create a book_prompt content item for this exact prompt
    const existing = prompts?.find((p) => p.prompt === `${prompt} (${book.title}, chapter ${book.currentChapter})`);
    const cid = existing?.id ?? (await api.content.create({
      type: "book_prompt",
      title: `${book.title} · Ch. ${book.currentChapter}: ${prompt}`,
      prompt: `${prompt} (${book.title}, chapter ${book.currentChapter})`,
      category: "Books",
      subcategory: book.title,
      difficulty: "intermediate",
      durationSeconds: prompt.includes("2 minutes") ? 120 : 180,
      preparationSeconds: 20,
      tags: ["books", "active-recall"],
      bookId: book.id,
    })).id;
    router.push(`/practice/run?content=${cid}`);
  };

  return (
    <div className="space-y-6">
      <Link href="/learn/books" className="inline-flex items-center gap-1 text-[13px] text-fg-muted hover:text-fg"><ArrowLeft className="h-3.5 w-3.5" /> Books</Link>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{book.title}</h1>
          {book.author && <div className="text-sm text-fg-muted">{book.author}</div>}
        </div>
        <div className="flex items-center gap-2">
          <Select value={book.status} onChange={(e) => patch({ status: e.target.value as BookStatus })} className="w-40">{BOOK_STATUS.map((s) => <option key={s} value={s}>{titleCase(s)}</option>)}</Select>
          <Button variant="ghost" onClick={async () => { if (confirm("Delete this book?")) { await api.books.remove(book.id); invalidate(); router.push("/learn/books"); } }}><Trash2 className="h-4 w-4" /></Button>
        </div>
      </div>

      <Card className="flex flex-wrap items-center gap-6 p-4">
        <div>
          <div className="text-xs text-fg-muted">Current chapter</div>
          <div className="mt-1 flex items-center gap-2">
            <Button size="sm" onClick={() => patch({ currentChapter: Math.max(0, book.currentChapter - 1) })}><Minus className="h-3.5 w-3.5" /></Button>
            <span className="w-16 text-center text-xl font-semibold tabular-nums">{book.currentChapter}{book.totalChapters ? <span className="text-sm text-fg-faint"> / {book.totalChapters}</span> : null}</span>
            <Button size="sm" onClick={() => patch({ currentChapter: book.currentChapter + 1 })}><Plus className="h-3.5 w-3.5" /></Button>
          </div>
        </div>
        <div>
          <div className="text-xs text-fg-muted">Pages read</div>
          <div className="mt-1 flex items-center gap-2">
            <Input type="number" className="w-24" value={book.pagesRead} onChange={(e) => patch({ pagesRead: Number(e.target.value) })} />
          </div>
        </div>
        <div>
          <div className="text-xs text-fg-muted">Total chapters</div>
          <Input type="number" className="mt-1 w-24" value={book.totalChapters ?? ""} onChange={(e) => patch({ totalChapters: e.target.value ? Number(e.target.value) : undefined })} />
        </div>
      </Card>

      <Card className="p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold tracking-tight">After this chapter</h2>
          <AccentButton size="sm" onClick={() => speak(BOOK_CHAPTER_PROMPTS[Math.floor(Math.random() * BOOK_CHAPTER_PROMPTS.length)])}><Mic className="h-3.5 w-3.5" /> Random prompt</AccentButton>
        </div>
        <p className="mt-1 text-sm text-fg-muted">Close the book. Pick one and speak.</p>
        <div className="mt-3 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
          {[...BOOK_CHAPTER_PROMPTS, ...book.prompts].map((p) => (
            <button key={p} type="button" onClick={() => speak(p)} className="flex items-center justify-between rounded-xl border px-3 py-2.5 text-left text-[14px] hover:bg-hover">
              {p}<Mic className="h-3.5 w-3.5 shrink-0 text-fg-faint" />
            </button>
          ))}
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <Card className="space-y-5 p-5">
          <ListEditor label="Important ideas" items={book.ideas} onChange={(v) => patch({ ideas: v })} placeholder="One idea per line" />
          <ListEditor label="Quotes" items={book.quotes} onChange={(v) => patch({ quotes: v })} placeholder="A quote worth keeping" />
          <ListEditor label="Concepts" items={book.concepts} onChange={(v) => patch({ concepts: v })} placeholder="A concept to be able to explain" />
        </Card>
        <Card className="space-y-5 p-5">
          <Field label="Notes">
            <Textarea className="min-h-[160px]" value={notesDraft ?? book.notes} onChange={(e) => setNotesDraft(e.target.value)} onBlur={() => { if (notesDraft !== null) { patch({ notes: notesDraft }); setNotesDraft(null); } }} />
          </Field>
          <ListEditor label="Vocabulary from this book" items={book.vocabulary} onChange={(v) => patch({ vocabulary: v })} placeholder="word or phrase" />
          <ListEditor label="Custom discussion prompts" items={book.prompts} onChange={(v) => patch({ prompts: v })} placeholder="e.g. How does chapter 3 apply to hiring?" />
          {book.vocabulary.length > 0 && (
            <Button size="sm" onClick={async () => {
              const all = await api.vocabulary.list();
              const have = new Set(all.map((v) => v.word.toLowerCase()));
              for (const w of book.vocabulary) if (!have.has(w.toLowerCase())) await api.vocabulary.create({ word: w, meaning: "", category: "other", discoveredIn: book.title });
              invalidate();
              toast.push("Added to Vocabulary", "success");
            }}>Send words to Vocabulary</Button>
          )}
        </Card>
      </div>

      {prompts && prompts.length > 0 && (
        <div>
          <h2 className="mb-2 text-[13px] font-semibold uppercase tracking-wider text-fg-muted">Prompts practiced for this book</h2>
          <div className="flex flex-wrap gap-1.5">{prompts.map((p) => <Badge key={p.id}>{p.title.split(": ").slice(1).join(": ")}</Badge>)}</div>
        </div>
      )}
    </div>
  );
}
