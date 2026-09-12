"use client";
import { BookOpen, Dumbbell, Gavel, Layers, MessageSquare, Mic2, Radio, Shuffle, Timer, Users, Zap } from "lucide-react";
import { AccentButton, CardLink, PageHeader } from "@/components/ui";
import { useContentList } from "@/lib/api/hooks";

const MODES = [
  { href: "/practice/random", label: "Random", desc: "Let Sharpr choose. Filters optional.", icon: Shuffle, type: null },
  { href: "/practice/speak", label: "Speak", desc: "Opinion and explanation topics, 2–5 minutes.", icon: Mic2, type: "speaking_topic" },
  { href: "/practice/quick", label: "Quick", desc: "30, 60 or 120-second bursts.", icon: Zap, type: "quick_speaking" },
  { href: "/practice/story", label: "Story", desc: "Storytelling with frameworks.", icon: BookOpen, type: "storytelling_prompt" },
  { href: "/practice/podcast", label: "Podcast", desc: "Long-form, host-driven.", icon: Radio, type: "podcast_topic" },
  { href: "/practice/debate", label: "Debate", desc: "Defend or oppose. Counterarguments revealed.", icon: Gavel, type: "debate" },
  { href: "/practice/interview", label: "Interview", desc: "Tracks and mock sessions.", icon: MessageSquare, type: "interview_question" },
  { href: "/practice/tech", label: "Tech Talk", desc: "Explain technology to any audience.", icon: Layers, type: "technical_topic" },
  { href: "/practice/scenario", label: "Scenarios", desc: "CTO and founder role-plays.", icon: Users, type: "scenario" },
  { href: "/sessions", label: "Sessions", desc: "Structured multi-step workouts.", icon: Timer, type: null },
] as const;

export default function PracticePage() {
  const { data: all } = useContentList();
  const counts: Record<string, number> | undefined = all ? all.reduce((m, c) => ({ ...m, [c.type]: (m[c.type] ?? 0) + 1 }), {} as Record<string, number>) : undefined;
  return (
    <div>
      <PageHeader
        title="Practice"
        description="Retrieve, explain, speak, discover weaknesses, learn, repeat."
        actions={
          <AccentButton size="md" href="/practice/random">
            <Shuffle className="h-4 w-4" /> Give me something random
          </AccentButton>
        }
      />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {MODES.map((m) => {
          const Icon = m.icon;
          return (
            <CardLink key={m.href} href={m.href} className="p-4">
              <div className="flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-muted text-fg">
                  <Icon className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-[15px] font-medium">
                    {m.label}
                    {m.type && counts && <span className="text-xs text-fg-faint tabular-nums">{counts[m.type] ?? 0}</span>}
                  </div>
                  <div className="mt-0.5 text-[13px] text-fg-muted">{m.desc}</div>
                </div>
              </div>
            </CardLink>
          );
        })}
      </div>
      <div className="mt-8 hidden sm:block">
        <Dumbbell className="mb-2 h-4 w-4 text-fg-faint" />
        <p className="max-w-xl text-[13px] text-fg-muted">
          Sharpr never shows the same prompt twice in a week if it can help it. Items you rated below 6, bookmarked, or added to the retry queue surface more often.
        </p>
      </div>
    </div>
  );
}
