"use client";

import { useEffect, useState } from "react";

/**
 * Renders a timestamp in the VIEWER's local timezone. Formatting must happen in
 * the browser — a server component (e.g. on Vercel) runs in UTC and would show
 * the wrong clock time. We compute after mount to avoid a hydration mismatch.
 */
export default function LocalTime({ iso }: { iso: string }) {
  const [text, setText] = useState("");
  useEffect(() => {
    setText(
      new Date(iso).toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      }),
    );
  }, [iso]);
  return <span suppressHydrationWarning>{text || "…"}</span>;
}
