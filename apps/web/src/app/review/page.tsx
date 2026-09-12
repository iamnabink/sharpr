"use client";
import { FileText, Mic, RotateCcw } from "lucide-react";
import { CardLink, PageHeader } from "@/components/ui";
import { useAttempts, useNotes, useRetryQueue } from "@/lib/api/hooks";

export default function ReviewPage() {
  const attempts = useAttempts();
  const retry = useRetryQueue("pending");
  const notes = useNotes();
  const counts = { recordings: attempts.data?.length, retry: retry.data?.length, notes: notes.data?.length };
  const items = [
    { href: "/review/recordings", label: "Recordings", desc: "Every attempt, with playback and your self-review.", icon: Mic, n: counts?.recordings },
    { href: "/review/retry", label: "Retry queue", desc: "Topics you chose to practice again later.", icon: RotateCcw, n: counts?.retry },
    { href: "/review/notes", label: "Notes", desc: "Free notes, plus everything you wrote in reviews.", icon: FileText, n: counts?.notes },
  ];
  return (
    <div>
      <PageHeader title="Review" description="Listen to yourself. Be specific about what to fix." />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {items.map((m) => { const Icon = m.icon; return (
          <CardLink key={m.href} href={m.href} className="p-4"><div className="flex items-start gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-muted"><Icon className="h-4 w-4" /></span><div><div className="flex items-center gap-2 text-[15px] font-medium">{m.label}{m.n !== undefined && <span className="text-xs text-fg-faint tabular-nums">{m.n}</span>}</div><div className="mt-0.5 text-[13px] text-fg-muted">{m.desc}</div></div></div></CardLink>
        ); })}
      </div>
    </div>
  );
}
