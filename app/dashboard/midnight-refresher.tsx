"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Refreshes the dashboard the moment the user's local day rolls over, so the
 * "Today" totals reset without a manual reload. Uses the browser's local time
 * (which matches the profile timezone). Also re-checks on tab focus, so a
 * sleeping/backgrounded machine still catches up to the right day.
 */
export default function MidnightRefresher() {
  const router = useRouter();

  useEffect(() => {
    const today = () => new Date().toDateString();
    let lastDay = today();
    let timer: ReturnType<typeof setTimeout>;

    function scheduleNextMidnight() {
      const now = new Date();
      const nextMidnight = new Date(now);
      nextMidnight.setHours(24, 0, 0, 0); // start of the next local day
      const ms = nextMidnight.getTime() - now.getTime() + 1000; // +1s buffer
      timer = setTimeout(() => {
        lastDay = today();
        router.refresh();
        scheduleNextMidnight();
      }, ms);
    }

    function onVisible() {
      if (document.visibilityState === "visible" && today() !== lastDay) {
        lastDay = today();
        router.refresh();
      }
    }

    scheduleNextMidnight();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [router]);

  return null;
}
