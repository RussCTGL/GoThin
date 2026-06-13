"use client";

import { useState, type FormEvent } from "react";
import { Sparkles, Check } from "lucide-react";

type Estimate = {
  items: { name: string }[];
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  confidence: "low" | "medium" | "high";
};

const CONFIDENCE_STYLE: Record<Estimate["confidence"], string> = {
  high: "border-brand-500/40 bg-brand-500/10 text-brand-300",
  medium: "border-amber/40 bg-amber/10 text-amber",
  low: "border-coral/40 bg-coral/10 text-coral",
};

export default function MealPage() {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [estimate, setEstimate] = useState<Estimate | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function analyze(e: FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    setLoading(true);
    setError(null);
    setEstimate(null);
    setSaved(false);
    try {
      const res = await fetch("/api/meal/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      if (data.ok) {
        setEstimate(data.estimate as Estimate);
      } else {
        setError(
          data.reason === "refused"
            ? "Couldn't analyze that — try rephrasing the meal."
            : "AI is unavailable right now — you can enter macros manually.",
        );
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function save() {
    if (!estimate) return;
    setSaving(true);
    try {
      const res = await fetch("/api/meals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rawInput: text, estimate }),
      });
      if (res.ok) {
        setSaved(true);
        setText("");
        setEstimate(null);
      } else {
        setError("Couldn't save the meal. Please try again.");
      }
    } catch {
      setError("Couldn't save the meal. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  const macros = estimate
    ? [
        { v: `${estimate.calories}`, k: "kcal" },
        { v: `${estimate.protein_g}g`, k: "protein" },
        { v: `${estimate.carbs_g}g`, k: "carbs" },
        { v: `${estimate.fat_g}g`, k: "fat" },
      ]
    : [];

  return (
    <section className="mx-auto max-w-2xl">
      <h1 className="text-3xl font-bold md:text-4xl">Log a meal</h1>
      <p className="mt-1 text-muted">
        Describe what you ate in plain English — the AI estimates the rest.
      </p>

      <form onSubmit={analyze} className="card mt-6 p-5">
        <textarea
          className="input min-h-[120px] resize-y"
          rows={4}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="e.g. Lunch: grilled chicken breast, rice, and broccoli"
        />
        <button type="submit" disabled={loading} className="btn btn-primary mt-3">
          <Sparkles className="h-4 w-4" />
          {loading ? "Analyzing…" : "Analyze meal"}
        </button>
      </form>

      {saved && (
        <p className="mt-4 flex items-center gap-2 rounded-xl border border-brand-500/30 bg-brand-500/10 px-4 py-3 text-sm text-brand-300">
          <Check className="h-4 w-4" /> Saved to today
        </p>
      )}
      {error && (
        <p className="mt-4 rounded-xl border border-coral/30 bg-coral/10 px-4 py-3 text-sm text-coral">
          {error}
        </p>
      )}

      {estimate && (
        <div className="card mt-4 p-5">
          <span className={`badge ${CONFIDENCE_STYLE[estimate.confidence]}`}>
            confidence: {estimate.confidence}
          </span>
          <div className="mt-4 grid grid-cols-4 gap-3">
            {macros.map((m) => (
              <div key={m.k} className="rounded-xl bg-surface-2 p-3 text-center">
                <div className="font-display text-xl font-extrabold md:text-2xl">{m.v}</div>
                <div className="text-xs text-muted">{m.k}</div>
              </div>
            ))}
          </div>
          <p className="mt-4 text-sm text-muted">
            {estimate.items.map((i) => i.name).join(", ")}
          </p>
          <button onClick={save} disabled={saving} className="btn btn-primary mt-4">
            {saving ? "Saving…" : "Save to today"}
          </button>
        </div>
      )}
    </section>
  );
}
