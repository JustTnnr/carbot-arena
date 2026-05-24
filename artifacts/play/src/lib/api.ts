export type PlayPlayer = {
  playerId: string;
  name: string;
  score: number;
};

export type PlaySessionState = {
  sessionId: string;
  type: "tap" | "raid";
  status: "lobby" | "running" | "finished";
  startsAt: number | null;
  endsAt: number | null;
  serverTime: number;
  players: PlayPlayer[];
  bossHp: number | null;
  bossMaxHp: number | null;
  winnerName: string | null;
};

export type JoinResponse = { playerId: string; token: string };
export type ActionResponse = { score: number; bossHp: number | null };

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

export function joinSession(id: string, name: string): Promise<JoinResponse> {
  return jsonFetch(`/play/session/${id}/join`, {
    method: "POST",
    body: JSON.stringify({ name }),
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
