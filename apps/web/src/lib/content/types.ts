/**
 * Sharpr content model.
 *
 * One flexible `ContentItem` record covers every practice/learning unit.
 * Type-specific fields live on the same record but are optional, so the
 * import format stays flat and easy for external AI agents to produce.
 */

export const CONTENT_TYPES = [
  "speaking_topic",
  "interview_question",
  "technical_topic",
  "storytelling_prompt",
  "podcast_topic",
  "debate",
  "scenario",
  "book_prompt",
  "knowledge_topic",
  "quick_speaking",
] as const;
export type ContentType = (typeof CONTENT_TYPES)[number];

export const CONTENT_TYPE_LABELS: Record<ContentType, string> = {
  speaking_topic: "Speaking topic",
  interview_question: "Interview question",
  technical_topic: "Tech talk",
  storytelling_prompt: "Story prompt",
  podcast_topic: "Podcast episode",
  debate: "Debate",
  scenario: "Scenario",
  book_prompt: "Book prompt",
  knowledge_topic: "Knowledge topic",
  quick_speaking: "Quick speaking",
};

export const DIFFICULTIES = ["beginner", "intermediate", "advanced", "expert"] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];

export const CONTENT_STATUS = ["active", "archived"] as const;
export type ContentStatus = (typeof CONTENT_STATUS)[number];

export const INTERVIEW_TRACKS = [
  "flutter",
  "full_stack",
  "ai_engineer",
  "system_design",
  "cto",
  "founder",
  "behavioral",
] as const;
export type InterviewTrack = (typeof INTERVIEW_TRACKS)[number];

export const INTERVIEW_TRACK_LABELS: Record<InterviewTrack, string> = {
  flutter: "Flutter",
  full_stack: "Full Stack",
  ai_engineer: "AI Engineer",
  system_design: "System Design",
  cto: "CTO",
  founder: "Founder",
  behavioral: "Behavioral",
};

export const STORY_FRAMEWORKS = [
  "STAR",
  "Situation → Conflict → Resolution",
  "Beginning → Tension → Climax → Ending",
  "Hook → Story → Lesson",
  "Before → Change → After",
] as const;
export type StoryFramework = (typeof STORY_FRAMEWORKS)[number];

export const STORY_CATEGORIES = [
  "personal",
  "professional",
  "technical",
  "funny",
  "emotional",
  "leadership",
  "interview",
  "founder",
  "fictional",
] as const;

export const TECH_AUDIENCES = [
  "beginner",
  "junior developer",
  "senior developer",
  "CTO",
  "CEO",
  "investor",
  "customer",
  "no jargon",
] as const;
export type TechAudience = (typeof TECH_AUDIENCES)[number];

export const RESOURCE_TYPES = [
  "article",
  "documentation",
  "video",
  "podcast",
  "book",
  "course",
  "notes",
  "cheatsheet",
  "website",
] as const;
export type ResourceType = (typeof RESOURCE_TYPES)[number];

/** Learning material revealed after the user has spoken (Speak First → Learn Second). */
export interface LearningContent {
  short?: string;
  detailed?: string;
  keyPoints?: string[];
  examples?: string[];
  commonMistakes?: string[];
  interviewQuestions?: string[];
  relatedTopics?: string[];
}

export interface DebateCounterargument {
  /** Which side this counterargument attacks. */
  against: "defend" | "oppose";
  text: string;
}

export interface ContentItem {
  id: string;
  type: ContentType;
  title: string;
  /** The actual instruction shown to the user, e.g. "Explain how database indexes work." */
  prompt: string;
  category: string;
  subcategory?: string;
  difficulty: Difficulty;
  /** Recommended speaking duration in seconds. */
  durationSeconds: number;
  /** Preparation time in seconds (0 = none). */
  preparationSeconds: number;
  tags: string[];
  status: ContentStatus;
  /** 0 | 1 so Dexie can index it */
  bookmarked: 0 | 1;
  /** Where the content came from: "seed" | "manual" | "import:<filename>" */
  source: string;
  createdAt: number;
  updatedAt: number;

  // ---- optional, type-specific ----
  guidingQuestions?: string[];
  /** interview_question */
  track?: InterviewTrack;
  modelAnswerNotes?: string;
  /** storytelling_prompt */
  framework?: StoryFramework;
  /** technical_topic: audiences to practice explaining to */
  audiences?: TechAudience[];
  /** podcast_topic */
  openingQuestion?: string;
  discussionPoints?: string[];
  followUpQuestions?: string[];
  controversialAngle?: string;
  closingQuestion?: string;
  /** debate */
  position?: string;
  counterarguments?: DebateCounterargument[];
  /** scenario: role-play context */
  role?: string;
  situation?: string;
  /** book_prompt */
  bookId?: string;
  /** technical_topic / knowledge_topic: material revealed after speaking */
  learning?: LearningContent;
  /** ids of LearningResource records */
  resourceIds: string[];
}

export interface LearningResource {
  id: string;
  type: ResourceType;
  title: string;
  url?: string;
  author?: string;
  description?: string;
  /** free-form notes / cheatsheet body (plain text) */
  body?: string;
  tags: string[];
  /** many-to-many: one resource can support many topics */
  topicIds: string[];
  completed: 0 | 1;
  createdAt: number;
  updatedAt: number;
}

export interface Collection {
  id: string;
  name: string;
  description?: string;
  contentIds: string[];
  createdAt: number;
  updatedAt: number;
}

export interface VocabularyItem {
  id: string;
  word: string;
  meaning: string;
  example?: string;
  pronunciation?: string;
  synonyms: string[];
  category: string;
  discoveredIn?: string;
  personalExample?: string;
  timesUsed: number;
  createdAt: number;
  updatedAt: number;
}

export const VOCAB_CATEGORIES = [
  "professional phrase",
  "precise vocabulary",
  "concise expression",
  "executive language",
  "transition phrase",
  "storytelling expression",
  "persuasive language",
  "technical term",
  "idiom",
  "other",
] as const;

export const BOOK_STATUS = ["want_to_read", "reading", "finished", "abandoned"] as const;
export type BookStatus = (typeof BOOK_STATUS)[number];

export interface Book {
  id: string;
  title: string;
  author?: string;
  status: BookStatus;
  totalChapters?: number;
  currentChapter: number;
  pagesRead: number;
  notes: string;
  ideas: string[];
  quotes: string[];
  concepts: string[];
  vocabulary: string[];
  /** Custom discussion prompts in addition to the built-in ones. */
  prompts: string[];
  createdAt: number;
  updatedAt: number;
}

/** Built-in active-recall prompts shown after any chapter. */
export const BOOK_CHAPTER_PROMPTS = [
  "Explain the chapter without looking.",
  "What was the main argument?",
  "What did you disagree with?",
  "What surprised you?",
  "Explain it in 2 minutes.",
  "Relate it to your career.",
  "Relate it to another book.",
  "How could you apply this idea?",
  "Teach the chapter to someone else.",
];
