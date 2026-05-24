import { Router, type IRouter, type Request, type Response } from "express";
import crypto from "crypto";

const router: IRouter = Router();

type PlayerRecord = {
  playerId: string;
  token: string;
  name: string;
  score: number;
  lastActionAt: number;
};

type Session = {
  sessionId: string;
  type: "tap" | "raid";
  chatId: number;
  status: "lobby" | "running" | "finished";
  createdAt: number;
  startsAt: number;
  endsAt: number;
  bossHp?: number;
  bossMaxHp?: number;
  players: Map<string, PlayerRecord>;
  winnerName: string | null;
  resultsPosted: boolean;
};

const sessions = new Map<string, Session>();

const BOT_TOKEN = process.env["TELEGRAM_BOT_TOKEN"] ?? "";
const PLAY_BOT_SECRET = process.env["TELEGRAM_BOT_TOKEN"] ?? "";

function getPublicBaseUrl(): string {
  const domains = process.env["REPLIT_DOMAINS"];
  if (domains) {
    const first = domains.split(",")[0];
    if (first) return `https://${first}`;
  }
  const devDomain = process.env["REPLIT_DEV_DOMAIN"];
  if (devDomain) return `https://${devDomain}`;
  return "http://localhost:80";
}

function newId(prefix: string): string {
  return `${prefix}_${crypto.randomBytes(6).toString("hex")}`;
}

function serializeState(s: Session) {
  const players = Array.from(s.players.values())
    .map((p) => ({ playerId: p.playerId, name: p.name, score: p.score }))
    .sort((a, b) => b.score - a.score);
  return {
    sessionId: s.sessionId,
    type: s.type,
    status: s.status,
    startsAt: s.startsAt,
    endsAt: s.endsAt,
    serverTime: Date.now(),
    players,
    bossHp: s.bossHp ?? null,
    bossMaxHp: s.bossMaxHp ?? null,
    winnerName: s.winnerName,
  };
}

async function postToTelegram(chatId: number, text: string): Promise<void> {
  if (!BOT_TOKEN) {
    console.warn("[play] TELEGRAM_BOT_TOKEN not set; cannot post results");
    return;
  }
  try {
    const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" }),
    });
    if (!res.ok) {
      const body = await res.text();
      console.warn(`[play] Telegram sendMessage failed: ${res.status} ${body}`);
    }
  } catch (err) {
    console.warn("[play] Telegram sendMessage error", err);
  }
}

