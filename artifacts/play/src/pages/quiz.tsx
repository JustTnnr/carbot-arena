import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRoute } from "wouter";
import { useSession, useCountdown } from "@/lib/useSession";
import { joinSession } from "@/lib/api";

const BASE = "/api";

async function jsonPost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${res.status}`);
  return res.json() as Promise<T>;
}

type Creds = { playerId: string; token: string; name: string };

const STORAGE_PREFIX = "carbot.play.quiz.";

function saveCreds(id: string, c: Creds) {
  try { localStorage.setItem(STORAGE_PREFIX + id, JSON.stringify(c)); } catch { /**/ }
}
function loadCreds(id: string): Creds | null {
  try { const r = localStorage.getItem(STORAGE_PREFIX + id); return r ? JSON.parse(r) as Creds : null; } catch { return null; }
}

type QuizState = {
  sessionId: string;
  type: "quiz";
  status: "lobby" | "running" | "finished";
  startsAt: number | null;
  endsAt: number | null;
  serverTime: number;
  quizType: string;
  currentQ: number;
  totalQuestions: number;
  questionEndsAt: number;
  revealEndsAt: number;
  questionDurationMs: number;
  question: { text: string; options: string[]; correctIdx?: number } | null;
  myAnswer: number | null;
  players: { playerId: string; name: string; score: number }[];
  winnerName: string | null;
};

function quizLabel(qt: string) {
  switch (qt) {
    case "carquiz":  return "🚗 Car Quiz";
    case "mathquiz": return "🧠 Math Quiz";
    case "puzzle":   return "🧩 Puzzle Quiz";
    case "carlogo":  return "🚘 Car Logo Quiz";
    case "mixquiz":  return "🎲 Mix Quiz";
    default:         return "Quiz";
  }
}

export default function QuizPage() {
  const [, params] = useRoute<{ id: string }>("/quiz/:id");
  const id = params?.id ?? "";

  // Poll with playerId so server includes myAnswer
  const [creds, setCreds] = useState<Creds | null>(() => (id ? loadCreds(id) : null));
  const pollPath = creds ? `${id}?playerId=${creds.playerId}` : id;

  const { state: rawState, error, serverOffset } = useSession(pollPath, 500);
  const state = rawState as unknown as QuizState | null;

  const [name, setName] = useState("");
  const [joining, setJoining] = useState(false);
  const [joinErr, setJoinErr] = useState<string | null>(null);

  // Local answer tracking: questionIdx → answerIdx (for immediate feedback)
  const [localAnswers, setLocalAnswers] = useState<Record<number, number>>({});
  const submitting = useRef(false);

  const handleJoin = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setJoining(true);
    setJoinErr(null);
    try {
      const r = await joinSession(id, trimmed);
      const next = { playerId: r.playerId, token: r.token, name: trimmed };
      saveCreds(id, next);
      setCreds(next);
    } catch (e) {
      setJoinErr(String(e));
    }
    setJoining(false);
  };

  const handleAnswer = useCallback(
    async (answerIdx: number) => {
      if (!creds || !state || state.status !== "running" || submitting.current) return;
      const currentQ = state.currentQ;
      if (localAnswers[currentQ] !== undefined) return; // already answered
      submitting.current = true;
      setLocalAnswers((prev) => ({ ...prev, [currentQ]: answerIdx }));
      try {
        await jsonPost(`/play/session/${id}/action`, {
          playerId: creds.playerId,
          token: creds.token,
          answerIdx,
        });
      } catch { /* drop */ }
      submitting.current = false;
    },
    [creds, state, localAnswers, id],
  );

  // Reset local answers when question changes
  const prevQ = useRef<number>(-1);
  useEffect(() => {
    if (state && state.currentQ !== prevQ.current) {
      prevQ.current = state.currentQ;
      // Don't clear local answers — we keep them for the reveal phase
    }
  }, [state]);

  const startsIn = useCountdown(state?.startsAt ?? null, serverOffset);
  const qEndsIn = useCountdown(state?.questionEndsAt ?? null, serverOffset);
  const revealEndsIn = useCountdown(state?.revealEndsAt ?? null, serverOffset);

  if (error && !state) {
    return <Shell><div className="text-center text-red-300">Session unavailable. {error}</div></Shell>;
  }
  if (!state) {
    return <Shell><div className="text-center text-violet-300">Loading…</div></Shell>;
  }

  const now = Date.now() + serverOffset;
  const questionExpired = now >= (state.questionEndsAt ?? 0);
  const inReveal = questionExpired && now < (state.revealEndsAt ?? 0);
  const revealCountdown = Math.ceil(revealEndsIn / 1000);
  const qCountdown = Math.ceil(qEndsIn / 1000);

  const currentQ = state.currentQ;
  const q = state.question;
  // My answer: server-side (state.myAnswer) or local optimistic
  const myAnswer = state.myAnswer ?? localAnswers[currentQ] ?? null;
  const correctIdx = state.question?.correctIdx; // only set when expired

  const me = state.players.find((p) => p.playerId === creds?.playerId);

  // ── Join screen ──────────────────────────────────────────────────────────────
  if (!creds) {
    return (
      <Shell>
        <div className="space-y-5">
          <div className="text-center">
            <div className="text-5xl mb-2">🧠</div>
            <h1 className="text-2xl font-bold">{quizLabel(state.quizType)}</h1>
            <p className="text-violet-300 text-sm mt-1">
              {state.totalQuestions} questions • {Math.round((state.questionDurationMs ?? 15000) / 1000)}s each • fastest correct answer wins
            </p>
          </div>
          <div className="space-y-2">
            <label className="text-sm text-violet-300">Your display name</label>
            <input
              autoFocus
              className="w-full rounded-xl bg-white/10 border border-white/20 text-white px-4 py-3 outline-none focus:border-violet-400"
              placeholder="e.g. @yourhandle"
              value={name}
              maxLength={32}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") void handleJoin(); }}
            />
            {joinErr && <div className="text-red-300 text-xs">{joinErr}</div>}
            <button
              disabled={joining || !name.trim()}
              onClick={() => void handleJoin()}
              className="w-full py-3 rounded-xl bg-violet-600 text-white font-bold disabled:opacity-50 active:scale-95 transition"
            >
              {joining ? "Joining…" : "Join Quiz"}
            </button>
          </div>
        </div>
      </Shell>
    );
  }

  // ── Lobby ────────────────────────────────────────────────────────────────────
  if (state.status === "lobby") {
    return (
      <Shell>
        <div className="text-center space-y-4">
          <div className="text-5xl">🧠</div>
          <h1 className="text-2xl font-bold">{quizLabel(state.quizType)}</h1>
          <div className="text-4xl font-black text-violet-300">
            {Math.ceil(startsIn / 1000)}s
          </div>
          <div className="text-violet-300 text-sm">Starts soon — tell your friends to join!</div>
          <div className="rounded-2xl bg-white/10 border border-white/20 p-4">
            <div className="text-sm text-violet-300 mb-1">Players ready</div>
            <div className="text-3xl font-bold">{state.players.length}</div>
          </div>
          <div className="text-xs text-violet-400">You're in as <b>{creds.name}</b></div>
        </div>
      </Shell>
    );
  }

  // ── Finished ─────────────────────────────────────────────────────────────────
  if (state.status === "finished") {
    const ranked = state.players;
    const myScore = me?.score ?? 0;
    const myRank = me ? ranked.indexOf(me) + 1 : null;
    return (
      <Shell>
        <div className="space-y-4">
          <div className="text-center">
            <div className="text-5xl mb-2">🏆</div>
            <h1 className="text-xl font-bold">{quizLabel(state.quizType)} finished!</h1>
            {state.winnerName && (
              <div className="mt-2 text-yellow-300 font-semibold">Winner: {state.winnerName}</div>
            )}
          </div>
          <div className="rounded-2xl bg-white/10 border border-white/20 p-4 text-center">
            <div className="text-sm text-violet-300">Your score</div>
            <div className="text-5xl font-black text-yellow-300">{myScore}</div>
            <div className="text-sm text-violet-300">out of {state.totalQuestions} correct</div>
            {myRank && <div className="text-xs text-violet-400 mt-1">Rank #{myRank}</div>}
          </div>
          <div className="rounded-2xl bg-white/10 border border-white/20 p-4">
            <div className="font-semibold mb-3">Final Leaderboard</div>
            <ul className="space-y-1">
              {ranked.slice(0, 10).map((p, i) => (
                <li key={p.playerId} className={`flex justify-between px-3 py-2 rounded-lg ${p.playerId === creds.playerId ? "bg-yellow-400/20" : "bg-white/5"}`}>
                  <span className="flex gap-2 min-w-0 items-center">
                    <span className="w-5 text-violet-300 text-sm">{i + 1}</span>
                    <span className="truncate">{p.name}</span>
                  </span>
                  <span className="font-mono font-semibold">{p.score}<span className="text-xs text-violet-300">/{state.totalQuestions}</span></span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Shell>
    );
  }

  // ── Running ───────────────────────────────────────────────────────────────────
  const answered = myAnswer !== null;
  const pct = Math.max(0, (qCountdown / ((state.questionDurationMs ?? 15000) / 1000)) * 100);

  return (
    <Shell>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="text-sm text-violet-300 font-semibold">
            {quizLabel(state.quizType)}
          </div>
          <div className="text-sm font-mono text-violet-300">
            Q {currentQ + 1}/{state.totalQuestions} • Score: <b className="text-white">{me?.score ?? 0}</b>
          </div>
        </div>

        {/* Timer bar */}
        <div className="h-2 bg-black/40 rounded-full overflow-hidden border border-white/10">
          <div
            className={`h-full rounded-full transition-all ${
              qCountdown <= 3 ? "bg-red-500" : "bg-violet-500"
            }`}
            style={{ width: `${inReveal ? 0 : pct}%`, transition: "width 0.2s linear" }}
          />
        </div>

        {/* Question */}
        <div className="rounded-2xl bg-white/10 border border-white/20 p-5 text-center">
          <div className="text-xs text-violet-400 mb-2 uppercase tracking-wide">
            {inReveal ? `Next in ${revealCountdown}s…` : `${qCountdown}s`}
          </div>
          <div className="text-lg font-bold leading-snug">
            {q?.text ?? "—"}
          </div>
        </div>

        {/* Options */}
        <div className="grid grid-cols-2 gap-3">
          {(q?.options ?? []).map((opt, idx) => {
            let style = "bg-white/10 border-white/20 text-white";
            if (inReveal && correctIdx !== undefined) {
              if (idx === correctIdx) style = "bg-emerald-600/80 border-emerald-400 text-white";
              else if (idx === myAnswer) style = "bg-red-600/80 border-red-400 text-white";
              else style = "bg-white/5 border-white/10 text-white/50";
            } else if (answered) {
              if (idx === myAnswer) style = "bg-violet-600/80 border-violet-400 text-white";
              else style = "bg-white/5 border-white/10 text-white/50";
            }
            return (
              <button
                key={idx}
                disabled={answered || inReveal || !q}
                onClick={() => void handleAnswer(idx)}
                className={`border-2 rounded-xl px-3 py-4 text-sm font-semibold text-left transition active:scale-95 disabled:cursor-default ${style}`}
              >
                <span className="text-xs opacity-60 mr-1">{String.fromCharCode(65 + idx)}.</span>{" "}
                {opt}
              </button>
            );
          })}
        </div>

        {/* Status message */}
        {answered && !inReveal && (
          <div className="text-center text-sm text-violet-300">Locked in — waiting for others…</div>
        )}
        {inReveal && correctIdx !== undefined && (
          <div className={`text-center font-semibold ${myAnswer === correctIdx ? "text-emerald-400" : "text-red-400"}`}>
            {myAnswer === correctIdx ? "✓ Correct!" : myAnswer === null ? "⏱ Time's up!" : "✗ Wrong"}
          </div>
        )}

        {/* Mini leaderboard */}
        <div className="rounded-2xl bg-white/10 border border-white/20 p-3">
          <div className="flex justify-between mb-2 text-xs text-violet-300">
            <span className="font-semibold">Leaderboard</span>
            <span>{state.players.length} player{state.players.length !== 1 ? "s" : ""}</span>
          </div>
          <ul className="space-y-1">
            {state.players.slice(0, 5).map((p, i) => (
              <li key={p.playerId} className={`flex justify-between px-2 py-1 rounded-lg text-sm ${p.playerId === creds.playerId ? "bg-yellow-400/20" : "bg-white/5"}`}>
                <span className="flex gap-2 min-w-0">
                  <span className="w-4 text-violet-300">{i + 1}</span>
                  <span className="truncate">{p.name}</span>
                </span>
                <span className="font-mono">{p.score}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-900 via-violet-950 to-slate-900 text-white p-4">
      <div className="max-w-md mx-auto">{children}</div>
    </div>
  );
}
