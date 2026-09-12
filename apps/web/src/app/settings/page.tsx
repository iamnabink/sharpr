"use client";
import { Download, ExternalLink, RefreshCw, Trash2 } from "lucide-react";
import { Button, Card, Field, PageHeader, Select, useToast } from "@/components/ui";
import { ThemeToggle } from "@/components/shell/ThemeToggle";
import { api, API_URL } from "@/lib/api/client";
import { useAuth } from "@/lib/api/auth";
import { useAttempts, useContentList, useInvalidate, useRecordingUsage, useSettings } from "@/lib/api/hooks";
import { downloadJson } from "@/lib/content/export";

export default function SettingsPage() {
  const toast = useToast();
  const invalidate = useInvalidate();
  const { user, logout } = useAuth();
  const settings = useSettings();
  const usage = useRecordingUsage();
  const content = useContentList({ status: "all" });
  const attempts = useAttempts();
  const mode = (settings.data?.recordingMode as string | undefined) ?? "audio";
  const mb = (b: number) => `${(b / 1024 / 1024).toFixed(1)} MB`;

  return (
    <div className="space-y-5">
      <PageHeader title="Settings" description="Your data lives on this Sharpr server, in PostgreSQL and the recordings volume." />
      <Card className="space-y-4 p-5">
        <div className="text-base font-semibold tracking-tight">Account</div>
        <div className="text-sm">{user?.name || user?.email} <span className="text-fg-muted">· {user?.email} · {user?.role}</span></div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={logout}>Log out</Button>
          {user?.role === "admin" && <a href={`${API_URL}/admin`} target="_blank" rel="noreferrer" className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-muted px-3 text-[13px] font-medium hover:bg-hover">Open admin <ExternalLink className="h-3 w-3" /></a>}
          <a href={`${API_URL}/docs`} target="_blank" rel="noreferrer" className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-muted px-3 text-[13px] font-medium hover:bg-hover">API docs <ExternalLink className="h-3 w-3" /></a>
        </div>
      </Card>

      <Card className="space-y-4 p-5">
        <div className="text-base font-semibold tracking-tight">Preferences</div>
        <Field label="Theme"><div className="w-40"><ThemeToggle /></div></Field>
        <Field label="Default recording mode"><Select className="w-48" value={mode} onChange={async (e) => { await api.settings.set("recordingMode", e.target.value); invalidate(); }}><option value="audio">Audio</option><option value="video">Video</option><option value="none">None (timer only)</option></Select></Field>
      </Card>

      <Card className="space-y-3 p-5">
        <div className="text-base font-semibold tracking-tight">Storage</div>
        <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
          <div><div className="text-xs text-fg-muted">Content items</div><div className="font-medium tabular-nums">{content.data?.length ?? 0}</div></div>
          <div><div className="text-xs text-fg-muted">Attempts</div><div className="font-medium tabular-nums">{attempts.data?.length ?? 0}</div></div>
          <div><div className="text-xs text-fg-muted">Recordings</div><div className="font-medium tabular-nums">{usage.data?.count ?? 0} · {mb(usage.data?.bytes ?? 0)}</div></div>
        </div>
        <p className="text-xs text-fg-muted">Recordings are stored by the API (local volume by default, S3-compatible storage when configured). Delete old ones from Review → Recordings if space gets tight.</p>
      </Card>

      <Card className="space-y-3 p-5">
        <div className="text-base font-semibold tracking-tight">Data</div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={async () => downloadJson(`sharpr-content-${new Date().toISOString().slice(0, 10)}.json`, await api.importing.exportJson())}><Download className="h-4 w-4" /> Export content (import format)</Button>
          <Button onClick={async () => downloadJson(`sharpr-backup-${new Date().toISOString().slice(0, 10)}.json`, await api.importing.exportBackup())}><Download className="h-4 w-4" /> Full backup (no recordings)</Button>
          <Button onClick={async () => { const r = await api.importing.reseed(); invalidate(); toast.push(`Seed re-imported: ${r.content} new items, ${r.skipped_duplicates} skipped`); }}><RefreshCw className="h-4 w-4" /> Re-import bundled seed</Button>
        </div>
        <p className="text-xs text-fg-muted">The full backup includes attempts, reviews, retry queue, goals and notes. Recordings are excluded because of size; download them individually.</p>
      </Card>

      <Card className="space-y-3 border-danger/30 p-5">
        <div className="text-base font-semibold tracking-tight text-danger">Danger zone</div>
        <div className="flex flex-wrap gap-2">
          <Button variant="danger" onClick={async () => { if (confirm("Delete ALL recordings? Attempts and reviews are kept.")) { await api.recordings.removeAll(); invalidate(); toast.push("Recordings deleted"); } }}><Trash2 className="h-4 w-4" /> Delete all recordings</Button>
        </div>
      </Card>

      <p className="text-xs text-fg-faint">Sharpr uses no AI. The API is documented at /docs and designed so speech-to-text and automatic scoring can be added later (see docs/ARCHITECTURE.md).</p>
    </div>
  );
}
