import { useEffect, useMemo, useRef, useState } from "react";
import { useRoute } from "wouter";
import { useSession, useCountdown } from "@/lib/useSession";
import { actSession, joinSession } from "@/lib/api";

type PlayerCreds = { playerId: string; token: string; name: string };

type TgUser = {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
};

function readTelegramUser(): TgUser | null {
  try {
    const w = window as unknown as {
      Telegram?: {
        WebApp?: {
          initDataUnsafe?: { user?: TgUser };
          ready?: () => void;
          expand?: () => void;
        };
      };
    };
    const wa = w.Telegram?.WebApp;
    if (wa?.ready) wa.ready();
    if (wa?.expand) wa.expand();
    return wa?.initDataUnsafe?.user ?? null;
  } catch {
    return null;
  }
}

const STORAGE_PREFIX = "carbot.play.tap.";
const GRID_SIZE = 25;
const MIN_GREEN_MS = 600;
const MAX_GREEN_MS = 1100;

function loadCreds(id: string): PlayerCreds | null {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + id);
    return raw ? (JSON.parse(raw) as PlayerCreds) : null;
  } catch {
    return null;
  }
}

function saveCreds(id: string, c: PlayerCreds) {
  try {
    localStorage.setItem(STORAGE_PREFIX + id, JSON.stringify(c));
  } catch {
    /* ignore */
  }
}

function pickNextGreen(prev: number): number {
  let next = Math.floor(Math.random() * GRID_SIZE);
  if (next === prev) next = (next + 1) % GRID_SIZE;
  return next;
}

