"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Shuffle } from "lucide-react";
import { AccentButton, Chip, Empty, Input, PageHeader } from "@/components/ui";
import { ContentRow } from "@/components/library/ContentCard";
import { api } from "@/lib/api/client";
import { useContentByType, useHistoryIndex } from "@/lib/api/hooks";
import type { ContentItem, ContentType, Difficulty } from "@/lib/content/types";
import { DIFFICULTIES } from "@/lib/content/types";

export function TypeHub({
  types,
  title,
  description,
  eyebrow = "Practice",
  groupBy = "category",
  children,
}: {
  types: ContentType | ContentType[];
  title: string;
  description?: string;
  eyebrow?: string;
  groupBy?: "category" | "subcategory" | "track";
  children?: React.ReactNode;
}) {
  const router = useRouter();
  const { data: items } = useContentByType(types);
  const { data: history } = useHistoryIndex();
  const [q, setQ] = useState("");
  const [group, setGroup] = useState<string | null>(null);
  const [difficulty, setDifficulty] = useState<Difficulty | null>(null);
  const [onlyNew, setOnlyNew] = useState(false);

  const groups = useMemo(() => {
    const m = new Map<string, number>();
    for (const it of items ?? []) {
      const key = (it[groupBy] as string | undefined) ?? it.category;
      m.set(key, (m.get(key) ?? 0) + 1);
    }
    return Array.from(m.entries()).sort((a, b) => b[1] - a[1]);
  }, [items, groupBy]);

  const filtered = useMemo(() => {
    let list = items ?? [];
    if (group) list = list.filter((it) => ((it[groupBy] as string | undefined) ?? it.category) === group);
    if (difficulty) list = list.filter((it) => it.difficulty === difficulty);
    if (onlyNew && history) list = list.filter((it) => !history[it.id]);
    if (q.trim()) {
      const s = q.toLowerCase();
      list = list.filter((it) => [it.title, it.prompt, it.category, it.subcategory ?? "", ...it.tags].join(" ").toLowerCase().includes(s));
    }
    return [...list].sort((a, b) => a.title.localeCompare(b.title));
  }, [items, group, difficulty, onlyNew, q, history, groupBy]);

  const random = async () => {
    const r = await api.engine.random({
      type: Array.isArray(types) ? types : [types],
      category: group ?? undefined,
      difficulty: difficulty ? [difficulty] : undefined,
      onlyNeverPracticed: onlyNew,
    });
    if (r.pick) router.push(`/practice/run?content=${r.pick.item.id}`);
  };

  return (
    <div>
      <PageHeader
        eyebrow={eyebrow}
        title={title}
        description={description}
        actions={
          <AccentButton size="md" onClick={random} disabled={!filtered.length}>
            <Shuffle className="h-4 w-4" /> Random {group ? `from ${group}` : ""}
          </AccentButton>
        }
      />
      {children}
      <div className="mb-4 flex flex-col gap-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-faint" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search prompts…" className="pl-9" />
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Chip active={!group} onClick={() => setGroup(null)}>
            All <span className="text-fg-faint tabular-nums">{items?.length ?? 0}</span>
          </Chip>
          {groups.map(([g, n]) => (
            <Chip key={g} active={group === g} onClick={() => setGroup(group === g ? null : g)}>
              {g} <span className="text-fg-faint tabular-nums">{n}</span>
            </Chip>
          ))}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {DIFFICULTIES.map((d) => (
            <Chip key={d} active={difficulty === d} onClick={() => setDifficulty(difficulty === d ? null : d)}>
              {d}
            </Chip>
          ))}
          <Chip active={onlyNew} onClick={() => setOnlyNew((v) => !v)}>
            never practiced
          </Chip>
        </div>
      </div>
      {items && items.length === 0 ? (
        <Empty title="Nothing here yet" description="Import content from an external agent or create items in the Library." />
      ) : filtered.length === 0 ? (
        <Empty title="No matches" description="Try clearing a filter." />
      ) : (
        <div className="space-y-2">
          {filtered.map((it: ContentItem) => {
            const h = history?.[it.id];
            return <ContentRow key={it.id} item={it} lastPracticed={h?.last} rating={h?.rating} />;
          })}
        </div>
      )}
    </div>
  );
}
