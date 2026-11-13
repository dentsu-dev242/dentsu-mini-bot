// Messages d'accueil / départ des groupes WhatsApp.
// Source unique : utilisé par lib/whatsapp.js (événement group-participants.update).

function smallCaps(value) {
  const MAP = { a: "ᴀ", b: "ʙ", c: "ᴄ", d: "ᴅ", e: "ᴇ", f: "ꜰ", g: "ɢ", h: "ʜ", i: "ɪ", j: "ᴊ", k: "ᴋ", l: "ʟ", m: "ᴍ", n: "ɴ", o: "ᴏ", p: "ᴘ", q: "ǫ", r: "ʀ", s: "ꜱ", t: "ᴛ", u: "ᴜ", v: "ᴠ", w: "ᴡ", x: "x", y: "ʏ", z: "ᴢ" };
  return String(value ?? "").replace(/[A-Za-z]/g, (letter) => MAP[letter.toLowerCase()] || letter);
}

const SITE = "dentsu-mini-bot.vercel.app";
const SIGNATURE = "ʙʏ ᴅᴇɴᴛsᴜ'sᴘʀᴏᴊᴇᴄᴛ ⃝⃘̉̉⃝⃪";

const LABELS = {
  add: { title: "Welcome to", icon: "🎉" },
  remove: { title: "Goodbye to", icon: "👋" },
};

// meta      : objet groupMetadata de Baileys (subject, participants...)
// member    : nom affiché du membre (peut être vide)
// phone     : numéro (sans @s.whatsapp.net) pour la mention
// eventTime : date formatée (Africa/Brazzaville)
// action    : "add" | "remove"
function buildGroupGreeting({ action = "add", meta, member = "", phone = "", eventTime = "" } = {}) {
  const participants = Array.isArray(meta?.participants) ? meta.participants : [];
  const admins = participants.filter((p) => p?.admin === "admin" || p?.admin === "superadmin").length;
  const total = participants.length;
  // ᴍᴇᴍʙᴇʀs = simples membres (hors admins) ; ᴛᴏᴛᴀʟ = tous les participants.
  const members = Math.max(total - admins, 0);
  const groupName = String(meta?.subject || "Groupe WhatsApp").replace(/\s+/g, " ").trim().slice(0, 100);
  const display = String(member || "").replace(/\s+/g, " ").trim().slice(0, 60);
  const label = LABELS[action] || LABELS.add;
  const who = display || (phone ? `@${phone}` : "membre");

  return [
    `┌ ❏ ⫹⫺  ${label.icon} ${label.title} ${who}`,
    "",
    "⫹⫺ ▰▰▰▰▰▰ ⫹⫺",
    `➠ ɢʀᴏᴜᴘᴇ : ${groupName}`,
    `➠ ᴀᴅᴍɪɴ : ${admins}`,
    `➠ ᴅᴀᴛᴇ : ${eventTime}`,
    `➠ ᴍᴇᴍʙᴇʀs : ${members}`,
    `➠ ᴛᴏᴛᴀʟ ᴍᴇᴍʙᴇʀ ɢᴄ : ${total}`,
    "╭──⧼▰▰▰▰◈",
    `┆❏ ᴜsᴇʀɴᴀᴍᴇ : ${phone ? `@${phone}` : "—"}${display ? ` · ${smallCaps(display)}` : ""}`,
    "╰──⧼▰▰▰▰◈",
    `вoт : ${SITE}`,
    "",
    `> ${SIGNATURE}`,
  ].join("\n");
}

module.exports = { buildGroupGreeting, smallCaps, SITE };
