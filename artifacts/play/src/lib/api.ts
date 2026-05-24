export type PlayPlayer = {
  playerId: string;
  name: string;
  score: number;
};

export type PlaySessionState = {
  sessionId: string;
  type: "tap" | "raid" | "quiz" | "team-raid";
  status: "lobby" | "running" | "finished";
  startsAt: number | null;
  endsAt: number | null;
  serverTime: number;
  players: PlayPlayer[];
  bossHp: number | null;
  bossMaxHp: number | null;
  winnerName: string | null;
  // tap/raid extras
  awaitingAdminStart?: boolean;
  manualStart?: boolean;
  // quiz extras (optional — full typing handled in quiz.tsx)
  quizType?: string;
  currentQ?: number;
  totalQuestions?: number;
  questionEndsAt?: number;
  revealEndsAt?: number;
  questionDurationMs?: number;
  question?: { text: string; options: string[]; correctIdx?: number } | null;
  myAnswer?: number | null;
  // team-raid extras
  teams?: { teamIdx: number; name: string; totalDamage: number; memberCount: number; full: boolean; members: { name: string; score: number; telegramUsername: string | null }[] }[];
  myTeamIdx?: number | null;
  winnerTeamIdx?: number | null;
};

export type JoinResponse = { playerId: string; token: string; teamIdx?: number; teamName?: string };
export type ActionResponse = { score: number; bossHp: number | null; accepted?: boolean; correct?: boolean };

const API = "/api";

async function jsonFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  if (!res.ok) {
    throw new Error(`${res.status} ${res.statusText}`);
  }
  return (await res.json()) as T;
}

export function getSession(id: string): Promise<PlaySessionState> {
  return jsonFetch(`/play/session/${id}`);
}

export function joinSession(
  id: string,
  name: string,
  extras?: { telegramId?: number; telegramUsername?: string },
): Promise<JoinResponse> {
  return jsonFetch(`/play/session/${id}/join`, {
    method: "POST",
    body: JSON.stringify({
      name,
      telegramId: extras?.telegramId,
      telegramUsername: extras?.telegramUsername,
    }),
  });
}

export function actSession(
  id: string,
  playerId: string,
  token: string,
  amount: number,
): Promise<ActionResponse> {
  return jsonFetch(`/play/session/${id}/action`, {
    method: "POST",
    body: JSON.stringify({ playerId, token, amount }),
  });
}
