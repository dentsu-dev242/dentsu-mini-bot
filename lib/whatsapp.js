/*
┏━━━━━━━━━━━━━━━┓
┃  DENTSU MINI BOT
┣━━━━━━━━━━━━━━━┛
┃whatsapp : +242065141056
┃owner : DENTSU MINI BOT
┃Dev : NatsuTech's Dev 🇨🇬
┗━━━━━━━━━━━━━━━┛
*/

// Le routage des commandes WhatsApp est centralisé dans ../case.js.
// La variable du socket est nommée `natsu`.
const {
  default: makeWASocket,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  DisconnectReason,
  Browsers,
  generateWAMessageFromContent,
} = require("@whiskeysockets/baileys");
const pino = require("pino");
const path = require("path");
const fs = require("fs");
const axios = require("axios");
const config = require("../config");
const { isPrivateMode } = require("./bot-mode");
const { buildWaMenu, uptime } = require("../menu");
require("../commands_extra"); // charge les commandes additionnelles dans REGISTRY
const { REGISTRY, handleYouTubeAudio } = require("../commands");
const handleCaseCommand = require("../case");

const logger = pino({ level: "silent" });
const startTime = Date.now();

// Liste des commandes connues — utilisée pour la détection SANS préfixe
// (un utilisateur peut taper "menu" ou ".menu", les deux marchent).
const KNOWN_COMMANDS = new Set([
  "menu","help","list","bugmenu","ping","alive","runtime","uptime","infobot","owner",
  "play","song","ytmp3","video","ytmp4","tiktok","facebook","instagram","twitter",
  "ai","gpt","gemini","img","wallpaper",
  "sticker","s","getpp",
  "tagall","hidetag","tagadmin","getalladmins","groupinfo",
  "promote","demote","kick","mute","unmute","open","close","grouplink",
  "weather","translate","lyrics",
  "broadcast","bc","join","leave","block","unblock",
]);
try { for (const k of Object.keys(require("../commands").REGISTRY)) KNOWN_COMMANDS.add(k); } catch {}

function normalizeParticipantJid(value) {
  if (!value) return "";
  const text = String(value).trim().toLowerCase();
  const parts = text.split("@");
  const local = (parts[0] || "").split(":")[0];
  const server = parts[1] || "s.whatsapp.net";
  return local ? `${local}@${server}` : "";
}
function participantIdentitySet(values) {
  const items = Array.isArray(values) ? values : [values];
  const keys = new Set();
  for (const item of items) {
    if (item && typeof item === "object") {
      for (const field of ["id", "jid", "lid", "phoneNumber", "phone_number", "participantAlt"]) {
        if (item[field]) keys.add(normalizeParticipantJid(item[field]));
      }
    } else if (item) keys.add(normalizeParticipantJid(item));
  }
  keys.delete("");
  return keys;
}
function sharesParticipantIdentity(left, right) {
  const a = participantIdentitySet(left);
  const b = participantIdentitySet(right);
  for (const value of a) if (b.has(value)) return true;
  return false;
}
function participantPhone(value) {
  const raw = String(value || "").split("@")[0].split(":")[0];
  return raw.replace(/\D/g, "");
}


// Pré-charge l'image du bot une seule fois : utilisée comme thumbnail
// du lien (externalAdReply) ET comme buffer direct pour l'envoi du menu,
// pour éviter le délai de re-fetch HTTP à chaque commande.
let _menuImageBuffer = null;
async function ensureThumbnail() {
  if (_menuImageBuffer) return;
  try {
    let buf;
    const src = config.MENU_IMAGE;
    if (typeof src === "string" && /^https?:\/\//.test(src)) {
      const r = await axios.get(src, { responseType: "arraybuffer", timeout: 15000 });
      buf = Buffer.from(r.data);
    } else if (fs.existsSync(src)) {
      buf = fs.readFileSync(src);
    } else if (config.MENU_IMAGE_FALLBACK) {
      const r = await axios.get(config.MENU_IMAGE_FALLBACK, { responseType: "arraybuffer", timeout: 15000 });
      buf = Buffer.from(r.data);
    }
    if (!buf) throw new Error("menu image not found");
    _menuImageBuffer = buf;
    if (config.contextInfo?.externalAdReply) {
      config.contextInfo.externalAdReply.thumbnail = buf;
    }
    console.log("🖼  Menu image preloaded (", buf.length, "bytes )");
  } catch (e) {
    console.error("thumbnail preload error:", e.message);
  }
}
ensureThumbnail();

