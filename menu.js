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
const { spawnSync } = require("child_process");

const SMALL_CAPS = { a: "ᴀ", b: "ʙ", c: "ᴄ", d: "ᴅ", e: "ᴇ", f: "ꜰ", g: "ɢ", h: "ʜ", i: "ɪ", j: "ᴊ", k: "ᴋ", l: "ʟ", m: "ᴍ", n: "ɴ", o: "ᴏ", p: "ᴘ", q: "ǫ", r: "ʀ", s: "ꜱ", t: "ᴛ", u: "ᴜ", v: "ᴠ", w: "ᴡ", x: "x", y: "ʏ", z: "ᴢ" };
function smallCaps(value) { return String(value ?? "").replace(/[A-Za-z]/g, (letter) => SMALL_CAPS[letter.toLowerCase()] || letter); }
const CURATED_COMMANDS = new Set(["menu","help","ping","alive","runtime","uptime","infobot","owner","pair","setpp","ban","unban","block","unblock","self","public","approuveall","play","song","tiktok","fb","ytmp4","ytmp3","apk","instagram","gitclone","mediafire","spotify","movie","yts","ytsearch","shorturl","qrcode","say","bible","tourl","vv","toimg","tomp3","sticker","s","getpp","hidetag","tagall","tagadmin","getalladmins","groupinfo","promote","demote","kick","mute","unmute","open","close","join","left","add","creategroup","resetlink","grouplink","listadmins","members","antilink","welcome","tag","glitchtext","writetext","advancedglow","typographytext","pixelglitch","neonglitch","flagtext","flag3dtext","logomaker","cartoonstyle","watercolortext","blackpinklogo","gradienttext","gfx","gfx2","gfx3","ai","gpt","bot","ask","natsu","rps","guess","coin","dice","hangman","tictactoe","joke","truth","dare","advice","funfact","dog","cat","meme","trivia","weather","translate","lyrics","auto-react","genpass","calculate","wiki","dictionary","time","recipe","book","remind","myip","iplookup","currency","sciencefact","rejecteall","approve","reject","antispam"]);


function uptime(sec) {
  sec = Math.floor(sec);
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return `${h}h ${m}m ${s}s`;
}

// ── Sections du menu WhatsApp ──────────────────────────────────
const SECTIONS = [
  { icon: "👑", name: "OWNER", items: [
    "setpp","owner","ban","unban","block","unblock","alive","pair",
    "ping","speed","runtime","self","public",
  ]},
  { icon: "📥", name: "DOWNLOAD", items: [
    "play","play2","song","vv","vv2","tiktok","tt","toimg","ytsearch","yts",
    "spotify","movie","tomp3","tomp4","tourl","url","apk","mediafire",
    "pdftotext","qrcode","shorturl","say","bible","fb","facebook",
    "ytmp4","ytmp3","video","instagram","ig","gitclone","aiimg",
  ]},
  { icon: "👥", name: "GROUP", items: [
    "hidetag","htag","tagall","demote","promote","mute","unmute","open","close",
    "join","kick","left","add","creategroup","resetlink","pair","tag",
    "listadmins","members","closetime","opentime","antilink","grouplink",
    "kickadmins","kickall","welcome","approveall","approuveall","rejectall",
  ]},
  { icon: "🖼️", name: "EPHOTO", items: [
    "glitchtext","writetext","advancedglow","typographytext","pixelglitch",
    "neonglitch","flagtext","flag3dtext","deletingtext","blackpinkstyle",
    "glowingtext","underwatertext","logomaker","cartoonstyle","papercutstyle",
    "watercolortext","effectclouds","blackpinklogo","gradienttext","summerbeach",
    "luxurygold","multicoloredneon","sandsummer","galaxywallpaper","style1917",
    "makingneon","royaltext","freecreate","galaxystyle","createlogo","lighteffects",
  ]},
  { icon: "🧩", name: "STICKER", items: [
    "sticker","cry","kill","hug","happy","dance","handhold","highfive","slap",
    "kiss","blush","bite","cuddle","furbrat","shinobu","bonk","pat","nom",
  ]},
  { icon: "🎨", name: "LOGO", items: [
    "gfx","gfx2","gfx3","gfx4","gfx5","gfx6","gfx7","gfx8","gfx9","gfx10","gfx11","gfx12",
  ]},
  { icon: "🤖", name: "AI", items: [
    "ai","gpt","gpt4","openai","xxai","chatgpt","bot","ask","natsu",
  ]},
  { icon: "🎮", name: "PLAYER", items: [
    "rps","guess","coin","dice","hangman","tictactoe",
  ]},
  { icon: "🗣️", name: "VOICE", items: [
    "bass","blown","earrape","deep","fast","nightcore","reverse","robot","slow","smooth","squirrel",
  ]},
  { icon: "🎲", name: "ADVER", items: [
    "8ball","trivia","joke","truth","dare","meme","advice","urban","moviequote",
    "funfact","dog","cat","fact","coffee",
  ]},
  { icon: "🔞", name: "+18", items: [
    "hentai","waifu","neko","trap","blowjob","paptt",
  ]},
  { icon: "ℹ️", name: "TOOL / HELP", items: [
    "idch","react-ch","auto-react","jid","dictionary","getpp","wiki","aiimg","qc","readqr",
    "genpass","myip","iplookup","currency","time","recipe","horoscope","book",
    "remind","mathfact","sciencefact","calculate","weather",
  ]},
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
  let CATS = {};
  let REG = {};
  try { CATS = require("./commands").CATEGORIES || {}; REG = require("./commands").REGISTRY || {}; } catch {}
  try { require("./commands_extra"); CATS = require("./commands").CATEGORIES || CATS; REG = require("./commands").REGISTRY || REG; } catch {}
  const BUILTIN = new Set(["menu","help","list","ping","alive","runtime","uptime","infobot","owner","weather","translate","lyrics"]);
  const ffmpegReady = () => {
    try { return spawnSync("ffmpeg", ["-version"], { stdio: "ignore", timeout: 2000 }).status === 0; }
    catch { return false; }
  };
  const REAL = (name) => {
    if (!BUILTIN.has(name) && !REG[name]) return false;
    if (name === "movie" && !config.OMDB_API_KEY) return false;
    if (/^gfx(?:[2-9]|1[0-2])?$/.test(name) && !config.NEXORACLE_API_KEY) return false;
    if (name === "tomp3" && !ffmpegReady()) return false;
    return true;
  };
  const out = SECTIONS.map((section) => ({ ...section, items: section.items.filter((command) => CURATED_COMMANDS.has(command) && REAL(command)) }));
  for (const [category, commands] of Object.entries(CATS)) {
    const sectionName = CATEGORY_TO_SECTION[category] || category;
    const section = out.find((item) => item.name === sectionName);
    if (!section) { const items = commands.filter((command) => CURATED_COMMANDS.has(command) && REAL(command)); if (items.length) out.push({ icon: "🧰", name: sectionName, items }); continue; }
    const seen = new Set(section.items);
    for (const command of commands) if (CURATED_COMMANDS.has(command) && REAL(command) && !seen.has(command)) { section.items.push(command); seen.add(command); }
  }
  const listed = new Set(out.flatMap((section) => section.items));
  const missing = [...CURATED_COMMANDS].filter((command) => REAL(command) && !listed.has(command));
  if (missing.length) out.push({ icon: "🧰", name: "TOOLS", items: missing });
  const seenGlobal = new Set();
  for (const section of out) { const unique = []; for (const command of section.items) { if (seenGlobal.has(command)) continue; seenGlobal.add(command); unique.push(command); } section.items = unique.sort((a, b) => a.localeCompare(b)); }
  return out.filter((section) => section.items.length > 0);
}

