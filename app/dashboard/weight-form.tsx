"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

export default function WeightForm() {
  const [val, setVal] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function submit(e: FormEvent) {
    e.preventDefault();
    const weightKg = parseFloat(val);
    if (!Number.isFinite(weightKg) || weightKg <= 0) return;
    setBusy(true);
    try {
      await fetch("/api/weight", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weightKg }),
      });
      setVal("");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit}>
      <input
        type="text"
        inputMode="decimal"
        value={val}
        onChange={(e) => setVal(e.target.value)}
        placeholder="e.g. 107.4"
      />
      <button type="submit" disabled={busy}>
        {busy ? "Saving…" : "Log weight (kg)"}
      </button>
    </form>
  );
}