export default function TapPage() {
  const [, params] = useRoute<{ id: string }>("/tap/:id");
  const id = params?.id ?? "";
  const { state, error, serverOffset } = useSession(id, 700);
  const [creds, setCreds] = useState<PlayerCreds | null>(() =>
    id ? loadCreds(id) : null,
  );
  const tgUser = useMemo(() => readTelegramUser(), []);
  const defaultName = tgUser?.username
    ? `@${tgUser.username}`
    : tgUser?.first_name
      ? [tgUser.first_name, tgUser.last_name].filter(Boolean).join(" ")
      : "";
  const [name, setName] = useState(defaultName);
  const [tgHandle, setTgHandle] = useState(tgUser?.username ?? "");
  const [joining, setJoining] = useState(false);
  const [joinErr, setJoinErr] = useState<string | null>(null);
  const [localScore, setLocalScore] = useState(0);
  // Sync optimistic score with authoritative server score whenever the server
  // reports a value (handles reconnect / mid-game rejoin).
  const serverScore = useMemo(() => {
    if (!creds || !state) return null;
    return state.players.find((p) => p.playerId === creds.playerId)?.score ?? null;
  }, [creds, state]);
  useEffect(() => {
    if (serverScore == null) return;
    // Only adopt the server score if there are no pending un-flushed deltas.
    if (pending.current === 0) setLocalScore(serverScore);
  }, [serverScore]);
  const [greenIdx, setGreenIdx] = useState<number>(-1);
  // Debounce: ignore taps while a cell is mid-flip animation
  const lastTapAt = useRef<Record<number, number>>({});

  // Pending signed delta queue, flushed periodically
  const pending = useRef(0);
  const flushing = useRef(false);

  // Cycle the green cell while the game is running
  useEffect(() => {
    if (state?.status !== "running") {
      setGreenIdx(-1);
      return;
    }
    setGreenIdx((prev) => (prev < 0 ? Math.floor(Math.random() * GRID_SIZE) : prev));
    const tick = () => {
      setGreenIdx((prev) => pickNextGreen(prev));
    };
    const schedule = () => {
      const wait = MIN_GREEN_MS + Math.random() * (MAX_GREEN_MS - MIN_GREEN_MS);
      return setTimeout(() => {
        tick();
        timeoutId = schedule();
      }, wait);
    };
    let timeoutId = schedule();
    return () => clearTimeout(timeoutId);
  }, [state?.status]);

  // Flush pending deltas to the server in batches
  useEffect(() => {
    if (!creds || !id) return;
    const flush = async () => {
      if (flushing.current || pending.current === 0) return;
      if (state?.status !== "running") return;
      flushing.current = true;
      // Clamp to [-25, 25] and avoid sending 0
      const raw = pending.current;
      const delta = Math.max(-25, Math.min(25, raw));
      if (delta !== 0) {
        pending.current = raw - delta;
        try {
          const r = await actSession(id, creds.playerId, creds.token, delta);
          setLocalScore(r.score);
        } catch {
          /* drop */
        }
      } else {
        pending.current = 0;
      }
      flushing.current = false;
    };
    const t = setInterval(flush, 200);
    return () => clearInterval(t);
  }, [creds, id, state?.status]);

  const handleJoin = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setJoining(true);
    setJoinErr(null);
    try {
      const handle = (tgHandle || tgUser?.username || "")
        .replace(/^@+/, "")
        .trim();
      const r = await joinSession(id, trimmed, {
        telegramId: tgUser?.id,
        telegramUsername: handle || undefined,
      });
      const next = { playerId: r.playerId, token: r.token, name: trimmed };
      saveCreds(id, next);
      setCreds(next);
    } catch (e) {
      setJoinErr(String(e));
    }
    setJoining(false);
  };

  const handleCellTap = (cellIdx: number) => {
    if (!creds || state?.status !== "running") return;
    // Per-cell debounce (anti double-fire)
    const nowT = Date.now();
    const last = lastTapAt.current[cellIdx] ?? 0;
    if (nowT - last < 60) return;
    lastTapAt.current[cellIdx] = nowT;

    const isGreen = cellIdx === greenIdx;
    pending.current += isGreen ? 1 : -1;
    setLocalScore((s) => s + (isGreen ? 1 : -1));
  };

  const startsIn = useCountdown(state?.startsAt ?? null, serverOffset);
  const endsIn = useCountdown(state?.endsAt ?? null, serverOffset);

  if (error && !state) {
    return (
      <Shell>
        <div className="text-center text-red-200">
          Session unavailable. {error}
        </div>
      </Shell>
    );
  }
  if (!state) {
    return (
      <Shell>
        <div className="text-center text-purple-200">Loading…</div>
      </Shell>
    );
  }
  if (state.type !== "tap") {
    return (
      <Shell>
        <div className="text-center text-purple-200">
          Wrong game type for this link.
        </div>
      </Shell>
    );
  }

  if (!creds) {
    return (
      <Shell>
        <div className="space-y-4">
          <div className="text-center">
            <div className="text-5xl mb-2">⚡</div>
            <h1 className="text-2xl font-bold">Tap Race</h1>
            <p className="text-purple-200 text-sm mt-1">
              Tap only the GREEN square. Wrong cells and late taps cost you a
              point.
            </p>
          </div>
          <div className="space-y-2">
            <label className="text-sm text-purple-200">Display name</label>
            <input
              autoFocus
              className="w-full rounded-xl bg-white/10 border border-white/20 text-white px-4 py-3 outline-none focus:border-yellow-300"
              placeholder="e.g. @yourhandle"
              value={name}
              maxLength={32}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void handleJoin();
              }}
            />
            <label className="text-sm text-purple-200 block">
              Telegram @username{" "}
              <span className="text-purple-400 text-xs">(optional)</span>
            </label>
            <input
              className="w-full rounded-xl bg-white/10 border border-white/20 text-white px-4 py-3 outline-none focus:border-yellow-300"
              placeholder="@yourhandle"
              value={tgHandle}
              maxLength={32}
              onChange={(e) => setTgHandle(e.target.value)}
            />
            {tgUser && (
              <div className="text-xs text-purple-300">
                Detected as @{tgUser.username ?? `id${tgUser.id}`}
              </div>
            )}
            {joinErr && <div className="text-red-300 text-xs">{joinErr}</div>}
            <button
              disabled={joining || !name.trim()}
              onClick={() => void handleJoin()}
              className="w-full py-3 rounded-xl bg-yellow-400 text-slate-900 font-bold disabled:opacity-50 active:scale-95 transition"
            >
              {joining ? "Joining…" : "Join Race"}
            </button>
          </div>
        </div>
      </Shell>
    );
  }

  const status = state.status;
  const ranked = state.players;
  const me = ranked.find((p) => p.playerId === creds.playerId);
  const myRank = me ? ranked.indexOf(me) + 1 : null;
  const awaitingAdmin =
    (state as { awaitingAdminStart?: boolean }).awaitingAdminStart === true;
  const lobbyCountdown = Math.ceil(startsIn / 1000);

  return (
    <Shell>
      <div className="space-y-4">
        <div className="text-center">
          <div className="text-sm uppercase tracking-wide text-purple-200">
            Tap Race
          </div>
          <div className="text-3xl font-bold">
            {status === "lobby" &&
              (awaitingAdmin
                ? "Waiting for admin…"
                : `Starts in ${lobbyCountdown}s`)}
            {status === "running" && `${Math.ceil(endsIn / 1000)}s left`}
            {status === "finished" && "Race finished"}
          </div>
          {status === "lobby" && awaitingAdmin && (
            <div className="text-sm text-purple-200 mt-1">
              Admin must run /startrace in Telegram to begin.
            </div>
          )}
          {status === "running" && (
            <div className="text-sm text-purple-200 mt-1">
              Score: <span className="font-mono font-bold">{localScore}</span>
            </div>
          )}
        </div>

        <Grid
          status={status}
          greenIdx={greenIdx}
          onTap={handleCellTap}
        />

        {status === "finished" && (
          <div className="rounded-2xl bg-white/10 border border-white/20 p-4 text-center">
            <div className="text-sm text-purple-200">You scored</div>
            <div className="text-5xl font-black text-yellow-300 mt-1">
              {me?.score ?? localScore}
            </div>
          </div>
        )}

        <Leaderboard
          players={ranked}
          highlightId={creds.playerId}
          myRank={myRank}
          winnerName={state.winnerName}
          status={status}
          unit="pts"
        />
      </div>
    </Shell>
  );
}

