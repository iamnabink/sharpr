"use client";
import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, FileJson, FileSpreadsheet } from "lucide-react";
import { Button, Card, Checkbox, PageHeader, Textarea, useToast } from "@/components/ui";
import { api, type ImportSummary } from "@/lib/api/client";
import { useInvalidate } from "@/lib/api/hooks";

const EXAMPLE = `[
  {
    "type": "speaking_topic",
    "title": "Should startups use microservices?",
    "category": "System Design",
    "difficulty": "advanced",
    "duration": 3,
    "preparation_seconds": 30,
    "prompt": "Should every startup begin with a monolith? Take a position and defend it.",
    "guiding_questions": ["What is your position?", "What are the tradeoffs?", "What would someone who disagrees say?"],
    "tags": ["architecture", "startups"],
    "resources": []
  }
]`;

export default function ImportPage() {
  const toast = useToast();
  const invalidate = useInvalidate();
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [counts, setCounts] = useState<Record<string, number> | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [skipDup, setSkipDup] = useState(true);
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [busy, setBusy] = useState(false);

  const validate = async () => {
    setSummary(null);
    setErrors([]);
    setCounts(null);
    let body: unknown;
    try {
      body = JSON.parse(text);
    } catch (e) {
      return setErrors([`Invalid JSON: ${(e as Error).message}`]);
    }
    try {
      const r = await api.importing.validate(body);
      setCounts(r.counts);
    } catch (e) {
      setErrors(String((e as Error).message).split("\n"));
    }
  };

  const onFile = async (f: File) => {
    setFile(f);
    setSummary(null);
    setErrors([]);
    if (f.name.toLowerCase().endsWith(".csv")) {
      setText("");
      setCounts({ "csv rows": (await f.text()).split(/\r?\n/).filter(Boolean).length - 1 });
    } else {
      const t = await f.text();
      setText(t);
      try {
        const r = await api.importing.validate(JSON.parse(t));
        setCounts(r.counts);
      } catch (e) {
        setErrors(String((e as Error).message).split("\n"));
      }
    }
  };

  const run = async () => {
    setBusy(true);
    try {
      const s = file && file.name.toLowerCase().endsWith(".csv") ? await api.importing.importFile(file, skipDup) : await api.importing.importJson(JSON.parse(text), skipDup, file ? `import:${file.name}` : "import:paste");
      setSummary(s);
      setCounts(null);
      invalidate();
      toast.push(`Imported ${s.content} items`, "success");
    } catch (e) {
      setErrors(String((e as Error).message).split("\n"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <Link href="/library" className="mb-4 inline-flex items-center gap-1 text-[13px] text-fg-muted hover:text-fg"><ArrowLeft className="h-3.5 w-3.5" /> Library</Link>
      <PageHeader eyebrow="Library" title="Import" description="Paste JSON from an external AI agent, or drop a .json / .csv file. See docs/IMPORT_SCHEMA.md for the contract." />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="space-y-3 lg:col-span-2">
          <label className="flex cursor-pointer items-center justify-center gap-3 rounded-2xl border border-dashed p-6 text-sm text-fg-muted hover:bg-hover" onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) onFile(f); }}>
            <FileJson className="h-5 w-5" /><FileSpreadsheet className="h-5 w-5" /> {file ? file.name : "Drop a file or click to choose (.json, .csv)"}
            <input type="file" accept=".json,.csv,application/json,text/csv" className="hidden" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
          </label>
          <Textarea className="min-h-[280px] font-mono text-[12px]" value={text} onChange={(e) => { setText(e.target.value); setFile(null); setCounts(null); setErrors([]); }} placeholder={EXAMPLE} />
          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={validate} disabled={!text.trim()}>Validate</Button>
            <Button variant="ghost" onClick={() => { setText(EXAMPLE); setFile(null); }}>Load example</Button>
            <Checkbox label="Skip duplicates (same type + title)" checked={skipDup} onChange={setSkipDup} />
          </div>
        </div>
        <div className="space-y-3">
          {errors.length > 0 && <Card className="border-danger/30 p-4 text-sm"><div className="font-medium text-danger">Validation failed</div><ul className="mt-2 space-y-1 font-mono text-[12px] text-fg-muted">{errors.map((e, i) => <li key={i}>{e}</li>)}</ul></Card>}
          {counts && (
            <Card className="p-4 text-sm">
              <div className="font-medium">Ready to import</div>
              <ul className="mt-2 space-y-1 text-fg-muted">{Object.entries(counts).map(([k, v]) => <li key={k} className="flex justify-between"><span>{k}</span><span className="tabular-nums">{v}</span></li>)}</ul>
              <Button variant="primary" className="mt-4 w-full" onClick={run} disabled={busy}>{busy ? "Importing…" : "Import"}</Button>
            </Card>
          )}
          {summary && (
            <Card className="border-success/30 p-4 text-sm">
              <div className="font-medium text-success">Imported</div>
              <ul className="mt-2 space-y-1 text-fg-muted">
                {(["content", "resources", "vocabulary", "collections", "books"] as const).map((k) => <li key={k} className="flex justify-between"><span>{k}</span><span>{summary[k]}</span></li>)}
                <li className="flex justify-between"><span>skipped duplicates</span><span>{summary.skipped_duplicates}</span></li>
              </ul>
              <Button className="mt-4 w-full" href="/library">Open Library</Button>
            </Card>
          )}
          <Card className="p-4 text-[13px] text-fg-muted">
            <div className="mb-1 font-medium text-fg">Prompt for an external agent</div>
            <p>“Generate 50 senior Flutter interview questions as JSON for Sharpr: a bare array of objects with <code className="font-mono text-[12px]">type: &quot;interview_question&quot;</code>, <code className="font-mono text-[12px]">track: &quot;flutter&quot;</code>, title, prompt, subcategory, difficulty, 2–4 guiding_questions and model_answer_notes. Output only JSON.”</p>
          </Card>
        </div>
      </div>
    </div>
  );
}
