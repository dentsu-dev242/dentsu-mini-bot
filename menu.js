/*
┏━━━━━━━━━━━━━━━┓
┃  DENTSU MINI BOT
┣━━━━━━━━━━━━━━━┛
┃whatsapp : +242065141056
┃owner : DENTSU MINI BOT
┃Dev : NatsuTech's Dev 🇨🇬
┗━━━━━━━━━━━━━━━┛
*/

const config = require("./config");
const { isPrivateMode } = require("./lib/bot-mode");
const { spawnSync } = require("child_process");

const SMALL_CAPS = { a: "ᴀ", b: "ʙ", c: "ᴄ", d: "ᴅ", e: "ᴇ", f: "ꜰ", g: "ɢ", h: "ʜ", i: "ɪ", j: "ᴊ", k: "ᴋ", l: "ʟ", m: "ᴍ", n: "ɴ", o: "ᴏ", p: "ᴘ", q: "ǫ", r: "ʀ", s: "ꜱ", t: "ᴛ", u: "ᴜ", v: "ᴠ", w: "ᴡ", x: "x", y: "ʏ", z: "ᴢ" };
function smallCaps(value) { return String(value ?? "").replace(/[A-Za-z]/g, (letter) => SMALL_CAPS[letter.toLowerCase()] || letter); }


function uptime(sec) {
  sec = Math.floor(sec);
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return `${h}h ${m}m ${s}s`;
}

// ── Sections du menu WhatsApp ──────────────────────────────────
const SECTION_ORDER = [
    { icon: "👑", name: "OWNER" },
    { icon: "📥", name: "DOWNLOAD" },
    { icon: "👥", name: "GROUP" },
    { icon: "🖼️", name: "EPHOTO" },
    { icon: "🧩", name: "STICKER" },
    { icon: "🎨", name: "LOGO" },
    { icon: "🤖", name: "AI" },
    { icon: "🎮", name: "PLAYER" },
    { icon: "🗣️", name: "VOICE" },
    { icon: "🎲", name: "ADVER" },
    { icon: "🔞", name: "+18" },
    { icon: "💌", name: "LOVE" },
    { icon: "ℹ️", name: "TOOL / HELP" },
    ];

// ── Sections du menu TELEGRAM (ordonnées proprement) ───────────
const TG_SECTIONS = [
  { icon: "🔗", name: "ᴡʜᴀᴛsᴀᴘᴘ ᴄᴏɴɴᴇᴄᴛɪᴏɴ", items: [
    "/pair 242xxxxxx",
    "/delpair 242xxxxxx",
    "/howtouse",
    "/checkdevice",
  ]},
  { icon: "ℹ️", name: "INFO", items: [
    "/ping",
    "/runtime",
    "/getmyid",
    "/owner",
  ]},
  { icon: "👑", name: "ADMIN", items: [
    "/ban 242xxxx [n]",
    "/broadcast <msg> (users who /start)",
    "/stop — unsubscribe from broadcasts",
    "/listpair",
  ]},

];

// ── Fusionne les commandes autorisées et réellement disponibles ─
// Seules les commandes enregistrées et capables de fonctionner dans
// l'environnement courant sont affichées.
const CATEGORY_TO_SECTION = {
  OWNER: "OWNER", DOWNLOAD: "DOWNLOAD", GROUP: "GROUP",
  EPHOTO: "EPHOTO", STICKER: "STICKER", LOGO: "LOGO",
  AI: "AI", PLAYER: "PLAYER", VOIX: "VOICE", VOICE: "VOICE",
  ADVER: "ADVER", "+18": "+18", TOOL: "TOOL / HELP",
  LOVE: "LOVE",
};
function mergedSections() {
    let REG = {};
    try {
      const main = require("./commands");
      require("./commands_extra");
      REG = main.REGISTRY || {};
    } catch {}

    const BUILTIN = new Set(["menu", "help", "list", "ping", "alive", "runtime", "uptime", "infobot", "owner", "weather", "translate", "lyrics"]);
    const DISABLED = new Set(["fc-close", "invisible", "crash-io", "delay-ghost", "kill-gc", "nullgc", "spam"]);
    const ffmpegReady = () => {
      try { return spawnSync("ffmpeg", ["-version"], { stdio: "ignore", timeout: 2000 }).status === 0; }
      catch { return false; }
    };
    const canShow = (name) => {
      if (DISABLED.has(name)) return false;
      if (!BUILTIN.has(name) && typeof REG[name]?.handler !== "function") return false;
      if (name === "movie" && !config.OMDB_API_KEY) return false;
      if (/^gfx(?:[2-9]|1[0-2])?$/.test(name) && !config.NEXORACLE_API_KEY) return false;
      if (name === "tomp3" && !ffmpegReady()) return false;
      return true;
    };

    const sections = SECTION_ORDER.map((section) => ({ ...section, items: [] }));
    const sectionByName = new Map(sections.map((section) => [section.name, section]));
    const iconByName = new Map(SECTION_ORDER.map((section) => [section.name, section.icon]));
    const getSection = (name) => {
      if (!sectionByName.has(name)) {
        const section = { icon: iconByName.get(name) || "🧰", name, items: [] };
        sections.push(section);
        sectionByName.set(name, section);
      }
      return sectionByName.get(name);
    };

    for (const [command, definition] of Object.entries(REG)) {
      if (!canShow(command)) continue;
      const category = definition.category || "OTHER";
      const sectionName = CATEGORY_TO_SECTION[category] || String(category).toUpperCase();
      getSection(sectionName).items.push(command);
    }
    const tools = getSection("TOOL / HELP");
    for (const command of BUILTIN) if (canShow(command)) tools.items.push(command);

    const preferred = new Map(SECTION_ORDER.map((section, index) => [section.name, index]));
    return sections
      .map((section) => ({ ...section, items: [...new Set(section.items)].sort((a, b) => a.localeCompare(b)) }))
      .filter((section) => section.items.length > 0)
      .sort((a, b) => (preferred.get(a.name) ?? Number.MAX_SAFE_INTEGER) - (preferred.get(b.name) ?? Number.MAX_SAFE_INTEGER) || a.name.localeCompare(b.name));
    }
    
