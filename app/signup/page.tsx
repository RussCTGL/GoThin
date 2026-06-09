"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/auth/client";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);
    const sb = createSupabaseBrowserClient();
    const { data, error } = await sb.auth.signUp({ email, password });
    setBusy(false);
    if (error) {
      setError(error.message);
      return;
    }
    // If email confirmation is on, there's no active session yet.
    if (data.session) {
      router.push("/dashboard");
      router.refresh();
    } else {
      setNotice("Check your email to confirm your account, then sign in.");
    }
  }

  return (
    <section className="auth">
      <h1>Create account</h1>
      <form onSubmit={submit}>
        <input
          type="text"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="email"
          autoComplete="email"
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="password (min 6 chars)"
          autoComplete="new-password"
        />
        <button type="submit" disabled={busy}>
          {busy ? "Creating…" : "Sign up"}
        </button>
      </form>
      {error && <p className="error panel">{error}</p>}
      {notice && <p className="panel">{notice}</p>}
      <p className="muted">
        Already have an account? <a href="/login">Sign in</a>
      </p>
    </section>
  );
}
