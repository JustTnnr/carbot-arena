import { Router, type IRouter } from "express";
import fs from "fs";
import path from "path";

const router: IRouter = Router();

const BOT_DATA_PATH = path.resolve(process.cwd(), "../../telegram-bot/bot_data.json");
const BOT_LIVE_PATH = path.resolve(process.cwd(), "../../telegram-bot/bot_live.json");
const BOT_CONTROL_PATH = path.resolve(process.cwd(), "../../telegram-bot/bot_control.json");

const VALID_STOP_TYPES = new Set([
  "giveaway",
  "premium",
  "tournament",
  "boss_raid",
  "taprace",
  "marathon",
  "all",
]);

function readBotData(): Record<string, unknown> {
  try {
    return JSON.parse(fs.readFileSync(BOT_DATA_PATH, "utf8"));
  } catch {
    return {};
  }
}

function readLiveState(): Record<string, unknown> {
  try {
    return JSON.parse(fs.readFileSync(BOT_LIVE_PATH, "utf8"));
  } catch {
    return {};
  }
}

router.get("/dashboard/summary", (_req, res) => {
  const data = readBotData();
  const live = readLiveState();

  const leaderboard = (data.leaderboard as Record<string, number>) ?? {};
  const events = (data.events as Record<string, unknown>) ?? {};
  const tournamentPlayers = (data.tournament_players as unknown[]) ?? [];

  const totalPlayers = Object.keys(leaderboard).length;
  const totalScore = Object.values(leaderboard).reduce((sum, v) => sum + v, 0);

  let activeEvents = 0;
  const now = Date.now() / 1000;
  for (const key of ["giveaway", "premium"]) {
    const ev = events[key] as Record<string, number> | null;
    if (ev && ev.end > now) activeEvents++;
  }

  const botOnline = typeof live.timestamp === "number" && Date.now() / 1000 - (live.timestamp as number) < 30;

  res.json({
    totalPlayers,
    totalScore,
    activeEvents,
    tournamentPlayers: tournamentPlayers.length,
    botOnline,
  });
});

router.get("/dashboard/leaderboard", (_req, res) => {
  const data = readBotData();
  const leaderboard = (data.leaderboard as Record<string, number>) ?? {};
  const playerNames = (data.player_names as Record<string, string>) ?? {};

  const entries = Object.entries(leaderboard)
    .map(([userId, score]) => ({ userId, name: playerNames[userId] ?? null, score }))
    .sort((a, b) => b.score - a.score)
    .map((entry, index) => ({ rank: index + 1, ...entry }));

  res.json(entries);
});

router.get("/dashboard/events", (_req, res) => {
  const data = readBotData();
  const events = (data.events as Record<string, Record<string, unknown> | null>) ?? {};
  const now = Date.now() / 1000;

  function formatEvent(ev: Record<string, unknown> | null) {
    if (!ev) return null;
    return {
      title: ev.title as string,
      prize: ev.prize as string,
      playerCount: ((ev.players as unknown[]) ?? []).length,
      startTime: ev.start as number,
      endTime: ev.end as number,
      active: (ev.end as number) > now,
    };
  }

  res.json({
    giveaway: formatEvent(events.giveaway ?? null),
    premium: formatEvent(events.premium ?? null),
  });
});

router.get("/dashboard/tournament", (_req, res) => {
  const data = readBotData();
  const players = (data.tournament_players as unknown[]) ?? [];
  const winners = (data.tournament_winners as unknown[]) ?? [];

  res.json({
    playerCount: players.length,
    playerIds: players.map(String),
    winners: winners.map(String),
  });
});

router.get("/dashboard/live", (_req, res) => {
  const live = readLiveState();
  const data = readBotData();
  const playerNames = (data.player_names as Record<string, string>) ?? {};
  const botOnline = typeof live.timestamp === "number" && Date.now() / 1000 - (live.timestamp as number) < 30;

  const rawTaps = (live.taprace_taps as Record<string, number>) ?? {};
  const namedTaps: Record<string, number> = {};
  for (const [uid, taps] of Object.entries(rawTaps)) {
    namedTaps[playerNames[uid] ?? uid] = taps;
  }

  res.json({
    tapRaceActive: (live.taprace_active as boolean) ?? false,
    tapRaceStarted: (live.taprace_started as boolean) ?? false,
    tapRaceMatch: (live.taprace_match as number[]) ?? [],
    tapRaceTaps: namedTaps,
    bossRaidActive: (live.boss_raid_active as boolean) ?? false,
    bossRaidStarted: (live.boss_raid_started as boolean) ?? false,
    bossRaidHp: (live.boss_raid_hp as number) ?? 0,
    bossRaidMaxHp: (live.boss_raid_max_hp as number) ?? 0,
    marathonActive: (live.marathon_active as boolean) ?? false,
    botOnline,
    lastUpdated: (live.timestamp as number) ?? null,
  });
});

router.post("/dashboard/stop", (req, res) => {
  const body = req.body as { type?: string } | undefined;
  const type = body?.type;
  if (!type || !VALID_STOP_TYPES.has(type)) {
    res.status(400).json({ ok: false });
    return;
  }

  let queue: { commands: Array<{ action: string; type: string }> } = { commands: [] };
  try {
    queue = JSON.parse(fs.readFileSync(BOT_CONTROL_PATH, "utf8"));
    if (!Array.isArray(queue.commands)) queue.commands = [];
  } catch {
    queue = { commands: [] };
  }
  queue.commands.push({ action: "stop", type });
  fs.writeFileSync(BOT_CONTROL_PATH, JSON.stringify(queue));

  res.json({ ok: true });
});

export default router;
