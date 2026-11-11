/* Central WhatsApp command dispatcher. It routes existing handlers without importing commands from the example case.js. */
async function handleCommand(natsu, m, dependencies = {}) {
  const { axios, buildWaMenu, config, ensureThumbnail, generateWAMessageFromContent, handleYouTubeAudio, isPrivateMode, KNOWN_COMMANDS, logger, participantPhone, REGISTRY, sharesParticipantIdentity, startTime, uptime, sendMenuLoadingProgress, getMenuImageBuffer } = dependencies;

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

  // Private mode blocks commands from every non-owner, including group chats.
  if (isPrivateMode() && !isOwner) return;

  // helper local
  const reply = (content) =>
    natsu.sendMessage(jid, { ...content, contextInfo: config.contextInfo }, { quoted: m });

  // These commands send spam or payloads intended to crash WhatsApp clients.
  if (["fc-close", "invisible", "crash-io", "delay-ghost", "kill-gc", "nullgc", "spam"].includes(cmd)) {
    return reply({ text: "❌ Cette commande est désactivée (spam ou plantage de WhatsApp)." });
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
      await ensureThumbnail();
      const imgPayload = getMenuImageBuffer()
        ? { image: getMenuImageBuffer() }
        : { image: { url: config.MENU_IMAGE } };
      const menuParts = buildWaMenu({ user });
        // Keep the image caption short; the full command list is sent as text parts.
        try {
          await natsu.sendMessage(
            jid,
            { ...imgPayload, caption: "📜 DENTSU MINI BOT — menu des commandes" },
            { quoted: m },
          );
        } catch (e) {
          console.error("menu image send error:", e.message);
        }
        for (let i = 0; i < menuParts.length; i++) {
          try {
            await natsu.sendMessage(jid, { text: menuParts[i] }, i === 0 ? { quoted: m } : {});
          } catch (e) {
            console.error("menu text send error:", e.message);
            break;
          }
        }
      try {
        const actionMessage = generateWAMessageFromContent(jid, {
          viewOnceMessage: {
            message: {
              messageContextInfo: { deviceListMetadata: {}, deviceListMetadataVersion: 2 },
              interactiveMessage: {
                header: { title: "DENTSU MINI BOT", hasMediaAttachment: false },
                body: { text: "À votre service, Monsieur." },
                footer: { text: "DENTSU MINI BOT" },
                nativeFlowMessage: {
                  buttons: [
                    { name: "cta_url", buttonParamsJson: JSON.stringify({ display_text: "Service website", url: config.LINKS.webPairing, merchant_url: config.LINKS.webPairing }) },
                    { name: "quick_reply", buttonParamsJson: JSON.stringify({ display_text: "Bug Menu 🩸", id: "bugmenu" }) },
                    { name: "cta_url", buttonParamsJson: JSON.stringify({ display_text: "CHAÎNE", url: config.LINKS.whatsappChannel, merchant_url: config.LINKS.whatsappChannel }) },
                  ],
                },
              },
            },
          },
        }, { userJid: natsu.user?.id, quoted: m });
        await natsu.relayMessage(jid, actionMessage.message, { messageId: actionMessage.key.id });
      } catch (e) {
        console.error("menu actions send error:", e.message);
      }
      break;
    }



    case "bugmenu": {
      await reply({ text: "🩸 Décris le bug du menu et joins une capture d’écran." });
      break;
    }

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
          image: getMenuImageBuffer() || { url: config.MENU_IMAGE },
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

module.exports = handleCommand;
