/**
 * Practice / review / progress records.
 * Kept separate from content so content stays importable and portable.
 */

export const RATING_DIMENSIONS = [
  "fluency",
  "confidence",
  "clarity",
  "vocabulary",
  "grammar",
  "pronunciation",
  "conciseness",
  "organization",
  "knowledge",
  "storytelling",
  "persuasiveness",
  "technicalAccuracy",
] as const;
export type RatingDimension = (typeof RATING_DIMENSIONS)[number];

export const RATING_LABELS: Record<RatingDimension, string> = {
  fluency: "Fluency",
  confidence: "Confidence",
  clarity: "Clarity",
  vocabulary: "Vocabulary",
  grammar: "Grammar",
  pronunciation: "Pronunciation",
  conciseness: "Conciseness",
  organization: "Organization",
  knowledge: "Knowledge",
  storytelling: "Storytelling",
  persuasiveness: "Persuasiveness",
  technicalAccuracy: "Technical accuracy",
};

export const REVIEW_FLAGS = [
  "filler_words",
  "too_fast",
  "too_slow",
  "repeated_myself",
  "weak_opening",
  "weak_conclusion",
  "forgot_information",
  "lacked_examples",
  "too_much_jargon",
  "lost_train_of_thought",
] as const;
export type ReviewFlag = (typeof REVIEW_FLAGS)[number];

export const REVIEW_FLAG_LABELS: Record<ReviewFlag, string> = {
  filler_words: "Too many filler words",
  too_fast: "Spoke too quickly",
  too_slow: "Spoke too slowly",
  repeated_myself: "Repeated myself",
  weak_opening: "Weak opening",
  weak_conclusion: "Weak conclusion",
  forgot_information: "Forgot important information",
  lacked_examples: "Lacked examples",
  too_much_jargon: "Overused technical jargon",
  lost_train_of_thought: "Lost train of thought",
};

export type RecordingKind = "audio" | "video" | "none";

export interface Recording {
  id: string;
  attemptId: string;
  kind: Exclude<RecordingKind, "none">;
  mimeType: string;
  sizeBytes: number;
  durationSeconds: number;
  createdAt: number;
  /** stream URL served by the API */
  url: string;
}

export interface Review {
  ratings: Partial<Record<RatingDimension, number>>;
  /** average of provided ratings, 1–10 */
  overall?: number | null;
  flags: ReviewFlag[];
  wentWell?: string;
  toImprove?: string;
  toResearch?: string;
  wordsToLearn?: string;
}

/** One practice attempt of one content item. */
export interface Attempt {
  id: string;
  contentId: string;
  contentType: string;
  contentTitle: string;
  category: string;
  difficulty: string;
  /** e.g. tech-talk audience, debate side, "explain again" pass number */
  variant?: string;
  /** 1 = before learning, 2 = "explain again" after learning */
  pass: number;
  recordingKind: RecordingKind;
  recordingId?: string;
  /** Actual speaking seconds */
  durationSeconds: number;
  startedAt: number;
  completedAt: number;
  review?: Review | null;
  /** vocabulary ids the user was asked to use */
  vocabularyIds?: string[];
  sessionRunId?: string;
}

export const RETRY_STATUS = ["pending", "done", "dismissed"] as const;
export type RetryStatus = (typeof RETRY_STATUS)[number];

export interface RetryItem {
  id: string;
  contentId: string;
  attemptId?: string;
  reason?: string;
  dueAt: number;
  status: RetryStatus;
  createdAt: number;
}

export interface SessionStep {
  id: string;
  label: string;
  /** which content types can satisfy this step; empty = any */
  types: string[];
  /** optional category filter (case-insensitive contains) */
  category?: string;
  /** optional difficulty filter */
  difficulty?: string;
  /** override duration in seconds (0 = use content default) */
  durationSeconds?: number;
  /** step kinds that aren't content-driven */
  kind: "practice" | "learn" | "reflect";
}

export interface SessionTemplate {
  id: string;
  name: string;
  description?: string;
  estimatedMinutes: number;
  steps: SessionStep[];
  builtIn: 0 | 1;
  createdAt: number;
  updatedAt: number;
}

export interface SessionRun {
  id: string;
  templateId: string;
  templateName: string;
  startedAt: number;
  completedAt?: number;
  currentStep: number;
  steps: SessionStep[];
  /** contentId chosen per step index */
  stepContentIds: (string | null)[];
  attemptIds: string[];
  reflection?: string;
}

export const GOAL_METRICS = [
  "speaking_minutes",
  "attempts",
  "interview_questions",
  "stories",
  "concepts_learned",
  "pages_read",
  "podcasts",
  "practice_days",
] as const;
export type GoalMetric = (typeof GOAL_METRICS)[number];

export const GOAL_METRIC_LABELS: Record<GoalMetric, string> = {
  speaking_minutes: "Speaking minutes",
  attempts: "Practice attempts",
  interview_questions: "Interview questions",
  stories: "Storytelling exercises",
  concepts_learned: "Concepts learned",
  pages_read: "Pages read",
  podcasts: "Podcast recordings",
  practice_days: "Practice days",
};

export type GoalPeriod = "day" | "week";

export interface Goal {
  id: string;
  title: string;
  metric: GoalMetric;
  target: number;
  period: GoalPeriod;
  active: 0 | 1;
  createdAt: number;
}

export interface Note {
  id: string;
  title: string;
  body: string;
  contentId?: string;
  tags: string[];
  createdAt: number;
  updatedAt: number;
}