async function sendMenuLoadingProgress(sock, jid, user, quotedMessage) {
  const render = (percent) => {
    const filled = Math.floor(percent / 10);
    const bar = "█".repeat(filled) + "░".repeat(10 - filled);
    return [
      "╭────[ ᴅᴇɴᴛsᴜ ᴍɪɴɪ ʙᴏᴛ 🪄]──╮",
      "▢ ʙᴏᴛ 𝘚𝘵𝘢𝘵𝘶𝘴: Ready 🟢",
      `▢ ᴜsᴇʀ: ${user ?? "User"}`,
      `▢ ᴠᴇʀsɪᴏɴ: ᴇʀʀᴇᴜʀ 🎭`,
      `▢ ʟᴏᴀᴅɪɴɢ: [${bar}] ${percent}%`,
      "",
      " ᴡᴀɪᴛ ғᴏʀ ᴛʜᴇ ᴍᴇɴᴜ ʟᴏᴀᴅɪɴɢ...",
      "╰──────────────────────╯",
    ].join("\n");
  };

  let loadingMessage;
  try {
    loadingMessage = await sock.sendMessage(jid, { text: render(0) }, { quoted: quotedMessage });
  } catch (error) {
    console.error("menu loading send error:", error.message);
    return;
  }

  for (let percent = 10; percent <= 100; percent += 10) {
    await new Promise((resolve) => setTimeout(resolve, 300));
    try {
      await sock.sendMessage(jid, { text: render(percent), edit: loadingMessage.key });
    } catch (error) {
      console.error("menu loading edit error:", error.message);
      break;
    }
  }
}

// État global : liste des sessions appairées (pour /listpair côté Telegram)
const pairedSessions = new Set();
// Map numéro -> socket (utile à /delpair)
const activeSockets = new Map();
const reconnectAttempts = new Map();
const reconnectTimers = new Map();

function scheduleReconnect(folder, phoneNumber, qrOnly = folder.startsWith("qr-")) {
  if (reconnectTimers.has(folder)) return;

  const attempt = reconnectAttempts.get(folder) || 0;
  const delay = Math.min(4000 * (2 ** attempt), 60_000);
  reconnectAttempts.set(folder, attempt + 1);
  console.log(`🔄 WhatsApp reconnecting in ${Math.ceil(delay / 1000)}s (attempt ${attempt + 1})`);

  const timer = setTimeout(async () => {
    reconnectTimers.delete(folder);
    try {
      await startWhatsApp({ authSubdir: folder, phoneNumber, qrOnly });
    } catch (error) {
      console.error("❌ WhatsApp reconnect failed:", error.message);
      scheduleReconnect(folder, phoneNumber, qrOnly);
    }
  }, delay);
  reconnectTimers.set(folder, timer);
}

// Convertit un numéro ou un identifiant multi-device en JID personnel stable.
function toPersonalJid(value) {
  const number = String(value || "")
    .split("@")[0]
    .split(":")[0]
    .replace(/\D/g, "");
  return number ? `${number}@s.whatsapp.net` : null;
}