function Grid({
  status,
  greenIdx,
  onTap,
}: {
  status: "lobby" | "running" | "finished";
  greenIdx: number;
  onTap: (i: number) => void;
}) {
  const cells = Array.from({ length: GRID_SIZE }, (_, i) => i);
  const running = status === "running";
  return (
    <div
      className="grid grid-cols-5 gap-1 p-1 rounded-2xl bg-black border-2 border-black select-none"
      style={{ aspectRatio: "1 / 1", touchAction: "manipulation" }}
    >
      {cells.map((i) => {
        const isGreen = running && i === greenIdx;
        const base = running
          ? isGreen
            ? "bg-emerald-400 border-emerald-200"
            : "bg-red-600 border-red-900"
          : status === "finished"
            ? "bg-white/10 border-white/20"
            : "bg-white/10 border-white/20";
        return (
          <button
            key={i}
            disabled={!running}
            onPointerDown={(e) => {
              e.preventDefault();
              onTap(i);
            }}
            className={`border-2 rounded-md transition-colors duration-75 active:scale-95 ${base} ${
              !running ? "opacity-70" : ""
            }`}
            aria-label={`cell ${i + 1}`}
          />
        );
      })}
    </div>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white p-4">
      <div className="max-w-md mx-auto">{children}</div>
    </div>
  );
}

function Leaderboard({
  players,
  highlightId,
  myRank,
  winnerName,
  status,
  unit,
}: {
  players: { playerId: string; name: string; score: number }[];
  highlightId: string;
  myRank: number | null;
  winnerName: string | null;
  status: "lobby" | "running" | "finished";
  unit: string;
}) {
  return (
    <div className="rounded-2xl bg-white/10 backdrop-blur border border-white/20 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="font-semibold">Leaderboard</div>
        <div className="text-xs text-purple-200">
          {players.length} {players.length === 1 ? "player" : "players"}
          {myRank ? ` • You: #${myRank}` : ""}
        </div>
      </div>
      {status === "finished" && winnerName && (
        <div className="mb-3 rounded-xl bg-yellow-400/20 border border-yellow-300/40 p-2 text-center text-yellow-100 text-sm">
          🏆 Winner: <span className="font-bold">{winnerName}</span>
        </div>
      )}
      {players.length === 0 ? (
        <div className="text-center text-purple-200 text-sm py-4">
          Waiting for players…
        </div>
      ) : (
        <ul className="space-y-1">
          {players.slice(0, 8).map((p, i) => (
            <li
              key={p.playerId}
              className={`flex items-center justify-between px-3 py-2 rounded-lg ${
                p.playerId === highlightId ? "bg-yellow-400/20" : "bg-white/5"
              }`}
            >
              <span className="flex items-center gap-2 min-w-0">
                <span className="w-5 text-purple-300 text-sm">{i + 1}</span>
                <span className="truncate">{p.name}</span>
              </span>
              <span className="font-mono font-semibold">
                {p.score} <span className="text-xs text-purple-300">{unit}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
