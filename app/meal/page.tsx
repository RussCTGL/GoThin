"use client";

import { useState, type FormEvent } from "react";

type Estimate = {
  items: { name: string }[];
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  confidence: "low" | "medium" | "high";
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
        // Graceful degradation — the app never blocks the user.
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

  return (
    <section>
      <h1>Log a meal</h1>
      <p className="muted">What did you eat?</p>
      <form onSubmit={analyze}>
        <textarea
          rows={4}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="e.g. Lunch: chicken breast, rice, and broccoli"
        />
        <button type="submit" disabled={loading}>
          {loading ? "Analyzing…" : "Analyze meal"}
        </button>
      </form>

      {saved && <p className="panel">Saved to today ✓</p>}
      {error && <p className="error panel">{error}</p>}

      {estimate && (
        <div className="panel">
          <span className="badge">confidence: {estimate.confidence}</span>
          <div className="macros">
            <div className="macro">
              <div className="v">{estimate.calories}</div>
              <div className="k">kcal</div>
            </div>
            <div className="macro">
              <div className="v">{estimate.protein_g}g</div>
              <div className="k">protein</div>
            </div>
            <div className="macro">
              <div className="v">{estimate.carbs_g}g</div>
              <div className="k">carbs</div>
            </div>
            <div className="macro">
              <div className="v">{estimate.fat_g}g</div>
              <div className="k">fat</div>
            </div>
          </div>
          <p className="muted">{estimate.items.map((i) => i.name).join(", ")}</p>
          <button onClick={save} disabled={saving}>
            {saving ? "Saving…" : "Save to today"}
          </button>
        </div>
      )}
    </section>
  );
}
