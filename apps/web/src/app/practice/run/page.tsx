"use client";
import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PracticeRunner } from "@/components/practice/PracticeRunner";
import { useContent } from "@/lib/api/hooks";

function Runner() {
  const params = useSearchParams();
  const id = params.get("content");
  const pass = Number(params.get("pass") ?? 1);
  const variant = params.get("variant") ?? undefined;
  const content = useContent(id);

  if (!id) return <p className="text-sm text-fg-muted">No content selected.</p>;
  if (content.isLoading) return <p className="text-sm text-fg-faint">Loading…</p>;
  if (!content.data) return <p className="text-sm text-fg-muted">This item no longer exists.</p>;

  return (
    <div>
      <Link href="/practice" className="mb-4 inline-flex items-center gap-1 text-[13px] text-fg-muted hover:text-fg"><ArrowLeft className="h-3.5 w-3.5" /> Practice</Link>
      <PracticeRunner key={`${content.data.id}:${pass}:${variant ?? ""}`} content={content.data} pass={pass} variant={variant} />
    </div>
  );
}

export default function RunPage() {
  return (
    <Suspense fallback={null}>
      <Runner />
    </Suspense>
  );
}
