import { Router, type IRouter, type Request, type Response } from "express";
import crypto from "crypto";
import { getQuestions, type QuizQuestion, QUIZ_TYPES } from "../lib/quizQuestions";

const router: IRouter = Router();

// ─── Types ────────────────────────────────────────────────────────────────────

type PlayerRecord = {
  playerId: string;
  token: string;
  name: string;
  score: number;
  lastActionAt: number;
  telegramId: number | null;
  telegramUsername: string | null;
};

type TeamRecord = {
  name: string;
  totalDamage: number;
  memberIds: string[];
};

type QuizPlayerAnswer = {
  answerIdx: number;
  correct: boolean;
  answeredAt: number;
};

type Session = {
  sessionId: string;
  type: "tap" | "raid" | "quiz" | "team-raid";
  chatId: number | string;
  status: "lobby" | "running" | "finished";
  createdAt: number;
  startsAt: number;
  endsAt: number;
  playDurationMs: number;
  manualStart: boolean;
  players: Map<string, PlayerRecord>;
  winnerName: string | null;
  resultsPosted: boolean;
  // raid / team-raid
  bossHp?: number;
  bossMaxHp?: number;
  // quiz
  quizType?: string;
  questions?: QuizQuestion[];
  currentQ?: number;
  questionDurationMs?: number;
  revealDurationMs?: number;
  questionStartedAt?: number;
  playerAnswers?: Map<string, QuizPlayerAnswer[]>;
  // team-raid
  teams?: TeamRecord[];
  playerTeam?: Map<string, number>; // playerId → teamIdx
  winnerTeamIdx?: number | null;
};

// ─── Shared state ─────────────────────────────────────────────────────────────

const sessions = new Map<string, Session>();
const latestByChat = new Map<string, string>();

function chatKey(chatId: number | string, type: string): string {
  return `${chatId}:${type}`;
}

const BOT_SECRET = process.env["TELEGRAM_BOT_TOKEN"] ?? "";

// ─── Constants ────────────────────────────────────────────────────────────────

const TEAM_NAMES = [
  "Alpha", "Bravo", "Charlie", "Delta", "Echo", "Foxtrot",
  "Golf", "Hotel", "India", "Juliet", "Kilo", "Lima",
];
const MAX_TEAM_SIZE = 3;
const QUIZ_QUESTIONS = 10;
const QUIZ_Q_MS = 15_000;
const QUIZ_REVEAL_MS = 3_000;

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

