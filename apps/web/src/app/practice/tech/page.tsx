"use client";
import { TypeHub } from "@/components/practice/TypeHub";
import { TECH_AUDIENCES } from "@/lib/content/types";
import { Badge } from "@/components/ui";

export default function Page() {
  return (
    <TypeHub types="technical_topic" title="Tech Talk" description="Explain a technology clearly. Speak first, then learn, then explain again to a different audience." groupBy="category">
      <div className="mb-5 flex flex-wrap items-center gap-1.5 text-xs text-fg-muted">
        <span>Audiences:</span>
        {TECH_AUDIENCES.map((a) => (
          <Badge key={a}>{a}</Badge>
        ))}
      </div>
    </TypeHub>
  );
}
