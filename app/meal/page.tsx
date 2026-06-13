"use client";

import { useRef, useState, type FormEvent } from "react";
import { Sparkles, Camera, Check, Undo2, Loader2 } from "lucide-react";

type Estimate = {
  items: { name: string }[];
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  confidence: "low" | "medium" | "high";
};

type Logged = { estimate: Estimate; mealId: string };

const CONFIDENCE_STYLE: Record<Estimate["confidence"], string> = {
  high: "border-brand-500/40 bg-brand-500/10 text-brand-300",
  medium: "border-amber/40 bg-amber/10 text-amber",
  low: "border-coral/40 bg-coral/10 text-coral",
};

// Downscale a photo in the browser before upload: smaller payload, fewer vision
// tokens, faster round-trip. Returns raw base64 (no data: prefix) + media type.
async function downscale(
  file: File,
  maxDim = 1024,
): Promise<{ base64: string; mediaType: "image/jpeg" }> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = () => reject(new Error("bad image"));
    i.src = dataUrl;
  });
  const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(img.width * scale);
  canvas.height = Math.round(img.height * scale);
  canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
  const jpeg = canvas.toDataURL("image/jpeg", 0.82);
  return { base64: jpeg.split(",")[1], mediaType: "image/jpeg" };
}

export default function MealPage() {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState<null | "text" | "photo">(null);
  const [logged, setLogged] = useState<Logged | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [removed, setRemoved] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function reset() {
    setError(null);
    setLogged(null);
    setRemoved(false);
  }

  // Text → analyze → auto-save, in one action. No manual "save" step.
  async function analyzeText(e: FormEvent) {
    e.preventDefault();
    if (!text.trim() || busy) return;
    reset();
    setBusy("text");
    try {
      const res = await fetch("/api/meal/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      if (!data.ok) {
        setError(
          data.reason === "refused"
            ? "Couldn't read that — try rephrasing the meal."
            : "AI is unavailable right now. Try again in a moment.",
        );
        return;
      }
      const save = await fetch("/api/meals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rawInput: text, estimate: data.estimate }),
      });
      const saved = await save.json();
      if (!save.ok || !saved.meal) {
        setError("Logged the estimate but couldn't save it. Try again.");
        return;
      }
      setLogged({ estimate: data.estimate, mealId: saved.meal.id });
      setText("");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setBusy(null);
    }
  }

  // Photo → analyze → auto-save, in one request (POST /api/meal/image).
  async function onPhoto(file: File) {
    reset();
    setBusy("photo");
    try {
      const { base64, mediaType } = await downscale(file);
      const res = await fetch("/api/meal/image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: base64, mediaType }),
      });
      const data = await res.json();
      if (!data.ok || !data.meal) {
        setError(
          data.reason === "refused"
            ? "Couldn't read that photo — try a clearer shot of the food."
            : "AI is unavailable right now. Try again in a moment.",
        );
        return;
      }
      setLogged({ estimate: data.estimate, mealId: data.meal.id });
    } catch {
      setError("Couldn't process that image. Please try another.");
    } finally {
      setBusy(null);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function undo() {
    if (!logged) return;
    const id = logged.mealId;
    setLogged(null);
    setRemoved(true);
    try {
      await fetch(`/api/meals?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    } catch {
      /* best-effort; the dashboard is the source of truth */
    }
  }

  const est = logged?.estimate;
  const macros = est
    ? [
        { v: `${est.calories}`, k: "kcal" },
        { v: `${est.protein_g}g`, k: "protein" },
        { v: `${est.carbs_g}g`, k: "carbs" },
        { v: `${est.fat_g}g`, k: "fat" },
      ]
    : [];

  return (
    <section className="mx-auto max-w-2xl">
      <h1 className="text-3xl font-bold md:text-4xl">Log a meal</h1>
      <p className="mt-1 text-muted">
        Snap a photo or describe it — GoThin reads it and logs it automatically.
      </p>

      {/* Photo — fully automated: pick a photo and it's analyzed + logged */}
      <div className="card mt-6 p-5">
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void onPhoto(f);
          }}
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={busy !== null}
          className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-surface-2/40 py-8 text-center transition-colors hover:border-brand-500/50 disabled:opacity-60"
        >
          {busy === "photo" ? (
            <>
              <Loader2 className="h-7 w-7 animate-spin text-brand-300" />
              <span className="font-display font-semibold">Reading your photo…</span>
            </>
          ) : (
            <>
              <Camera className="h-7 w-7 text-brand-300" />
              <span className="font-display font-semibold">Take or upload a food photo</span>
              <span className="text-xs text-muted">Analyzed and logged automatically</span>
            </>
          )}
        </button>
      </div>

      {/* Text — also auto-logs, no separate save click */}
      <form onSubmit={analyzeText} className="card mt-4 p-5">
        <textarea
          className="input min-h-[96px] resize-y"
          rows={3}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="…or type it: grilled chicken breast, rice, and broccoli"
        />
        <button type="submit" disabled={busy !== null || !text.trim()} className="btn btn-primary mt-3">
          {busy === "text" ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Logging…
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" /> Analyze &amp; log
            </>
          )}
        </button>
      </form>

      {removed && (
        <p className="mt-4 rounded-xl border border-border bg-surface px-4 py-3 text-sm text-muted">
          Removed from today.
        </p>
      )}
      {error && (
        <p className="mt-4 rounded-xl border border-coral/30 bg-coral/10 px-4 py-3 text-sm text-coral">
          {error}
        </p>
      )}

      {logged && est && (
        <div className="card mt-4 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="flex items-center gap-2 font-display font-semibold text-brand-300">
              <Check className="h-5 w-5" /> Logged to today
            </span>
            <button
              type="button"
              onClick={undo}
              className="btn btn-ghost !px-3 !py-1.5 text-sm"
            >
              <Undo2 className="h-4 w-4" /> Undo
            </button>
          </div>

          <div className="mt-4 grid grid-cols-4 gap-3">
            {macros.map((m) => (
              <div key={m.k} className="rounded-xl bg-surface-2 p-3 text-center">
                <div className="font-display text-xl font-extrabold md:text-2xl">{m.v}</div>
                <div className="text-xs text-muted">{m.k}</div>
              </div>
            ))}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className={`badge ${CONFIDENCE_STYLE[est.confidence]}`}>
              confidence: {est.confidence}
            </span>
            <span className="text-sm text-muted">
              {est.items.map((i) => i.name).join(", ")}
            </span>
          </div>
        </div>
      )}
    </section>
  );
}
