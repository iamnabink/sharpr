import { z } from "zod";
import {
  CONTENT_TYPES,
  DIFFICULTIES,
  INTERVIEW_TRACKS,
  RESOURCE_TYPES,
  STORY_FRAMEWORKS,
  TECH_AUDIENCES,
} from "./types";

/**
 * Import schema — the contract external AI agents produce.
 * Lenient on purpose: only `type`, `title` and `prompt` are required.
 * Everything else has sensible defaults.
 */

const strArr = z.array(z.string().trim().min(1)).default([]);

export const learningSchema = z
  .object({
    short: z.string().optional(),
    detailed: z.string().optional(),
    key_points: strArr.optional(),
    examples: strArr.optional(),
    common_mistakes: strArr.optional(),
    interview_questions: strArr.optional(),
    related_topics: strArr.optional(),
  })
  .partial();

export const counterargumentSchema = z.object({
  against: z.enum(["defend", "oppose"]),
  text: z.string().min(1),
});

export const importResourceSchema = z.object({
  type: z.enum(RESOURCE_TYPES).default("article"),
  title: z.string().trim().min(1),
  url: z.string().trim().optional(),
  author: z.string().optional(),
  description: z.string().optional(),
  body: z.string().optional(),
  tags: strArr,
});

export const importContentSchema = z.object({
  type: z.enum(CONTENT_TYPES),
  title: z.string().trim().min(1),
  prompt: z.string().trim().min(1),
  category: z.string().trim().default("General"),
  subcategory: z.string().trim().optional(),
  difficulty: z.enum(DIFFICULTIES).default("intermediate"),
  /** minutes (accepts either `duration` in minutes or `duration_seconds`) */
  duration: z.number().nonnegative().optional(),
  duration_seconds: z.number().nonnegative().optional(),
  preparation_seconds: z.number().nonnegative().default(30),
  tags: strArr,
  guiding_questions: strArr.optional(),
  track: z.enum(INTERVIEW_TRACKS).optional(),
  model_answer_notes: z.string().optional(),
  framework: z.enum(STORY_FRAMEWORKS).optional(),
  audiences: z.array(z.enum(TECH_AUDIENCES)).optional(),
  opening_question: z.string().optional(),
  discussion_points: strArr.optional(),
  follow_up_questions: strArr.optional(),
  controversial_angle: z.string().optional(),
  closing_question: z.string().optional(),
  position: z.string().optional(),
  counterarguments: z.array(counterargumentSchema).optional(),
  role: z.string().optional(),
  situation: z.string().optional(),
  learning: learningSchema.optional(),
  resources: z.array(importResourceSchema).default([]),
});
export type ImportContent = z.infer<typeof importContentSchema>;

export const importVocabularySchema = z.object({
  word: z.string().trim().min(1),
  meaning: z.string().trim().min(1),
  example: z.string().optional(),
  pronunciation: z.string().optional(),
  synonyms: strArr,
  category: z.string().default("other"),
  discovered_in: z.string().optional(),
  personal_example: z.string().optional(),
});

export const importCollectionSchema = z.object({
  name: z.string().trim().min(1),
  description: z.string().optional(),
  /** match by content title (exact, case-insensitive) or tag (prefix "tag:") */
  items: strArr,
});

export const importBookSchema = z.object({
  title: z.string().trim().min(1),
  author: z.string().optional(),
  status: z.enum(["want_to_read", "reading", "finished", "abandoned"]).default("want_to_read"),
  total_chapters: z.number().int().positive().optional(),
  current_chapter: z.number().int().nonnegative().default(0),
  notes: z.string().default(""),
  ideas: strArr,
  quotes: strArr,
  concepts: strArr,
  vocabulary: strArr,
  prompts: strArr,
});

/**
 * A full import file. Can be either:
 *  - a bare array of content items, or
 *  - an object with any of the keys below.
 */
export const importFileSchema = z.union([
  z.array(importContentSchema),
  z.object({
    content: z.array(importContentSchema).default([]),
    vocabulary: z.array(importVocabularySchema).default([]),
    resources: z
      .array(importResourceSchema.extend({ topics: strArr }))
      .default([]),
    collections: z.array(importCollectionSchema).default([]),
    books: z.array(importBookSchema).default([]),
  }),
]);
export type ImportFile = z.infer<typeof importFileSchema>;

export const DEFAULT_DURATION_SECONDS: Record<string, number> = {
  speaking_topic: 180,
  interview_question: 120,
  technical_topic: 180,
  storytelling_prompt: 180,
  podcast_topic: 600,
  debate: 180,
  scenario: 180,
  book_prompt: 120,
  knowledge_topic: 120,
  quick_speaking: 60,
};
