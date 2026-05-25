# =========================================================
# INSTALL:
# pip install python-telegram-bot==13.15
# =========================================================

from telegram import WebAppInfo
from telegram import (
    InlineKeyboardButton,
    InlineKeyboardMarkup
)

from telegram.ext import (
    Updater,
    CommandHandler,
    CallbackQueryHandler,
    MessageHandler,
    Filters,
)

from telegram.error import (
    BadRequest,
    NetworkError,
    TimedOut,
    RetryAfter,
    Unauthorized,
    TelegramError,
)

import random
import threading
import time
import math
import json
import os
import http.server
import socketserver
import urllib.request
import urllib.error

# =========================================================
# HEALTH SERVER — starts immediately so port opens fast
# =========================================================

_HEALTH_START = time.time()

class _HealthHandler(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        uptime_sec = int(time.time() - _HEALTH_START)
        days = uptime_sec // 86400
        hours = (uptime_sec % 86400) // 3600
        mins = (uptime_sec % 3600) // 60
        secs = uptime_sec % 60
        body = f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Bot Status</title>
  <style>
    body {{ font-family: monospace; background: #0d0d0d; color: #00ff88;
           display: flex; align-items: center; justify-content: center;
           height: 100vh; margin: 0; }}
    .box {{ border: 2px solid #00ff88; padding: 40px 60px; text-align: center; }}
    h1 {{ font-size: 2rem; margin: 0 0 10px; }}
    p {{ margin: 6px 0; color: #aaa; }}
    .badge {{ color: #00ff88; font-size: 1.2rem; }}
  </style>
</head>
<body>
  <div class="box">
    <h1>🔥 BOT RUNNING</h1>
    <p class="badge">Status: <strong>Online</strong></p>
    <p>Uptime: {days}d {hours}h {mins}m {secs}s</p>
  </div>
</body>
</html>"""
        self.send_response(200)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.end_headers()
        self.wfile.write(body.encode())
    def log_message(self, format, *args):
        pass

class _ReusableTCPServer(socketserver.TCPServer):
    allow_reuse_address = True

_HEALTH_PORT = int(os.environ.get("PORT", 3000))
_health_server = _ReusableTCPServer(("", _HEALTH_PORT), _HealthHandler)
threading.Thread(target=_health_server.serve_forever, daemon=True).start()

# =========================================================
# ANIMATED BORDERS
# =========================================================

animated_borders = [

    "▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓",
    "████████████████",
    "◥◣◢◤◥◣◢◤◥◣◢◤",
    "⚠️━━━━━━━━━━━━━━⚠️",
    "☠️━━━━━━━━━━━━━━☠️",
    "💀━━━━━━━━━━━━━━💀",
    "👹━━━━━━━━━━━━━━👹",
    "🔥══════════════🔥",
    "⚡██████████████⚡",
    "🩸━━━━━━━━━━━━━━🩸",
    "⛓️══════════════⛓️",
    "🔻▬▬▬▬▬▬▬▬▬▬▬▬🔻",
    "🖤━━━━━━━━━━━━━━🖤",
    "👑══════════════👑",
    "🏴━━━━━━━━━━━━━━🏴",
    "🕷️━━━━━━━━━━━━━━🕷️",
    "☣️══════════════☣️",
    "🚨▬▬▬▬▬▬▬▬▬▬▬▬🚨",
    "🔴██████████████🔴",
    "🌑━━━━━━━━━━━━━━🌑",
    "🩶══════════════🩶",
    "🦂━━━━━━━━━━━━━━🦂",
    "🔪▬▬▬▬▬▬▬▬▬▬▬▬🔪",
    "💣━━━━━━━━━━━━━━💣",
    "🛑██████████████🛑",
    "🧨━━━━━━━━━━━━━━🧨",
    "👾══════════════👾",
    "🤖▬▬▬▬▬▬▬▬▬▬▬▬🤖",
    "🧿━━━━━━━━━━━━━━🧿",
    "⚔️══════════════⚔️",
    "💎══════════════💎",
    "🌌━━━━━━━━━━━━━━🌌",
    "🔮▬▬▬▬▬▬▬▬▬▬▬▬🔮",
    "🌀══════════════🌀",
    "🌟━━━━━━━━━━━━━━🌟",
    "⚜️══════════════⚜️",
    "🛸▬▬▬▬▬▬▬▬▬▬▬▬🛸",
    "🌠━━━━━━━━━━━━━━🌠",
    "🎯══════════════🎯",
    "🎮▬▬▬▬▬▬▬▬▬▬▬▬🎮",
    "🚀━━━━━━━━━━━━━━🚀",
    "🧊══════════════🧊",
    "💠▬▬▬▬▬▬▬▬▬▬▬▬💠",
    "🔷━━━━━━━━━━━━━━🔷",
    "🪐══════════════🪐",
    "🌪️▬▬▬▬▬▬▬▬▬▬▬▬🌪️",
    "🎭━━━━━━━━━━━━━━🎭",
    "🃏══════════════🃏",
    "🎪▬▬▬▬▬▬▬▬▬▬▬▬🎪",
    "🎲━━━━━━━━━━━━━━🎲",
    "🛡️══════════════🛡️",
    "🐉▬▬▬▬▬▬▬▬▬▬▬▬🐉",
    "🦅━━━━━━━━━━━━━━🦅",
    "🦇══════════════🦇",
    "🐺▬▬▬▬▬▬▬▬▬▬▬▬🐺",
    "🌋━━━━━━━━━━━━━━🌋",
    "❄️══════════════❄️",
    "🌊▬▬▬▬▬▬▬▬▬▬▬▬🌊",
    "⚙️━━━━━━━━━━━━━━⚙️",
    "🧬══════════════🧬"
    "▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓",
    "████████████████",
    "◥◣◢◤◥◣◢◤◥◣◢◤",

    "🔥══════════════🔥",
    "⚡██████████████⚡",
    "💎══════════════💎",
    "👑══════════════👑",
    "⚔️══════════════⚔️",
    "🛡️══════════════🛡️",
    "☣️══════════════☣️",
    "👾══════════════👾",
    "🧬══════════════🧬",
    "⚜️══════════════⚜️",
    "🦇══════════════🦇",
    "🃏══════════════🃏",
    "🪐══════════════🪐",
    "❄️══════════════❄️",
    "🧊══════════════🧊",
    "💫══════════════💫",
    "🌈══════════════🌈",
    "🪙══════════════🪙",
    "🦾══════════════🦾",
    "☄️══════════════☄️",
    "📛══════════════📛",
    "🗿══════════════🗿",
    "🎤══════════════🎤",
    "💢══════════════💢",
    "🌟══════════════🌟",

    "🚨▬▬▬▬▬▬▬▬▬▬▬▬🚨",
    "🔻▬▬▬▬▬▬▬▬▬▬▬▬🔻",
    "🔪▬▬▬▬▬▬▬▬▬▬▬▬🔪",
    "🎮▬▬▬▬▬▬▬▬▬▬▬▬🎮",
    "🐉▬▬▬▬▬▬▬▬▬▬▬▬🐉",
    "🌊▬▬▬▬▬▬▬▬▬▬▬▬🌊",
    "🎪▬▬▬▬▬▬▬▬▬▬▬▬🎪",
    "🔮▬▬▬▬▬▬▬▬▬▬▬▬🔮",
    "💠▬▬▬▬▬▬▬▬▬▬▬▬💠",
    "🤖▬▬▬▬▬▬▬▬▬▬▬▬🤖",
    "🌪️▬▬▬▬▬▬▬▬▬▬▬▬🌪️",
    "🐺▬▬▬▬▬▬▬▬▬▬▬▬🐺",
    "🕹️▬▬▬▬▬▬▬▬▬▬▬▬🕹️",
    "🧿▬▬▬▬▬▬▬▬▬▬▬▬🧿",
    "🏆▬▬▬▬▬▬▬▬▬▬▬▬🏆",
    "👁️▬▬▬▬▬▬▬▬▬▬▬▬👁️",
    "🧪▬▬▬▬▬▬▬▬▬▬▬▬🧪",
    "🌀▬▬▬▬▬▬▬▬▬▬▬▬🌀",
    "🌐▬▬▬▬▬▬▬▬▬▬▬▬🌐",
    "🧱▬▬▬▬▬▬▬▬▬▬▬▬🧱",
    "🔰▬▬▬▬▬▬▬▬▬▬▬▬🔰",
    "🪬▬▬▬▬▬▬▬▬▬▬▬▬🪬",

    "🌌━━━━━━━━━━━━━━🌌",
    "🌑━━━━━━━━━━━━━━🌑",
    "🖤━━━━━━━━━━━━━━🖤",
    "🩸━━━━━━━━━━━━━━🩸",
    "🧿━━━━━━━━━━━━━━🧿",
    "🎭━━━━━━━━━━━━━━🎭",
    "🌠━━━━━━━━━━━━━━🌠",
    "🚀━━━━━━━━━━━━━━🚀",
    "🎯━━━━━━━━━━━━━━🎯",
    "🔷━━━━━━━━━━━━━━🔷",
    "🛸━━━━━━━━━━━━━━🛸",
    "🌋━━━━━━━━━━━━━━🌋",
    "⚙️━━━━━━━━━━━━━━⚙️",
    "🦂━━━━━━━━━━━━━━🦂",
    "🕷️━━━━━━━━━━━━━━🕷️",
    "☠️━━━━━━━━━━━━━━☠️",
    "💀━━━━━━━━━━━━━━💀",
    "👹━━━━━━━━━━━━━━👹",
    "🏴━━━━━━━━━━━━━━🏴",
    "🧨━━━━━━━━━━━━━━🧨",
    "💣━━━━━━━━━━━━━━💣",
    "🎆━━━━━━━━━━━━━━🎆",
    "⚡━━━━━━━━━━━━━━⚡",
    "🎇━━━━━━━━━━━━━━🎇",
    "🔱━━━━━━━━━━━━━━🔱",
    "🎴━━━━━━━━━━━━━━🎴",
    "💥━━━━━━━━━━━━━━💥",
    "🎼━━━━━━━━━━━━━━🎼",
    "🛰️━━━━━━━━━━━━━━🛰️",

    "◤━━━━━━━━━━━━━━◥",
    "◢━━━━━━━━━━━━━━◣",
    "◆══════════════◆",
    "◇━━━━━━━━━━━━━━◇",
    "⬢══════════════⬢",
    "⬡━━━━━━━━━━━━━━⬡",
    "◈▬▬▬▬▬▬▬▬▬▬▬▬◈",
    "✦══════════════✦",
    "✧━━━━━━━━━━━━━━✧",
    "★▬▬▬▬▬▬▬▬▬▬▬▬★",
    "☆━━━━━━━━━━━━━━☆",
    "☢️══════════════☢️",
    "⚔️▬▬▬▬▬▬▬▬▬▬▬▬⚔️",
    "🜲━━━━━━━━━━━━━━🜲",
    "🜂══════════════🜂",

    # VENOM / DARK STYLE

    "◣◥◣◥◣◥◣◥◣◥",
    "◤◢◤◢◤◢◤◢◤◢",
    "◢████████████◣",
    "◥████████████◤",
    "◣━━━━━━━━━━━━◢",
    "◤━━━━━━━━━━━━◥",

    "👁️════════════👁️",
    "🕷️════════════🕷️",
    "🩸████████████🩸",
    "☠️▓▓▓▓▓▓▓▓▓▓☠️",
    "👹████████████👹",
    "😈════════════😈",
    "💀▬▬▬▬▬▬▬▬▬▬💀",
    "🧿▓▓▓▓▓▓▓▓▓▓🧿",

    "🕸️◣◥◣◥◣◥🕸️",
    "🕷️◤◢◤◢◤◢🕷️",
    "🩸◣██████◢🩸",
    "☣️◤██████◥☣️",

    "👀━━━━━━━━━━━━👀",
    "👁️‍🗨️━━━━━━━━━━👁️‍🗨️",
    "😡════════════😡",
    "🔥▓▓▓▓▓▓▓▓▓▓🔥",
    "⚫████████████⚫",
    "🔴▓▓▓▓▓▓▓▓▓▓🔴",

    "◥🕷️◣◢◤🕷️◤",
    "◣👁️◥◤👁️◢",
    "◤💀◢◣💀◥",
    "◢😈◤◥😈◣",

    "🖤◤◢◤◢◤◢🖤",
    "❤️‍🔥◣◥◣◥◣◥❤️‍🔥",
    "💥████████████💥",
    "⚔️▓▓▓▓▓▓▓▓▓▓⚔️"

]

# =========================================================
# CONFIG
# =========================================================

TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN", "")

OWNER_ID = 6531314640
EXTRA_ADMIN = 8650959684

# Announcement channel — bot must be admin in this channel
ANNOUNCE_CHANNEL = os.environ.get("ANNOUNCE_CHANNEL", "@TnnrCPM")

DATA_FILE = "bot_data.json"

# =========================================================
# GLOBAL DATA
# =========================================================

leaderboard = {}

player_names = {}

total_games = {}

events = {
    "giveaway": None,
    "premium": None,
    "flash": None,
}

quiz_data = {}

# Tracks in-flight web game sessions so poll threads survive bot restarts
# { session_id: {"label": str, "started_at": float} }
active_web_sessions: dict = {}

marathon_active = False
marathon_scores = {}

# =========================================================
# TAP RACE GLOBALS
# =========================================================

taprace_match = []

taprace_taps = {}

taprace_active = False
taprace_started = False
taprace_message_id = None

last_tap = {}

match_running = False

_tap_lock = threading.Lock()
_raid_lock = threading.Lock()
_accounts_lock = threading.Lock()

# =========================================================
# ACCOUNT DISTRIBUTION CONFIG
# =========================================================

ACCOUNTS_POOL_FILE = "accounts_pool.txt"
ACCOUNTS_GIVEN_FILE = "accounts_given.txt"
ACCOUNT_COOLDOWN_PARTY  = 2    # seconds during party mode
ACCOUNT_COOLDOWN_NORMAL = 43200  # 12 hours normally
unlimited_mode = False  # when True, cooldown is skipped for all users
party_mode = False      # when True, users get 1-10 random accounts instead of 1

account_claims = {}  # {str(user_id): timestamp}

# Accounts won but not yet delivered (DM failed at the time)
# {str(uid): [account_str, ...]}
pending_prizes: dict = {}

# Full user registry — persisted so the bot knows every user it has ever seen
# {str(uid): {"uid": int, "first_name": str, "username": str|None}}
user_registry: dict = {}

# Reverse lookup: lowercase username (without @) → int uid
username_to_uid: dict = {}

# ── Invite system ─────────────────────────────────────────
INVITE_RECEIVER_ACCOUNTS = 5   # accounts sent to the person who was invited
INVITE_SENDER_ACCOUNTS   = 5   # accounts sent to the person who shared the link

invite_pending = {}   # {str(invitee_uid): str(inviter_uid)} — awaiting /claimbonus
invite_used    = []   # list of int user_ids that already claimed an invite bonus

tournament_players = []

tournament_winners = []

# =========================================================
# SAVE SYSTEM
# =========================================================

def save_data():

    data = {

        "leaderboard": leaderboard,
        "player_names": player_names,
        "events": events,
        "tournament_players": tournament_players,
        "tournament_winners": tournament_winners,
        "account_claims": account_claims,
        "invite_pending": invite_pending,
        "invite_used": invite_used,
        "user_registry": user_registry,
        "pending_prizes": pending_prizes,
        "active_web_sessions": active_web_sessions,

    }

    with open(DATA_FILE, "w") as f:

        json.dump(data, f)

def register_user(uid, user):
    """Fully record a user: display name, full registry entry, and reverse username index."""
    key = str(uid)
    player_names[key] = safe_name(user)

    username = None
    if hasattr(user, "username") and user.username:
        username = user.username.lstrip("@").lower()

    first_name = ""
    if hasattr(user, "first_name") and user.first_name:
        first_name = user.first_name

    user_registry[key] = {
        "uid": int(uid),
        "first_name": first_name,
        "username": username,
    }

    if username:
        username_to_uid[username] = int(uid)

def record_name(uid, user):
    register_user(uid, user)

# =========================================================
# LOAD SYSTEM
# =========================================================

def load_data():

    global leaderboard
    global events
    global tournament_players
    global tournament_winners
    global player_names

    if not os.path.exists(DATA_FILE):
        return

    try:

        with open(DATA_FILE, "r") as f:

            data = json.load(f)

    except:
        return

    leaderboard = {
        int(k): v
        for k, v in data.get(
            "leaderboard",
            {}
        ).items()
    }

    events = data.get(
        "events",
        events
    )

    tournament_players = data.get(
        "tournament_players",
        []
    )

    player_names.update(
        data.get("player_names", {})
    )

    tournament_winners = data.get(
        "tournament_winners",
        []
    )

    account_claims.update(
        data.get("account_claims", {})
    )

    invite_pending.update(data.get("invite_pending", {}))
    invite_used.extend(
        uid for uid in data.get("invite_used", [])
        if uid not in invite_used
    )

    for key, prizes in data.get("pending_prizes", {}).items():
        if prizes:
            pending_prizes[key] = prizes

    # Restore full user registry and rebuild reverse username index
    for key, rec in data.get("user_registry", {}).items():
        user_registry[key] = rec
        uname = rec.get("username")
        if uname:
            username_to_uid[uname.lower()] = int(rec.get("uid", key))

    active_web_sessions.update(data.get("active_web_sessions", {}))

load_data()

# =========================================================
# ACCOUNT POOL HELPERS
# =========================================================

def pool_count():
    if not os.path.exists(ACCOUNTS_POOL_FILE):
        return 0
    with open(ACCOUNTS_POOL_FILE, "r", encoding="utf-8") as f:
        return sum(1 for line in f if line.strip())

def pool_take():
    """Remove and return the first account line. Returns None if empty."""
    with _accounts_lock:
        if not os.path.exists(ACCOUNTS_POOL_FILE):
            return None
        with open(ACCOUNTS_POOL_FILE, "r", encoding="utf-8") as f:
            lines = [l.rstrip("\n") for l in f.readlines()]
        available = [l for l in lines if l.strip()]
        if not available:
            return None
        account = available[0].strip()
        remaining = available[1:]
        with open(ACCOUNTS_POOL_FILE, "w", encoding="utf-8") as f:
            f.write("\n".join(remaining) + ("\n" if remaining else ""))
        return account

def given_append(account, user_display, user_id):
    date_str = time.strftime("%Y-%m-%d %H:%M", time.localtime())
    line = f"{account} | {user_display} | {user_id} | {date_str}\n"
    with _accounts_lock:
        with open(ACCOUNTS_GIVEN_FILE, "a", encoding="utf-8") as f:
            f.write(line)

def pool_add_lines(lines):
    """Append a list of account strings to the pool. Returns count added."""
    clean = [l.strip() for l in lines if l.strip()]
    if not clean:
        return 0
    with _accounts_lock:
        with open(ACCOUNTS_POOL_FILE, "a", encoding="utf-8") as f:
            for line in clean:
                f.write(line + "\n")
    return len(clean)

def _send_account_dm(bot_instance, uid, account, label):
    """Send a single account DM. Returns True on success."""
    border = random.choice(animated_borders)
    bot_instance.send_message(
        chat_id=uid,
        text=(
            f"{border}\n"
            f"🎁 YOU WON AN ACCOUNT!\n"
            f"{border}\n\n"
            f"🏆 REWARD:\n"
            f"{label}\n\n"
            f"{border}\n\n"
            f"<code>{account}</code>\n\n"
            f"{border}\n\n"
            f"⚠️ Keep this private — do not share it.\n\n"
            f"{border}"
        ),
        parse_mode="HTML"
    )


def deliver_pending_prizes(bot_instance, uid):
    """Try to deliver any queued prizes to uid. Called whenever the user is known to be reachable."""
    key = str(uid)
    prizes = pending_prizes.get(key)
    if not prizes:
        return
    delivered = []
    for account in list(prizes):
        try:
            _send_account_dm(bot_instance, uid, account, "🎁 PENDING PRIZE")
            delivered.append(account)
        except Exception:
            break  # still unreachable — stop and try next time
    if delivered:
        pending_prizes[key] = [a for a in prizes if a not in delivered]
        if not pending_prizes[key]:
            del pending_prizes[key]
        save_data()


def dm_prize_account(bot_instance, uid, display_name, label="🏆 GAME WIN"):
    """Take 1 account from pool and DM it to uid.
    If DM fails the account is queued in pending_prizes — not lost."""
    account = pool_take()
    if not account:
        return False
    given_append(account, display_name, uid)
    save_data()
    try:
        _send_account_dm(bot_instance, uid, account, label)
        return True
    except Exception:
        # DM not yet possible — hold the account for this user
        key = str(uid)
        pending_prizes.setdefault(key, []).append(account)
        save_data()
        return False

# =========================================================
# HELPERS
# =========================================================

def now():

    return int(time.time())

def is_admin(update):

    uid = update.effective_user.id

    return uid in [
        OWNER_ID,
        EXTRA_ADMIN
    ]

def safe_name(user):

    if user.username:
        return f"@{user.username}"

    return user.first_name

def format_time(sec):

    days = sec // 86400
    sec %= 86400

    hours = sec // 3600
    sec %= 3600

    mins = sec // 60
    sec %= 60

    if days > 0:
        return f"{days}d {hours}h {mins}m"

    if hours > 0:
        return f"{hours}h {mins}m {sec}s"

    return f"{mins:02d}:{sec:02d}"
    
    # =========================================================
# CAR QUIZ QUESTIONS
# =========================================================

car_q = [

("Which engine powers MK4 Supra?", "2jz"),
("Which car is called Godzilla?", "nissan gtr"),
("Which brand makes RX7?", "mazda"),
("Who owns Lamborghini?", "volkswagen"),
("Engine of Skyline R34?", "rb26"),
("Who made NSX?", "honda"),
("Car with B58 engine?", "bmw"),
("WRX drivetrain?", "awd"),
("Prancing horse logo?", "ferrari"),
("Hellcat brand?", "dodge"),

("Who makes 350z?", "nissan"),
("Civic Type R brand?", "honda"),
("Fastest Bugatti?", "chiron"),
("Meaning of GTR?", "gran turismo racer"),
("Lancer Evolution brand?", "mitsubishi"),
("Supra brand?", "toyota"),
("Mustang brand?", "ford"),
("Audi R8 brand?", "audi"),
("Porsche 911 brand?", "porsche"),
("Jesko brand?", "koenigsegg"),

("Huayra brand?", "pagani"),
("Model S brand?", "tesla"),
("P1 brand?", "mclaren"),
("Corvette brand?", "chevrolet"),
("GT86 brand?", "toyota"),
("Aventador brand?", "lamborghini"),
("Rotary engine car?", "mazda rx7"),
("BMW performance division?", "m"),
("Dodge Demon engine type?", "v8"),
("Senna brand?", "mclaren"),

("Which engine powers Lexus LFA?", "1lr-gue"),
("What turbo setup does RB26 use?", "twin turbo"),
("What drivetrain is Audi Quattro?", "awd"),
("Transmission of MK4 Supra RZ?", "getrag v160"),
("Which brand made F40?", "ferrari"),
("What engine powers Nissan Silvia S15?", "sr20det"),
("Who makes Chiron?", "bugatti"),
("Which company owns Bentley?", "volkswagen"),
("What engine powers Dodge Hellcat?", "supercharged v8"),
("Which company makes AMG?", "mercedes")

]

# =========================================================
# MATH QUIZ QUESTIONS
# =========================================================

math_q = [

("125 x 24", "3000"),
("15²", "225"),
("√196", "14"),
("45 x 11", "495"),
("18³", "5832"),
("900 ÷ 30", "30"),
("77 + 88", "165"),
("1000 - 457", "543"),
("13 x 13", "169"),
("99 x 9", "891"),

("144 x 2", "288"),
("256 ÷ 16", "16"),
("121 ÷ 11", "11"),
("17 x 17", "289"),
("400 ÷ 25", "16"),
("36 x 12", "432"),
("625 ÷ 25", "25"),
("150 - 73", "77"),
("81 ÷ 9 + 10", "19"),
("64 ÷ 8 + 9", "17"),

("250 ÷ 5 x 3", "150"),
("72 ÷ 9 x 6", "48"),
("(50 x 2) - 35", "65"),
("144 ÷ 12 + 7", "19"),
("999 ÷ 3", "333"),
("45²", "2025"),
("√625", "25"),
("88 x 12", "1056"),
("500 - 275", "225"),
("(125 × 12) + (50 ÷ 2)", "1525"),

("√2025", "45"),
("(18² + 24²)", "900"),
("(99 × 99)", "9801"),
("(144 ÷ 12) × (17 - 5)", "144"),
("(81 x 9) - 100", "629"),
("(500 ÷ 5) + 777", "877"),
("(15 x 15) + (25 x 4)", "325"),
("(64 ÷ 8)²", "64"),
("(90 x 11)", "990"),
("50 x 50", "2500")

]

# =========================================================
# PUZZLE QUESTIONS
# =========================================================

puzzle_q = [

("R O F D", "ford"),
("I D U A", "audi"),
("A D Z M A", "mazda"),
("A Y T O O T", "toyota"),
("S U X E L", "lexus"),
("W M B", "bmw"),
("A D G O D", "dodge"),
("A R F R E R I", "ferrari"),
("A G A P N I", "pagani"),
("T T I U A B G", "bugatti"),

("R O P E H S C", "porsche"),
("U S B R A U", "subaru"),
("M A C N E R L", "mclaren"),
("K G G O I E N S E", "koenigsegg"),
("A T E S L", "tesla"),
("A N H O D", "honda"),
("A N S I N S", "nissan"),
("Y E V O T H C E R L", "chevrolet"),
("A I K S Y L N E", "skyline"),
("A U S R P", "supra"),

("O N C H R I", "chiron"),
("A N E S N", "senna"),
("A J O K S E", "jesko"),
("A R Y A U H", "huayra"),
("A R G T", "gtr"),
("R B ✌ 6", "rb26"),
("✌ j Z", "2jz"),
("A R X 7", "rx7"),
("🌲 5 0 Z", "350z"),
("✈️ R A R I F E R", "ferrari"),

("🦇 M B W", "bmw"),
("💀 A N I G A P", "pagani"),
("⚡ S A L E T", "tesla"),
("🔥 T G R", "gtr"),
("👑 R A Y H U A", "huayra"),
("🏁 N A N S I S", "nissan"),
("🚗 O Y O T T A", "toyota"),
("💨 R U S B A U", "subaru"),
("🛞 D O F R", "ford"),
("⚔️ H E C O R S P", "porsche")

]

# =========================================================
# CAR LOGO QUESTIONS
# =========================================================

logo_q = [

("4 rings logo?", "audi"),
("Horse logo?", "ferrari"),
("Bull logo?", "lamborghini"),
("Electric Elon brand?", "tesla"),
("Stars Japan brand?", "subaru"),
("BMW round logo?", "bmw"),
("Trident logo?", "maserati"),
("Wings logo?", "bentley"),
("Snake logo?", "dodge"),
("Shield logo?", "porsche"),

("Rotary engine brand?", "mazda"),
("3 diamonds logo?", "mitsubishi"),
("Korean modern logo?", "hyundai"),
("Lightning logo?", "opel"),
("Swedish luxury brand?", "volvo"),
("Oval Japan logo?", "toyota"),
("Horse muscle brand?", "ford"),
("Lion logo?", "peugeot"),
("Nissan luxury division?", "infiniti"),
("Honda luxury division?", "acura"),

("Diamond French brand?", "renault"),
("Hypercar Pagani brand?", "pagani"),
("Koenigsegg brand?", "koenigsegg"),
("Chiron brand?", "bugatti"),
("Senna brand?", "mclaren"),
("Supra maker?", "toyota"),
("Skyline maker?", "nissan"),
("NSX maker?", "honda"),
("LFA maker?", "lexus"),
("RX7 maker?", "mazda"),

("What brand uses griffin logo?", "saab"),
("Luxury division of Toyota?", "lexus"),
("Luxury division of Hyundai?", "genesis"),
("What brand has scorpion logo?", "abarth"),
("What logo has double chevron?", "citroen"),
("Italian supercar bull logo?", "lamborghini"),
("Which logo has blue oval?", "ford"),
("Which company owns Mini?", "bmw"),
("Which logo has star emblem?", "mercedes"),
("What logo has ram head?", "dodge")

]

# =========================================================
# RANDOM MIX QUIZ EVENT (10 QUESTIONS)
# =========================================================

mix_quiz_active = False
mix_quiz_scores = {}

# =========================================================
# START MIX QUIZ
# COMMAND: /mixquiz
# =========================================================

def mixquiz(update, context):

    global mix_quiz_active
    global mix_quiz_scores

    if not is_admin(update):
        return

    if mix_quiz_active:

        update.message.reply_text(
            "❌ MIX QUIZ ALREADY RUNNING"
        )

        return

    mix_quiz_active = True
    mix_quiz_scores = {}

    threading.Thread(
        target=run_mix_quiz,
        args=(
            update,
            context
        ),
        daemon=True
    ).start()

# =========================================================
# MIX QUIZ ENGINE
# =========================================================

def run_mix_quiz(update, context):

    global mix_quiz_active
    global mix_quiz_scores
    global quiz_data

    border = random.choice(animated_borders)

    chat_id = update.effective_chat.id

    all_questions = [
        ("🚗 CAR QUIZ", car_q),
        ("🧠 MATH QUIZ", math_q),
        ("🧩 PUZZLE GAME", puzzle_q),
        ("🚘 CAR LOGO QUIZ", logo_q)
    ]

    context.bot.send_message(
        chat_id,
f"""
{border}
🔥 MIX QUIZ EVENT 🔥
{border}

🎮 10 RANDOM QUESTIONS
🏆 1 POINT = 1 ACCOUNT

{border}

🔥 GOOD LUCK BRO 🔥

{border}
"""
    )

    for round_num in range(1, 11):

        border = random.choice(animated_borders)

        q_type = random.choice(all_questions)

        title = q_type[0]

        q = random.choice(q_type[1])

        quiz_data[chat_id] = {
            "answer": q[1].lower(),
            "end": now() + 20,
            "mix": True
        }

        msg = context.bot.send_message(
            chat_id,
            "⏳ LOADING QUESTION..."
        )

        total = 20

        answered = False

        for remaining in range(total, 0, -1):

            if chat_id not in quiz_data:
                answered = True
                break

            filled = int(
                (
                    remaining /
                    total
                ) * 10
            )

            empty = 10 - filled

            percent = int(
                (
                    remaining /
                    total
                ) * 100
            )

            bar = (
                "⬢" * filled
            )

            bar += (
                "⬡" * empty
            )

            bar += f" 『{percent}%』"

            try:

                context.bot.edit_message_text(
                    chat_id=chat_id,
                    message_id=msg.message_id,

                    text=f"""
{border}
🔥 MIX QUIZ #{round_num} 🔥
{border}

{title}

❓ {q[0]}

⏳ {remaining}s LEFT

{bar}

🏆 1 POINT = 1 ACCOUNT

{border}
"""
                )

            except:
                pass

            # Sleep 1s total, in 0.5s slices so we can exit fast when answered
            for _ in range(2):
                if chat_id not in quiz_data:
                    answered = True
                    break
                time.sleep(0.5)
            if answered:
                break

        # TIME UP
        if not answered:

            if chat_id in quiz_data:
                del quiz_data[chat_id]

            border = random.choice(animated_borders)

            context.bot.send_message(
                chat_id,
f"""
{border}
⏰ TIME'S UP
{border}

✅ ANSWER:
{q[1]}

😎 NICE TRY BRO

{border}
"""
            )

        time.sleep(0.3)

    # =====================================================
    # FINAL SCOREBOARD
    # =====================================================

    mix_quiz_active = False

    border = random.choice(animated_borders)

    if not mix_quiz_scores:

        context.bot.send_message(
            chat_id,
f"""
{border}
❌ NO WINNERS
{border}
"""
        )

        return

    text = (
f"""
{border}
🏆 MIX QUIZ RESULTS
{border}

👑 FINAL SCORES 👑

😎 NICE ONE BRO 😎

{border}
"""
    )

    sorted_scores = sorted(
        mix_quiz_scores.items(),
        key=lambda x: x[1],
        reverse=True
    )

    for uid, points in sorted_scores:

        try:

            user = context.bot.get_chat(uid)

            text += (
                f"\n👤 {safe_name(user)}"
                f"\n🏆 POINTS: {points}"
                f"\n🎁 REWARD: {points} ACCOUNT(S)\n"
                f"\n{border}\n"
            )

        except:
            pass

    context.bot.send_message(
        chat_id,
        text
    )

    # DM accounts to each scorer based on total points earned
    # (accounts were already sent per-round; this is just a summary safety net
    #  — skip double-sending since per-round DMs already handled it)
    # Final scoreboard is informational only.
    
    # =========================================================
# START COMMAND
# =========================================================

def start(update, context):

    border = random.choice(animated_borders)
    user = update.effective_user
    uid  = user.id
    record_name(uid, user)
    deliver_pending_prizes(context.bot, uid)

    # Detect invite deep-link: /start inv_USERID
    args = context.args or []
    if args and args[0].startswith("inv_"):
        inviter_key = args[0][4:]   # strip "inv_"
        invitee_key = str(uid)

        # Don't let someone invite themselves
        if inviter_key == invitee_key:
            update.message.reply_text("❌ You can't use your own invite link.")
        elif invitee_key in invite_pending:
            update.message.reply_text(
                f"ℹ️ You already have a pending invite. Run /claimbonus to collect your accounts."
            )
        elif uid in invite_used:
            update.message.reply_text(
                "❌ You've already claimed an invite bonus before. This is a one-time reward."
            )
        elif inviter_key not in player_names:
            update.message.reply_text(
                "❌ That invite link is invalid or the sender hasn't used the bot yet."
            )
        else:
            invite_pending[invitee_key] = inviter_key
            save_data()
            inviter_name = player_names[inviter_key]
            update.message.reply_text(
                f"🎉 You were invited by <b>{inviter_name}</b>!\n\n"
                f"To claim your <b>{INVITE_RECEIVER_ACCOUNTS} free accounts</b>:\n"
                f"1️⃣ Join {ANNOUNCE_CHANNEL} (if you haven't already)\n"
                f"2️⃣ Run /claimbonus here\n\n"
                f"You must be a member of the channel to qualify.",
                parse_mode="HTML",
            )
        return

    update.message.reply_text(
f"""
{border}
🏁 TNNR GIVEAWAY BOT
{border}
🔥 BOT ONLINE 🔥
{border}
🎮 GAMES
{border}
🚗 CAR QUIZ
🧠 MATH QUIZ
🧩 PUZZLE GAME
🚘 CAR LOGO QUIZ
🏁 TAP RACE TOURNAMENT
😈 BOSS RAID GAME
{border}
🎁 EVENTS
{border}
🔥 MIX QUIZ EVENT
🎁 GIVEAWAY
👑 PREMIUM GIVEAWAY
{border}
"""
    )

def help_cmd(update, context):
    border = random.choice(animated_borders)
    update.message.reply_text(
        f"{border}\n"
        f"📖 BOT COMMAND GUIDE\n"
        f"{border}\n\n"
        f"🌐 GENERAL\n"
        f"{'─'*18}\n"
        f"/start — Start the bot\n"
        f"/ping — Check if bot is online\n"
        f"/profile — View your stats\n"
        f"/leaderboard — Top players\n"
        f"/info — Show this message\n\n"
        f"{border}\n\n"
        f"🎁 ACCOUNT COMMANDS\n"
        f"{'─'*18}\n"
        f"/getaccount — Claim a free account\n"
        f"  (12hr cooldown · 1 account)\n\n"
        f"/poolstatus — See how many accounts\n"
        f"  are left in the pool\n\n"
        f"/invite — Get your personal invite link\n"
        f"  (sent to your DMs)\n\n"
        f"/claimbonus — Claim your invite reward\n"
        f"  after joining via someone's link\n"
        f"  → You get 5 accounts\n"
        f"  → They get 5 accounts\n\n"
        f"{border}\n\n"
        f"⚙️ OTHER COMMANDS\n"
        f"{'─'*18}\n"
        f"All other commands visible in this chat\n"
        f"are activated by admins only.\n\n"
        f"{border}",
        parse_mode=None,
    )


def ping(update, context):
    t_start = time.time()

    uptime_sec = int(t_start - _HEALTH_START)
    days = uptime_sec // 86400
    hours = (uptime_sec % 86400) // 3600
    mins = (uptime_sec % 3600) // 60
    secs = uptime_sec % 60

    if days > 0:
        uptime_str = f"{days}d {hours}h {mins}m"
    elif hours > 0:
        uptime_str = f"{hours}h {mins}m {secs}s"
    else:
        uptime_str = f"{mins}m {secs}s"

    border = random.choice(animated_borders)

    ms = int((time.time() - t_start) * 1000)

    update.message.reply_text(
f"""{border}
🏓 PONG!
{border}
✅ Bot is alive and running
⚡ Response: {ms}ms
⏱ Uptime: {uptime_str}
👥 Players tracked: {len(leaderboard)}
{border}"""
    )

# =========================================================
# PROFILE
# =========================================================

def profile(update, context):

    border = random.choice(animated_borders)

    user = update.message.from_user

    wins = leaderboard.get(
        user.id,
        0
    )

    update.message.reply_text(
f"""
{border}
👤 PLAYER PROFILE
{border}
👤 USER: {safe_name(user)}
{border}
🏆 TOTAL WINS: {wins}
{border}
👑 WOW NICE STATS BRO 👑
{border}
"""
    )

# =========================================================
# LEADERBOARD
# =========================================================

def leaderboard_cmd(update, context):

    border = random.choice(animated_borders)

    text = f"""
{border}
🏆 GLOBAL LEADERBOARD 🏆
{border}

👑 TOP PLAYERS 👑

{border}
"""

    sorted_players = sorted(
        leaderboard.items(),
        key=lambda x: x[1],
        reverse=True
    )

    if not sorted_players:

        text += f"""

❌ NO PLAYERS YET

{border}
"""

    for i, (uid, wins) in enumerate(
        sorted_players[:10],
        start=1
    ):

        try:

            user = context.bot.get_chat(uid)

            games = total_games.get(
                uid,
                0
            )

            # RANKS
            if i == 1:
                rank = "🥇 LEGEND"

            elif i == 2:
                rank = "🥈 MASTER"

            elif i == 3:
                rank = "🥉 PRO"

            else:
                rank = "🔥 PLAYER"

            text += f"""

👑 RANK #{i}
🏅 {rank}

👤 PLAYER:
{safe_name(user)}

🏆 WINS:
{wins}

🎮 GAMES:
{games}

{border}
"""

        except:
            pass

    update.message.reply_text(text)

# =========================================================
# TIMER LOOP
# =========================================================

def timer_loop(bot):

    while True:

        try:

            for key in [
                "giveaway",
                "premium",
                "flash",
            ]:

                ev = events.get(key)

                if not ev:
                    continue

                remaining = (
                    ev["end"] - now()
                )

                # FINISH EVENT
                if remaining <= 0:

                    finish_event(
                        bot,
                        key
                    )

                # UPDATE TIMER
                else:

                    try:

                        update_event(
                            bot,
                            key,
                            remaining
                        )

                    except Exception as e:
                        print(
                            f"TIMER ERROR: {e}"
                        )

        except Exception as e:

            print(
                f"LOOP ERROR: {e}"
            )

        # IMPORTANT
        # para di mag freeze
        time.sleep(1)

# =========================================================
# UPDATE EVENT
# =========================================================

def update_event(
    bot,
    key,
    remaining
):

    ev = events[key]

    border = random.choice(animated_borders)

    total = len(
        ev["players"]
    )

    start_date = time.strftime(
        "%Y-%m-%d %I:%M %p",
        time.localtime(ev["start"])
    )

    end_date = time.strftime(
        "%Y-%m-%d %I:%M %p",
        time.localtime(ev["end"])
    )

    filled = int(
        (
            remaining /
            ev["duration"]
        ) * 10
    )

    empty = 10 - filled

    percent = int(
        (
            remaining /
            ev["duration"]
        ) * 100
    )

    bar = (
        "➖" * filled
    )

    bar += (
        "〰" * empty
    )

    bar += f" 『{percent}%』"

    if key == "giveaway":

        button_text = (
            f"🎁 JOIN GIVEAWAY ({total})"
        )

        callback = "join_giveaway"

        winner_text = "👑 GIVEAWAY WINNER : 1"

    elif key == "flash":

        button_text = (
            f"⚡ ENTER FLASH GIVEAWAY ({total})"
        )

        callback = "join_flash"

        winner_text = "🏆 FLASH WINNER : 1"

    else:

        button_text = (
            f"👑 JOIN PREMIUM ({total})"
        )

        callback = "join_premium"

        winner_text = "👑 PREMIUM WINNERS : 3"

    keyboard = [[
        InlineKeyboardButton(
            button_text,
            callback_data=callback
        )
    ]]

    try:

        bot.edit_message_text(
            chat_id=ev["chat_id"],
            message_id=ev["message_id"],

            text=f"""
{border}
👑 {ev['title']}
{border}

🎁 PRIZE:
{ev['prize']}

{border}

🏆 LIVE EVENT

{winner_text}

{border}

👥 PLAYERS:
{total}

{border}

⌛ TIME LEFT:
{format_time(remaining)}

{bar}

{border}

📅 STARTED:
{start_date}

{border}

🏁 ENDS:
{end_date}

{border}
""",

            reply_markup=InlineKeyboardMarkup(
                keyboard
            )
        )

    except:
        pass

# =========================================================
# CLAIM NOTE HELPER
# =========================================================

def _dm_success_note():
    """Short confirmation block used in group chat when a prize DM was delivered."""
    border = random.choice(animated_borders)
    return (
        f"{border}\n"
        f"✅ ACCOUNT DELIVERED\n"
        f"{border}\n\n"
        f"Your account has been sent\n"
        f"directly to your Telegram DMs.\n\n"
        f"Check your messages now!\n\n"
        f"⚠️ Keep it private — do not share.\n\n"
        f"{border}"
    )


def _dm_fail_note():
    """Full explanation block used in group chat when a prize DM failed."""
    border = random.choice(animated_borders)
    return (
        f"{border}\n"
        f"⚠️ DM COULD NOT BE SENT\n"
        f"{border}\n\n"
        f"The bot tried to send your account\n"
        f"but could not reach you.\n\n"
        f"YOUR PRIZE IS SAVED — not lost.\n"
        f"It will auto-deliver the moment\n"
        f"the issue below is fixed.\n\n"
        f"{'─'*20}\n"
        f"POSSIBLE REASONS:\n"
        f"{'─'*20}\n\n"
        f"1️⃣ You haven't started the bot\n"
        f"   Bots cannot DM you first unless\n"
        f"   you've pressed Start in a DM.\n\n"
        f"2️⃣ Privacy settings block bots\n"
        f"   Telegram Settings → Privacy &\n"
        f"   Security → Messages → set to\n"
        f"   Everyone.\n\n"
        f"3️⃣ You have blocked the bot\n"
        f"   Unblock it to receive messages.\n\n"
        f"4️⃣ Your account has restrictions\n"
        f"   Telegram may have limited your\n"
        f"   account from receiving DMs.\n\n"
        f"{'─'*20}\n"
        f"HOW TO FIX IT:\n"
        f"{'─'*20}\n\n"
        f"1️⃣ Open the bot in Telegram\n"
        f"   and press START\n"
        f"2️⃣ Fix your privacy settings\n"
        f"3️⃣ Send any message in the group\n"
        f"   — your prize auto-sends after.\n\n"
        f"The admin will also try to find\n"
        f"you by name. If they can't locate\n"
        f"you, the steps above are the only\n"
        f"way to receive your account.\n\n"
        f"{border}"
    )


def _claim_note(user_obj):
    """Giveaway claim block — admin will search winner; explains what to do if unreachable."""
    border = random.choice(animated_borders)
    has_username = user_obj and getattr(user_obj, "username", None)
    display = safe_name(user_obj) if user_obj else "Winner"

    if has_username:
        uname = f"@{user_obj.username}"
        return (
            f"{border}\n"
            f"📨 CLAIM INSTRUCTIONS\n"
            f"{border}\n\n"
            f"✅ WINNER IDENTIFIED AS:\n"
            f"{uname}\n\n"
            f"The admin will DM you shortly.\n\n"
            f"{'─'*20}\n"
            f"IF YOU DON'T RECEIVE IT:\n"
            f"{'─'*20}\n\n"
            f"POSSIBLE REASONS:\n"
            f"1️⃣ Your DMs are closed to bots\n"
            f"   Settings → Privacy & Security\n"
            f"   → Messages → Everyone\n\n"
            f"2️⃣ You have blocked the admin\n"
            f"   Unblock them to receive DMs.\n\n"
            f"3️⃣ Your account has restrictions\n"
            f"   limiting incoming messages.\n\n"
            f"HOW TO CLAIM IF UNREACHABLE:\n"
            f"Message the admin directly\n"
            f"from the group chat — tell them\n"
            f"you won and show this message.\n\n"
            f"{border}"
        )
    else:
        return (
            f"{border}\n"
            f"⚠️ CLAIM INSTRUCTIONS\n"
            f"{border}\n\n"
            f"🔍 NO @USERNAME DETECTED\n\n"
            f"The admin will try to find you\n"
            f"by the name you used:\n"
            f"{display}\n\n"
            f"If the admin CANNOT find you —\n"
            f"IT IS UP TO YOU TO CLAIM.\n\n"
            f"{'─'*20}\n"
            f"WHY THE ADMIN MAY NOT FIND YOU:\n"
            f"{'─'*20}\n\n"
            f"1️⃣ You have no @username set\n"
            f"   Admins can only search by\n"
            f"   username, not by display name.\n\n"
            f"2️⃣ Your profile is private\n"
            f"   Hidden profiles cannot be\n"
            f"   found via search.\n\n"
            f"3️⃣ You are not visible in the group\n"
            f"   Send a message so admins\n"
            f"   can see your account.\n\n"
            f"{'─'*20}\n"
            f"HOW TO CLAIM:\n"
            f"{'─'*20}\n\n"
            f"1️⃣ Set a @username in Telegram\n"
            f"   Settings → Username\n"
            f"2️⃣ Message an admin in the group\n"
            f"   and tell them you won\n"
            f"3️⃣ OR message the bot directly\n"
            f"   — your prize auto-delivers\n\n"
            f"Act fast — unclaimed prizes may\n"
            f"be given to the next player.\n\n"
            f"{border}"
        )

# =========================================================
# FINISH EVENT
# =========================================================

def finish_event(
    bot,
    key
):

    ev = events[key]

    border = random.choice(animated_borders)

    if not ev:
        return

    # REMOVE BUTTONS
    try:

        bot.edit_message_reply_markup(
            chat_id=ev["chat_id"],
            message_id=ev["message_id"],
            reply_markup=None
        )

    except:
        pass

    # =====================================================
    # PREMIUM GIVEAWAY
    # =====================================================

    if key == "premium":

        if ev["players"]:

            winners = random.sample(
                ev["players"],
                min(3, len(ev["players"]))
            )

            text = f"""
{border}
💎 ELITE PREMIUM WINNERS 💎
{border}

😎 CONGRATULATIONS BRO'S 😎

{border}
"""

            for uid in winners:

                user = bot.get_chat(uid)

                record_name(uid, user)

                leaderboard[uid] = (
                    leaderboard.get(uid, 0) + 1
                )

                text += f"""

👑 {safe_name(user)}

{border}
"""

            text += f"""

🎁 PRIZE:
{ev['prize']}

{border}

👥 TOTAL PLAYERS:
{len(ev['players'])}

{border}
"""

            save_data()

            bot.send_message(
                ev["chat_id"],
                text
            )

            # Send individual claim instructions for each winner
            for uid in winners:
                try:
                    winner_user = bot.get_chat(uid)
                    bot.send_message(
                        ev["chat_id"],
                        _claim_note(winner_user),
                        parse_mode=None,
                    )
                except Exception:
                    pass

        else:

            bot.send_message(
                ev["chat_id"],
f"""
{border}
❌ NO PLAYERS JOINED
{border}
"""
            )

    # =====================================================
    # FLASH GIVEAWAY
    # =====================================================

    elif key == "flash":

        if ev["players"]:

            winner_id = random.choice(ev["players"])

            try:
                user = bot.get_chat(winner_id)
                record_name(winner_id, user)
                name = user.first_name or "Unknown"
                username = f"@{user.username}" if user.username else name
                mention = f"{name} ({username})" if user.username else name
            except Exception:
                mention = player_names.get(str(winner_id), str(winner_id))

            leaderboard[winner_id] = leaderboard.get(winner_id, 0) + 1

            save_data()

            bot.send_message(
                ANNOUNCE_CHANNEL,
f"""
{border}
⚡ FLASH GIVEAWAY RESULTS ⚡
{border}

🎉 CONGRATULATIONS! 🎉

🏆 WINNER:
{mention}

{border}

🎁 PRIZE:
{ev['prize']}

{border}

👥 TOTAL ENTRIES:
{len(ev['players'])}

{border}
""",
                parse_mode=None
            )

            try:
                flash_winner_user = bot.get_chat(winner_id)
            except Exception:
                flash_winner_user = None

            bot.send_message(
                ANNOUNCE_CHANNEL,
                _claim_note(flash_winner_user),
                parse_mode=None,
            )

        else:

            bot.send_message(
                ANNOUNCE_CHANNEL,
f"""
{border}
⚡ FLASH GIVEAWAY ENDED
{border}

❌ NO ONE ENTERED — NO WINNER

{border}
"""
            )

    # =====================================================
    # NORMAL GIVEAWAY
    # =====================================================

    else:

        if ev["players"]:

            winner = random.choice(
                ev["players"]
            )

            user = bot.get_chat(
                winner
            )

            record_name(winner, user)

            leaderboard[winner] = (
                leaderboard.get(
                    winner,
                    0
                ) + 1
            )

            save_data()

            bot.send_message(
                ev["chat_id"],
f"""
{border}
🎉 GIVEAWAY WINNER 🎉
{border}

👑 WINNER:
{safe_name(user)}

{border}

🎁 PRIZE:
{ev['prize']}

{border}

👥 TOTAL PLAYERS:
{len(ev['players'])}

{border}
"""
            )

            bot.send_message(
                ev["chat_id"],
                _claim_note(user),
                parse_mode=None,
            )

        else:

            bot.send_message(
                ev["chat_id"],
f"""
{border}
❌ NO PLAYERS JOINED
{border}
"""
            )

    events[key] = None

    save_data()

# =========================================================
# GET ACCOUNT  (/getaccount) — available to all users
# =========================================================

def getaccount(update, context):

    uid = update.effective_user.id
    user = update.effective_user
    record_name(uid, user)

    key = str(uid)
    if not unlimited_mode:
        cooldown = ACCOUNT_COOLDOWN_PARTY if party_mode else ACCOUNT_COOLDOWN_NORMAL
        last_claim = account_claims.get(key, 0)
        elapsed = now() - last_claim
        cooldown_remaining = cooldown - elapsed
    else:
        cooldown_remaining = 0

    if cooldown_remaining > 0:
        days = cooldown_remaining // 86400
        hours = (cooldown_remaining % 86400) // 3600
        mins = (cooldown_remaining % 3600) // 60
        secs = cooldown_remaining % 60
        if days > 0:
            wait = f"{days}d {hours}h {mins}m"
        elif hours > 0:
            wait = f"{hours}h {mins}m"
        elif mins > 0:
            wait = f"{mins}m {secs}s"
        else:
            wait = f"{secs}s"
        update.message.reply_text(
            f"⏳ You already claimed an account in the last 12 hours.\n"
            f"Come back in <b>{wait}</b>.",
            parse_mode="HTML"
        )
        return

    display = safe_name(user)

    count = random.randint(1, 10) if party_mode else 1
    accounts = [a for a in (pool_take() for _ in range(count)) if a]

    if not accounts:
        update.message.reply_text("❌ No accounts are available right now. Check back later!")
        return

    for acc in accounts:
        given_append(acc, display, uid)
    account_claims[key] = now()
    save_data()

    dm_text = (
        f"🎁 <b>You got {len(accounts)} account(s)!</b>\n\n"
        + "".join(f"<code>{acc}</code>\n" for acc in accounts)
        + "\n⚠️ Keep these private — do not share them."
    )

    try:
        context.bot.send_message(chat_id=uid, text=dm_text, parse_mode="HTML")
        if party_mode:
            update.message.reply_text(
                f"🎉 <b>{display}</b> just scored <b>{len(accounts)} account(s)</b>! "
                f"Check your DMs 🔥",
                parse_mode="HTML"
            )
        else:
            update.message.reply_text(f"✅ Account sent to your DMs, {display}!")
    except Exception:
        pool_add_lines(accounts)
        del account_claims[key]
        save_data()
        update.message.reply_text(
            f"⚠️ {display}, I couldn't send you a DM.\n\n"
            f"<b>Fix it in 2 steps:</b>\n"
            f"1️⃣ Open @{context.bot.username} in Telegram and press <b>Start</b>\n"
            f"2️⃣ If it still fails, go to <b>Telegram Settings → Privacy and Security → Messages</b> and set it to <b>Everybody</b>\n\n"
            f"✅ <b>Your cooldown has been reset</b> — run /getaccount again once fixed. No waiting!",
            parse_mode="HTML"
        )


# =========================================================
# UNLIMITED MODE  (/unlimited) — admin only
# =========================================================

def unlimited(update, context):
    global unlimited_mode
    if not is_admin(update):
        return
    unlimited_mode = not unlimited_mode
    if unlimited_mode:
        update.message.reply_text(
            "🔓 <b>Unlimited mode ON</b> — cooldown is disabled. "
            "Users can claim accounts with no wait time.\n\n"
            "Run /unlimited again to turn it off.",
            parse_mode="HTML",
        )
    else:
        update.message.reply_text(
            "🔒 <b>Unlimited mode OFF</b> — 2 minute cooldown restored.",
            parse_mode="HTML",
        )


# =========================================================
# PARTY MODE  (/party) — admin only
# =========================================================

def party(update, context):
    global party_mode
    if not is_admin(update):
        return
    party_mode = not party_mode
    if party_mode:
        update.message.reply_text(
            "🎉 <b>Party mode ON</b> — users now get 1–10 random accounts per claim "
            "and a public shoutout in chat!\n\n"
            "Run /party again to turn it off.",
            parse_mode="HTML",
        )
    else:
        update.message.reply_text(
            "🎈 <b>Party mode OFF</b> — back to 1 account per claim.",
            parse_mode="HTML",
        )


# POOL STATUS  (/poolstatus) — admin only
# =========================================================

def poolstatus(update, context):

    remaining = pool_count()

    given_count = 0
    if os.path.exists(ACCOUNTS_GIVEN_FILE):
        with open(ACCOUNTS_GIVEN_FILE, "r", encoding="utf-8") as f:
            given_count = sum(1 for line in f if line.strip())

    update.message.reply_text(
        f"📦 <b>Account Pool Status</b>\n\n"
        f"✅ Available: <b>{remaining}</b>\n"
        f"📤 Given out: <b>{given_count}</b>\n"
        f"📋 Total users with claims: <b>{len(account_claims)}</b>",
        parse_mode="HTML"
    )


# =========================================================
# INVITE SYSTEM  (/invite + /claimbonus)
# =========================================================

def _dm_accounts_batch(bot, uid, accounts, header):
    """DM a list of accounts to uid. Returns True on success."""
    lines = "\n".join(f"<code>{a}</code>" for a in accounts)
    msg = f"🎁 <b>{header}</b>\n\n{lines}\n\n⚠️ Keep these private — do not share them."
    try:
        bot.send_message(chat_id=uid, text=msg, parse_mode="HTML")
        return True
    except Exception:
        return False


def invite(update, context):
    user = update.effective_user
    uid  = user.id
    record_name(uid, user)

    bot_username = context.bot.username
    link = f"https://t.me/{bot_username}?start=inv_{uid}"
    display = safe_name(user)

    msg = (
        f"🔗 <b>Your Invite Link</b>\n\n"
        f"Share this with someone who has <b>never joined {ANNOUNCE_CHANNEL}</b>:\n\n"
        f"<code>{link}</code>\n\n"
        f"When they join the channel and run /claimbonus:\n"
        f"• They get <b>{INVITE_RECEIVER_ACCOUNTS} free accounts</b>\n"
        f"• You get <b>{INVITE_SENDER_ACCOUNTS} free accounts</b>\n\n"
        f"⚠️ Only works for new members of {ANNOUNCE_CHANNEL}. One bonus per person."
    )

    try:
        context.bot.send_message(chat_id=uid, text=msg, parse_mode="HTML")
        # Only reply in-chat if the command was used outside a private chat
        if update.effective_chat.type != "private":
            update.message.reply_text("✅ Your invite link has been sent to your DMs!")
    except Exception:
        update.message.reply_text(
            f"⚠️ I couldn't DM you your invite link.\n\n"
            f"Open @{bot_username} and press <b>Start</b>, then run /invite again.",
            parse_mode="HTML",
        )


def inviteinfo(update, context):
    if not is_admin(update):
        return
    border = random.choice(animated_borders)
    text = (
        f"{border}\n"
        f"🔗 INVITE & EARN FREE ACCOUNTS\n"
        f"{border}\n\n"
        f"Want free accounts? Invite your friends!\n\n"
        f"{border}\n"
        f"📲 HOW IT WORKS\n"
        f"{border}\n\n"
        f"1️⃣ Run /invite to get your personal invite link\n\n"
        f"2️⃣ Share the link with someone who has never joined {ANNOUNCE_CHANNEL}\n\n"
        f"3️⃣ They click your link, join {ANNOUNCE_CHANNEL}, then run /claimbonus\n\n"
        f"4️⃣ Both of you get rewarded instantly!\n\n"
        f"{border}\n"
        f"🎁 REWARDS\n"
        f"{border}\n\n"
        f"👤 New member gets → {INVITE_RECEIVER_ACCOUNTS} FREE accounts\n"
        f"🤝 You (the inviter) get → {INVITE_SENDER_ACCOUNTS} FREE accounts\n\n"
        f"{border}\n"
        f"⚠️ RULES\n"
        f"{border}\n\n"
        f"✅ The person you invite must be NEW to {ANNOUNCE_CHANNEL}\n"
        f"✅ Each person can only claim the invite bonus once\n"
        f"✅ You cannot use your own invite link\n"
        f"✅ Accounts are sent privately to your DMs\n\n"
        f"{border}\n"
        f"▶️ Ready? Run /invite in the bot to get your link!\n"
        f"{border}"
    )
    try:
        context.bot.send_message(ANNOUNCE_CHANNEL, text)
        update.message.reply_text(f"✅ Invite info posted to {ANNOUNCE_CHANNEL}.")
    except Exception as e:
        update.message.reply_text(f"❌ Couldn't post to {ANNOUNCE_CHANNEL}: {e}")


def claimbonus(update, context):
    user    = update.effective_user
    uid     = user.id
    key     = str(uid)
    display = safe_name(user)
    record_name(uid, user)

    # Must have a pending invite (i.e. started bot via invite link)
    inviter_key = invite_pending.get(key)
    if not inviter_key:
        update.message.reply_text(
            "❌ No pending invite found for you.\n\n"
            "This can happen if:\n"
            "• You haven't opened an invite link yet — ask someone for their /invite link\n"
            "• The person who sent you the link hasn't joined the channel or started the bot yet\n"
            "• Your invite was already used or expired\n\n"
            "Once you have a valid invite link, click it and then run /claimbonus again."
        )
        return

    # Already claimed the invite bonus before?
    if uid in invite_used:
        update.message.reply_text(
            "❌ You've already used an invite bonus. This is a one-time reward."
        )
        return

    # Must be a member of the announcements channel
    try:
        member = context.bot.get_chat_member(ANNOUNCE_CHANNEL, uid)
        if member.status in ("left", "kicked", "banned"):
            raise Exception("not a member")
    except Exception:
        update.message.reply_text(
            f"❌ You need to join {ANNOUNCE_CHANNEL} first, then run /claimbonus again."
        )
        return

    # Need enough accounts in the pool
    total_needed = INVITE_RECEIVER_ACCOUNTS + INVITE_SENDER_ACCOUNTS
    if pool_count() < total_needed:
        update.message.reply_text(
            f"❌ Not enough accounts available right now "
            f"({pool_count()} in pool, {total_needed} needed). Check back later!"
        )
        return

    # Pull accounts from pool
    receiver_accounts = [a for a in (pool_take() for _ in range(INVITE_RECEIVER_ACCOUNTS)) if a]
    sender_accounts   = [a for a in (pool_take() for _ in range(INVITE_SENDER_ACCOUNTS))   if a]

    # Mark as used and clear the pending entry
    invite_used.append(uid)
    del invite_pending[key]
    save_data()

    # Log to accounts_given.txt
    inviter_display = player_names.get(inviter_key, f"uid:{inviter_key}")
    date_str = time.strftime("%Y-%m-%d %H:%M", time.localtime())
    with _accounts_lock:
        with open(ACCOUNTS_GIVEN_FILE, "a", encoding="utf-8") as f:
            for acc in receiver_accounts:
                f.write(f"{acc} | {display} | {uid} | {date_str} | [invite bonus from {inviter_display}]\n")
            for acc in sender_accounts:
                f.write(f"{acc} | {inviter_display} | {inviter_key} | {date_str} | [invite reward for inviting {display}]\n")

    # DM receiver — if this fails, reverse everything
    if receiver_accounts:
        ok_receiver = _dm_accounts_batch(
            context.bot, uid, receiver_accounts,
            f"Your Invite Bonus — {len(receiver_accounts)} Accounts"
        )
        if not ok_receiver:
            # Reverse: put accounts back, undo claim
            pool_add_lines(receiver_accounts + sender_accounts)
            invite_used.remove(uid)
            invite_pending[key] = inviter_key
            save_data()
            update.message.reply_text(
                f"⚠️ {display}, I couldn't send you a DM.\n\n"
                f"<b>Fix it in 2 steps:</b>\n"
                f"1️⃣ Open @{context.bot.username} and press <b>Start</b>\n"
                f"2️⃣ Go to <b>Telegram Settings → Privacy → Messages</b> → set to <b>Everybody</b>\n\n"
                f"✅ Your bonus is still waiting — run /claimbonus again once fixed. No waiting!",
                parse_mode="HTML",
            )
            return

    update.message.reply_text(
        f"✅ {display}, your {len(receiver_accounts)} account(s) have been sent to your DMs!"
    )

    # DM sender
    sender_uid = int(inviter_key)
    if sender_accounts:
        ok_sender = _dm_accounts_batch(
            context.bot, sender_uid, sender_accounts,
            f"Invite Reward — {len(sender_accounts)} Accounts"
        )
        try:
            if ok_sender:
                context.bot.send_message(
                    chat_id=sender_uid,
                    text=(
                        f"🎉 <b>{display}</b> just joined via your invite link!\n"
                        f"You earned <b>{len(sender_accounts)} accounts</b> — check your DMs above."
                    ),
                    parse_mode="HTML",
                )
            else:
                context.bot.send_message(
                    chat_id=sender_uid,
                    text=(
                        f"🎉 <b>{display}</b> joined via your invite link!\n"
                        f"⚠️ I couldn't DM your {len(sender_accounts)} reward account(s) — "
                        f"please open @{context.bot.username} and press Start so I can reach you."
                    ),
                    parse_mode="HTML",
                )
        except Exception:
            pass


# =========================================================
# EXTRA ACCOUNTS FOR OLD 2-ACCOUNT INVITE RECEIVERS
# =========================================================

def extrafromchange(update, context):
    if not is_admin(update):
        return

    EXTRA = 3  # how many extra accounts to give each affected user

    # Parse accounts_given.txt for UIDs that received an invite bonus
    log_path = os.path.join(os.path.dirname(__file__), "accounts_given.txt")
    try:
        with open(log_path, "r", encoding="utf-8") as f:
            lines = f.readlines()
    except Exception as e:
        update.message.reply_text(f"❌ Couldn't read accounts log: {e}")
        return

    # Collect unique UIDs from lines tagged [invite bonus from ...]
    affected_uids = {}  # uid (int) -> display name
    for line in lines:
        if "[invite bonus from" not in line:
            continue
        parts = [p.strip() for p in line.split("|")]
        if len(parts) < 3:
            continue
        try:
            uid = int(parts[2])
        except ValueError:
            continue
        display = parts[1] if len(parts) > 1 else str(uid)
        affected_uids[uid] = display

    if not affected_uids:
        update.message.reply_text("ℹ️ No invite bonus receivers found in the log.")
        return

    available = pool_count()
    needed = len(affected_uids) * EXTRA
    if available < needed:
        update.message.reply_text(
            f"⚠️ Pool only has {available} accounts but {needed} are needed "
            f"({len(affected_uids)} users × {EXTRA}). Add more accounts first."
        )
        return

    update.message.reply_text(
        f"⏳ Sending {EXTRA} extra accounts to {len(affected_uids)} users…"
    )

    sent_ok = []
    sent_fail = []
    ts = datetime.now().strftime("%Y-%m-%d %H:%M")

    for uid, display in affected_uids.items():
        accounts = [a for a in (pool_take() for _ in range(EXTRA)) if a]
        if not accounts:
            sent_fail.append(display)
            continue

        ok = _dm_accounts_batch(
            context.bot, uid, accounts,
            f"Bonus Top-Up — {len(accounts)} Extra Accounts"
        )

        # Log each account given
        with open(log_path, "a", encoding="utf-8") as f:
            for acc in accounts:
                f.write(f"{acc} | {display} | {uid} | {ts} | [extrafromchange top-up]\n")

        if ok:
            sent_ok.append(display)
            try:
                context.bot.send_message(
                    chat_id=uid,
                    text=(
                        f"🎁 <b>Bonus Top-Up!</b>\n\n"
                        f"We updated the invite reward to <b>5 accounts each</b>. "
                        f"Here are <b>{len(accounts)} extra accounts</b> to make up the difference — "
                        f"check your DMs above!"
                    ),
                    parse_mode="HTML",
                )
            except Exception:
                pass
        else:
            sent_fail.append(display)

    summary = f"✅ Sent to {len(sent_ok)} users."
    if sent_fail:
        summary += f"\n⚠️ DM failed for {len(sent_fail)}: {', '.join(sent_fail)}"
    update.message.reply_text(summary)


# =========================================================
# UPLOAD ACCOUNTS — admin sends a .txt document
# =========================================================

def handle_document(update, context):

    if not is_admin(update):
        return

    doc = update.message.document

    if not doc:
        return

    fname = doc.file_name or ""
    if not fname.lower().endswith(".txt"):
        return

    try:
        tg_file = context.bot.get_file(doc.file_id)
        raw = tg_file.download_as_bytearray()
        text = raw.decode("utf-8", errors="replace")
    except Exception as e:
        update.message.reply_text(f"❌ Failed to download file: {e}")
        return

    lines = text.splitlines()
    added = pool_add_lines(lines)

    if added == 0:
        update.message.reply_text("⚠️ File had no valid lines to add.")
        return

    total = pool_count()
    update.message.reply_text(
        f"✅ Added <b>{added}</b> account(s) to the pool.\n"
        f"📦 Pool now has <b>{total}</b> account(s) available.",
        parse_mode="HTML"
    )


# =========================================================
# FLASH GIVEAWAY  (/flashgiveaway [prize text])
# =========================================================

def flashgiveaway(update, context):

    if not is_admin(update):
        return

    if events.get("flash"):
        update.message.reply_text("⚡ A flash giveaway is already running!")
        return

    prize = " ".join(context.args).strip() if context.args else "SURPRISE PRIZE 🎁"

    duration = 600  # 10 minutes

    ev = {
        "title": "⚡ FLASH GIVEAWAY",
        "prize": prize,
        "chat_id": ANNOUNCE_CHANNEL,
        "message_id": None,
        "players": [],
        "start": now(),
        "end": now() + duration,
        "duration": duration,
    }

    border = random.choice(animated_borders)

    keyboard = [[
        InlineKeyboardButton(
            "⚡ ENTER FLASH GIVEAWAY (0)",
            callback_data="join_flash"
        )
    ]]

    end_date = time.strftime(
        "%Y-%m-%d %I:%M %p",
        time.localtime(ev["end"])
    )

    try:
        sent = context.bot.send_message(
            ANNOUNCE_CHANNEL,
f"""
{border}
⚡ FLASH GIVEAWAY ⚡
{border}

🎁 PRIZE:
{prize}

{border}

🏆 FLASH WINNER : 1

{border}

👥 PLAYERS:
0

{border}

⌛ TIME LEFT:
10:00

{border}

🏁 ENDS:
{end_date}

{border}
""",
            reply_markup=InlineKeyboardMarkup(keyboard)
        )

        ev["message_id"] = sent.message_id
        events["flash"] = ev
        save_data()

        update.message.reply_text(
            f"⚡ Flash giveaway started! Posted to {ANNOUNCE_CHANNEL}. Ends in 10 minutes."
        )

    except Exception as e:
        update.message.reply_text(f"❌ Failed to post: {e}")


def join_flash(update, context):

    q = update.callback_query

    uid = q.from_user.id

    record_name(uid, q.from_user)

    ev = events.get("flash")

    if not ev:
        q.answer("No flash giveaway active.")
        return

    if uid not in ev["players"]:
        ev["players"].append(uid)
        save_data()
        q.answer("⚡ You're in the flash giveaway!")
    else:
        q.answer("Already entered!")


# =========================================================
# GIVEAWAY
# =========================================================

def giveaway(update, context):

    if not is_admin(update):
        return

    prize = "5 ACCOUNTS"

    ev = {

        "title": "🎁 GIVEAWAY EVENT",

        "prize": prize,

        "chat_id": update.effective_chat.id,

        "message_id": None,

        "players": [],

        "start": now(),

        "end": now() + 3600,

        "duration": 3600

    }

    events["giveaway"] = ev

    msg = update.message.reply_text(
        "🎁 STARTING GIVEAWAY..."
    )

    ev["message_id"] = msg.message_id

    save_data()

# =========================================================
# PREMIUM GIVEAWAY
# =========================================================

def premium(update, context):

    if not is_admin(update):
        return

    prize = "10 ACCOUNTS"

    ev = {

        "title": "👑 PREMIUM GIVEAWAY",

        "prize": prize,

        "chat_id": update.effective_chat.id,

        "message_id": None,

        "players": [],

        "start": now(),

        "end": now() + 86400,

        "duration": 86400

    }

    events["premium"] = ev

    msg = update.message.reply_text(
        "👑 STARTING PREMIUM..."
    )

    ev["message_id"] = msg.message_id

    save_data()

# =========================================================
# JOIN BUTTONS
# =========================================================

def join_giveaway(update, context):

    q = update.callback_query

    uid = q.from_user.id

    record_name(uid, q.from_user)

    ev = events["giveaway"]

    if not ev:
        return

    if uid not in ev["players"]:

        ev["players"].append(uid)

        save_data()

        q.answer(
            "Joined Giveaway!"
        )

    else:

        q.answer(
            "Already Joined"
        )

def join_premium(update, context):

    q = update.callback_query

    uid = q.from_user.id

    record_name(uid, q.from_user)

    ev = events["premium"]

    if not ev:
        return

    if uid not in ev["players"]:

        ev["players"].append(uid)

        save_data()

        q.answer(
            "Joined Premium!"
        )

    else:

        q.answer(
            "Already Joined"
        )
        
        # =========================================================
# QUIZ SYSTEM
# =========================================================

def ask_quiz(
    update,
    context,
    questions,
    title
):

    border = random.choice(animated_borders)

    if not is_admin(update):
        return

    q = random.choice(
        questions
    )

    chat_id = update.effective_chat.id

    quiz_data[chat_id] = {

        "answer": q[1].lower(),

        "end": now() + 20,

        "mix": False

    }

    msg = update.message.reply_text(
        "⏳ STARTING QUIZ..."
    )

    total = 20

    for remaining in range(
        total,
        0,
        -1
    ):

        filled = int(
            (
                remaining /
                total
            ) * 10
        )

        empty = 10 - filled

        percent = int(
            (
                remaining /
                total
            ) * 100
        )

        bars = (
            "⬢" * filled
        )

        bars += (
            "⬡" * empty
        )

        bars += f" 『{percent}%』"

        try:

            context.bot.edit_message_text(
                chat_id=chat_id,
                message_id=msg.message_id,

                text=f"""
{border}
{title}
{border}
🎁 PRIZE: 1 ACCOUNT
{border}
🏆 ONLY ONE WINNER
{border}
❓ QUESTION:
{q[0]}
{border}
⏳ {remaining}s LEFT
{bars}

{border}
⚡ ANSWER FAST ⚡
{border}
"""
            )

        except:
            pass

        # Sleep 1s total, in 0.5s slices so we can exit fast when answered
        for _ in range(2):
            if chat_id not in quiz_data:
                return
            time.sleep(0.5)

    # TIME UP
    if chat_id in quiz_data:

        del quiz_data[chat_id]

        context.bot.send_message(
            chat_id,
f"""
{border}
⏰ TIME'S UP ⏰
{border}
✅ ANSWER:
{q[1]}
{border}
"""
        )

# =========================================================
# CHECK ANSWERS
# =========================================================

def check_answer(update, context):
    _check_answer_inner(update, context)


def _check_answer_inner(update, context):

    global mix_quiz_scores

    if not update.message or not update.message.text:
        return

    chat_id = update.effective_chat.id

    border = random.choice(animated_borders)

    if chat_id not in quiz_data:
        return

    if now() > quiz_data[chat_id]["end"]:
        return

    answer = (
        update.message.text
        .lower()
        .strip()
    )

    correct = quiz_data[chat_id]["answer"]

    if answer == correct:

        user = update.message.from_user

        total_games[user.id] = (
            total_games.get(user.id, 0) + 1
        )

        # =================================================
        # MIX QUIZ POINTS
        # =================================================

        if quiz_data[chat_id].get("mix"):

            mix_quiz_scores[user.id] = (
                mix_quiz_scores.get(
                    user.id,
                    0
                ) + 1
            )

            record_name(user.id, user)

            sent = dm_prize_account(
                context.bot,
                user.id,
                safe_name(user),
                "🎲 MIX QUIZ ROUND WIN"
            )

            update.message.reply_text(
f"""
{border}
🔥 CORRECT ANSWER 🥳
{border}

👑 NICE ONE BRO 👑

{border}

👤 PLAYER:
{safe_name(user)}

{border}

🏆 +1 POINT
🎁 +1 ACCOUNT

{border}
"""
            )

            update.message.reply_text(
                _dm_success_note() if sent else _dm_fail_note(),
                parse_mode=None,
            )

        # =================================================
        # NORMAL QUIZ
        # =================================================

        else:

            record_name(user.id, user)

            leaderboard[user.id] = (
                leaderboard.get(
                    user.id,
                    0
                ) + 1
            )

            save_data()

            sent = dm_prize_account(
                context.bot,
                user.id,
                safe_name(user),
                "🚗 QUIZ WIN"
            )

            update.message.reply_text(
f"""
{border}
👑 QUIZ WINNER 👑
{border}

🥳 NICE ONE BRO 🥳

{border}

🏆 WINNER:
{safe_name(user)}

{border}

🎁 WON:
1 ACCOUNT

{border}
"""
            )

            update.message.reply_text(
                _dm_success_note() if sent else _dm_fail_note(),
                parse_mode=None,
            )

        del quiz_data[chat_id]

# =========================================================
# QUIZ COMMANDS
# =========================================================

def carquiz(update, context):

    if not is_admin(update):
        return
    threading.Thread(
        target=ask_quiz,
        args=(
            update,
            context,
            car_q,
            "🚗 CAR QUIZ 🚗 GOODLUCK BRO"
        ),
        daemon=True
    ).start()

def mathquiz(update, context):

    if not is_admin(update):
        return
    threading.Thread(
        target=ask_quiz,
        args=(
            update,
            context,
            math_q,
            "🧠 MATH QUIZ 🧠GOODLUCK BRO"
        ),
        daemon=True
    ).start()

def puzzle(update, context):

    if not is_admin(update):
        return
    threading.Thread(
        target=ask_quiz,
        args=(
            update,
            context,
            puzzle_q,
            "🧩 PUZZLE GAME 🧩GOODLUCK BRO"
        ),
        daemon=True
    ).start()

def carlogo(update, context):

    if not is_admin(update):
        return
    threading.Thread(
        target=ask_quiz,
        args=(
            update,
            context,
            logo_q,
            "🚘 CAR LOGO QUIZ 🚘 GOODLUCK BRO"
        ),
        daemon=True
    ).start()
    
    # =========================================================
# TAP RACE TOURNAMENT
# =========================================================

def taprace(update, context):

    if not is_admin(update):
        return
    global tournament_players

    border = random.choice(animated_borders)

    tournament_players = []

    keyboard = [[
        InlineKeyboardButton(
            "🏁 JOIN TOURNAMENT (0/20)",
            callback_data="join_taprace"
        )
    ]]

    update.message.reply_text(
f"""
{border}
🏁 TAP RACE TOURNAMENT
{border}

⚔️ REAL ELIMINATION
👑 SEMI FINALS
🏆 GRAND FINALS

{border}

🔥 TAP FAST TO WIN

{border}

👥 MAX PLAYERS: 20

{border}

🎁 REWARD:
5 ACCOUNTS

{border}

👑 WAIT FOR ADMIN
TO START MATCH 👑

{border}
""",
        reply_markup=InlineKeyboardMarkup(
            keyboard
        )
    )

# =========================================================
# JOIN TOURNAMENT
# =========================================================

def join_taprace(update, context):

    global tournament_players
    global match_running

    border = random.choice(animated_borders)

    q = update.callback_query

    user = q.from_user

    # ALREADY JOINED
    if user.id in tournament_players:

        q.answer(
            "Already Joined 🤣"
        )

        return

    # FULL
    if len(tournament_players) >= 20:

        q.answer(
            "Tournament Full"
        )

        return

    # ADD PLAYER
    record_name(user.id, user)

    tournament_players.append(
        user.id
    )

    save_data()

    total = len(
        tournament_players
    )

    keyboard = [[
        InlineKeyboardButton(
            f"🏁 JOIN TOURNAMENT ({total}/20)",
            callback_data="join_taprace"
        )
    ]]

    try:

        q.edit_message_reply_markup(
            reply_markup=InlineKeyboardMarkup(
                keyboard
            )
        )

    except:
        pass

    q.answer(
        f"{total}/20 Joined"
    )

    # AUTO START WHEN FULL
    if total >= 20 and not match_running:

        context.bot.send_message(
            q.message.chat.id,
f"""
{border}
🔥 TOURNAMENT FULL 🔥
{border}

⚡ AUTO STARTING...

{border}
"""
        )

        threading.Thread(
            target=start_tournament,
            args=(
                context,
                q.message.chat.id
            ),
            daemon=True
        ).start()
        
# =========================================================
# ADMIN MANUAL START
# =========================================================

def starttap(update, context):

    global match_running

    if not is_admin(update):
        return

    # ALREADY RUNNING
    if match_running:

        update.message.reply_text(
            "⚠️ Tournament already running"
        )

        return

    # NEED PLAYERS
    if len(tournament_players) < 2:

        update.message.reply_text(
            "❌ NEED ATLEAST 2 PLAYERS"
        )

        return

    # START ENGINE
    threading.Thread(
        target=start_tournament,
        args=(
            context,
            update.effective_chat.id
        ),
        daemon=True
    ).start()

# =========================================================
# TOURNAMENT ENGINE
# =========================================================

def start_tournament(
    context,
    chat_id
):

    global tournament_players
    global tournament_winners
    global match_running

    border = random.choice(animated_borders)

    match_running = True

    round_num = 1

    while len(
        tournament_players
    ) > 1:

        border = random.choice(animated_borders)

        tournament_winners = []

        context.bot.send_message(
            chat_id,
f"""
{border}
👑 ROUND {round_num} 👑
{border}

🏹🏹🏹🏹🏹🏹🏹🏹🏹🏹
🔥 GOOD LUCK BRO 🔥
🏹🏹🏹🏹🏹🏹🏹🏹🏹🏹

{border}
"""
        )

        while len(
            tournament_players
        ) >= 2:

            p1 = tournament_players.pop(0)
            p2 = tournament_players.pop(0)

            winner = run_match(
                context,
                chat_id,
                p1,
                p2
            )

            tournament_winners.append(
                winner
            )

        # ODD PLAYER AUTO ADVANCE
        if len(
            tournament_players
        ) == 1:

            tournament_winners.append(
                tournament_players.pop(0)
            )

        tournament_players = (
            tournament_winners.copy()
        )

        round_num += 1

    # =====================================================
    # CHAMPION
    # =====================================================

    border = random.choice(animated_borders)

    champion = tournament_players[0]

    user = context.bot.get_chat(
        champion
    )

    record_name(champion, user)

    leaderboard[champion] = (
        leaderboard.get(
            champion,
            0
        ) + 5
    )

    save_data()

    context.bot.send_message(
        chat_id,
f"""
{border}
👑 TOURNAMENT CHAMPION 👑
{border}

🎁🥳 NICE BRO BRO 🥳🎁

{border}

🏆 WINNER:
{safe_name(user)}

{border}

🔥 DOMINATED THE EVENT 🔥

{border}

🎁 WON:
5 ACCOUNTS

{border}
"""
    )

    # RESET
    tournament_players.clear()

    match_running = False
    
    # =========================================================
# MATCH SYSTEM
# =========================================================

def run_match(
    context,
    chat_id,
    p1,
    p2
):

    global taprace_match
    global taprace_taps
    global taprace_active
    global taprace_started
    global taprace_message_id

    # MATCH STATE
    taprace_active = True
    taprace_started = False

    taprace_match = [p1, p2]

    taprace_taps = {
        p1: 0,
        p2: 0
    }

    # USERS
    u1 = context.bot.get_chat(p1)
    u2 = context.bot.get_chat(p2)

    # BUTTON
    keyboard = [[
        InlineKeyboardButton(
            "🔥 TAP FAST 🔥",
            callback_data="tap_button"
        )
    ]]

    # START MESSAGE
    msg = context.bot.send_message(
        chat_id,
        "⚔️ PREPARING MATCH..."
    )

    taprace_message_id = msg.message_id

    # =====================================================
    # COUNTDOWN
    # =====================================================

    countdown = [
        "5️⃣",
        "4️⃣",
        "3️⃣",
        "2️⃣",
        "1️⃣"
    ]

    for num in countdown:

        try:

            context.bot.edit_message_text(
                chat_id=chat_id,
                message_id=msg.message_id,

                text=
                "{border}\n"
                "⚔️ NEXT MATCH\n"
                "{border}\n\n"

                f"👤 {safe_name(u1)}\n\n"

                "🆚\n\n"

                f"👤 {safe_name(u2)}\n\n"

                f"{num}\n\n"

                "⏳ GET READY...\n"

                "{border}",

                reply_markup=InlineKeyboardMarkup(
                    keyboard
                )
            )

        except:
            pass

        time.sleep(1)

    # =====================================================
    # START GAME
    # =====================================================

    taprace_started = True

    try:

        context.bot.edit_message_text(
            chat_id=chat_id,
            message_id=msg.message_id,

            text=
            "{border}\n"
            "🔥 GO GO GO 🔥\n"
            "{border}\n\n"

            f"👤 {safe_name(u1)}\n"
            "🆚\n"
            f"👤 {safe_name(u2)}\n\n"

            "⚡ TAP FAST NOW ⚡\n"
            "🔥 SPAM THE BUTTON 🔥\n"

            "{border}",

            reply_markup=InlineKeyboardMarkup(
                keyboard
            )
        )

    except:
        pass

    time.sleep(1)

    # =====================================================
    # MATCH TIMER
    # =====================================================

    total = 10

    for sec in range(
        total,
        -1,
        -1
    ):

        p1_taps = taprace_taps.get(
            p1,
            0
        )

        p2_taps = taprace_taps.get(
            p2,
            0
        )

        max_taps = max(
            p1_taps,
            p2_taps,
            1
        )

        # PLAYER 1 BAR
        p1_fill = int(
            (p1_taps / max_taps) * 10
        )

        p1_bar = (
            "🟩" * p1_fill
        ) + (
            "⬜" * (10 - p1_fill)
        )

        # PLAYER 2 BAR
        p2_fill = int(
            (p2_taps / max_taps) * 10
        )

        p2_bar = (
            "🟦" * p2_fill
        ) + (
            "⬜" * (10 - p2_fill)
        )

        # TIMER BAR
        timer_fill = int(
            (sec / total) * 10
        )

        timer_bar = (
            "🟨" * timer_fill
        ) + (
            "⬜" * (10 - timer_fill)
        )

        try:

            context.bot.edit_message_text(
                chat_id=chat_id,
                message_id=msg.message_id,

                text=
                "{border}\n"
                "🏁 LIVE TAP RACE\n"
                "{border}\n\n"

                f"👤 {safe_name(u1)}\n\n"

                f"🔥 {p1_taps} TAPS\n"

                f"{p1_bar}\n\n"

                "🆚\n\n"

                f"👤 {safe_name(u2)}\n\n"

                f"🔥 {p2_taps} TAPS\n"

                f"{p2_bar}\n\n"

                f"⏳ {sec}s LEFT\n"

                f"{timer_bar}\n\n"

                "⚡ TAP FAST NOW ⚡\n"

                "{border}",

                reply_markup=InlineKeyboardMarkup(
                    keyboard
                )
            )

        except:
            pass

        time.sleep(1.0)

    # =====================================================
    # END MATCH
    # =====================================================

    taprace_active = False
    taprace_started = False

    p1_final = taprace_taps.get(
        p1,
        0
    )

    p2_final = taprace_taps.get(
        p2,
        0
    )

    # WINNER
    if p1_final >= p2_final:

        winner = p1
        loser = p2

    else:

        winner = p2
        loser = p1

    w_user = context.bot.get_chat(
        winner
    )

    l_user = context.bot.get_chat(
        loser
    )

    try:

        context.bot.edit_message_text(
            chat_id=chat_id,
            message_id=msg.message_id,

            text=
            "{border}\n"
            "🏆 MATCH RESULT\n"
            "{border}\n\n"

            f"👤 {safe_name(u1)}\n"
            f"🔥 {p1_final} taps\n\n"

            "🆚\n\n"

            f"👤 {safe_name(u2)}\n"
            f"🔥 {p2_final} taps\n\n"

            f"👑 WINNER:\n"
            f"{safe_name(w_user)}\n\n"

            f"💀 ELIMINATED:\n"
            f"{safe_name(l_user)}\n\n"

            "{border}"
        )

    except:
        pass

    return winner
    
    # =========================================================
# TAP BUTTON
# =========================================================

def tap_button(update, context):

    global taprace_active
    global taprace_started
    global taprace_match
    global taprace_taps
    global last_tap

    q = update.callback_query

    uid = q.from_user.id

    # MATCH ENDED
    if not taprace_active:
        try:
            q.answer("🏁 Match ended!")
        except:
            pass
        return

    # WAIT FOR GO
    if not taprace_started:
        try:
            q.answer("⏳ Wait for GO!")
        except:
            pass
        return

    # NOT PARTICIPATING
    if uid not in taprace_match:
        try:
            q.answer("❌ NOT YOUR MATCH")
        except:
            pass
        return

    # =====================================================
    # ANSWER IMMEDIATELY — clears Telegram loading spinner
    # =====================================================
    try:
        q.answer()
    except:
        pass

    # =====================================================
    # ANTI SPAM DELAY + THREAD-SAFE TAP COUNT
    # =====================================================

    current = time.time()

    with _tap_lock:

        if uid in last_tap and current - last_tap[uid] < 0.03:
            return

        last_tap[uid] = current

        if uid not in taprace_taps:
            taprace_taps[uid] = 0

        taprace_taps[uid] += 1

# =========================================================
# RESET TOURNAMENT
# =========================================================

def reset_tournament():

    global taprace_match
    global taprace_taps
    global taprace_active
    global taprace_started
    global taprace_message_id
    global tournament_players
    global tournament_winners
    global last_tap
    global match_running

    taprace_match = []

    taprace_taps = {}

    taprace_active = False
    taprace_started = False

    taprace_message_id = None

    tournament_players = []

    tournament_winners = []

    last_tap = {}

    match_running = False

# =========================================================
# EMERGENCY STOP COMMAND
# COMMAND: /stoptap
# =========================================================

def stoptap(update, context):

    if not is_admin(update):
        return
    global match_running

    border = random.choice(animated_borders)

    if not match_running:

        update.message.reply_text(
f"""
{border}
❌ NO ACTIVE TOURNAMENT
{border}
"""
        )

        return

    reset_tournament()

    update.message.reply_text(
f"""
{border}
🛑 TOURNAMENT STOPPED
{border}
👑 ADMIN ENDED EVENT
{border}
"""
    )

# =========================================================
# TOURNAMENT PLAYERS
# COMMAND: /players
# =========================================================

def players(update, context):

    if not is_admin(update):
        return
    border = random.choice(animated_borders)

    if not tournament_players:

        update.message.reply_text(
f"""
{border}
❌ NO PLAYERS JOINED
{border}
"""
        )

        return

    text = f"""
{border}
👥 TOURNAMENT PLAYERS
{border}
"""

    for i, uid in enumerate(
        tournament_players,
        start=1
    ):

        try:

            user = context.bot.get_chat(uid)

            text += (
                f"\n{i}. "
                f"{safe_name(user)}"
            )

        except:
            pass

    text += f"""

{border}
"""

    update.message.reply_text(text)

# =========================================================
# TOURNAMENT STATUS
# COMMAND: /tapstatus
# =========================================================

def tapstatus(update, context):

    if not is_admin(update):
        return
    border = random.choice(animated_borders)

    if match_running:

        update.message.reply_text(
f"""
{border}
🏁 TOURNAMENT STATUS
{border}

🔥 ACTIVE TOURNAMENT 🔥

{border}

👥 PLAYERS LEFT:
{len(tournament_players)}

{border}
"""
        )

    else:

        update.message.reply_text(
f"""
{border}
🏁 TOURNAMENT STATUS
{border}

❌ NO ACTIVE TOURNAMENT

{border}
"""
        )
        
        # =========================================================
# MAIN
# =========================================================

updater = Updater(
    TOKEN,
    use_context=True,
    workers=20,
)

dp = updater.dispatcher
        
        # =========================================================
# 👹 BOSS RAID SYSTEM
# =========================================================

boss_raid = None
raid_active = False
raid_cooldown = {}

def start_boss_raid(update, context):

    if not is_admin(update):
        return
    global boss_raid
    global raid_active

    if raid_active:

        update.message.reply_text(
            "⚠️ RAID ALREADY ACTIVE"
        )

        return

    border = random.choice(
        animated_borders
    )

    chat_id = update.effective_chat.id

    raid_active = True

    boss_raid = {

        "chat_id": chat_id,

        "boss_name":
        "👹 MARK MWEHEHEHE😈",

        "boss_hp": 1000000,

        "max_hp": 1000000,

        "teams": {

            "team1": [],
            "team2": [],
            "team3": [],
            "team4": []

        },

        "damage": {},

        "started": False
    }

    keyboard = [

        [

            InlineKeyboardButton(
                "🔴 TEAM 1 [0/3]",
                callback_data="raid_team1"
            ),

            InlineKeyboardButton(
                "🔵 TEAM 2 [0/3]",
                callback_data="raid_team2"
            )

        ],

        [

            InlineKeyboardButton(
                "🟢 TEAM 3 [0/3]",
                callback_data="raid_team3"
            ),

            InlineKeyboardButton(
                "🟣 TEAM 4 [0/3]",
                callback_data="raid_team4"
            )

        ]

    ]

    msg = context.bot.send_message(

        chat_id,

f"""
{border}
👹 BOSS RAID EVENT
{border}

🏆 PRIZE:
6 PREMIUM ACCOUNTS

👥 PLAYERS:
0/12

⚔️ 4 TEAMS ONLY
👑 3 MEMBERS EACH

⌛ STARTS IN:
3mins

➖➖➖➖➖➖➖➖➖➖ 『100%』

❤️ BOSS HP:
1000000 / 1000000

👹 BOSS: MARK MWEHEHEHE😈

{border}
""",

        reply_markup=InlineKeyboardMarkup(
            keyboard
        )

    )

    boss_raid["message_id"] = (
        msg.message_id
    )

    # =========================================================
    # AUTO START TIMER
    # =========================================================

    def auto_start():

        global boss_raid

        total = 180

        for remaining in range(
            total,
            0,
            -2
        ):

            if not boss_raid:
                return

            if boss_raid["started"]:
                return

            total_players = (

                len(
                    boss_raid["teams"]["team1"]
                ) +

                len(
                    boss_raid["teams"]["team2"]
                ) +

                len(
                    boss_raid["teams"]["team3"]
                ) +

                len(
                    boss_raid["teams"]["team4"]
                )

            )

            filled = int(
                (
                    remaining /
                    total
                ) * 10
            )

            empty = 10 - filled

            percent = int(
                (
                    remaining /
                    total
                ) * 100
            )

            bar = (
                "➖" * filled
            )

            bar += (
                "〰" * empty
            )

            bar += f" 『{percent}%』"

            border = random.choice(
                animated_borders
            )

            keyboard = [

                [

                    InlineKeyboardButton(
                        f"🔴 TEAM 1 [{len(boss_raid['teams']['team1'])}/3]",
                        callback_data="raid_team1"
                    ),

                    InlineKeyboardButton(
                        f"🔵 TEAM 2 [{len(boss_raid['teams']['team2'])}/3]",
                        callback_data="raid_team2"
                    )

                ],

                [

                    InlineKeyboardButton(
                        f"🟢 TEAM 3 [{len(boss_raid['teams']['team3'])}/3]",
                        callback_data="raid_team3"
                    ),

                    InlineKeyboardButton(
                        f"🟣 TEAM 4 [{len(boss_raid['teams']['team4'])}/3]",
                        callback_data="raid_team4"
                    )

                ]

            ]

            try:

                context.bot.edit_message_text(

                    chat_id=chat_id,

                    message_id=msg.message_id,

text=f"""
{border}
👹 BOSS RAID EVENT
{border}

🏆 PRIZE:
6 PREMIUM ACCOUNTS

👥 PLAYERS:
{total_players}/12

⚔️ 4 TEAMS ONLY
👑 3 MEMBERS EACH

⌛ STARTS IN:
{remaining}s

{bar}

❤️ BOSS HP:
100000 / 100000

👹 BOSS: MARK MWEHEHEHE😈

{border}
""",

                    reply_markup=InlineKeyboardMarkup(
                        keyboard
                    )

                )

            except:
                pass

            time.sleep(0.7)

        # =========================================================
        # START RAID
        # =========================================================

        if not boss_raid:
            return

        boss_raid["started"] = True

        attack_keyboard = [[

            InlineKeyboardButton(
                "⚔️ ATTACK BOSS",
                callback_data="raid_attack"
            )

        ]]

        border = random.choice(
            animated_borders
        )

        context.bot.edit_message_text(

            chat_id=chat_id,

            message_id=msg.message_id,

text=f"""
{border}
👹 RAID STARTED
{border}

⚔️ ATTACK THE BOSS NOW

❤️ BOSS HP:
100000 / 100000

➖➖➖➖➖➖➖➖➖➖ 『100%』

👹 BOSS: MARK MWEHEHEHE😈

{border}
""",

            reply_markup=InlineKeyboardMarkup(
                attack_keyboard
            )

        )

    threading.Thread(
        target=auto_start
    ).start()

# =========================================================
# JOIN RAID TEAM
# =========================================================

def join_raid_team(update, context):

    global boss_raid

    if not boss_raid:
        return

    query = update.callback_query

    user = query.from_user

    data = query.data

    team = data.replace(
        "raid_",
        ""
    )

    # ALREADY JOINED

    for t in boss_raid["teams"]:

        if user.id in boss_raid["teams"][t]:

            query.answer(
                "⚠️ YOU ALREADY JOINED"
            )

            return

    # TEAM FULL

    if len(
        boss_raid["teams"][team]
    ) >= 3:

        query.answer(
            "❌ TEAM FULL"
        )

        return

    # JOIN TEAM

    boss_raid["teams"][team].append(
        user.id
    )

    query.answer(
        "🔥 TEAM JOINED"
    )

# =========================================================
# MANUAL RAID START
# =========================================================

def manual_start_raid(update, context):

    global boss_raid

    if not is_admin(update):
        return

    if not boss_raid:
        return

    if boss_raid["started"]:

        update.message.reply_text(
            "⚠️ RAID ALREADY STARTED"
        )

        return

    boss_raid["started"] = True

    border = random.choice(
        animated_borders
    )

    keyboard = [[

        InlineKeyboardButton(
            "⚔️ ATTACK BOSS",
            callback_data="raid_attack"
        )

    ]]

    context.bot.edit_message_text(

        chat_id=boss_raid["chat_id"],

        message_id=boss_raid["message_id"],

text=f"""
{border}
👹 RAID STARTED
{border}

⚔️ ATTACK THE BOSS NOW

❤️ BOSS HP:
100000 / 100000

➖➖➖➖➖➖➖➖➖➖ 『100%』

👹 BOSS: MARK MWEHEHEHE😈

{border}
""",

        reply_markup=InlineKeyboardMarkup(
            keyboard
        )

    )

# =========================================================
# RAID ATTACK SYSTEM
# =========================================================

def raid_attack(update, context):

    global boss_raid
    global raid_active

    if not boss_raid:
        return

    if not boss_raid["started"]:
        return

    query = update.callback_query
    user = query.from_user

    user_team = None

    for t in boss_raid["teams"]:

        if user.id in boss_raid["teams"][t]:
            user_team = t

    if not user_team:
        try:
            query.answer("❌ JOIN A TEAM FIRST")
        except:
            pass
        return

    # RANDOM DAMAGE

    damage = random.randint(
        1100,
        3500
    )

    # THREAD-SAFE HP + DAMAGE UPDATE

    with _raid_lock:

        if user.id not in boss_raid["damage"]:
            boss_raid["damage"][user.id] = {
                "name": user.first_name,
                "damage": 0
            }

        boss_raid["damage"][user.id]["damage"] += damage

        boss_raid["boss_hp"] -= damage

        if boss_raid["boss_hp"] < 0:
            boss_raid["boss_hp"] = 0

    hp = boss_raid["boss_hp"]
    max_hp = boss_raid["max_hp"]

    # ANSWER IMMEDIATELY — clears loading spinner
    try:
        query.answer(f"-{damage} HP")
    except:
        pass

    percent = int(
        (
            hp /
            max_hp
        ) * 100
    )

    filled = int(
        (
            hp /
            max_hp
        ) * 10
    )

    empty = 10 - filled

    bar = (
        "➖" * filled
    )

    bar += (
        "〰" * empty
    )

    bar += f" 『{percent}%』"

    border = random.choice(
        animated_borders
    )

    keyboard = [[

        InlineKeyboardButton(
            "⚔️ ATTACK BOSS",
            callback_data="raid_attack"
        )

    ]]

    context.bot.edit_message_text(

        chat_id=query.message.chat_id,

        message_id=query.message.message_id,

text=f"""
{border}
👹 BOSS: MARK MWEHEHEHE😈
{border}

❤️ HP:
{hp} / {max_hp}

{bar}

⚔️ {user.first_name}
DEALT {damage} DAMAGE

{border}
""",

        reply_markup=InlineKeyboardMarkup(
            keyboard
        )

    )

    # =========================================================
    # BOSS DEAD
    # =========================================================

    if hp <= 0:

        mvp_name = "UNKNOWN"
        mvp_damage = 0

        for uid in boss_raid["damage"]:

            dmg = boss_raid["damage"][uid]["damage"]

            if dmg > mvp_damage:

                mvp_damage = dmg

                mvp_name = (
                    boss_raid["damage"][uid]["name"]
                )

        winner_team = (
            user_team.upper()
        )

        context.bot.send_message(

            query.message.chat_id,

f"""
{border}
☠️ BOSS DEFEATED☠️
{border}

🏆 WINNING TEAM:
{winner_team}

🎁 TEAM REWARD:
2 ACCOUNTS EACH

{border}

👑 MVP PLAYER:
{mvp_name}

💥 TOTAL DAMAGE:
{mvp_damage}

🎁 MVP BONUS:
3 ACCOUNTS

{border}

😈😈😈😈😈😈😈😈😈😈
🔥 CONGRATS RAIDERS🔥
😈😈😈😈😈😈😈😈😈😈

{border}
"""
        )

        boss_raid = None
        raid_active = False
        
        # =========================================================
# HANDLERS
# =========================================================

dp.add_handler(
    CommandHandler(
        "start",
        start
    )
)

dp.add_handler(
    CommandHandler(
        "info",
        help_cmd
    )
)

dp.add_handler(
    CommandHandler(
        "ping",
        ping
    )
)

dp.add_handler(
    CommandHandler(
        "profile",
        profile
    )
)

dp.add_handler(
    CommandHandler(
        "leaderboard",
        leaderboard_cmd
    )
)

dp.add_handler(
    CommandHandler(
        "mixquiz",
        mixquiz
    )
)

dp.add_handler(
    CommandHandler(
        "bossraid",
        start_boss_raid
    )
)

dp.add_handler(
    CallbackQueryHandler(
        join_raid_team,
        pattern="raid_team",
        run_async=True,
    )
)

dp.add_handler(
    CallbackQueryHandler(
        raid_attack,
        pattern="raid_attack",
        run_async=True,
    )
)

dp.add_handler(
    CommandHandler(
        "startraid",
        manual_start_raid
    )
)

# =========================================================
# ACCOUNT COMMANDS
# =========================================================

dp.add_handler(
    CommandHandler(
        "getaccount",
        getaccount
    )
)

dp.add_handler(
    CommandHandler(
        "unlimited",
        unlimited
    )
)

dp.add_handler(
    CommandHandler(
        "party",
        party
    )
)

dp.add_handler(
    CommandHandler(
        "poolstatus",
        poolstatus
    )
)

dp.add_handler(
    CommandHandler(
        "invite",
        invite
    )
)

dp.add_handler(
    CommandHandler(
        "inviteinfo",
        inviteinfo
    )
)

dp.add_handler(
    CommandHandler(
        "claimbonus",
        claimbonus
    )
)

dp.add_handler(
    CommandHandler(
        "extrafromchange",
        extrafromchange
    )
)

# =========================================================
# GIVEAWAY COMMANDS
# =========================================================

dp.add_handler(
    CommandHandler(
        "flashgiveaway",
        flashgiveaway
    )
)

dp.add_handler(
    CommandHandler(
        "giveaway",
        giveaway
    )
)

dp.add_handler(
    CommandHandler(
        "premium",
        premium
    )
)

# =========================================================
# QUIZ COMMANDS
# =========================================================

dp.add_handler(
    CommandHandler(
        "carquiz",
        carquiz
    )
)

dp.add_handler(
    CommandHandler(
        "mathquiz",
        mathquiz
    )
)

dp.add_handler(
    CommandHandler(
        "puzzle",
        puzzle
    )
)

dp.add_handler(
    CommandHandler(
        "carlogo",
        carlogo
    )
)

# =========================================================
# WEB GAME COMMANDS (browser-based tap race + raid)
# =========================================================

def _api_base():
    return os.environ.get("PLAY_API_BASE", "http://localhost:80/api")

def _create_web_session(payload):
    data = json.dumps(payload).encode("utf-8")
    secret = os.environ.get("TELEGRAM_BOT_TOKEN", "")
    req = urllib.request.Request(
        f"{_api_base()}/play/session",
        data=data,
        headers={
            "Content-Type": "application/json",
            "X-Bot-Secret": secret,
        },
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=10) as resp:
        return json.loads(resp.read().decode("utf-8"))

def webtap(update, context):
    if not is_admin(update):
        return
    try:
        body = _create_web_session({
            "type": "tap",
            "chatId": ANNOUNCE_CHANNEL,
            "playDurationMs": 30000,
            "manualStart": True,
        })
    except Exception as e:
        update.message.reply_text(f"❌ Could not create session: {e}")
        return
    session_id = body.get("sessionId", "")
    url = body.get("url", "")
    text = (
        "⚡ <b>WEB TAP RACE</b> ⚡\n\n"
        "<b>How to play</b>\n"
        "• Tap the link below and enter your name to join the lobby.\n"
        "• Wait for an admin to run /startrace — a 10s countdown will appear here.\n"
        "• When the race begins, the board is a 5×5 grid. Every square is red except ONE that turns green.\n\n"
        "<b>Scoring (30 second race)</b>\n"
        "✅ Tap the GREEN square → <b>+1 point</b>\n"
        "❌ Tap a RED square → <b>−1 point</b>\n"
        "❌ Tap a square too late (after it turns back to red) → <b>−1 point</b>\n\n"
        "💡 Tip: blind spamming will lose you points — accuracy beats speed.\n"
        "🏆 Highest score when the timer hits zero wins!\n\n"
        f"🔗 <a href=\"{url}\">JOIN THE RACE</a>"
    )
    keyboard = InlineKeyboardMarkup([[
        InlineKeyboardButton("⚡ JOIN TAP RACE", url=url)
    ]])
    try:
        context.bot.send_message(
            ANNOUNCE_CHANNEL, text, parse_mode="HTML",
            reply_markup=keyboard, disable_web_page_preview=True,
        )
        update.message.reply_text(
            f"✅ Tap race posted to {ANNOUNCE_CHANNEL}.\n"
            f"Run /startrace here when you're ready to begin."
        )
    except Exception as e:
        update.message.reply_text(
            f"❌ Couldn't post to {ANNOUNCE_CHANNEL}: {e}\n"
            f"Make sure the bot is an admin in that channel."
        )
        return
    if session_id:
        _start_poll_thread(context.bot, session_id, "WEB TAP RACE")

def _get_latest_session(chat_id, type_):
    secret = os.environ.get("TELEGRAM_BOT_TOKEN", "")
    req = urllib.request.Request(
        f"{_api_base()}/play/chat/{chat_id}/latest/{type_}",
        headers={"X-Bot-Secret": secret},
        method="GET",
    )
    with urllib.request.urlopen(req, timeout=10) as resp:
        return json.loads(resp.read().decode("utf-8"))

def _start_session(session_id, delay_ms=0):
    secret = os.environ.get("TELEGRAM_BOT_TOKEN", "")
    payload = json.dumps({"delayMs": delay_ms}).encode("utf-8")
    req = urllib.request.Request(
        f"{_api_base()}/play/session/{session_id}/start",
        data=payload,
        headers={
            "Content-Type": "application/json",
            "X-Bot-Secret": secret,
        },
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=10) as resp:
        return json.loads(resp.read().decode("utf-8"))

def startrace(update, context):
    if not is_admin(update):
        return
    # Tap races are anchored to the announcement channel
    lookup_chat = ANNOUNCE_CHANNEL
    try:
        latest = _get_latest_session(lookup_chat, "tap")
    except urllib.error.HTTPError as e:
        if e.code == 404:
            update.message.reply_text(
                "❌ No tap race here. Run /webtap first."
            )
            return
        update.message.reply_text(f"❌ Lookup failed: {e}")
        return
    except Exception as e:
        update.message.reply_text(f"❌ Lookup failed: {e}")
        return
    status = latest.get("status")
    session_id = latest.get("sessionId")
    if status == "finished":
        update.message.reply_text(
            "❌ The last race already finished. Run /webtap to start a new one."
        )
        return
    if status == "running":
        update.message.reply_text("⚠️ The race is already running!")
        return
    player_count = latest.get("playerCount", 0)

    # Schedule the start 10s in the future so the web page sees the same
    # countdown as Telegram and they stay in lockstep.
    try:
        result = _start_session(session_id, delay_ms=10000)
    except Exception as e:
        update.message.reply_text(f"❌ Start failed: {e}")
        return

    starts_at_ms = result.get("startsAt")
    server_time_ms = result.get("serverTime")
    # Map server clock to local monotonic clock so each tick anchors against the
    # real start moment instead of drifting with edit-latency.
    if isinstance(starts_at_ms, (int, float)) and isinstance(server_time_ms, (int, float)):
        local_start_at = time.time() + (starts_at_ms - server_time_ms) / 1000.0
    else:
        local_start_at = time.time() + 10.0

    update.message.reply_text(
        f"⏳ Starting in 10 seconds…\nPlayers in lobby: {player_count}"
    )

    # 10s countdown in the announcement channel; edit a single message
    countdown_msg = None
    try:
        countdown_msg = context.bot.send_message(
            ANNOUNCE_CHANNEL,
            "⏳ <b>RACE STARTING IN 10s</b>\nJoin now if you haven't!",
            parse_mode="HTML",
        )
    except Exception:
        pass

    last_shown = None
    while True:
        remaining_s = local_start_at - time.time()
        remaining = int(math.ceil(remaining_s))
        if remaining <= 0:
            break
        if remaining != last_shown and countdown_msg is not None:
            try:
                context.bot.edit_message_text(
                    chat_id=ANNOUNCE_CHANNEL,
                    message_id=countdown_msg.message_id,
                    text=(
                        f"⏳ <b>RACE STARTING IN {remaining}s</b>\n"
                        f"Join now if you haven't!"
                    ),
                    parse_mode="HTML",
                )
            except Exception:
                pass
            last_shown = remaining
        # Sleep until the next second boundary against the real start time
        next_tick = local_start_at - (remaining - 1)
        time.sleep(max(0.05, min(1.0, next_tick - time.time())))

    players = result.get("players", player_count)
    started_text = (
        f"🏁 <b>RACE STARTED!</b>\n\n"
        f"👥 {players} player(s) in the lobby\n"
        f"⏱ 30 seconds — hit the green square!"
    )
    if countdown_msg is not None:
        try:
            context.bot.edit_message_text(
                chat_id=ANNOUNCE_CHANNEL,
                message_id=countdown_msg.message_id,
                text=started_text,
                parse_mode="HTML",
            )
        except Exception:
            try:
                context.bot.send_message(
                    ANNOUNCE_CHANNEL, started_text, parse_mode="HTML",
                )
            except Exception:
                pass
    else:
        try:
            context.bot.send_message(
                ANNOUNCE_CHANNEL, started_text, parse_mode="HTML",
            )
        except Exception:
            pass

    update.message.reply_text(started_text, parse_mode="HTML")

def webraid(update, context):
    if not is_admin(update):
        return
    chat_id = update.effective_chat.id
    try:
        body = _create_web_session({
            "type": "team-raid",
            "chatId": ANNOUNCE_CHANNEL,
            "lobbyDurationMs": 0,
            "playDurationMs": 60000,
            "bossHp": 15000,
        })
    except Exception as e:
        update.message.reply_text(f"❌ Could not create session: {e}")
        return
    session_id = body.get("sessionId", "")
    url = body.get("url", "")
    text = (
        "👹 <b>WEB TEAM BOSS RAID</b> 👹\n\n"
        "<b>12 teams</b> (3 players max each) vs. the Boss!\n"
        "Pick your team and deal as much damage as you can!\n\n"
        "<b>Rules</b>\n"
        "⚔️ Every tap = 10 damage\n"
        "⏱ <b>60 seconds</b> — raid ends when the timer hits zero\n"
        "🏆 Winner = team with the <b>highest average damage per player</b>\n"
        "   (so a solo player can still beat a full team!)\n"
        "🐢 One tap every 0.3s max — no spamming\n\n"
        f"❤️ Boss HP: 15,000\n\n"
        f"🔗 <a href=\"{url}\">JOIN TEAM RAID</a>"
    )
    keyboard = InlineKeyboardMarkup([[
        InlineKeyboardButton("⚔️ JOIN TEAM RAID", url=url)
    ]])
    try:
        context.bot.send_message(
            ANNOUNCE_CHANNEL, text, parse_mode="HTML",
            reply_markup=keyboard, disable_web_page_preview=True,
        )
        update.message.reply_text(f"✅ Team Raid posted to {ANNOUNCE_CHANNEL}.")
    except Exception as e:
        update.message.reply_text(f"❌ Couldn't post: {e}")
        return
    if session_id:
        _start_poll_thread(context.bot, session_id, "WEB TEAM RAID")

def _get_session_winner(session_id):
    """Fetch winner info from the API (bot-auth). Returns parsed JSON or None."""
    secret = os.environ.get("TELEGRAM_BOT_TOKEN", "")
    url = f"{_api_base()}/play/session/{session_id}/winner"
    req = urllib.request.Request(url, headers={"X-Bot-Secret": secret}, method="GET")
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            print(f"[POLL] {session_id} → status={data.get('status')} winner={data.get('winner')} members={data.get('winnerTeamMembers')}")
            return data
    except urllib.error.HTTPError as e:
        body = ""
        try:
            body = e.read().decode("utf-8")[:200]
        except Exception:
            pass
        print(f"[POLL] {session_id} → HTTP {e.code}: {body}")
        return None
    except Exception as e:
        print(f"[POLL] {session_id} → error: {e}")
        return None


def _resolve_tg_id(tg_id, tg_username):
    """Return a confirmed int uid or None.
    Tries the supplied telegramId first; falls back to username registry lookup."""
    if tg_id and isinstance(tg_id, (int, float)) and int(tg_id) > 0:
        return int(tg_id)
    if tg_username:
        clean = tg_username.lstrip("@").lower()
        found = username_to_uid.get(clean)
        if found:
            return found
    return None


def _start_poll_thread(bot_instance, session_id, game_label, started_at=None):
    """Register a session and launch its poll thread. Call this instead of threading.Thread directly."""
    t = started_at or time.time()
    active_web_sessions[session_id] = {"label": game_label, "started_at": t}
    save_data()
    threading.Thread(
        target=_poll_web_session,
        args=(bot_instance, session_id, game_label, t),
        daemon=True,
    ).start()
    print(f"[POLL] registered+launched {session_id} ({game_label})")


def _poll_web_session(bot_instance, session_id, game_label, started_at=None, timeout=600):
    """Background thread: polls until the session finishes, then DMs winner(s) 1 account each."""
    started_at = started_at or time.time()
    deadline = started_at + timeout
    print(f"[POLL] started polling {session_id} ({game_label})")
    consecutive_404 = 0
    try:
        while time.time() < deadline:
            time.sleep(4)
            data = _get_session_winner(session_id)
            if not data:
                consecutive_404 += 1
                if consecutive_404 >= 5:
                    print(f"[POLL] {session_id} — 5× 404, session gone, aborting")
                    return
                continue
            consecutive_404 = 0

            status = data.get("status")
            if status != "finished":
                continue

            print(f"[POLL] {session_id} FINISHED — processing winner(s)")
            border = random.choice(animated_borders)
            winner_names = []

            # Single winner (tap, quiz, raid)
            winner = data.get("winner")
            if winner:
                print(f"[POLL] winner raw: {winner}")
                uid = _resolve_tg_id(winner.get("telegramId"), winner.get("telegramUsername"))
                print(f"[POLL] resolved uid={uid}")
                if uid:
                    name = winner.get("name") or winner.get("telegramUsername") or str(uid)
                    sent = dm_prize_account(bot_instance, uid, name, f"🌐 {game_label}")
                    print(f"[POLL] dm_prize_account → sent={sent}")
                    winner_names.append((name, sent))
                else:
                    print(f"[POLL] could not resolve uid for winner={winner}")

            # Team-raid: DM every member of the winning team
            for member in (data.get("winnerTeamMembers") or []):
                uid = _resolve_tg_id(member.get("telegramId"), member.get("telegramUsername"))
                if uid:
                    name = member.get("name") or member.get("telegramUsername") or str(uid)
                    sent = dm_prize_account(bot_instance, uid, name, f"🌐 {game_label}")
                    print(f"[POLL] team member uid={uid} → sent={sent}")
                    winner_names.append((name, sent))
                else:
                    print(f"[POLL] could not resolve uid for member={member}")

            # Post winner announcement to channel
            if winner_names:
                try:
                    lines = []
                    for name, sent in winner_names:
                        status_icon = "✅" if sent else "⚠️"
                        lines.append(f"{status_icon} {name}")
                    bot_instance.send_message(
                        ANNOUNCE_CHANNEL,
                        f"{border}\n"
                        f"🏆 {game_label} WINNER(S) 🏆\n"
                        f"{border}\n\n"
                        + "\n".join(lines) + "\n\n"
                        + "🎁 Account sent to your DMs!\n\n"
                        + (
                            "⚠️ If you didn't receive it, check\n"
                            "the bot's instructions in your DMs.\n\n"
                            if any(not s for _, s in winner_names) else ""
                        )
                        + f"{border}",
                        parse_mode=None,
                    )
                except Exception as e:
                    print(f"[POLL] couldn't post winner announcement: {e}")

            return  # done — finally block will clean up

        print(f"[POLL] {session_id} timed out after {timeout}s — no winner found")
    finally:
        active_web_sessions.pop(session_id, None)
        save_data()


def _post_web_quiz(update, context, quiz_type, label, emoji):
    if not is_admin(update):
        return
    try:
        body = _create_web_session({
            "type": "quiz",
            "quizType": quiz_type,
            "chatId": ANNOUNCE_CHANNEL,
            "lobbyDurationMs": 30000,
        })
    except Exception as e:
        update.message.reply_text(f"❌ Could not create session: {e}")
        return
    session_id = body.get("sessionId", "")
    url = body.get("url", "")
    text = (
        f"{emoji} <b>WEB {label.upper()}</b> {emoji}\n\n"
        f"10 questions • 15 seconds each\n"
        f"Answer fast for more points — fastest correct answer wins!\n\n"
        f"⏱ Lobby: 30s — join now before the quiz starts!\n\n"
        f"🔗 <a href=\"{url}\">JOIN {label.upper()}</a>"
    )
    keyboard = InlineKeyboardMarkup([[
        InlineKeyboardButton(f"{emoji} JOIN {label.upper()}", url=url)
    ]])
    try:
        context.bot.send_message(
            ANNOUNCE_CHANNEL, text, parse_mode="HTML",
            reply_markup=keyboard, disable_web_page_preview=True,
        )
        update.message.reply_text(f"✅ {label} posted to {ANNOUNCE_CHANNEL}.")
    except Exception as e:
        update.message.reply_text(f"❌ Couldn't post: {e}")
        return
    if session_id:
        _start_poll_thread(context.bot, session_id, f"WEB {label.upper()}")

def webcarquiz(update, context):
    _post_web_quiz(update, context, "carquiz", "Car Quiz", "🚗")

def webmathquiz(update, context):
    _post_web_quiz(update, context, "mathquiz", "Math Quiz", "🧠")

def webpuzzle(update, context):
    _post_web_quiz(update, context, "puzzle", "Puzzle Quiz", "🧩")

def webcarlogo(update, context):
    _post_web_quiz(update, context, "carlogo", "Car Logo Quiz", "🚘")

def webmixquiz(update, context):
    _post_web_quiz(update, context, "mixquiz", "Mix Quiz", "🎲")

dp.add_handler(CommandHandler("webtap", webtap))
dp.add_handler(CommandHandler("webraid", webraid))
dp.add_handler(CommandHandler("startrace", startrace))
dp.add_handler(CommandHandler("webcarquiz", webcarquiz))
dp.add_handler(CommandHandler("webmathquiz", webmathquiz))
dp.add_handler(CommandHandler("webpuzzle", webpuzzle))
dp.add_handler(CommandHandler("webcarlogo", webcarlogo))
dp.add_handler(CommandHandler("webmixquiz", webmixquiz))

# =========================================================
# ANNOUNCEMENT CHANNEL
# =========================================================

def announce(update, context):
    """Send a message to the announcement channel.
    Usage:
      /announce <message>           — sends the text after the command
      /announce (as a reply)        — forwards/sends the replied-to message text
    """
    if not is_admin(update):
        return

    msg = update.message
    text = None
    parse_mode = "HTML"

    # Prefer text following the command
    if context.args:
        text = msg.text.split(None, 1)[1] if msg.text else " ".join(context.args)
    # Otherwise use the message we're replying to
    elif msg.reply_to_message and (msg.reply_to_message.text or msg.reply_to_message.caption):
        text = msg.reply_to_message.text or msg.reply_to_message.caption

    if not text:
        msg.reply_text(
            "Usage:\n"
            "• <code>/announce your message here</code>\n"
            "• reply to any message with <code>/announce</code>\n\n"
            f"Channel: <b>{ANNOUNCE_CHANNEL}</b>",
            parse_mode="HTML",
        )
        return

    try:
        sent = context.bot.send_message(
            chat_id=ANNOUNCE_CHANNEL,
            text=text,
            parse_mode=parse_mode,
            disable_web_page_preview=False,
        )
        msg.reply_text(
            f"✅ Posted to {ANNOUNCE_CHANNEL} (msg id {sent.message_id})"
        )
    except Exception as e:
        # Retry without HTML parsing in case the text contains stray tags
        try:
            sent = context.bot.send_message(
                chat_id=ANNOUNCE_CHANNEL,
                text=text,
            )
            msg.reply_text(
                f"✅ Posted to {ANNOUNCE_CHANNEL} as plain text (msg id {sent.message_id})"
            )
        except Exception as e2:
            msg.reply_text(
                f"❌ Failed to post to {ANNOUNCE_CHANNEL}: {e2}\n"
                f"Make sure the bot is an admin in that channel."
            )

dp.add_handler(CommandHandler("announce", announce))

# =========================================================
# TAP RACE COMMANDS
# =========================================================

dp.add_handler(
    CommandHandler(
        "taprace",
        taprace
    )
)

dp.add_handler(
    CommandHandler(
        "starttap",
        starttap
    )
)

dp.add_handler(
    CommandHandler(
        "stoptap",
        stoptap
    )
)

dp.add_handler(
    CommandHandler(
        "players",
        players
    )
)

dp.add_handler(
    CommandHandler(
        "tapstatus",
        tapstatus
    )
)

# =========================================================
# BUTTON HANDLERS
# =========================================================

dp.add_handler(
    CallbackQueryHandler(
        join_giveaway,
        pattern="join_giveaway",
        run_async=True,
    )
)

dp.add_handler(
    CallbackQueryHandler(
        join_premium,
        pattern="join_premium",
        run_async=True,
    )
)

dp.add_handler(
    CallbackQueryHandler(
        join_flash,
        pattern="join_flash",
        run_async=True,
    )
)

dp.add_handler(
    CallbackQueryHandler(
        join_taprace,
        pattern="join_taprace",
        run_async=True,
    )
)

dp.add_handler(
    CallbackQueryHandler(
        tap_button,
        pattern="tap_button",
        run_async=True,
    )
)

# =========================================================
# DOCUMENT HANDLER (admin account upload)
# =========================================================

dp.add_handler(
    MessageHandler(
        Filters.document,
        handle_document
    )
)

# =========================================================
# USER TRACKER (group -1 — fires for every message so we
# always know every uid/username in the chat)
# =========================================================

_tracker_save_counter = 0

def track_any_message(update, context):
    """Record every user who sends any message — builds the uid/username registry.
    Also delivers any pending prizes the moment the user is reachable."""
    global _tracker_save_counter
    user = update.effective_user
    if user and not user.is_bot:
        register_user(user.id, user)
        # Deliver any queued prizes now that we know the user is active
        if str(user.id) in pending_prizes:
            threading.Thread(
                target=deliver_pending_prizes,
                args=(context.bot, user.id),
                daemon=True,
            ).start()
        _tracker_save_counter += 1
        if _tracker_save_counter >= 20:
            save_data()
            _tracker_save_counter = 0

dp.add_handler(
    MessageHandler(
        Filters.all,
        track_any_message
    ),
    group=-1
)

# =========================================================
# NEW MEMBER TRACKER
# =========================================================

def track_new_members(update, context):
    """Record all new members who join the group."""
    for member in (update.message.new_chat_members or []):
        if not member.is_bot:
            register_user(member.id, member)
    save_data()

dp.add_handler(
    MessageHandler(
        Filters.status_update.new_chat_members,
        track_new_members
    )
)

# =========================================================
# ANSWER HANDLER
# =========================================================

dp.add_handler(
    MessageHandler(
        Filters.text &
        ~Filters.command,
        check_answer
    )
)

# =========================================================
# AUTO RESTORE EVENTS
# =========================================================

for key in [
    "giveaway",
    "premium"
]:

    ev = events.get(key)

    if ev:

        remaining = (
            ev["end"] - now()
        )

        if remaining > 0:

            try:

                update_event(
                    updater.bot,
                    key,
                    remaining
                )

            except:
                pass

# =========================================================
# START TIMER THREAD
# =========================================================

threading.Thread(
    target=timer_loop,
    args=(updater.bot,),
    daemon=True
).start()

# =========================================================
# ERROR HANDLER
# =========================================================

def error_handler(update, context):
    err = context.error
    if isinstance(err, (TimedOut, NetworkError)):
        print(f"[RECONNECT] Network issue: {err} — will auto-retry")
    elif isinstance(err, RetryAfter):
        print(f"[RATELIMIT] Flood control: retry after {err.retry_after}s")
    elif isinstance(err, Unauthorized):
        print("[AUTH] Bot token revoked or invalid — check TELEGRAM_BOT_TOKEN")
    elif isinstance(err, BadRequest):
        print(f"[BADREQ] {err}")
    else:
        print(f"[ERROR] {err}")

dp.add_error_handler(error_handler)

# =========================================================
# LIVE STATE WRITER (for admin dashboard)
# =========================================================

def _write_live_state():
    while True:
        try:
            state = {
                "taprace_active": taprace_active,
                "taprace_started": taprace_started,
                "taprace_match": taprace_match,
                "taprace_taps": taprace_taps,
                "boss_raid_active": boss_raid is not None,
                "boss_raid_started": boss_raid["started"] if boss_raid else False,
                "boss_raid_hp": boss_raid["boss_hp"] if boss_raid else 0,
                "boss_raid_max_hp": boss_raid["max_hp"] if boss_raid else 0,
                "marathon_active": marathon_active,
                "timestamp": time.time(),
            }
            with open("bot_live.json", "w") as _f:
                json.dump(state, _f)
        except Exception:
            pass
        time.sleep(3)

threading.Thread(target=_write_live_state, daemon=True).start()

# =========================================================
# CONTROL POLLER (admin dashboard force-stop commands)
# =========================================================

CONTROL_FILE = "bot_control.json"

def _apply_stop(kind):
    global taprace_active, taprace_started, taprace_match, taprace_taps
    global boss_raid, marathon_active, tournament_players

    if kind == "giveaway":
        events["giveaway"] = None
        save_data()
    elif kind == "premium":
        events["premium"] = None
        save_data()
    elif kind == "tournament":
        tournament_players.clear()
        save_data()
    elif kind == "boss_raid":
        boss_raid = None
    elif kind == "taprace":
        taprace_active = False
        taprace_started = False
        taprace_match = []
        taprace_taps = {}
    elif kind == "marathon":
        marathon_active = False
    elif kind == "all":
        events["giveaway"] = None
        events["premium"] = None
        tournament_players.clear()
        boss_raid = None
        taprace_active = False
        taprace_started = False
        taprace_match = []
        taprace_taps = {}
        marathon_active = False
        save_data()

def _poll_control():
    while True:
        try:
            if os.path.exists(CONTROL_FILE):
                with open(CONTROL_FILE, "r") as _f:
                    cmds = json.load(_f)
                # consume immediately
                with open(CONTROL_FILE, "w") as _f:
                    json.dump({"commands": []}, _f)
                for cmd in cmds.get("commands", []):
                    if cmd.get("action") == "stop":
                        _apply_stop(cmd.get("type", ""))
        except Exception:
            pass
        time.sleep(1)

threading.Thread(target=_poll_control, daemon=True).start()

# =========================================================
# START BOT (with auto-reconnect)
# =========================================================

_RECONNECT_DELAY = 5

while True:
    try:
        updater.start_polling(
            timeout=10,
            read_latency=2,
            drop_pending_updates=True,
        )
        print("""
______________
🔥 BOT RUNNING 🔥
______________
""")

        # ── Recover in-flight web game sessions from last run ──────────────
        now_ts = time.time()
        recovered = 0
        stale = []
        for sid, info in list(active_web_sessions.items()):
            age = now_ts - info.get("started_at", 0)
            if age >= 600:
                stale.append(sid)
            else:
                remaining = 600 - age
                print(f"[POLL] recovering {sid} ({info['label']}) — {int(remaining)}s left")
                threading.Thread(
                    target=_poll_web_session,
                    args=(updater.bot, sid, info["label"], info.get("started_at", now_ts)),
                    daemon=True,
                ).start()
                recovered += 1
        for sid in stale:
            active_web_sessions.pop(sid, None)
        if stale:
            save_data()
        if recovered:
            print(f"[POLL] recovered {recovered} session(s) from last run")
        updater.idle()
        break

    except (NetworkError, TimedOut) as e:
        print(f"[RECONNECT] Lost connection: {e} — retrying in {_RECONNECT_DELAY}s")
        time.sleep(_RECONNECT_DELAY)
        try:
            updater.stop()
        except Exception:
            pass

    except RetryAfter as e:
        print(f"[RATELIMIT] Flood control hit — waiting {e.retry_after}s")
        time.sleep(e.retry_after)

    except Unauthorized:
        print("[AUTH] Invalid token — stopping. Check TELEGRAM_BOT_TOKEN secret.")
        break

    except Exception as e:
        print(f"[ERROR] Unexpected error: {e} — retrying in {_RECONNECT_DELAY}s")
        time.sleep(_RECONNECT_DELAY)
        try:
            updater.stop()
        except Exception:
            pass