function totalCommands() {
  const set = new Set();
  for (const s of mergedSections()) for (const c of s.items) set.add(c);
  return set.size;
}

function buildTelegramMenu() {
  const head =
`╔══✦  ᴅᴇɴᴛsᴜ ᴍɪɴɪ ʙᴏᴛ  ✦══╗
║ 👨‍💻 Dev  : N̷a̷t̷s̷u̷ T̷e̷c̷h̷
║ 💖 Mode  : ${isPrivateMode() ? "Private" : "Public"}
╚══════════════════════╝`;

  const body = TG_SECTIONS.map((s) => {
    const lines = s.items.map((c) => `│ ✦ ${c}`).join("\n");
    return `╭─❒ 「 ${s.icon} ${s.name} 」 ❒─╮\n${lines}\n╰──────────────────╯`;
  }).join("\n\n");

  return `${head}\n\n${body}\n\n.`;
}

// WhatsApp menu — vertical layout (1 command per line, "debout pas couché"),
// chunked to respect WhatsApp's ~4096 char message limit.
function buildWaMenu({ user = "User" } = {}) {
    const date = new Date().toLocaleString("en-US", { timeZone: "Africa/Brazzaville" });
    const platform = process.platform === "linux" ? "Linux" : process.platform;
    const sections = mergedSections();
    const total = sections.reduce((count, section) => count + section.items.length, 0);
    const header = [
      "╭━━━〔 🤖 ᴅᴇɴᴛsᴜ ᴍɪɴɪ ʙᴏᴛ 〕━━━╮",
      "┃ 👤 *" + smallCaps(user) + "*",
      "┃ ⚡ *ᴍᴏᴅᴇ* : " + smallCaps(isPrivateMode() ? "Private" : "Public"),
      "┃ 📡 *ᴘʟᴀᴛғᴏʀᴍ* : " + smallCaps(platform),
      "┃ ⚙️ *ᴘʀᴇꜰɪx* : " + smallCaps(config.PREFIX || "."),
      "┃ 📚 *ᴛᴏᴛᴀʟ ᴄᴍᴅs* : " + total,
      "┃ 👨‍💻 *ᴅᴇᴠ* : " + smallCaps(config.DEV),
      "┃ ⏱️ *ᴜᴘᴛɪᴍᴇ* : " + smallCaps(uptime(process.uptime())),
      "┃ 📅 *ᴅᴀᴛᴇ* : " + smallCaps(date),
      "╰━━━━━━━━━━━━━━━━━━━━━━╯",
    ].join("\n");

    const lines = [header];
    for (const section of sections) {
      lines.push("");
      lines.push("╭─〔 " + section.icon + " *" + smallCaps(section.name) + "* 〕─╮");
      for (const command of section.items) lines.push("┃ ✦ " + smallCaps((config.PREFIX || ".") + command));
      lines.push("╰──────────────────╯");
    }
    lines.push("", "╰─ " + smallCaps("DENTSU MINI BOT") + " • " + smallCaps("by") + " " + smallCaps(config.DEV) + " ─╯");

    const limit = 3500;
    const continuationHeader = "╭━━━〔 🤖 ᴅᴇɴᴛsᴜ ᴍɪɴɪ ʙᴏᴛ 〕━━━╮\n┃ *ᴄᴏᴍᴍᴀɴᴅs — sᴜɪᴛᴇ*\n╰━━━━━━━━━━━━━━━━━━━━━━╯";
    const chunks = [];
    let current = "";
    for (const line of lines) {
      const separator = current ? "\n" : "";
      if (current.length + separator.length + line.length > limit) {
        if (current) chunks.push(current);
        current = continuationHeader;
      }
      current += (current ? "\n" : "") + line;
    }
    if (current) chunks.push(current);
    return chunks;
    }
    
module.exports = { buildTelegramMenu, buildWaMenu, uptime, SECTIONS: mergedSections() };
