"use client";
import { useState } from "react";
import { ExternalLink, Check } from "lucide-react";
import { Badge, Button } from "@/components/ui";
import { api } from "@/lib/api/client";
import { useInvalidatingMutation, useResourcesFor } from "@/lib/api/hooks";
import type { ContentItem } from "@/lib/content/types";
import { cn } from "@/lib/utils/format";

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="mb-2 text-[12px] font-semibold uppercase tracking-wider text-fg-muted">{title}</h3>
      {children}
    </section>
  );
}

function List({ items }: { items: string[] }) {
  return (
    <ul className="space-y-1.5 text-[14px] leading-relaxed">
      {items.map((it, i) => (
        <li key={i} className="flex gap-2">
          <span className="mt-[9px] h-1 w-1 shrink-0 rounded-full bg-fg-faint" />
          <span>{it}</span>
        </li>
      ))}
    </ul>
  );
}

/** Reveals learning material after speaking. */
export function LearnPanel({ item, className, collapsible }: { item: ContentItem; className?: string; collapsible?: boolean }) {
  const { data: resources } = useResourcesFor(item);
  const toggleDone = useInvalidatingMutation((id: string, completed: 0 | 1) => api.resources.update(id, { completed }));
  const [open, setOpen] = useState(!collapsible);
  const L = item.learning;
  const hasLearning = !!(L && (L.short || L.detailed || L.keyPoints?.length)) || !!item.modelAnswerNotes || (resources?.length ?? 0) > 0;

  if (!hasLearning) {
    return (
      <div className={cn("rounded-2xl border border-dashed p-5 text-sm text-fg-muted", className)}>
        No learning material attached yet. Add resources or notes to this item in the Library, or import them from an external agent.
      </div>
    );
  }

  return (
    <div className={cn("rounded-2xl border bg-elev p-5 shadow-card", className)}>
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold tracking-tight">Learn this topic</h2>
        {collapsible && (
          <Button size="sm" variant="ghost" onClick={() => setOpen((o) => !o)}>
            {open ? "Hide" : "Reveal"}
          </Button>
        )}
      </div>
      {open && (
        <div className="mt-4 space-y-6 animate-fade-up">
          {item.modelAnswerNotes && (
            <Block title="What a strong answer covers">
              <p className="text-[14px] leading-relaxed">{item.modelAnswerNotes}</p>
            </Block>
          )}
          {L?.short && (
            <Block title="In short">
              <p className="text-[15px] leading-relaxed">{L.short}</p>
            </Block>
          )}
          {L?.keyPoints?.length ? (
            <Block title="Key points">
              <List items={L.keyPoints} />
            </Block>
          ) : null}
          {L?.detailed && (
            <Block title="In depth">
              <div className="prose-sharpr text-[14px] text-fg">
                {L.detailed.split(/\n\n+/).map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
              </div>
            </Block>
          )}
          {L?.examples?.length ? (
            <Block title="Examples">
              <List items={L.examples} />
            </Block>
          ) : null}
          {L?.commonMistakes?.length ? (
            <Block title="Common mistakes">
              <List items={L.commonMistakes} />
            </Block>
          ) : null}
          {L?.interviewQuestions?.length ? (
            <Block title="Follow-up questions an interviewer might ask">
              <List items={L.interviewQuestions} />
            </Block>
          ) : null}
          {resources?.length ? (
            <Block title="Resources">
              <ul className="space-y-2">
                {resources.map((r) => (
                  <li key={r.id} className="flex items-start gap-2 text-[14px]">
                    <button
                      type="button"
                      title={r.completed ? "Completed" : "Mark completed"}
                      onClick={() => toggleDone(r.id, r.completed ? 0 : 1)}
                      className={cn("mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border", r.completed ? "border-success bg-success text-white" : "border-border-strong")}
                    >
                      {r.completed ? <Check className="h-3 w-3" /> : null}
                    </button>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {r.url ? (
                          <a href={r.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-medium underline-offset-2 hover:underline">
                            {r.title}
                            <ExternalLink className="h-3 w-3 text-fg-faint" />
                          </a>
                        ) : (
                          <span className="font-medium">{r.title}</span>
                        )}
                        <Badge>{r.type}</Badge>
                      </div>
                      {r.description && <div className="text-[13px] text-fg-muted">{r.description}</div>}
                      {r.body && <pre className="mt-1 whitespace-pre-wrap rounded-lg bg-muted p-3 font-sans text-[13px] leading-relaxed">{r.body}</pre>}
                    </div>
                  </li>
                ))}
              </ul>
            </Block>
          ) : null}
          {L?.relatedTopics?.length ? (
            <Block title="Related topics">
              <div className="flex flex-wrap gap-1.5">
                {L.relatedTopics.map((t) => (
                  <Badge key={t}>{t}</Badge>
                ))}
              </div>
            </Block>
          ) : null}
        </div>
      )}
    </div>
  );
}
