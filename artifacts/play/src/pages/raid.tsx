import { useEffect, useRef, useState } from "react";
import { useRoute } from "wouter";
import { useSession, useCountdown } from "@/lib/useSession";
import { actSession, joinSession } from "@/lib/api";

type PlayerCreds = { playerId: string; token: string; name: string };

const STORAGE_PREFIX = "carbot.play.raid.";

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

export default function RaidPage() {
  const [, params] = useRoute<{ id: string }>("/raid/:id");
  const id = params?.id ?? "";
  const { state, error } = useSession(id, 600);
  const [creds, setCreds] = useState<PlayerCreds | null>(() =>
    id ? loadCreds(id) : null,
  );
  const [name, setName] = useState("");
  const [joining, setJoining] = useState(false);
  const [joinErr, setJoinErr] = useState<string | null>(null);
  const [localDmg, setLocalDmg] = useState(0);
  const [shake, setShake] = useState(0);

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
        setLocalDmg(r.score);
      } catch {
        /* drop */
      }
      flushing.current = false;
    };
    const t = setInterval(flush, 120);
    return () => clearInterval(t);
  }, [creds, id, state?.status]);

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

  const handleHit = () => {
    if (!creds || state?.status !== "running") return;
    pending.current += 1;
    setLocalDmg((s) => s + 10);
    setShake((n) => n + 1);
  };

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
  if (state.type !== "raid") {
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
            <div className="text-5xl mb-2">👹</div>
            <h1 className="text-2xl font-bold">Boss Raid</h1>
            <p className="text-rose-200 text-sm mt-1">
              Tap to strike the boss. Most damage wins.
            </p>
          </div>
          <div className="space-y-2">
            <label className="text-sm text-rose-200">Display name</label>
            <input
              autoFocus
              className="w-full rounded-xl bg-white/10 border border-white/20 text-white px-4 py-3 outline-none focus:border-rose-300"
              placeholder="e.g. @yourhandle"
              value={name}
              maxLength={32}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void handleJoin();
              }}
            />
            {joinErr && <div className="text-red-300 text-xs">{joinErr}</div>}
            <button
              disabled={joining || !name.trim()}
              onClick={() => void handleJoin()}
              className="w-full py-3 rounded-xl bg-rose-500 text-white font-bold disabled:opacity-50 active:scale-95 transition"
            >
              {joining ? "Joining…" : "Join Raid"}
            </button>
          </div>
        </div>
      </Shell>
    );
  }

  const status = state.status;
  const maxHp = state.bossMaxHp ?? 1;
  const hp = Math.max(0, state.bossHp ?? 0);
  const pct = Math.max(0, Math.min(100, (hp / maxHp) * 100));
  const ranked = state.players;
  const me = ranked.find((p) => p.playerId === creds.playerId);
  const myRank = me ? ranked.indexOf(me) + 1 : null;

  return (
    <Shell>
      <div className="space-y-4">
        <div className="text-center">
          <div className="text-sm uppercase tracking-wide text-rose-200">
            Boss Raid
          </div>
          <div className="text-2xl font-bold">
            {status === "running" && `${Math.ceil(endsIn / 1000)}s left`}
            {status === "lobby" && "Starting…"}
            {status === "finished" &&
              (hp <= 0 ? "💀 Boss defeated!" : "Boss survived")}
          </div>
        </div>

        <div className="rounded-2xl bg-black/30 border border-rose-500/30 p-4">
          <div
            key={shake}
            className="text-7xl text-center mb-3"
            style={{ animation: "shake 120ms" }}
          >
            👹
          </div>
          <div className="h-4 bg-black/40 rounded-full overflow-hidden border border-white/10">
            <div
              className="h-full bg-gradient-to-r from-rose-600 to-red-400 transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="flex justify-between mt-2 text-xs text-rose-200 font-mono">
            <span>HP {hp.toLocaleString()}</span>
            <span>/ {maxHp.toLocaleString()}</span>
          </div>
        </div>

        <button
          onClick={handleHit}
          disabled={status !== "running"}
          className={`w-full py-8 rounded-3xl text-white text-2xl font-black border-4 transition select-none ${
            status === "running"
              ? "bg-gradient-to-br from-rose-600 to-red-700 border-rose-300 active:scale-95 shadow-2xl"
              : "bg-white/10 border-white/20 opacity-60"
          }`}
          style={{ touchAction: "manipulation" }}
        >
          {status === "running" ? (
            <>
              <div>⚔️ STRIKE</div>
              <div className="text-base mt-1 font-normal opacity-80">
                Your dmg: {me?.score ?? localDmg}
              </div>
            </>
          ) : status === "finished" ? (
            <div>
              <div className="text-lg">YOUR DAMAGE</div>
              <div className="text-5xl mt-2">{me?.score ?? localDmg}</div>
            </div>
          ) : (
            "GET READY"
          )}
        </button>

        <Leaderboard
          players={ranked}
          highlightId={creds.playerId}
          myRank={myRank}
          status={status}
          bossKilled={status === "finished" && hp <= 0}
        />
      </div>
      <style>{`
        @keyframes shake {
          0% { transform: translate(0,0); }
          25% { transform: translate(-4px,2px); }
          50% { transform: translate(4px,-2px); }
          75% { transform: translate(-2px,3px); }
          100% { transform: translate(0,0); }
        }
      `}</style>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-950 via-rose-950 to-slate-950 text-white p-4">
      <div className="max-w-md mx-auto">{children}</div>
    </div>
  );
}

function Leaderboard({
  players,
  highlightId,
  myRank,
  status,
  bossKilled,
}: {
  players: { playerId: string; name: string; score: number }[];
  highlightId: string;
  myRank: number | null;
  status: "lobby" | "running" | "finished";
  bossKilled: boolean;
}) {
  const total = players.reduce((s, p) => s + p.score, 0);
  return (
    <div className="rounded-2xl bg-white/10 backdrop-blur border border-white/20 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="font-semibold">Damage Board</div>
        <div className="text-xs text-rose-200">
          {players.length} {players.length === 1 ? "raider" : "raiders"}
          {myRank ? ` • You: #${myRank}` : ""}
        </div>
      </div>
      {status === "finished" && (
        <div className="mb-3 rounded-xl bg-rose-500/20 border border-rose-400/40 p-2 text-center text-rose-100 text-sm">
          {bossKilled ? "💀 BOSS DEFEATED" : "⏱ Time's up"} • Total dmg:{" "}
          <span className="font-bold">{total.toLocaleString()}</span>
        </div>
      )}
      {players.length === 0 ? (
        <div className="text-center text-rose-200 text-sm py-4">
          Waiting for raiders…
        </div>
      ) : (
        <ul className="space-y-1">
          {players.slice(0, 8).map((p, i) => (
            <li
              key={p.playerId}
              className={`flex items-center justify-between px-3 py-2 rounded-lg ${
                p.playerId === highlightId ? "bg-rose-500/20" : "bg-white/5"
              }`}
            >
              <span className="flex items-center gap-2 min-w-0">
                <span className="w-5 text-rose-300 text-sm">{i + 1}</span>
                <span className="truncate">{p.name}</span>
              </span>
              <span className="font-mono font-semibold">
                {p.score.toLocaleString()}
                <span className="text-xs text-rose-300"> dmg</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
