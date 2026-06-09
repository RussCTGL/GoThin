"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import ReactMarkdown from "react-markdown";

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
      void loadSessions(); // a brand-new conversation now appears in the list
    }
  }

  const currentInList = sessions.some((s) => s.sessionId === sessionId);

  return (
    <section>
      <div className="coach-head">
        <h1>Coach</h1>
        <div className="coach-controls">
          <select
            value={sessionId}
            onChange={(e) => openSession(e.target.value)}
            aria-label="Conversation"
          >
            {!currentInList && <option value={sessionId}>Current conversation</option>}
            {sessions.map((s) => (
              <option key={s.sessionId} value={s.sessionId}>
                {s.title || "Conversation"}
              </option>
            ))}
          </select>
          <button type="button" className="linkbtn" onClick={newConversation}>
            + New
          </button>
        </div>
      </div>

      <div className="thread">
        {messages.length === 0 && (
          <p className="muted">
            Ask anything — the coach uses your targets, today&apos;s intake, and
            weight trend, and remembers this conversation.
          </p>
        )}
        {messages.map((m, i) =>
          m.role === "user" ? (
            <div key={i} className="msg user">
              {m.content}
            </div>
          ) : (
            <div key={i} className="msg assistant">
              <ReactMarkdown>{m.content || "…"}</ReactMarkdown>
            </div>
          ),
        )}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={send} className="coach-input">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Message the coach…"
        />
        <button type="submit" disabled={loading}>
          {loading ? "…" : "Send"}
        </button>
      </form>
    </section>
  );
}
