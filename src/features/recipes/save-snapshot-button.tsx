"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveSnapshot } from "@/app/actions/recipes";
import { Button } from "@/components/ui/button";
import { Camera } from "lucide-react";

export function SaveSnapshotButton({ recipeId }: { recipeId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [done, setDone] = useState(false);

  function handleSave() {
    startTransition(async () => {
      await saveSnapshot(recipeId, "Snapshot manuale");
      setDone(true);
      router.refresh();
      setTimeout(() => setDone(false), 2000);
    });
  }

  return (
    <Button onClick={handleSave} disabled={pending} size="sm">
      <Camera className="size-4" />
      {done ? "Salvato ✓" : pending ? "Salvataggio…" : "Salva versione"}
    </Button>
  );
}