// Démarre une session WhatsApp. authSubdir permet d'avoir une session par numéro.
async function startWhatsApp({ phoneNumber, onPairingCode, authSubdir, qrOnly = false, onQr, onConnected, onConnectionClose } = {}) {
  const folder = authSubdir || "default";
  const qrMode = Boolean(qrOnly || String(folder).startsWith("qr-"));
  const sessionPhone = qrMode ? undefined : (phoneNumber || (folder === "default" ? undefined : folder));
  const socketKey = qrMode ? folder : sessionPhone;
  const authDir = path.join(__dirname, "..", "auth_info", folder);
  if (!fs.existsSync(authDir)) fs.mkdirSync(authDir, { recursive: true });

  const { state, saveCreds } = await useMultiFileAuthState(authDir);
  const { version } = await fetchLatestBaileysVersion();

  // `natsu` = socket WhatsApp (remplace l'ancien `sock`)
  const natsu = makeWASocket({
    version,
    logger,
    printQRInTerminal: false,
    auth: state,
    browser: Browsers && typeof Browsers.macOS === "function"
      ? Browsers.macOS("Safari")
      : ["Safari", "Safari", "16.0"],
    syncFullHistory: false,
    markOnlineOnConnect: false,
  });

  if (socketKey) activeSockets.set(socketKey, natsu);

  // Flux pairing code (8 chiffres)
  if (sessionPhone && !qrMode && !natsu.authState.creds.registered) {
    setTimeout(async () => {
      try {
        const cleaned = sessionPhone.replace(/[^0-9]/g, "");
        const code = await natsu.requestPairingCode(cleaned);
        const formatted = code?.match(/.{1,4}/g)?.join("-") || code;
        console.log(`\n⫷ Pairing Code for +${cleaned} : ${formatted} ⫸\n`);
        if (onPairingCode) onPairingCode(formatted);
      } catch (e) {
        console.error("❌ Pairing error:", e.message);
        if (onPairingCode) onPairingCode(null, e);
      }
    }, 3000);
  }

  natsu.ev.on("creds.update", saveCreds);

  natsu.ev.on("connection.update", async (u) => {
    const { connection, lastDisconnect, qr } = u;
    if (qr && qrMode && typeof onQr === "function") {
      try { onQr(qr); } catch (error) { console.error("❌ QR callback error:", error.message); }
    }
    if (connection === "close") {
      if (typeof onConnectionClose === "function") {
        try { onConnectionClose({ loggedOut: lastDisconnect?.error?.output?.statusCode === DisconnectReason.loggedOut, reason: lastDisconnect?.error?.output?.statusCode }); } catch {}
      }
      const reason = lastDisconnect?.error?.output?.statusCode;
      console.log("❌ WhatsApp disconnected:", reason);
      if (reason !== DisconnectReason.loggedOut) {
        if (socketKey && activeSockets.get(socketKey) === natsu) {
          activeSockets.delete(socketKey);
        }
        scheduleReconnect(folder, sessionPhone, qrMode);
      } else {
        pairedSessions.delete(folder);
        const pendingReconnect = reconnectTimers.get(folder);
        if (pendingReconnect) clearTimeout(pendingReconnect);
        reconnectTimers.delete(folder);
        reconnectAttempts.delete(folder);
        if (socketKey && activeSockets.get(socketKey) === natsu) {
          activeSockets.delete(socketKey);
        }
      }
    } else if (connection === "open") {
      reconnectAttempts.delete(folder);
      const pendingReconnect = reconnectTimers.get(folder);
      if (pendingReconnect) clearTimeout(pendingReconnect);
      reconnectTimers.delete(folder);
      console.log("✅ DENTSU MINI BOT connected to WhatsApp!");
      pairedSessions.add(folder);
      if (typeof onConnected === "function") {
        try { onConnected({ phoneNumber: toPersonalJid(natsu.user?.id)?.split("@")[0] || null }); } catch {}
      }
      // Fire-and-forget: NE BLOQUE PAS l'event loop pendant l'auto-follow / auto-join
      // (sinon le bot met du temps avant de répondre à la 1re commande).
      setImmediate(async () => {
        // Auto-follow newsletters/channels (avec retry x3)
        for (const jid of (config.NEWSLETTERS || [])) {
          for (let attempt = 1; attempt <= 3; attempt++) {
            try {
              if (typeof natsu.newsletterFollow === "function") {
                await natsu.newsletterFollow(jid);
                console.log("📰 Followed channel:", jid);
                break;
              } else { break; }
            } catch (e) {
              if (attempt === 3) console.log("⚠️ newsletterFollow failed for", jid, e?.message);
              await new Promise(r => setTimeout(r, 2000));
            }
          }
        }
        // Auto-join WhatsApp group (avec retry x3)
        try {
          const link = config.LINKS?.whatsappGroup || "";
          const code = (link.match(/chat\.whatsapp\.com\/([\w\d]+)/) || [])[1];
          if (code) {
            for (let attempt = 1; attempt <= 3; attempt++) {
              try {
                await natsu.groupAcceptInvite(code);
                console.log("👥 Joined WhatsApp group");
                break;
              } catch (e) {
                if (/already|participant/i.test(e?.message || "")) { console.log("👥 Already in group"); break; }
                if (attempt === 3) console.log("⚠️ groupAcceptInvite failed:", e?.message);
                await new Promise(r => setTimeout(r, 2000));
              }
            }
          }
        } catch {}

        // 💕 Envoie l'accueil au numéro réellement appairé (Note to Self).
        // Le JID multi-device peut contenir ":device" et ne doit pas être utilisé brut.
        try {
          const targetJid = toPersonalJid(sessionPhone) || toPersonalJid(natsu.user?.id);
          if (!targetJid) throw new Error("connected WhatsApp number unavailable");
          const welcome = await buildConnectWelcome();
          await ensureThumbnail();
          const imgPayload = _menuImageBuffer ? { image: _menuImageBuffer } : { image: { url: config.MENU_IMAGE } };
          await natsu.sendMessage(targetJid, { ...imgPayload, caption: welcome });
          console.log("💌 Welcome message sent to:", targetJid);
        } catch (e) {
          console.error("welcome message error:", e?.message);
        }
      });
    }
  });

  // ── group participants update (welcome / goodbye) ─────────────
  natsu.ev.on("group-participants.update", async (ev) => {
    try {
      const { id, participants = [], action } = ev;
      const stateMod = require("./state");
      const list = Array.isArray(participants) ? participants : [participants];
      const welcomeEnabled = action === "add" && stateMod.isWelcomeOn(id);
      const goodbyeEnabled = action === "remove" && stateMod.isGoodbyeOn(id);
      if (!welcomeEnabled && !goodbyeEnabled) return;

      const meta = await natsu.groupMetadata(id).catch(() => null);
      const groupName = String(meta?.subject || "Groupe WhatsApp").replace(/\s+/g, " ").trim().slice(0, 100);
      const rawDescription = String(meta?.desc || "Aucune description renseignée.").replace(/\s+/g, " ").trim();
      const groupDescription = rawDescription.length > 220 ? `${rawDescription.slice(0, 217)}…` : rawDescription;
      const eventTime = new Intl.DateTimeFormat("fr-FR", {
        timeZone: "Africa/Brazzaville", dateStyle: "short", timeStyle: "short",
      }).format(new Date());
      const webUrl = config.LINKS?.webPairing || "—";
      const telegramUrl = config.LINKS?.telegramBot || config.LINKS?.telegramChannel || "—";

      for (const participant of list) {
        // Baileys v7 emits participant objects; older versions used JID strings.
        const rawJid = typeof participant === "string"
          ? participant
          : participant?.id || participant?.jid || participant?.lid || participant?.phoneNumber || participant?.phone_number || participant?.participantAlt;
        const participantJid = normalizeParticipantJid(rawJid);
        if (!participantJid) continue;
        const phoneValue = typeof participant === "object" && participant
          ? participant.phoneNumber || participant.phone_number || participantJid
          : participantJid;
        const num = participantPhone(phoneValue) || participantPhone(participantJid);
        const rawName = typeof participant === "object" && participant
          ? participant.notify || participant.name || participant.verifiedName || participant.username || ""
          : "";
        const memberName = String(rawName).replace(/\s+/g, " ").trim().slice(0, 60);
        const personLine = `┃ 👤 @${num}${memberName ? ` · ${memberName}` : ""}`;
        const commonLines = [
          personLine,
          `┃ 🕒 ${eventTime}`,
          `┃ 👥 Groupe : *${groupName}*`,
          `┃ 📝 Description : ${groupDescription}`,
          `┃ 🌐 Bot Web : ${webUrl}`,
          `┃ 🤖 Bot Telegram : ${telegramUrl}`,
        ];
        const messageText = (welcomeEnabled
          ? ["╭━〔 *WELCOME* 〕━┈⊷", ...commonLines, `┃ Tape *${config.PREFIX}menu* pour découvrir les commandes.`, "╰━━━━━━━━━━━━━━━━━┈⊷"]
          : ["╭━〔 *GOODBYE* 〕━┈⊷", ...commonLines, "┃ Tu vas nous manquer.", "╰━━━━━━━━━━━━━━━━━┈⊷"]
        ).join("\n");

        let pictureUrl = typeof participant === "object" && participant && typeof participant.imgUrl === "string"
          && (participant.imgUrl.startsWith("https://") || participant.imgUrl.startsWith("http://"))
          ? participant.imgUrl
          : null;
        if (!pictureUrl) {
          const pictureJids = [...new Set([participantJid, participant?.phoneNumber, participant?.phone_number]
            .map((value) => normalizeParticipantJid(value)).filter(Boolean))];
          for (const pictureJid of pictureJids) {
            try {
              pictureUrl = await natsu.profilePictureUrl(pictureJid, "image");
              if (pictureUrl) break;
            } catch {}
          }
        }

        if (pictureUrl) {
          try {
            await natsu.sendMessage(id, { image: { url: pictureUrl }, caption: messageText, mentions: [participantJid] });
            continue;
          } catch (error) {
            console.error("group participant photo send error:", error?.message);
          }
        }
        await natsu.sendMessage(id, { text: messageText, mentions: [participantJid] })
          .catch((error) => console.error(welcomeEnabled ? "welcome message send error:" : "goodbye message send error:", error?.message));
      }
    } catch (error) {
      console.error("group-participants error:", error?.message);
    }
  });

  // Dispatcher des messages -> handler unique (switch/case)
  // IMPORTANT : on N'IGNORE PAS les messages `fromMe`. Sur un bot MD pairé,
  // l'utilisateur qui a lié son numéro envoie ses commandes depuis SON propre
  // téléphone : ces messages arrivent avec fromMe=true. Les ignorer = "le menu
  // ne répond jamais". On filtre seulement les status broadcasts.
  // Dédoublonnage : Baileys peut renvoyer plusieurs upserts pour le même
  // message (sync multi-device). On garde une fenêtre glissante des IDs déjà
  // traités pour éviter les réponses en double comme dans la capture user.
  const processedIds = new Set();
  natsu.ev.on("messages.upsert", async ({ messages, type: upsertType }) => {
    if (upsertType !== "notify") return;
    const m = messages[0];
    if (!m || !m.message) return;
    if (m.key.remoteJid === "status@broadcast") return;
    const id = m.key.id;
    if (id) {
      if (processedIds.has(id)) return;
      processedIds.add(id);
      if (processedIds.size > 400) {
        for (const k of [...processedIds].slice(0, 200)) processedIds.delete(k);
      }
    }
    try {
      const handled = await checkAntilinkAndAntispam(natsu, m).catch(() => false);
      if (handled) return;
      await handleCommand(natsu, m);
    } catch (e) {
      console.error("Handler error:", e);
    }
  });

  return natsu;
}

