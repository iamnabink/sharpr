"use client";
import { BookMarked, Brain, Globe, Link2, Type } from "lucide-react";
import { CardLink, PageHeader } from "@/components/ui";
import { useBooks, useContentList, useResources, useVocabulary } from "@/lib/api/hooks";

export default function LearnPage() {
  const content = useContentList();
  const books = useBooks();
  const resources = useResources();
  const vocabulary = useVocabulary();
  const counts = {
    topics: content.data?.filter((c) => c.type === "technical_topic").length,
    knowledge: content.data?.filter((c) => c.type === "knowledge_topic").length,
    books: books.data?.length,
    resources: resources.data?.length,
    vocabulary: vocabulary.data?.length,
  };
  const items = [
    { href: "/learn/topics", label: "Topics", desc: "Technical topics with learning material. Speak first, learn second.", icon: Brain, n: counts?.topics },
    { href: "/learn/knowledge", label: "General knowledge", desc: "Economics, psychology, history, science and more.", icon: Globe, n: counts?.knowledge },
    { href: "/learn/books", label: "Books", desc: "Active recall after every chapter.", icon: BookMarked, n: counts?.books },
    { href: "/learn/resources", label: "Resources", desc: "Articles, docs, videos, cheatsheets linked to topics.", icon: Link2, n: counts?.resources },
    { href: "/learn/vocabulary", label: "Vocabulary", desc: "Precise, natural professional language.", icon: Type, n: counts?.vocabulary },
  ];
  return (
    <div>
      <PageHeader title="Learn" description="Learning comes after speaking. Discover what you don't know by trying to explain it." />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {items.map((m) => {
          const Icon = m.icon;
          return (
            <CardLink key={m.href} href={m.href} className="p-4">
              <div className="flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-muted"><Icon className="h-4 w-4" /></span>
                <div>
                  <div className="flex items-center gap-2 text-[15px] font-medium">{m.label}{m.n !== undefined && <span className="text-xs text-fg-faint tabular-nums">{m.n}</span>}</div>
                  <div className="mt-0.5 text-[13px] text-fg-muted">{m.desc}</div>
                </div>
              </div>
            </CardLink>
          );
        })}
      </div>
    </div>
  );
}