async function postToTelegram(chatId: number | string, text: string): Promise<void> {
  if (!BOT_SECRET) return;
  try {
    const url = `https://api.telegram.org/bot${BOT_SECRET}/sendMessage`;
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

// ─── Serialization ────────────────────────────────────────────────────────────

function serializeState(s: Session, requestPlayerId?: string) {
  const players = Array.from(s.players.values())
    .map((p) => ({ playerId: p.playerId, name: p.name, score: p.score }))
    .sort((a, b) => b.score - a.score);

  const base = {
    sessionId: s.sessionId,
    type: s.type,
    status: s.status,
    startsAt: s.startsAt,
    endsAt: s.endsAt,
    serverTime: Date.now(),
    manualStart: s.manualStart,
    awaitingAdminStart: s.manualStart && s.status === "lobby",
    players,
    winnerName: s.winnerName,
  };

  if (s.type === "tap" || s.type === "raid") {
    return {
      ...base,
      bossHp: s.bossHp ?? null,
      bossMaxHp: s.bossMaxHp ?? null,
    };
  }

  if (s.type === "quiz") {
    const currentQ = s.currentQ ?? 0;
    const q = s.questions?.[currentQ];
    const qDuration = s.questionDurationMs ?? QUIZ_Q_MS;
    const revealDuration = s.revealDurationMs ?? QUIZ_REVEAL_MS;
    const questionEndsAt = (s.questionStartedAt ?? 0) + qDuration;
    const revealEndsAt = questionEndsAt + revealDuration;
    const now = Date.now();
    const questionExpired = now >= questionEndsAt;

    // Per-player: what did this player answer for the current question?
    let myAnswer: number | null = null;
    if (requestPlayerId) {
      const answers = s.playerAnswers?.get(requestPlayerId);
      const a = answers?.[currentQ];
      myAnswer = a !== undefined ? a.answerIdx : null;
    }

    return {
      ...base,
      quizType: s.quizType,
      currentQ,
      totalQuestions: s.questions?.length ?? QUIZ_QUESTIONS,
      questionEndsAt,
      revealEndsAt,
      questionDurationMs: qDuration,
      question: q
        ? {
            text: q.text,
            options: q.options,
            // Only reveal correct answer after question time expires
            correctIdx: questionExpired ? q.correctIdx : undefined,
          }
        : null,
      myAnswer,
    };
  }

  if (s.type === "team-raid") {
    const teams = (s.teams ?? []).map((t, idx) => ({
      teamIdx: idx,
      name: `Team ${t.name}`,
      totalDamage: t.totalDamage,
      memberCount: t.memberIds.length,
      full: t.memberIds.length >= MAX_TEAM_SIZE,
    }));
    let myTeamIdx: number | null = null;
    if (requestPlayerId) {
      myTeamIdx = s.playerTeam?.get(requestPlayerId) ?? null;
    }
    return {
      ...base,
      bossHp: s.bossHp ?? null,
      bossMaxHp: s.bossMaxHp ?? null,
      teams,
      myTeamIdx,
      winnerTeamIdx: s.winnerTeamIdx ?? null,
    };
  }

  return base;
}

// ─── Session lifecycle ────────────────────────────────────────────────────────

function finishSession(s: Session, reason: "time" | "boss_killed") {
  if (s.status === "finished") return;
  s.status = "finished";

  const sorted = Array.from(s.players.values()).sort((a, b) => b.score - a.score);
  const winner = sorted[0] ?? null;

  const playerLabel = (p: PlayerRecord): string => {
    const handle = p.telegramUsername ? ` (@${escapeHtml(p.telegramUsername)})` : "";
    return `<b>${escapeHtml(p.name)}</b>${handle}`;
  };

  let text = "";

  if (s.type === "tap") {
    s.winnerName = winner?.name ?? null;
    const lines = sorted.slice(0, 5).map((p, i) => `${i + 1}. ${playerLabel(p)} — ${p.score} pts`);
    let winnerBlock = "";
    if (winner) {
      const parts = [`🏆 Winner: <b>${escapeHtml(winner.name)}</b>`];
      if (winner.telegramUsername) parts.push(`@${escapeHtml(winner.telegramUsername)}`);
      if (winner.telegramId !== null) parts.push(`ID: <code>${winner.telegramId}</code>`);
      winnerBlock = `\n\n${parts.join(" • ")}`;
    }
    text = `🏁 <b>WEB TAP RACE FINISHED</b>\n\n${lines.join("\n") || "No players joined."}${winnerBlock}`;
  } else if (s.type === "raid") {
    s.winnerName = winner?.name ?? null;
    const totalDmg = sorted.reduce((sum, p) => sum + p.score, 0);
    const lines = sorted.slice(0, 5).map((p, i) => `${i + 1}. ${playerLabel(p)} — ${p.score.toLocaleString()} dmg`);
    const verdict =
      reason === "boss_killed"
        ? "💀 <b>BOSS DEFEATED!</b>"
        : `⏱ Time's up. Boss survived with ${s.bossHp?.toLocaleString() ?? "?"} HP`;
    text = `${verdict}\n\n<b>WEB BOSS RAID — Top Damage</b>\n${lines.join("\n") || "No raiders."}\n\nTotal damage: ${totalDmg.toLocaleString()}`;
  } else if (s.type === "quiz") {
    s.winnerName = winner?.name ?? null;
    const totalQ = s.questions?.length ?? QUIZ_QUESTIONS;
    const lines = sorted
      .slice(0, 5)
      .map((p, i) => `${i + 1}. ${playerLabel(p)} — ${p.score}/${totalQ} correct`);
    text = `🧠 <b>WEB ${quizLabel(s.quizType ?? "")} FINISHED</b>\n\n${lines.join("\n") || "No players joined."}${winner ? `\n\n🏆 Winner: <b>${escapeHtml(winner.name)}</b>` : ""}`;
  } else if (s.type === "team-raid") {
    // Winner = team with most totalDamage
    const teams = s.teams ?? [];
    const teamsById = teams
      .map((t, idx) => ({ ...t, idx }))
      .sort((a, b) => b.totalDamage - a.totalDamage);
    const winTeam = teamsById[0] ?? null;
    s.winnerTeamIdx = winTeam?.idx ?? null;
    s.winnerName = winTeam ? `Team ${winTeam.name}` : null;

    const lines = teamsById
      .filter((t) => t.totalDamage > 0)
      .slice(0, 6)
      .map((t, i) => `${i + 1}. <b>Team ${escapeHtml(t.name)}</b> — ${t.totalDamage.toLocaleString()} dmg (${t.memberIds.length} member${t.memberIds.length !== 1 ? "s" : ""})`);
    text =
      `👹 <b>WEB TEAM BOSS RAID FINISHED</b>\n\n` +
      (winTeam ? `🏆 Winner: <b>Team ${escapeHtml(winTeam.name)}</b> with ${winTeam.totalDamage.toLocaleString()} dmg!\n\n` : "") +
      `<b>Team Rankings:</b>\n${lines.join("\n") || "No teams participated."}`;
  }

  void postToTelegram(s.chatId, text);
}

function quizLabel(quizType: string): string {
  switch (quizType) {
    case "carquiz":  return "CAR QUIZ";
    case "mathquiz": return "MATH QUIZ";
    case "puzzle":   return "PUZZLE QUIZ";
    case "carlogo":  return "CAR LOGO QUIZ";
    case "mixquiz":  return "MIX QUIZ";
    default:         return "QUIZ";
  }
}

function tickSession(s: Session): void {
  const now = Date.now();

  if (s.status === "lobby" && !s.manualStart && now >= s.startsAt) {
    s.status = "running";
    if (s.type === "quiz") {
      s.questionStartedAt = now;
      s.currentQ = 0;
    }
  }

  if (s.status === "running") {
    if (s.type === "quiz") {
      const qDuration = s.questionDurationMs ?? QUIZ_Q_MS;
      const revealDuration = s.revealDurationMs ?? QUIZ_REVEAL_MS;
      const phaseEndsAt = (s.questionStartedAt ?? 0) + qDuration + revealDuration;
      if (now >= phaseEndsAt) {
        const nextQ = (s.currentQ ?? 0) + 1;
        if (nextQ >= (s.questions?.length ?? QUIZ_QUESTIONS)) {
          finishSession(s, "time");
        } else {
          s.currentQ = nextQ;
          s.questionStartedAt = now;
        }
      }
    } else if (s.type === "team-raid") {
      // No time limit for team-raid — ends only when boss is killed
    } else if (now >= s.endsAt) {
      finishSession(s, "time");
    }
  }
}

// Sweep old finished sessions
setInterval(() => {
  const now = Date.now();
  for (const [id, s] of sessions) {
    tickSession(s);
    if (s.status === "finished" && now - s.endsAt > 5 * 60 * 1000) {
      sessions.delete(id);
    }
  }
}, 1000);

// ─── Routes ───────────────────────────────────────────────────────────────────

function paramStr(p: string | string[] | undefined): string {
  return Array.isArray(p) ? (p[0] ?? "") : (p ?? "");
}

const VALID_TYPES = ["tap", "raid", "quiz", "team-raid"] as const;
type SessionType = (typeof VALID_TYPES)[number];

router.post("/play/session", (req: Request, res: Response) => {
  const provided = req.header("x-bot-secret") ?? "";
  if (!BOT_SECRET || provided !== BOT_SECRET) {
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
    quizType?: string;
  };

  if (!VALID_TYPES.includes(body.type as SessionType)) {
    res.status(400).json({ error: "invalid type" });
    return;
  }
  if (typeof body.chatId !== "number" && typeof body.chatId !== "string") {
    res.status(400).json({ error: "chatId required" });
    return;
  }

  const type = body.type as SessionType;
  const manualStart = body.manualStart === true;
  const lobby = Math.max(0, Math.min(120_000, body.lobbyDurationMs ?? 15_000));
  const now = Date.now();
  const FAR_FUTURE = now + 365 * 24 * 60 * 60 * 1000;

  let sessionId: string;
  let play: number;

  if (type === "quiz") {
    // Quiz: total play time computed from question count
    const qDuration = QUIZ_Q_MS;
    const revealDuration = QUIZ_REVEAL_MS;
    play = QUIZ_QUESTIONS * (qDuration + revealDuration); // 180s
    sessionId = newId("quiz");
  } else if (type === "team-raid") {
    play = Math.max(5_000, Math.min(300_000, body.playDurationMs ?? 60_000));
    sessionId = newId("raid");
  } else {
    play = Math.max(5_000, Math.min(300_000, body.playDurationMs ?? (type === "tap" ? 30_000 : 60_000)));
    sessionId = newId(type === "tap" ? "tap" : "raid");
  }

  const s: Session = {
    sessionId,
    type,
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

  if (type === "raid" || type === "team-raid") {
    const hp = Math.max(100, Math.min(10_000_000, body.bossHp ?? 50_000));
    s.bossHp = hp;
    s.bossMaxHp = hp;
  }

  if (type === "quiz") {
    const qType = typeof body.quizType === "string" ? body.quizType : "carquiz";
    s.quizType = qType;
    s.questions = getQuestions(qType, QUIZ_QUESTIONS);
    s.currentQ = 0;
    s.questionDurationMs = QUIZ_Q_MS;
    s.revealDurationMs = QUIZ_REVEAL_MS;
    s.questionStartedAt = s.startsAt; // starts ticking when game starts
    s.playerAnswers = new Map();
  }

  if (type === "team-raid") {
    s.teams = TEAM_NAMES.map((name) => ({ name, totalDamage: 0, memberIds: [] }));
    s.playerTeam = new Map();
    s.winnerTeamIdx = null;
  }

  sessions.set(sessionId, s);
  latestByChat.set(chatKey(body.chatId, type), sessionId);

  const base = getPublicBaseUrl();
  // URL slug: "team-raid" → "team-raid"
  const slug = type;
  const url = `${base}/play/${slug}/${sessionId}`;
  res.json({ sessionId, url });
});

// Manual start (tap race only)
router.post("/play/session/:id/start", (req: Request, res: Response) => {
  const provided = req.header("x-bot-secret") ?? "";
  if (!BOT_SECRET || provided !== BOT_SECRET) {
    res.status(403).json({ error: "forbidden" });
    return;
  }
  const s = sessions.get(paramStr(req.params["id"]));
  if (!s) { res.status(404).json({ error: "not found" }); return; }
  if (s.status === "finished") { res.status(409).json({ error: "session finished" }); return; }
  if (s.status === "running") { res.json({ ok: true, alreadyRunning: true }); return; }

  const body = (req.body ?? {}) as { delayMs?: number };
  const delay = Math.max(0, Math.min(60_000, Math.floor(body.delayMs ?? 0)));
  const now = Date.now();

  s.manualStart = false;
  s.startsAt = now + delay;
  s.endsAt = s.startsAt + s.playDurationMs;
  if (delay === 0) {
    s.status = "running";
    if (s.type === "quiz") s.questionStartedAt = now;
  }

  res.json({
    ok: true,
    startsAt: s.startsAt,
    endsAt: s.endsAt,
    serverTime: now,
    players: s.players.size,
  });
});

// Latest session lookup (for bot /startrace)
router.get("/play/chat/:chatId/latest/:type", (req: Request, res: Response) => {
  const provided = req.header("x-bot-secret") ?? "";
  if (!BOT_SECRET || provided !== BOT_SECRET) {
    res.status(403).json({ error: "forbidden" });
    return;
  }
  const chatIdRaw = paramStr(req.params["chatId"]);
  const typeRaw = paramStr(req.params["type"]);
  const asNum = Number(chatIdRaw);
  const chatId: number | string =
    Number.isFinite(asNum) && !chatIdRaw.startsWith("@") ? asNum : chatIdRaw;

  const id = latestByChat.get(chatKey(chatId, typeRaw));
  if (!id) { res.status(404).json({ error: "no session" }); return; }
  const s = sessions.get(id);
  if (!s) { res.status(404).json({ error: "no session" }); return; }
  res.json({ sessionId: s.sessionId, status: s.status, playerCount: s.players.size });
});

// Get session state
router.get("/play/session/:id", (req: Request, res: Response) => {
  const s = sessions.get(paramStr(req.params["id"]));
  if (!s) { res.status(404).json({ error: "not found" }); return; }
  tickSession(s);
  const playerId = paramStr(req.query["playerId"] as string | string[] | undefined) || undefined;
  res.json(serializeState(s, playerId));
});

// Join session
router.post("/play/session/:id/join", (req: Request, res: Response) => {
  const s = sessions.get(paramStr(req.params["id"]));
  if (!s) { res.status(404).json({ error: "not found" }); return; }
  tickSession(s);

  if (s.status === "finished") {
    res.status(409).json({ error: "session finished" });
    return;
  }
  // Quiz: join lobby only
  if (s.type === "quiz" && s.status === "running") {
    res.status(409).json({ error: "quiz already started" });
    return;
  }
  // Team-raid: allow joining at any time (no lobby cutoff)

  const body = req.body as {
    name?: string;
    telegramId?: number;
    telegramUsername?: string;
    teamIdx?: number;
  };

  const rawName = (body.name ?? "").trim();
  if (!rawName) { res.status(400).json({ error: "name required" }); return; }
  const name = rawName.slice(0, 32);

  // Team-raid: require teamIdx
  if (s.type === "team-raid") {
    const teamIdx = body.teamIdx;
    if (typeof teamIdx !== "number" || teamIdx < 0 || teamIdx >= TEAM_NAMES.length) {
      res.status(400).json({ error: "teamIdx required (0–11)" });
      return;
    }
    const team = s.teams?.[teamIdx];
    if (!team) { res.status(400).json({ error: "invalid team" }); return; }
    if (team.memberIds.length >= MAX_TEAM_SIZE) {
      res.status(409).json({ error: "team is full" });
      return;
    }

    const playerId = newId("p");
    const token = crypto.randomBytes(16).toString("hex");
    s.players.set(playerId, {
      playerId, token, name, score: 0,
      lastActionAt: 0, telegramId: null, telegramUsername: null,
    });
    team.memberIds.push(playerId);
    s.playerTeam!.set(playerId, teamIdx);

    res.json({ playerId, token, teamIdx, teamName: `Team ${team.name}` });
    return;
  }

  // Standard join (tap / raid / quiz)
  const tgId =
    typeof body.telegramId === "number" && Number.isFinite(body.telegramId)
      ? Math.trunc(body.telegramId)
      : null;
  const tgUsername =
    typeof body.telegramUsername === "string" && body.telegramUsername.trim()
      ? body.telegramUsername.trim().slice(0, 32)
      : null;
  const playerId = newId("p");
  const token = crypto.randomBytes(16).toString("hex");

  s.players.set(playerId, {
    playerId, token, name, score: 0,
    lastActionAt: 0, telegramId: tgId, telegramUsername: tgUsername,
  });

  // Init answer tracking for quiz
  if (s.type === "quiz" && s.playerAnswers) {
    s.playerAnswers.set(playerId, []);
  }

  res.json({ playerId, token });
});

// Action (tap/raid/team-raid: amount; quiz: answerIdx)
router.post("/play/session/:id/action", (req: Request, res: Response) => {
  const s = sessions.get(paramStr(req.params["id"]));
  if (!s) { res.status(404).json({ error: "not found" }); return; }
  tickSession(s);

  const body = req.body as {
    playerId?: string;
    token?: string;
    amount?: number;
    answerIdx?: number;
  };

  const player = s.players.get(body.playerId ?? "");
  if (!player || player.token !== body.token) {
    res.status(403).json({ error: "invalid player" });
    return;
  }

  if (s.status !== "running") {
    res.json({ score: player.score, bossHp: s.bossHp ?? null });
    return;
  }

  // ── Quiz action ────────────────────────────────────────────────
  if (s.type === "quiz") {
    const currentQ = s.currentQ ?? 0;
    const qDuration = s.questionDurationMs ?? QUIZ_Q_MS;
    const questionEndsAt = (s.questionStartedAt ?? 0) + qDuration;
    const now = Date.now();

    if (now >= questionEndsAt) {
      // Question already expired — too late
      res.json({ accepted: false, reason: "time_up", score: player.score });
      return;
    }

    const playerAnswers = s.playerAnswers ?? new Map();
    const myAnswers = playerAnswers.get(player.playerId) ?? [];

    if (myAnswers[currentQ] !== undefined) {
      // Already answered this question
      res.json({ accepted: false, reason: "already_answered", score: player.score });
      return;
    }

    const answerIdx = body.answerIdx ?? -1;
    const correct = answerIdx === s.questions?.[currentQ].correctIdx;

    if (correct) player.score += 1;

    myAnswers[currentQ] = { answerIdx, correct, answeredAt: now };
    playerAnswers.set(player.playerId, myAnswers);
    if (!s.playerAnswers) s.playerAnswers = playerAnswers;

    res.json({ accepted: true, correct, score: player.score });
    return;
  }

  // ── Tap / Raid / Team-raid action ─────────────────────────────
  const rawAmount = Math.floor(body.amount ?? 0);
  if (!Number.isFinite(rawAmount) || rawAmount === 0 || rawAmount < -25 || rawAmount > 25) {
    res.status(400).json({ error: "invalid amount" });
    return;
  }

  const now = Date.now();
  if (now - player.lastActionAt < 80) {
    res.json({ score: player.score, bossHp: s.bossHp ?? null });
    return;
  }
  player.lastActionAt = now;

  if (s.type === "tap") {
    player.score += rawAmount;
  } else {
    // raid or team-raid: only positive damage
    if (rawAmount < 1) {
      res.json({ score: player.score, bossHp: s.bossHp ?? null });
      return;
    }
    const dmg = rawAmount * 10;
    const actual = Math.min(dmg, s.bossHp ?? 0);
    player.score += actual;
    s.bossHp = (s.bossHp ?? 0) - actual;

    // Team-raid: accumulate team damage (no early finish — most damage wins)
    if (s.type === "team-raid") {
      const teamIdx = s.playerTeam?.get(player.playerId);
      if (teamIdx !== undefined && s.teams?.[teamIdx]) {
        s.teams[teamIdx].totalDamage += actual;
      }
    }

    // Solo raid: boss kill ends game
    if (s.type === "raid" && (s.bossHp ?? 0) <= 0) {
      s.bossHp = 0;
      finishSession(s, "boss_killed");
    }
    // Team-raid: boss kill ends the game
    if (s.type === "team-raid" && (s.bossHp ?? 0) <= 0) {
      s.bossHp = 0;
      finishSession(s, "boss_killed");
    }
  }

  res.json({ score: player.score, bossHp: s.bossHp ?? null });
});

export default router;
