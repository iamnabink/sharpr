"use client";
import { PageHeader } from "@/components/ui";
import { ContentEditor } from "@/components/library/ContentEditor";

export default function NewContentPage() {
  return (
    <div>
      <PageHeader eyebrow="Library" title="New content" />
      <ContentEditor />
    </div>
  );
}
