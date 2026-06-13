"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

type Initial = {
  targetCalories: number;
  targetProteinG: number;
  goalWeightKg?: number;
  dietaryPreferences?: string;
} | null | undefined;

export default function ProfileForm({ initial }: { initial: Initial }) {
  const [targetCalories, setTargetCalories] = useState(
    initial?.targetCalories?.toString() ?? "2000",
  );
  const [targetProteinG, setTargetProteinG] = useState(
    initial?.targetProteinG?.toString() ?? "150",
  );
  const [goalWeightKg, setGoalWeightKg] = useState(
    initial?.goalWeightKg?.toString() ?? "",
  );
  const [dietaryPreferences, setDietaryPreferences] = useState(
    initial?.dietaryPreferences ?? "",
  );
  // Auto-detected from the browser; defines which day a meal counts toward.
  const [timezone] = useState(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch {
      return "";
    }
  });
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetCalories: Number(targetCalories),
          targetProteinG: Number(targetProteinG),
          goalWeightKg: goalWeightKg ? Number(goalWeightKg) : undefined,
          dietaryPreferences,
          timezone,
        }),
      });
      if (res.ok) {
        setSaved(true);
        router.refresh();
      } else {
        const d = await res.json().catch(() => ({}));
        setError(d.error ?? "Couldn't save. Check your values.");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="card mt-6 flex flex-col gap-4 p-6">
      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-muted">Daily calorie target (kcal)</span>
        <input
          className="input"
          type="number"
          value={targetCalories}
          onChange={(e) => setTargetCalories(e.target.value)}
        />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-muted">Daily protein target (g)</span>
        <input
          className="input"
          type="number"
          value={targetProteinG}
          onChange={(e) => setTargetProteinG(e.target.value)}
        />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-muted">Goal weight (kg, optional)</span>
        <input
          className="input"
          type="number"
          value={goalWeightKg}
          onChange={(e) => setGoalWeightKg(e.target.value)}
          placeholder="e.g. 100"
        />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-muted">Dietary preferences (optional)</span>
        <input
          className="input"
          type="text"
          value={dietaryPreferences}
          onChange={(e) => setDietaryPreferences(e.target.value)}
          placeholder="e.g. high protein, no pork"
        />
      </label>
      <p className="text-xs text-muted">
        Timezone (auto-detected): <strong className="text-text">{timezone || "unknown"}</strong> —
        this sets when your day rolls over.
      </p>
      <button type="submit" disabled={busy} className="btn btn-primary mt-1">
        {busy ? "Saving…" : "Save targets"}
      </button>
      {saved && <p className="text-sm text-brand-300">Saved ✓</p>}
      {error && <p className="text-sm text-coral">{error}</p>}
    </form>
  );
}