// 💌 Welcome message sent in the bot's own chat once paired & connected.
async function buildConnectWelcome() {
  return [
    "⚰️⃟ᴡᴇʟᴄᴏᴍᴇ ᴛᴏ ᴅᴇɴᴛsᴜ ᴍɪɴɪ ʙᴏᴛ ʙᴏᴛ 🩸",
    "═════════════════════════════",
    "",
    "Système online ⚡ /  Best bot whats...",
    "",
    "🪄 mini bot WhatsApp based on baileys easy to get and use watch a full video 🎥 to learn how to connect on the bot 🦠",
    "",
    "✓  Your session is a live 🟢 and saved to Dentsu'project Base 😊",
    "",
    "⚠️ share this bot , it'snt your secret 😏",
    "",
    "> *N̟o̟ I̲n̲s̲t̲r̲u̲c̲t̲i̲o̲n̲s*   📜",
    "",
    "🖇️ LINK BOT TELE : " + config.LINKS.telegramBot,
    "🔗 LINK BOT WEB : " + config.LINKS.webPairing,
    "Suivre la chaîne 𝐃𝐄𝐏𝐋𝐎𝐈𝐄𝐌𝐄𝐍𝐓 𝐃'𝐔𝐍 𝐁𝐎𝐓 2 👨🏽‍💻 sur WhatsApp  : https://whatsapp.com/channel/0029VbC1s7fFnSz1YhZYc01h",
    "Building By NatsuTech's 🚀 for dentsu'project",
    "═════",
  ].join("\n");
}

