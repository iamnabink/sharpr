import type { RandomParams } from "@/lib/api/client";

/** Named presets exposed in the UI. Weighting happens server-side. */
export const RANDOM_PRESETS: { id: string; label: string; filter: RandomParams; hint?: string }[] = [
  { id: "surprise", label: "Surprise me", filter: {}, hint: "Anything at all" },
  { id: "communication", label: "Communication", filter: { type: ["speaking_topic", "storytelling_prompt", "debate", "quick_speaking"] } },
  { id: "technical", label: "Technical", filter: { type: ["technical_topic", "interview_question"] } },
  { id: "interview", label: "Interview", filter: { type: ["interview_question", "scenario"] } },
  { id: "storytelling", label: "Storytelling", filter: { type: ["storytelling_prompt"] } },
  { id: "podcast", label: "Podcast", filter: { type: ["podcast_topic"] } },
  { id: "leadership", label: "Leadership", filter: { category: "cto", type: ["interview_question", "scenario", "speaking_topic"] } },
  { id: "founder", label: "Founder", filter: { category: "founder" } },
  { id: "books", label: "Books", filter: { type: ["book_prompt"] } },
  { id: "knowledge", label: "General knowledge", filter: { type: ["knowledge_topic"] } },
  { id: "difficult", label: "Difficult", filter: { difficulty: ["advanced", "expert"] } },
  { id: "quick", label: "Quick practice", filter: { maxDuration: 120 } },
  { id: "five", label: "5-minute challenge", filter: { minDuration: 240, maxDuration: 360 } },
  { id: "fifteen", label: "15-minute session", filter: { minDuration: 600 } },
];
