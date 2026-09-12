"use client";
import { TypeHub } from "@/components/practice/TypeHub";

export default function Page() {
  return <TypeHub types="podcast_topic" title="Podcast mode" description="You are the guest. The host opens, pushes with follow-ups, and closes. Speak long-form." groupBy="subcategory" />;
}
