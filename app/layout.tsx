import type { Metadata } from "next";
import type { ReactNode } from "react";
import { adminEmails, authEnabled, getUser } from "@/lib/auth/user";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Fitness Coach",
  description: "Log meals and weight, get daily AI coaching.",
};

export default async function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  const showAuth = authEnabled();
  const user = showAuth ? await getUser() : null;
  const isAdminUser =
    !!user?.email && adminEmails().includes(user.email.toLowerCase());

  return (
    <html lang="en">
      <body>
        <header className="nav">
          <a href="/" className="brand">
            AI Fitness Coach
          </a>
          <nav className="nav-links">
            <a href="/meal">Log Meal</a>
            <a href="/coach">Coach</a>
            <a href="/dashboard">Dashboard</a>
            <a href="/profile">Profile</a>
            {isAdminUser && <a href="/admin">Admin</a>}
            {showAuth &&
              (user ? (
                <form action="/auth/signout" method="post" className="inline">
                  <button type="submit" className="linkbtn">
                    Sign out
                  </button>
                </form>
              ) : (
                <a href="/login">Login</a>
              ))}
          </nav>
        </header>
        <main className="container">{children}</main>
      </body>
    </html>
  );
}
