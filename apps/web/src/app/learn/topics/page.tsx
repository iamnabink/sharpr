"use client";
import { TypeHub } from "@/components/practice/TypeHub";

export default function Page() {
  return <TypeHub eyebrow="Learn" types="technical_topic" title="Topics" description="Each topic hides its learning material until you've spoken. Open a topic to read it anyway, or press play to explain first." groupBy="category" />;
}
