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
      Telegram?: { WebApp?: { initDataUnsafe?: { user?: TgUser }; ready?: () => void; expand?: () => void } };
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

export default function TapPage() {
  const [, params] = useRoute<{ id: string }>("/tap/:id");
  const id = params?.id ?? "";
  const { state, error } = useSession(id, 700);
  const [creds, setCreds] = useState<PlayerCreds | null>(() =>
    id ? loadCreds(id) : null,
  );
  const tgUser = useMemo(() => readTelegramUser(), []);
  const defaultName =
    tgUser?.username
      ? `@${tgUser.username}`
      : tgUser?.first_name
        ? [tgUser.first_name, tgUser.last_name].filter(Boolean).join(" ")
        : "";
  const [name, setName] = useState(defaultName);
  const [joining, setJoining] = useState(false);
  const [joinErr, setJoinErr] = useState<string | null>(null);
  const [localScore, setLocalScore] = useState(0);

  // Pending taps queue, flushed every ~150ms
  const pending = useRef(0);
  const flushing = useRef(false);

  useEffect(() => {
    if (!creds || !id) return;
    const flush = async () => {
      if (flushing.current || pending.current <= 0) return;
      if (state?.status !== "running") return;
      flushing.current = true;
      const amount = Math.min(25, pending.current);
      pending.current -= amount;
      try {
        const r = await actSession(id, creds.playerId, creds.token, amount);
        setLocalScore(r.score);
      } catch {
        /* drop */
      }
      flushing.current = false;
    };
    const t = setInterval(flush, 150);
    return () => clearInterval(t);
  }, [creds, id, state?.status]);

  const handleJoin = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setJoining(true);
    setJoinErr(null);
    try {
      const r = await joinSession(id, trimmed, {
        telegramId: tgUser?.id,
        telegramUsername: tgUser?.username,
      });
      const next = { playerId: r.playerId, token: r.token, name: trimmed };
      saveCreds(id, next);
      setCreds(next);
    } catch (e) {
      setJoinErr(String(e));
    }
    setJoining(false);
  };

  const handleTap = () => {
    if (!creds || state?.status !== "running") return;
    pending.current += 1;
    setLocalScore((s) => s + 1);
  };

  const startsIn = useCountdown(state?.startsAt ?? null);
  const endsIn = useCountdown(state?.endsAt ?? null);

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
              Tap the button as fast as you can!
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
            {tgUser && (
              <div className="text-xs text-purple-300">
                Joining as Telegram user{" "}
                {tgUser.username ? `@${tgUser.username}` : `#${tgUser.id}`}
              </div>
            )}
            {!tgUser && (
              <div className="text-xs text-yellow-300/80">
                Tip: open this link from inside Telegram so the bot can recognise you automatically.
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

  return (
    <Shell>
      <div className="space-y-4">
        <div className="text-center">
          <div className="text-sm uppercase tracking-wide text-purple-200">
            Tap Race
          </div>
          <div className="text-3xl font-bold">
            {status === "lobby" &&
              ((state as { awaitingAdminStart?: boolean }).awaitingAdminStart
                ? "Waiting for admin…"
                : `Starts in ${Math.ceil(startsIn / 1000)}s`)}
            {status === "running" && `${Math.ceil(endsIn / 1000)}s left`}
            {status === "finished" && "Race finished"}
          </div>
          {status === "lobby" &&
            (state as { awaitingAdminStart?: boolean }).awaitingAdminStart && (
              <div className="text-sm text-purple-200 mt-1">
                Admin must run /startrace in Telegram to begin.
              </div>
            )}
        </div>

        <button
          onClick={handleTap}
          disabled={status !== "running"}
          className={`w-full aspect-square max-h-80 mx-auto rounded-3xl text-white text-3xl font-black border-4 transition select-none ${
            status === "running"
              ? "bg-gradient-to-br from-yellow-400 to-orange-500 border-yellow-200 active:scale-95 shadow-2xl"
              : "bg-white/10 border-white/20 opacity-60"
          }`}
          style={{ touchAction: "manipulation" }}
        >
          {status === "lobby" && "GET READY"}
          {status === "running" && (
            <div>
              <div>TAP!</div>
              <div className="text-5xl mt-2">{localScore}</div>
            </div>
          )}
          {status === "finished" && (
            <div>
              <div className="text-lg">YOU SCORED</div>
              <div className="text-6xl mt-2">{me?.score ?? localScore}</div>
            </div>
          )}
        </button>

        <Leaderboard
          players={ranked}
          highlightId={creds.playerId}
          myRank={myRank}
          winnerName={state.winnerName}
          status={status}
          unit="taps"
        />
      </div>
    </Shell>
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
