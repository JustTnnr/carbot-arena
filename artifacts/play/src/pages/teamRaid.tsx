import { useEffect, useRef, useState } from "react";
import { useRoute } from "wouter";
import { useSession, useCountdown } from "@/lib/useSession";
import { actSession } from "@/lib/api";

const BASE = "/api";

async function jsonPost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => res.statusText);
    throw new Error(txt || `${res.status}`);
  }
  return res.json() as Promise<T>;
}

type TeamInfo = {
  teamIdx: number;
  name: string;
  totalDamage: number;
  memberCount: number;
  full: boolean;
};

type TeamRaidState = {
  sessionId: string;
  type: "team-raid";
  status: "lobby" | "running" | "finished";
  startsAt: number | null;
  endsAt: number | null;
  serverTime: number;
  bossHp: number | null;
  bossMaxHp: number | null;
  teams: TeamInfo[];
  myTeamIdx: number | null;
  winnerTeamIdx: number | null;
  winnerName: string | null;
  players: { playerId: string; name: string; score: number }[];
};

type Creds = {
  playerId: string;
  token: string;
  name: string;
  teamIdx: number;
  teamName: string;
};

const STORAGE_PREFIX = "carbot.play.team-raid.";

function saveCreds(id: string, c: Creds) {
  try { localStorage.setItem(STORAGE_PREFIX + id, JSON.stringify(c)); } catch { /**/ }
}
function loadCreds(id: string): Creds | null {
  try { const r = localStorage.getItem(STORAGE_PREFIX + id); return r ? JSON.parse(r) as Creds : null; } catch { return null; }
}

const TEAM_COLORS: Record<number, string> = {
  0: "from-red-600 to-rose-700",
  1: "from-blue-600 to-blue-800",
  2: "from-emerald-600 to-green-700",
  3: "from-yellow-500 to-amber-600",
  4: "from-purple-600 to-violet-700",
  5: "from-pink-600 to-rose-600",
  6: "from-cyan-500 to-teal-600",
  7: "from-orange-500 to-amber-600",
  8: "from-indigo-600 to-blue-700",
  9: "from-lime-600 to-green-600",
  10: "from-fuchsia-600 to-pink-600",
  11: "from-slate-500 to-gray-600",
};

function teamColor(idx: number) {
  return TEAM_COLORS[idx] ?? "from-slate-600 to-gray-700";
}