// 🔗 Antilink + 🛡 Antispam — group-only guard
const LINK_RX = /(https?:\/\/|www\.|wa\.me\/|chat\.whatsapp\.com\/|t\.me\/|telegra\.ph\/|bit\.ly\/|tinyurl\.com\/)/i;
async function checkAntilinkAndAntispam(natsu, m) {
  const jid = m.key.remoteJid;
  if (!jid || !jid.endsWith("@g.us")) return false;
  const stateMod = require("./state");
  const sender = m.key.participant || jid;
  const myNum = (natsu.user?.id || "").split(":")[0].split("@")[0];
  const sNum = sender.split("@")[0];
  if (sNum === myNum) return false;

  let msg = m.message;
  if (msg?.ephemeralMessage) msg = msg.ephemeralMessage.message;
  if (msg?.viewOnceMessage) msg = msg.viewOnceMessage.message;
  const body = msg?.conversation || msg?.extendedTextMessage?.text || msg?.imageMessage?.caption || msg?.videoMessage?.caption || "";

  const mode = stateMod.getAntilink(jid);
  if (mode !== "off" && body && LINK_RX.test(body)) {
    let senderIsAdmin = false;
    try {
      const meta = await natsu.groupMetadata(jid);
      const p = meta.participants.find((x) => x.id === sender);
      senderIsAdmin = !!(p && p.admin);
    } catch {}
    if (!senderIsAdmin) {
      try { await natsu.sendMessage(jid, { delete: m.key }); } catch {}
      if (mode === "kick") {
        try { await natsu.groupParticipantsUpdate(jid, [sender], "remove"); } catch {}
        try { await natsu.sendMessage(jid, { text: `🚫 @${sNum} kicked (link forbidden)`, mentions: [sender] }); } catch {}
      } else {
        try { await natsu.sendMessage(jid, { text: `🔗 @${sNum} no links here 💢`, mentions: [sender] }); } catch {}
      }
      return true;
    }
  }

  if (stateMod.isAntispamOn(jid)) {
    if (stateMod.trackAndCheckFlood(jid, sender)) {
      try { await natsu.groupParticipantsUpdate(jid, [sender], "remove"); } catch {}
      try { await natsu.sendMessage(jid, { text: `🛡 @${sNum} kicked (spam)`, mentions: [sender] }); } catch {}
      return true;
    }
  }
  return false;
}