function finishSession(s: Session, reason: "time" | "boss_killed") {
  if (s.status === "finished") return;
  s.status = "finished";
  const sorted = Array.from(s.players.values()).sort((a, b) => b.score - a.score);
  const winner = sorted[0] ?? null;
  s.winnerName = winner?.name ?? null;

  let text = "";
  if (s.type === "tap") {
    const lines = sorted
      .slice(0, 5)
      .map((p, i) => `${i + 1}. <b>${escapeHtml(p.name)}</b> — ${p.score} taps`);
    text = `🏁 <b>WEB TAP RACE FINISHED</b>\n\n${
      lines.join("\n") || "No players joined."
    }${winner ? `\n\n🏆 Winner: <b>${escapeHtml(winner.name)}</b>` : ""}`;
  } else {
    const totalDmg = sorted.reduce((sum, p) => sum + p.score, 0);
    const lines = sorted
      .slice(0, 5)
      .map(
        (p, i) =>
          `${i + 1}. <b>${escapeHtml(p.name)}</b> — ${p.score.toLocaleString()} dmg`,
      );
    const verdict =
      reason === "boss_killed"
        ? "💀 <b>BOSS DEFEATED!</b>"
        : `⏱ Time's up. Boss survived with ${s.bossHp?.toLocaleString() ?? "?"} HP`;
    text = `${verdict}\n\n<b>WEB BOSS RAID — Top Damage</b>\n${
      lines.join("\n") || "No raiders joined."
    }\n\nTotal damage: ${totalDmg.toLocaleString()}`;
  }

  void postToTelegram(s.chatId, text);
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function tickSession(s: Session): void {
  const now = Date.now();
  if (s.status === "lobby" && now >= s.startsAt) {
    s.status = "running";
  }
  if (s.status === "running" && now >= s.endsAt) {
    finishSession(s, "time");
  }
}

// Sweep old sessions periodically
setInterval(() => {
  const now = Date.now();
  for (const [id, s] of sessions) {
    tickSession(s);
    if (s.status === "finished" && now - s.endsAt > 5 * 60 * 1000) {
      sessions.delete(id);
    }
  }
}, 1000);

router.post("/play/session", (req: Request, res: Response) => {
  const provided = req.header("x-bot-secret") ?? "";
  if (!PLAY_BOT_SECRET || provided !== PLAY_BOT_SECRET) {
    res.status(403).json({ error: "forbidden" });
    return;
  }
  const body = req.body as {
    type?: string;
    chatId?: number;
    lobbyDurationMs?: number;
    playDurationMs?: number;
    bossHp?: number;
  };
  if (body.type !== "tap" && body.type !== "raid") {
    res.status(400).json({ error: "invalid type" });
    return;
  }
  if (typeof body.chatId !== "number") {
    res.status(400).json({ error: "chatId required" });
    return;
  }
  const lobby = Math.max(0, Math.min(120_000, body.lobbyDurationMs ?? 15_000));
  const play = Math.max(
    5_000,
    Math.min(120_000, body.playDurationMs ?? (body.type === "tap" ? 20_000 : 60_000)),
  );
  const now = Date.now();
  const sessionId = newId(body.type === "tap" ? "tap" : "raid");
  const s: Session = {
    sessionId,
    type: body.type,
    chatId: body.chatId,
    status: lobby > 0 ? "lobby" : "running",
    createdAt: now,
    startsAt: now + lobby,
    endsAt: now + lobby + play,
    players: new Map(),
    winnerName: null,
    resultsPosted: false,
  };
  if (body.type === "raid") {
    const hp = Math.max(100, Math.min(10_000_000, body.bossHp ?? 50_000));
    s.bossHp = hp;
    s.bossMaxHp = hp;
  }
  sessions.set(sessionId, s);
  const base = getPublicBaseUrl();
  const url = `${base}/play/${body.type}/${sessionId}`;
  res.json({ sessionId, url });
});

router.get("/play/session/:id", (req: Request, res: Response) => {
  const idParam = req.params["id"];
  const s = sessions.get(typeof idParam === "string" ? idParam : "");
  if (!s) {
    res.status(404).json({ error: "not found" });
    return;
  }
  tickSession(s);
  res.json(serializeState(s));
});

router.post("/play/session/:id/join", (req: Request, res: Response) => {
  const idParam = req.params["id"];
  const s = sessions.get(typeof idParam === "string" ? idParam : "");
  if (!s) {
    res.status(404).json({ error: "not found" });
    return;
  }
  tickSession(s);
  if (s.status === "finished") {
    res.status(409).json({ error: "session finished" });
    return;
  }
  const body = req.body as { name?: string };
  const rawName = (body.name ?? "").trim();
  if (!rawName) {
    res.status(400).json({ error: "name required" });
    return;
  }
  const name = rawName.slice(0, 32);
  const playerId = newId("p");
  const token = crypto.randomBytes(16).toString("hex");
  s.players.set(playerId, {
    playerId,
    token,
    name,
    score: 0,
    lastActionAt: 0,
  });
  res.json({ playerId, token });
});

router.post("/play/session/:id/action", (req: Request, res: Response) => {
  const idParam = req.params["id"];
  const s = sessions.get(typeof idParam === "string" ? idParam : "");
  if (!s) {
    res.status(404).json({ error: "not found" });
    return;
  }
  tickSession(s);
  const body = req.body as { playerId?: string; token?: string; amount?: number };
  const player = s.players.get(body.playerId ?? "");
  if (!player || player.token !== body.token) {
    res.status(403).json({ error: "invalid player" });
    return;
  }
  if (s.status !== "running") {
    res.json({ score: player.score, bossHp: s.bossHp ?? null });
    return;
  }
  const rawAmount = Math.floor(body.amount ?? 0);
  if (!Number.isFinite(rawAmount) || rawAmount < 1 || rawAmount > 25) {
    res.status(400).json({ error: "invalid amount" });
    return;
  }
  const amount = rawAmount;
  // Anti-spam: throttle batches to at most one per 80ms
  const now = Date.now();
  if (now - player.lastActionAt < 80) {
    res.json({ score: player.score, bossHp: s.bossHp ?? null });
    return;
  }
  player.lastActionAt = now;

  if (s.type === "tap") {
    player.score += amount;
  } else {
    const dmg = amount * 10; // each tap = 10 dmg
    const actual = Math.min(dmg, s.bossHp ?? 0);
    player.score += actual;
    s.bossHp = (s.bossHp ?? 0) - actual;
    if ((s.bossHp ?? 0) <= 0) {
      s.bossHp = 0;
      finishSession(s, "boss_killed");
    }
  }
  res.json({ score: player.score, bossHp: s.bossHp ?? null });
});

export default router;
