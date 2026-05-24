import { Router, type IRouter, type Request, type Response } from "express";
import crypto from "crypto";

const router: IRouter = Router();

type PlayerRecord = {
  playerId: string;
  token: string;
  name: string;
  score: number;
  lastActionAt: number;
  telegramId: number | null;
  telegramUsername: string | null;
};

type Session = {
  sessionId: string;
  type: "tap" | "raid";
  chatId: number | string;
  status: "lobby" | "running" | "finished";
  createdAt: number;
  startsAt: number;
  endsAt: number;
  playDurationMs: number;
  manualStart: boolean;
  bossHp?: number;
  bossMaxHp?: number;
  players: Map<string, PlayerRecord>;
  winnerName: string | null;
  resultsPosted: boolean;
};

// Latest active session per chat (for bot /startrace lookups)
const latestByChat = new Map<string, string>();
function chatKey(chatId: number | string, type: "tap" | "raid"): string {
  return `${chatId}:${type}`;
}

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
    manualStart: s.manualStart,
    awaitingAdminStart: s.manualStart && s.status === "lobby",
    players,
    bossHp: s.bossHp ?? null,
    bossMaxHp: s.bossMaxHp ?? null,
    winnerName: s.winnerName,
  };
}

async function postToTelegram(chatId: number | string, text: string): Promise<void> {
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

  const playerLabel = (p: PlayerRecord): string => {
    const handle = p.telegramUsername ? ` (@${escapeHtml(p.telegramUsername)})` : "";
    return `<b>${escapeHtml(p.name)}</b>${handle}`;
  };

  let text = "";
  if (s.type === "tap") {
    const lines = sorted
      .slice(0, 5)
      .map((p, i) => `${i + 1}. ${playerLabel(p)} — ${p.score} taps`);
    let winnerBlock = "";
    if (winner) {
      const parts = [`🏆 Winner: <b>${escapeHtml(winner.name)}</b>`];
      if (winner.telegramUsername) parts.push(`@${escapeHtml(winner.telegramUsername)}`);
      if (winner.telegramId !== null) parts.push(`ID: <code>${winner.telegramId}</code>`);
      winnerBlock = `\n\n${parts.join(" • ")}`;
    }
    text = `🏁 <b>WEB TAP RACE FINISHED</b>\n\n${
      lines.join("\n") || "No players joined."
    }${winnerBlock}`;
  } else {
    const totalDmg = sorted.reduce((sum, p) => sum + p.score, 0);
    const lines = sorted
      .slice(0, 5)
      .map(
        (p, i) =>
          `${i + 1}. ${playerLabel(p)} — ${p.score.toLocaleString()} dmg`,
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
  if (s.status === "lobby" && !s.manualStart && now >= s.startsAt) {
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
    chatId?: number | string;
    lobbyDurationMs?: number;
    playDurationMs?: number;
    bossHp?: number;
    manualStart?: boolean;
  };
  if (body.type !== "tap" && body.type !== "raid") {
    res.status(400).json({ error: "invalid type" });
    return;
  }
  if (typeof body.chatId !== "number" && typeof body.chatId !== "string") {
    res.status(400).json({ error: "chatId required" });
    return;
  }
  const manualStart = body.manualStart === true;
  const lobby = Math.max(0, Math.min(120_000, body.lobbyDurationMs ?? 15_000));
  const play = Math.max(
    5_000,
    Math.min(300_000, body.playDurationMs ?? (body.type === "tap" ? 30_000 : 60_000)),
  );
  const now = Date.now();
  const sessionId = newId(body.type === "tap" ? "tap" : "raid");
  const FAR_FUTURE = now + 365 * 24 * 60 * 60 * 1000;
  const s: Session = {
    sessionId,
    type: body.type,
    chatId: body.chatId,
    status: manualStart || lobby > 0 ? "lobby" : "running",
    createdAt: now,
    startsAt: manualStart ? FAR_FUTURE : now + lobby,
    endsAt: manualStart ? FAR_FUTURE : now + lobby + play,
    playDurationMs: play,
    manualStart,
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
  latestByChat.set(chatKey(body.chatId, body.type), sessionId);
  const base = getPublicBaseUrl();
  const url = `${base}/play/${body.type}/${sessionId}`;
  res.json({ sessionId, url });
});

router.post("/play/session/:id/start", (req: Request, res: Response) => {
  const provided = req.header("x-bot-secret") ?? "";
  if (!PLAY_BOT_SECRET || provided !== PLAY_BOT_SECRET) {
    res.status(403).json({ error: "forbidden" });
    return;
  }
  const idParam = req.params["id"];
  const s = sessions.get(typeof idParam === "string" ? idParam : "");
  if (!s) {
    res.status(404).json({ error: "not found" });
    return;
  }
  if (s.status === "finished") {
    res.status(409).json({ error: "session finished" });
    return;
  }
  if (s.status === "running") {
    res.json({ ok: true, alreadyRunning: true });
    return;
  }
  // Idempotent: once a start has been scheduled (manualStart consumed), refuse
  // to reschedule. Prevents a second /startrace from shifting the countdown.
  if (s.manualStart === false && s.startsAt > Date.now() && s.startsAt < Date.now() + 365 * 24 * 60 * 60 * 1000 / 2) {
    res.json({
      ok: true,
      alreadyScheduled: true,
      startsAt: s.startsAt,
      endsAt: s.endsAt,
      serverTime: Date.now(),
      players: s.players.size,
    });
    return;
  }
  const body = (req.body ?? {}) as { delayMs?: number };
  const delay = Math.max(0, Math.min(60_000, Math.floor(body.delayMs ?? 0)));
  const now = Date.now();
  // Schedule it — tickSession will transition lobby->running when startsAt arrives.
  s.manualStart = false;
  s.startsAt = now + delay;
  s.endsAt = s.startsAt + s.playDurationMs;
  if (delay === 0) {
    s.status = "running";
  }
  res.json({
    ok: true,
    startsAt: s.startsAt,
    endsAt: s.endsAt,
    serverTime: now,
    players: s.players.size,
  });
});

router.get("/play/chat/:chatId/latest/:type", (req: Request, res: Response) => {
  const provided = req.header("x-bot-secret") ?? "";
  if (!PLAY_BOT_SECRET || provided !== PLAY_BOT_SECRET) {
    res.status(403).json({ error: "forbidden" });
    return;
  }
  const chatIdRaw = req.params["chatId"];
  const typeRaw = req.params["type"];
  if (typeof chatIdRaw !== "string" || !chatIdRaw) {
    res.status(400).json({ error: "bad chatId" });
    return;
  }
  // Accept either a numeric id or an @username
  const asNum = Number(chatIdRaw);
  const chatId: number | string = Number.isFinite(asNum) && chatIdRaw[0] !== "@"
    ? asNum
    : chatIdRaw;
  if (typeRaw !== "tap" && typeRaw !== "raid") {
    res.status(400).json({ error: "bad type" });
    return;
  }
  const id = latestByChat.get(chatKey(chatId, typeRaw));
  if (!id) {
    res.status(404).json({ error: "no session" });
    return;
  }
  const s = sessions.get(id);
  if (!s) {
    res.status(404).json({ error: "no session" });
    return;
  }
  res.json({ sessionId: s.sessionId, status: s.status, playerCount: s.players.size });
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
  const body = req.body as {
    name?: string;
    telegramId?: number;
    telegramUsername?: string;
  };
  const rawName = (body.name ?? "").trim();
  if (!rawName) {
    res.status(400).json({ error: "name required" });
    return;
  }
  const name = rawName.slice(0, 32);
  const playerId = newId("p");
  const token = crypto.randomBytes(16).toString("hex");
  const tgId =
    typeof body.telegramId === "number" && Number.isFinite(body.telegramId)
      ? Math.trunc(body.telegramId)
      : null;
  const tgUsername =
    typeof body.telegramUsername === "string" && body.telegramUsername.trim()
      ? body.telegramUsername.trim().slice(0, 32)
      : null;
  s.players.set(playerId, {
    playerId,
    token,
    name,
    score: 0,
    lastActionAt: 0,
    telegramId: tgId,
    telegramUsername: tgUsername,
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
  if (!Number.isFinite(rawAmount) || rawAmount === 0 || rawAmount < -25 || rawAmount > 25) {
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
    // Boss raid: only positive damage allowed
    if (amount < 1) {
      res.json({ score: player.score, bossHp: s.bossHp ?? null });
      return;
    }
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