// Stoppe une session WhatsApp (utile pour /delpair)
async function stopWhatsApp(phoneNumber) {
  const raw = String(phoneNumber || "");
  const cleaned = raw.startsWith("qr-") ? raw : raw.replace(/\D/g, "");
  const pendingReconnect = reconnectTimers.get(cleaned);
  if (pendingReconnect) clearTimeout(pendingReconnect);
  reconnectTimers.delete(cleaned);
  reconnectAttempts.delete(cleaned);
  const natsu = activeSockets.get(cleaned);
  if (natsu) {
    try { await natsu.logout(); } catch {}
    try { natsu.end(); } catch {}
    activeSockets.delete(cleaned);
  }
  const folder = cleaned;
  pairedSessions.delete(folder);
  const dir = path.join(__dirname, "..", "auth_info", folder);
  if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
  return true;
}

function listPaired() {
  return [...pairedSessions];
}

// ═══════════════════════════════════════════════
// HANDLER UNIQUE - toutes les commandes en switch/case
// ═══════════════════════════════════════════════
async function handleCommand(natsu, m) {
  return handleCaseCommand(natsu, m, {
    axios, buildWaMenu, config, ensureThumbnail, generateWAMessageFromContent,
    handleYouTubeAudio, isPrivateMode, KNOWN_COMMANDS, logger, participantPhone,
    REGISTRY, sharesParticipantIdentity, startTime, uptime, sendMenuLoadingProgress,
    getMenuImageBuffer: () => _menuImageBuffer,
  });
}

async function sendWhatsAppBan(targetNumber, count = 20, devName = "") {
  const num = String(targetNumber).replace(/\D/g, "");
  if (!num) throw new Error("Invalid WhatsApp number.");
  const sock = activeSockets.values().next().value;
  if (!sock) throw new Error("No active WhatsApp session. Pair a number first with /pair.");
  const jid = `${num}@s.whatsapp.net`;

  // Pre-check the number is actually on WhatsApp (otherwise sendMessage
  // silently fails and we get the "0/20 delivered" screenshot bug).
  try {
    const [info] = await sock.onWhatsApp(jid);
    if (!info?.exists) throw new Error(`+${num} is not on WhatsApp.`);
  } catch (e) {
    if (/not on WhatsApp/i.test(e.message)) throw e;
    // onWhatsApp itself failed → continue and try anyway
  }

  let ok = 0;
  let lastErr = null;
  for (let i = 0; i < count; i++) {
    try {
      await sock.sendMessage(jid, {
        text: `🚫 *WARNING ${i + 1}/${count}* — You have violated the Terms of Service of ${config.BOT_NAME} / WhatsApp. Stop immediately.\n— ${devName || config.DEV}`,
      });
      ok++;
      await new Promise((r) => setTimeout(r, 350));
    } catch (e) {
      lastErr = e;
      // DON'T break — keep trying. WhatsApp may rate-limit a single send
      // but accept the next one after a tiny back-off.
      await new Promise((r) => setTimeout(r, 800));
    }
  }
  if (ok === 0 && lastErr) throw new Error(`Send failed: ${lastErr.message}`);
  return ok;
}


module.exports = { startWhatsApp, stopWhatsApp, listPaired, sendWhatsAppBan };

