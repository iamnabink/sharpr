"use client";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Shuffle } from "lucide-react";
import { AccentButton, Button, Chip, Empty, PageHeader } from "@/components/ui";
import { PromptCard } from "@/components/library/ContentCard";
import { api, type Pick, type RandomParams } from "@/lib/api/client";
import { useCollections } from "@/lib/api/hooks";
import { RANDOM_PRESETS } from "@/lib/engine/random";
import { Suspense } from "react";

function RandomInner() {
  const router = useRouter();
  const params = useSearchParams();
  const [preset, setPreset] = useState("surprise");
  const [extra, setExtra] = useState<RandomParams>(() => ({ collectionId: params.get("collection") ?? undefined }));
  const [pick, setPick] = useState<Pick | null>(null);
  const [count, setCount] = useState(0);
  const collections = useCollections();

  const filter: RandomParams = { ...(RANDOM_PRESETS.find((p) => p.id === preset)?.filter ?? {}), ...extra };

  const roll = async (exclude?: string) => {
    const r = await api.engine.random({ ...filter, exclude: exclude ? [exclude] : undefined });
    setPick(r.pick);
    setCount(r.candidates);
  };

  useEffect(() => {
    let cancelled = false;
    api.engine.random(filter).then((r) => {
      if (cancelled) return;
      setPick(r.pick);
      setCount(r.candidates);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preset, JSON.stringify(extra)]);

  return (
    <div>
      <PageHeader eyebrow="Practice" title="Random" description="Pick a filter or don't. Sharpr weights toward what you haven't practiced, what you rated low, and what's due for retry." />
      <div className="mb-3 flex flex-wrap gap-1.5">
        {RANDOM_PRESETS.map((p) => (
          <Chip key={p.id} active={preset === p.id} onClick={() => setPreset(p.id)}>
            {p.label}
          </Chip>
        ))}
      </div>
      <div className="mb-6 flex flex-wrap gap-1.5">
        <Chip active={!!extra.onlyNeverPracticed} onClick={() => setExtra((e) => ({ ...e, onlyNeverPracticed: !e.onlyNeverPracticed }))}>never practiced</Chip>
        <Chip active={!!extra.onlyLowRated} onClick={() => setExtra((e) => ({ ...e, onlyLowRated: !e.onlyLowRated }))}>low rated</Chip>
        <Chip active={!!extra.onlyBookmarked} onClick={() => setExtra((e) => ({ ...e, onlyBookmarked: !e.onlyBookmarked }))}>bookmarked</Chip>
        <Chip active={!!extra.onlyRetryQueue} onClick={() => setExtra((e) => ({ ...e, onlyRetryQueue: !e.onlyRetryQueue }))}>retry queue</Chip>
        {collections.data?.map((c) => (
          <Chip key={c.id} active={extra.collectionId === c.id} onClick={() => setExtra((e) => ({ ...e, collectionId: e.collectionId === c.id ? undefined : c.id }))}>
            {c.name}
          </Chip>
        ))}
      </div>

      {pick ? (
        <div className="animate-fade-up" key={pick.item.id}>
          <PromptCard
            item={pick.item}
            eyebrow={pick.reasons.length ? `Picked because: ${pick.reasons.join(", ")}` : "Your pick"}
            action={
              <>
                <AccentButton size="md" onClick={() => router.push(`/practice/run?content=${pick.item.id}`)}>Start</AccentButton>
                <Button onClick={() => roll(pick.item.id)}>
                  <Shuffle className="h-4 w-4" /> Reroll
                </Button>
              </>
            }
          />
          <p className="mt-3 text-xs text-fg-faint">{count} candidates match this filter.</p>
        </div>
      ) : (
        <Empty title="Nothing matches" description="Loosen the filter, or import more content." action={<Button href="/library/import">Import content</Button>} />
      )}
    </div>
  );
}

export default function RandomPage() {
  return (
    <Suspense fallback={null}>
      <RandomInner />
    </Suspense>
  );
}