export default function TeamRaidPage() {
  const [, params] = useRoute<{ id: string }>("/team-raid/:id");
  const id = params?.id ?? "";

  const [creds, setCreds] = useState<Creds | null>(() => (id ? loadCreds(id) : null));
  const pollPath = creds ? `${id}?playerId=${creds.playerId}` : id;

  const { state: rawState, error, serverOffset } = useSession(pollPath, 500);
  const state = rawState as unknown as TeamRaidState | null;

  // Join flow: step 1 = name, step 2 = team selection
  const [step, setStep] = useState<"name" | "team">("name");
  const [name, setName] = useState("");
  const [joining, setJoining] = useState(false);
  const [joinErr, setJoinErr] = useState<string | null>(null);

  // Raid
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
      } catch { /**/ }
      flushing.current = false;
    };
    const t = setInterval(flush, 120);
    return () => clearInterval(t);
  }, [creds, id, state?.status]);

  const handlePickTeam = async (teamIdx: number) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setJoining(true);
    setJoinErr(null);
    try {
      const r = await jsonPost<{ playerId: string; token: string; teamIdx: number; teamName: string }>(
        `/play/session/${id}/join`,
        { name: trimmed, teamIdx },
      );
      const next: Creds = { playerId: r.playerId, token: r.token, name: trimmed, teamIdx: r.teamIdx, teamName: r.teamName };
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

  const startsIn = useCountdown(state?.startsAt ?? null, serverOffset);

  if (error && !state) {
    return <Shell><div className="text-center text-red-300">Session unavailable. {error}</div></Shell>;
  }
  if (!state) {
    return <Shell><div className="text-center text-rose-300">Loading…</div></Shell>;
  }

  const maxHp = state.bossMaxHp ?? 1;
  const hp = Math.max(0, state.bossHp ?? 0);
  const pct = Math.max(0, Math.min(100, (hp / maxHp) * 100));

  const myTeamIdx = creds?.teamIdx ?? state.myTeamIdx;
  const myTeam = myTeamIdx !== null ? state.teams[myTeamIdx] : null;

  const me = state.players.find((p) => p.playerId === creds?.playerId);
  const myScore = me?.score ?? localDmg;

  const sortedTeams = [...state.teams].sort((a, b) => b.totalDamage - a.totalDamage);

  // ── Name entry ───────────────────────────────────────────────────────────────
  if (!creds && step === "name") {
    return (
      <Shell>
        <div className="space-y-5">
          <div className="text-center">
            <div className="text-6xl mb-2">👹</div>
            <h1 className="text-2xl font-bold">Team Boss Raid</h1>
            <p className="text-rose-300 text-sm mt-1">
              12 teams · 3 players max each · most damage wins
            </p>
          </div>
          <div className="space-y-3">
            <label className="text-sm text-rose-300">Your display name</label>
            <input
              autoFocus
              className="w-full rounded-xl bg-white/10 border border-white/20 text-white px-4 py-3 outline-none focus:border-rose-400"
              placeholder="e.g. @yourhandle"
              value={name}
              maxLength={32}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && name.trim()) setStep("team"); }}
            />
            <button
              disabled={!name.trim()}
              onClick={() => setStep("team")}
              className="w-full py-3 rounded-xl bg-rose-600 text-white font-bold disabled:opacity-50 active:scale-95 transition"
            >
              Choose a Team →
            </button>
          </div>
        </div>
      </Shell>
    );
  }

  // ── Team selection ───────────────────────────────────────────────────────────
  if (!creds && step === "team") {
    return (
      <Shell>
        <div className="space-y-4">
          <div className="text-center">
            <div className="text-lg font-bold">Pick your team, {name}</div>
            <div className="text-sm text-rose-300">Teams with 3/3 are full</div>
          </div>
          {joinErr && <div className="text-red-300 text-xs text-center">{joinErr}</div>}
          <div className="grid grid-cols-3 gap-2">
            {state.teams.map((t) => {
              const slots = `${t.memberCount}/${3}`;
              const isFull = t.full;
              return (
                <button
                  key={t.teamIdx}
                  disabled={isFull || joining}
                  onClick={() => void handlePickTeam(t.teamIdx)}
                  className={`rounded-xl p-3 border-2 text-center transition active:scale-95 ${
                    isFull
                      ? "opacity-40 cursor-not-allowed bg-white/5 border-white/10"
                      : `bg-gradient-to-br ${teamColor(t.teamIdx)} border-white/30 hover:border-white/60`
                  }`}
                >
                  <div className="font-bold text-sm">{t.name}</div>
                  <div className="text-xs mt-1 opacity-80">{slots}</div>
                  {isFull && <div className="text-xs font-bold text-red-300">FULL</div>}
                </button>
              );
            })}
          </div>
          <button
            onClick={() => setStep("name")}
            className="w-full py-2 text-sm text-rose-300 hover:text-white transition"
          >
            ← Change name
          </button>
        </div>
      </Shell>
    );
  }

  // ── Lobby (short or zero-duration — mostly unseen) ────────────────────────
  if (state.status === "lobby") {
    const lobbyMs = startsIn;
    return (
      <Shell>
        <div className="text-center space-y-4">
          <div className="text-6xl">👹</div>
          <h1 className="text-2xl font-bold">Team Boss Raid</h1>
          {lobbyMs > 500 && (
            <div className="text-4xl font-black text-rose-300">{Math.ceil(lobbyMs / 1000)}s</div>
          )}
          <div className="text-rose-300 text-sm">Loading raid…</div>
          {myTeam && (
            <div className={`rounded-2xl bg-gradient-to-br ${teamColor(myTeamIdx ?? 0)} p-4 border border-white/20`}>
              <div className="text-sm opacity-80">Your team</div>
              <div className="text-2xl font-black">{myTeam.name}</div>
              <div className="text-sm opacity-80">{myTeam.memberCount}/3 members</div>
            </div>
          )}
        </div>
      </Shell>
    );
  }

  // ── Finished ─────────────────────────────────────────────────────────────────
  if (state.status === "finished") {
    const winnerIdx = state.winnerTeamIdx;
    const winnerTeam = winnerIdx !== null ? state.teams[winnerIdx] : null;
    return (
      <Shell>
        <div className="space-y-4">
          <div className="text-center">
            <div className="text-5xl mb-2">{winnerTeam ? "🏆" : "💀"}</div>
            <h1 className="text-xl font-bold">Raid Over!</h1>
            {winnerTeam && (
              <div className="mt-2 text-yellow-300 font-bold text-lg">
                {winnerTeam.name} Wins!
              </div>
            )}
          </div>
          {myTeam && (
            <div className={`rounded-2xl bg-gradient-to-br ${teamColor(myTeamIdx ?? 0)} p-4 border border-white/20 text-center`}>
              <div className="text-sm opacity-80">Your team damage</div>
              <div className="text-4xl font-black">{myTeam.totalDamage.toLocaleString()}</div>
              <div className="text-sm opacity-80">Your personal dmg: {myScore.toLocaleString()}</div>
            </div>
          )}
          <div className="rounded-2xl bg-white/10 border border-white/20 p-4">
            <div className="font-semibold mb-3">Team Leaderboard</div>
            <ul className="space-y-2">
              {sortedTeams.filter(t => t.totalDamage > 0).map((t, i) => (
                <li
                  key={t.teamIdx}
                  className={`flex items-center justify-between px-3 py-2 rounded-lg ${
                    t.teamIdx === myTeamIdx ? "bg-yellow-400/20" : "bg-white/5"
                  } ${t.teamIdx === winnerIdx ? "ring-2 ring-yellow-400" : ""}`}
                >
                  <span className="flex items-center gap-2">
                    <span className="w-5 text-rose-300 text-sm">{i + 1}</span>
                    <span className="font-semibold">{t.name}</span>
                    <span className="text-xs text-rose-300">{t.memberCount} member{t.memberCount !== 1 ? "s" : ""}</span>
                  </span>
                  <span className="font-mono font-semibold">{t.totalDamage.toLocaleString()} <span className="text-xs text-rose-300">dmg</span></span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Shell>
    );
  }

  // ── Running ───────────────────────────────────────────────────────────────────
  return (
    <Shell>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="text-sm text-rose-300">
            {myTeam ? <span className="font-bold">{myTeam.name}</span> : "Team Raid"}
          </div>
          <div className="text-sm font-mono text-rose-300">No time limit</div>
        </div>

        {/* Boss HP */}
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

        {/* Strike button */}
        <button
          onClick={handleHit}
          className="w-full py-8 rounded-3xl text-white text-2xl font-black border-4 bg-gradient-to-br from-rose-600 to-red-700 border-rose-300 active:scale-95 shadow-2xl transition select-none"
          style={{ touchAction: "manipulation" }}
        >
          <div>⚔️ STRIKE</div>
          <div className="text-base mt-1 font-normal opacity-80">Your dmg: {myScore.toLocaleString()}</div>
        </button>

        {/* Team leaderboard */}
        <div className="rounded-2xl bg-white/10 border border-white/20 p-4">
          <div className="font-semibold mb-3 text-sm">Team Damage</div>
          <ul className="space-y-2">
            {sortedTeams.filter(t => t.totalDamage > 0 || t.teamIdx === myTeamIdx).map((t, i) => (
              <li
                key={t.teamIdx}
                className={`flex items-center justify-between px-3 py-2 rounded-lg ${
                  t.teamIdx === myTeamIdx ? "bg-rose-500/30 ring-1 ring-rose-400" : "bg-white/5"
                }`}
              >
                <span className="flex items-center gap-2 min-w-0">
                  <span className="w-5 text-rose-300 text-sm">{i + 1}</span>
                  <span className="font-semibold truncate">{t.name}</span>
                  <span className="text-xs text-rose-400">{t.memberCount}/3</span>
                </span>
                <span className="font-mono font-semibold text-sm">
                  {t.totalDamage.toLocaleString()} <span className="text-xs text-rose-300">dmg</span>
                </span>
              </li>
            ))}
            {sortedTeams.filter(t => t.totalDamage === 0 && t.teamIdx !== myTeamIdx).length > 0 && (
              <li className="text-xs text-rose-400 text-center pt-1">
                {sortedTeams.filter(t => t.totalDamage === 0).length} teams haven't dealt damage yet
              </li>
            )}
          </ul>
        </div>
      </div>
      <style>{`
        @keyframes shake {
          0%   { transform: translate(0,0); }
          25%  { transform: translate(-4px,2px); }
          50%  { transform: translate(4px,-2px); }
          75%  { transform: translate(-2px,3px); }
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
