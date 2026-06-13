"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import ReactMarkdown from "react-markdown";
import { Plus, Send } from "lucide-react";

type Msg = { role: "user" | "assistant"; content: string };
type SessionSummary = {
  sessionId: string;
  title: string;
  lastAt: string;
  messageCount: number;
};

export default function CoachPage() {
  const [sessionId, setSessionId] = useState("");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    void loadSessions(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function loadSessions(openLatest = false) {
    try {
      const res = await fetch("/api/coach/sessions");
      const data = await res.json();
      const list: SessionSummary[] = data.sessions ?? [];
      setSessions(list);
      if (openLatest) {
        if (list.length > 0) await openSession(list[0].sessionId);
        else newConversation();
      }
    } catch {
      newConversation();
    }
  }

  async function openSession(id: string) {
    setSessionId(id);
    const res = await fetch(`/api/coach/messages?sessionId=${id}`);
    const data = await res.json();
    setMessages(
      (data.messages ?? []).map((m: Msg) => ({ role: m.role, content: m.content })),
    );
  }

  function newConversation() {
    setSessionId(crypto.randomUUID());
    setMessages([]);
  }

  async function send(e: FormEvent) {
    e.preventDefault();
    const msg = input.trim();
    if (!msg || loading) return;
    setInput("");
    setMessages((m) => [
      ...m,
      { role: "user", content: msg },
      { role: "assistant", content: "" },
    ]);
    setLoading(true);
    try {
      const res = await fetch("/api/coach/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, message: msg }),
      });
      if (!res.body) throw new Error("no body");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        setMessages((m) => {
          const copy = [...m];
          copy[copy.length - 1] = {
            role: "assistant",
            content: copy[copy.length - 1].content + chunk,
          };
          return copy;
        });
      }
    } catch {
      setMessages((m) => {
        const copy = [...m];
        copy[copy.length - 1] = {
          role: "assistant",
          content: "Coach is unavailable right now — try again in a moment.",
        };
        return copy;
      });
    } finally {
      setLoading(false);
      void loadSessions();
    }
  }

  const currentInList = sessions.some((s) => s.sessionId === sessionId);

  return (
    <section className="mx-auto flex max-w-2xl flex-col">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold md:text-4xl">Coach</h1>
          <p className="mt-1 text-sm text-muted">
            Direct, no-shame advice that knows your numbers.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={sessionId}
            onChange={(e) => openSession(e.target.value)}
            aria-label="Conversation"
            className="input max-w-[200px] !py-2 text-sm"
          >
            {!currentInList && <option value={sessionId}>Current conversation</option>}
            {sessions.map((s) => (
              <option key={s.sessionId} value={s.sessionId}>
                {s.title || "Conversation"}
              </option>
            ))}
          </select>
          <button type="button" onClick={newConversation} className="btn btn-ghost !px-3 !py-2 text-sm">
            <Plus className="h-4 w-4" /> New
          </button>
        </div>
      </div>

      <div className="my-5 flex min-h-[40vh] flex-col gap-3">
        {messages.length === 0 && (
          <div className="card p-6 text-center text-sm text-muted">
            Ask anything — the coach uses your targets, today&apos;s intake, and weight
            trend, and remembers this conversation.
          </div>
        )}
        {messages.map((m, i) =>
          m.role === "user" ? (
            <div
              key={i}
              className="max-w-[85%] self-end rounded-2xl rounded-br-md bg-gradient-to-br from-brand-500/25 to-emerald/20 px-4 py-2.5 text-[0.95rem] ring-1 ring-brand-500/25"
            >
              {m.content}
            </div>
          ) : (
            <div
              key={i}
              className="prose-chat max-w-[85%] self-start rounded-2xl rounded-bl-md border border-border bg-surface px-4 py-2.5 text-[0.95rem]"
            >
              <ReactMarkdown>{m.content || "…"}</ReactMarkdown>
            </div>
          ),
        )}
        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={send}
        className="sticky bottom-0 flex gap-2 bg-bg/90 py-3 backdrop-blur"
      >
        <input
          className="input"
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Message the coach…"
        />
        <button type="submit" disabled={loading} className="btn btn-primary !px-4">
          <Send className="h-4 w-4" />
          <span className="hidden sm:inline">{loading ? "…" : "Send"}</span>
        </button>
      </form>
    </section>
  );
}
