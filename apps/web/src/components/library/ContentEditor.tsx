"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { Button, Card, Field, Input, Select, Textarea, useToast } from "@/components/ui";
import { api } from "@/lib/api/client";
import { useInvalidate } from "@/lib/api/hooks";
import {
  CONTENT_TYPES, CONTENT_TYPE_LABELS, DIFFICULTIES, INTERVIEW_TRACKS, INTERVIEW_TRACK_LABELS, STORY_FRAMEWORKS, TECH_AUDIENCES,
  type ContentItem, type ContentType, type Difficulty, type InterviewTrack, type StoryFramework, type TechAudience,
} from "@/lib/content/types";
import { DEFAULT_DURATION_SECONDS } from "@/lib/content/schema";

function Lines({ label, value, onChange, hint }: { label: string; value?: string[]; onChange: (v: string[]) => void; hint?: string }) {
  return (
    <Field label={label} hint={hint ?? "One per line"}>
      <Textarea value={(value ?? []).join("\n")} onChange={(e) => onChange(e.target.value.split("\n").map((s) => s.trim()).filter(Boolean))} />
    </Field>
  );
}

export function ContentEditor({ initial }: { initial?: ContentItem }) {
  const router = useRouter();
  const toast = useToast();
  const invalidate = useInvalidate();
  const [c, setC] = useState<Partial<ContentItem>>(
    initial ?? { type: "speaking_topic", title: "", prompt: "", category: "General", difficulty: "intermediate", durationSeconds: 180, preparationSeconds: 30, tags: [], learning: {} },
  );
  const set = <K extends keyof ContentItem>(k: K, v: ContentItem[K]) => setC((x) => ({ ...x, [k]: v }));
  const setL = (k: keyof NonNullable<ContentItem["learning"]>, v: string | string[] | undefined) => setC((x) => ({ ...x, learning: { ...(x.learning ?? {}), [k]: v } }));
  const [tagText, setTagText] = useState((initial?.tags ?? []).join(", "));
  const t = c.type as ContentType;

  const save = async () => {
    if (!c.title?.trim() || !c.prompt?.trim()) return toast.push("Title and prompt are required", "danger");
    const body = { ...c, tags: tagText.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean), title: c.title.trim(), prompt: c.prompt.trim(), type: t };
    try {
      const saved = initial ? await api.content.update(initial.id, body) : await api.content.create(body);
      invalidate();
      toast.push("Saved", "success");
      router.push(`/library/${saved.id}`);
    } catch (e) {
      toast.push((e as Error).message, "danger");
    }
  };

  return (
    <div className="space-y-5">
      <Card className="space-y-4 p-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field label="Type">
            <Select value={t} onChange={(e) => { const nt = e.target.value as ContentType; setC((x) => ({ ...x, type: nt, durationSeconds: initial ? x.durationSeconds : DEFAULT_DURATION_SECONDS[nt] })); }}>
              {CONTENT_TYPES.map((ct) => <option key={ct} value={ct}>{CONTENT_TYPE_LABELS[ct]}</option>)}
            </Select>
          </Field>
          <Field label="Category"><Input value={c.category ?? ""} onChange={(e) => set("category", e.target.value)} /></Field>
          <Field label="Subcategory"><Input value={c.subcategory ?? ""} onChange={(e) => set("subcategory", e.target.value || undefined)} /></Field>
        </div>
        <Field label="Title"><Input value={c.title ?? ""} onChange={(e) => set("title", e.target.value)} placeholder="Short label" /></Field>
        <Field label="Prompt" hint="What the user is asked to do"><Textarea value={c.prompt ?? ""} onChange={(e) => set("prompt", e.target.value)} /></Field>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Field label="Difficulty"><Select value={c.difficulty} onChange={(e) => set("difficulty", e.target.value as Difficulty)}>{DIFFICULTIES.map((d) => <option key={d} value={d}>{d}</option>)}</Select></Field>
          <Field label="Speak (seconds)"><Input type="number" value={c.durationSeconds ?? 0} onChange={(e) => set("durationSeconds", Number(e.target.value))} /></Field>
          <Field label="Prep (seconds)"><Input type="number" value={c.preparationSeconds ?? 0} onChange={(e) => set("preparationSeconds", Number(e.target.value))} /></Field>
          <Field label="Tags" hint="comma-separated"><Input value={tagText} onChange={(e) => setTagText(e.target.value)} /></Field>
        </div>
        <Lines label="Guiding questions" value={c.guidingQuestions} onChange={(v) => set("guidingQuestions", v)} />
      </Card>

      {t === "interview_question" && (
        <Card className="space-y-4 p-5">
          <Field label="Track"><Select value={c.track ?? ""} onChange={(e) => set("track", (e.target.value || undefined) as InterviewTrack)}><option value="">—</option>{INTERVIEW_TRACKS.map((tr) => <option key={tr} value={tr}>{INTERVIEW_TRACK_LABELS[tr]}</option>)}</Select></Field>
          <Field label="What a strong answer covers" hint="Revealed after speaking"><Textarea value={c.modelAnswerNotes ?? ""} onChange={(e) => set("modelAnswerNotes", e.target.value || undefined)} /></Field>
        </Card>
      )}
      {t === "storytelling_prompt" && (
        <Card className="p-5"><Field label="Framework"><Select value={c.framework ?? ""} onChange={(e) => set("framework", (e.target.value || undefined) as StoryFramework)}><option value="">—</option>{STORY_FRAMEWORKS.map((f) => <option key={f} value={f}>{f}</option>)}</Select></Field></Card>
      )}
      {t === "technical_topic" && (
        <Card className="p-5">
          <div className="mb-1.5 text-[13px] font-medium">Audiences</div>
          <div className="flex flex-wrap gap-1.5">{TECH_AUDIENCES.map((a) => { const on = (c.audiences ?? []).includes(a); return <button key={a} type="button" onClick={() => set("audiences", on ? (c.audiences ?? []).filter((x) => x !== a) : [...(c.audiences ?? []), a as TechAudience])} className={`h-8 rounded-full border px-3 text-[13px] ${on ? "border-fg bg-fg text-bg" : "hover:bg-hover"}`}>{a}</button>; })}</div>
        </Card>
      )}
      {t === "podcast_topic" && (
        <Card className="space-y-4 p-5">
          <Field label="Opening question"><Input value={c.openingQuestion ?? ""} onChange={(e) => set("openingQuestion", e.target.value || undefined)} /></Field>
          <Lines label="Discussion points" value={c.discussionPoints} onChange={(v) => set("discussionPoints", v)} />
          <Lines label="Follow-up questions" value={c.followUpQuestions} onChange={(v) => set("followUpQuestions", v)} />
          <Field label="Controversial angle"><Input value={c.controversialAngle ?? ""} onChange={(e) => set("controversialAngle", e.target.value || undefined)} /></Field>
          <Field label="Closing question"><Input value={c.closingQuestion ?? ""} onChange={(e) => set("closingQuestion", e.target.value || undefined)} /></Field>
        </Card>
      )}
      {t === "debate" && (
        <Card className="space-y-4 p-5">
          <Field label="Position" hint="The statement to defend or oppose"><Input value={c.position ?? ""} onChange={(e) => set("position", e.target.value || undefined)} /></Field>
          <div>
            <div className="mb-1.5 text-[13px] font-medium">Counterarguments</div>
            <div className="space-y-2">
              {(c.counterarguments ?? []).map((ca, i) => (
                <div key={i} className="flex gap-2">
                  <Select className="w-32" value={ca.against} onChange={(e) => set("counterarguments", (c.counterarguments ?? []).map((x, j) => (j === i ? { ...x, against: e.target.value as "defend" | "oppose" } : x)))}><option value="defend">vs defend</option><option value="oppose">vs oppose</option></Select>
                  <Input value={ca.text} onChange={(e) => set("counterarguments", (c.counterarguments ?? []).map((x, j) => (j === i ? { ...x, text: e.target.value } : x)))} />
                  <Button variant="ghost" onClick={() => set("counterarguments", (c.counterarguments ?? []).filter((_, j) => j !== i))}><Trash2 className="h-4 w-4" /></Button>
                </div>
              ))}
            </div>
            <Button size="sm" className="mt-2" onClick={() => set("counterarguments", [...(c.counterarguments ?? []), { against: "defend", text: "" }])}><Plus className="h-3.5 w-3.5" /> Add</Button>
          </div>
        </Card>
      )}
      {t === "scenario" && (
        <Card className="space-y-4 p-5">
          <Field label="Role"><Input value={c.role ?? ""} onChange={(e) => set("role", e.target.value || undefined)} placeholder="You are the CTO of…" /></Field>
          <Field label="Situation"><Textarea value={c.situation ?? ""} onChange={(e) => set("situation", e.target.value || undefined)} /></Field>
        </Card>
      )}

      <Card className="space-y-4 p-5">
        <div><div className="text-base font-semibold tracking-tight">Learning material</div><div className="text-xs text-fg-muted">Revealed after the user has spoken.</div></div>
        <Field label="Short explanation"><Textarea className="min-h-[60px]" value={c.learning?.short ?? ""} onChange={(e) => setL("short", e.target.value || undefined)} /></Field>
        <Field label="Detailed explanation" hint="Separate paragraphs with a blank line"><Textarea className="min-h-[160px]" value={c.learning?.detailed ?? ""} onChange={(e) => setL("detailed", e.target.value || undefined)} /></Field>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Lines label="Key points" value={c.learning?.keyPoints} onChange={(v) => setL("keyPoints", v)} />
          <Lines label="Examples" value={c.learning?.examples} onChange={(v) => setL("examples", v)} />
          <Lines label="Common mistakes" value={c.learning?.commonMistakes} onChange={(v) => setL("commonMistakes", v)} />
          <Lines label="Interview questions" value={c.learning?.interviewQuestions} onChange={(v) => setL("interviewQuestions", v)} />
          <Lines label="Related topics" value={c.learning?.relatedTopics} onChange={(v) => setL("relatedTopics", v)} />
        </div>
      </Card>

      <div className="flex justify-between">
        {initial ? <Button variant="danger" onClick={async () => { if (confirm("Delete this item? Attempts are kept.")) { await api.content.remove(initial.id); invalidate(); router.push("/library"); } }}><Trash2 className="h-4 w-4" /> Delete</Button> : <span />}
        <div className="flex gap-2"><Button variant="ghost" onClick={() => router.back()}>Cancel</Button><Button variant="primary" onClick={save}>Save</Button></div>
      </div>
    </div>
  );
}
