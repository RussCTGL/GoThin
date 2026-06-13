"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { Activity, Menu, X } from "lucide-react";

const LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/meal", label: "Log Meal" },
  { href: "/coach", label: "Coach" },
  { href: "/profile", label: "Profile" },
];

export default function SiteNav({
  showAuth,
  isAdmin,
  email,
}: {
  showAuth: boolean;
  isAdmin: boolean;
  email: string | null;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const links = isAdmin ? [...LINKS, { href: "/admin", label: "Admin" }] : LINKS;

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-bg/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between px-5">
        <Link href="/" className="flex items-center gap-2" onClick={() => setOpen(false)}>
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-brand-400 to-emerald text-[#06210a] shadow-[0_8px_20px_-8px_rgba(132,204,22,0.8)]">
            <Activity size={18} strokeWidth={2.75} />
          </span>
          <span className="font-display text-lg font-extrabold tracking-tight">
            Go<span className="gradient-text">Thin</span>
          </span>
        </Link>

        {/* Desktop links */}
        <nav className="hidden items-center gap-1 md:flex">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                isActive(l.href)
                  ? "bg-surface-2 text-text"
                  : "text-muted hover:text-text"
              }`}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          {showAuth &&
            (email ? (
              <>
                <span className="max-w-[160px] truncate text-xs text-muted" title={email}>
                  {email}
                </span>
                <form action="/auth/signout" method="post">
                  <button type="submit" className="btn btn-ghost !px-3 !py-1.5 text-sm">
                    Sign out
                  </button>
                </form>
              </>
            ) : (
              <>
                <Link href="/login" className="text-sm font-medium text-muted hover:text-text">
                  Login
                </Link>
                <Link href="/signup" className="btn btn-primary !px-4 !py-2 text-sm">
                  Get started
                </Link>
              </>
            ))}
        </div>

        {/* Mobile toggle */}
        <button
          type="button"
          aria-label="Menu"
          onClick={() => setOpen((v) => !v)}
          className="btn btn-ghost !p-2 md:hidden"
        >
          {open ? <X size={18} /> : <Menu size={18} />}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="border-t border-border bg-bg px-5 py-3 md:hidden">
          <nav className="flex flex-col gap-1">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className={`rounded-lg px-3 py-2.5 text-sm font-medium ${
                  isActive(l.href) ? "bg-surface-2 text-text" : "text-muted"
                }`}
              >
                {l.label}
              </Link>
            ))}
          </nav>
          {showAuth && (
            <div className="mt-3 flex items-center gap-3 border-t border-border pt-3">
              {email ? (
                <>
                  <span className="flex-1 truncate text-xs text-muted">{email}</span>
                  <form action="/auth/signout" method="post">
                    <button type="submit" className="btn btn-ghost !px-3 !py-1.5 text-sm">
                      Sign out
                    </button>
                  </form>
                </>
              ) : (
                <>
                  <Link href="/login" onClick={() => setOpen(false)} className="btn btn-ghost flex-1 !py-2 text-sm">
                    Login
                  </Link>
                  <Link href="/signup" onClick={() => setOpen(false)} className="btn btn-primary flex-1 !py-2 text-sm">
                    Get started
                  </Link>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </header>
  );
}