function totalCommands() {
  const set = new Set();
  for (const s of mergedSections()) for (const c of s.items) set.add(c);
  return set.size;
}

function menuBox(title, lines) {
  const heading = `╭──⧼ ス ${smallCaps(title)} ⧽──≽`;
  const body = lines.map((line) => `│┃ ⿻ ${line}`).join("\n");
  return `${heading}\n${body}\n╰───────────`;
}

function buildTelegramMenu() {
  const head = menuBox("DENTSU MINI BOT", [
    `👨‍💻 Dev : ${config.DEV}`,
    "💖 Mode : Public",
  ]);
  const body = TG_SECTIONS.map((section) =>
    menuBox(`${section.name} MENU`, section.items),
  ).join("\n\n");
  return `${head}\n\n${body}`;
}

// Limite d'un message texte WhatsApp (large, ~65 535 caractères).
// Le menu complet doit tenir dans UN SEUL message : on ne découpe plus.
const WA_TEXT_LIMIT = 65535;

// WhatsApp menu — vertical layout (1 command per line, "debout pas couché").
// Retourne UNE seule chaîne contenant TOUTES les catégories.
function buildWaMenu({ user = "User" } = {}) {
  const date = new Date().toLocaleString("en-US", { timeZone: "Africa/Brazzaville" });
  const platform = process.platform === "linux" ? "Linux" : process.platform;
  const header = menuBox(config.BOT_NAME || "DENTSU MINI BOT", [
    `👤 *${smallCaps(user)}*`,
    `⚡ *ᴍᴏᴅᴇ* : ${smallCaps("Public")}`,
    `📡 *ᴘʟᴀᴛғᴏʀᴍ* : ${smallCaps(platform)}`,
    `⚙️ *ᴘʀᴇꜰɪx* : ${smallCaps(config.PREFIX || ".")}`,
    `👨‍💻 *ᴅᴇᴠ* : ${smallCaps(config.DEV)}`,
    `⏱️ *ᴜᴘᴛɪᴍᴇ* : ${smallCaps(uptime(process.uptime()))}`,
    `📅 *ᴅᴀᴛᴇ* : ${smallCaps(date)}`,
  ]);
  const blocks = mergedSections().map((section) =>
    menuBox(`${section.name} MENU`, section.items.map((command) => smallCaps(config.PREFIX + command))),
  );
  return [header, ...blocks].join("\n\n");
}

function splitWaMenu(text, maxLength = 3500) {
  const value = String(text ?? "");
  if (!Number.isInteger(maxLength) || maxLength < 1) throw new RangeError("maxLength must be a positive integer");
  const chunks = [];
  let start = 0;
  while (start < value.length) {
    let end = Math.min(start + maxLength, value.length);
    if (end < value.length) {
      const paragraphBreak = value.lastIndexOf("\n\n", end - 2);
      const lineBreak = value.lastIndexOf("\n", end - 1);
      if (paragraphBreak > start + Math.floor(maxLength / 2)) end = paragraphBreak + 2;
      else if (lineBreak > start + Math.floor(maxLength / 2)) end = lineBreak + 1;
    }
    chunks.push(value.slice(start, end));
    start = end;
  }
  return chunks;
}

module.exports = { buildTelegramMenu, buildWaMenu, splitWaMenu, uptime, WA_TEXT_LIMIT, SECTIONS: mergedSections() };
