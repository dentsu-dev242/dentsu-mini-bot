// Vérifie que le menu WhatsApp part en UN SEUL message.
// Usage: node test-menu-single.js
process.env.SESSION_DIR = process.env.SESSION_DIR || "/tmp/menu-test-sessions";

const { buildWaMenu, WA_TEXT_LIMIT, SECTIONS } = require("./menu");
const { sendWaMenuMessage } = require("./lib/whatsapp");

(async () => {
  const calls = [];
  const fakeSock = {
    sendMessage: async (...args) => { calls.push(args); return { key: { id: "fake" } }; },
  };
  const jid = "123456@s.whatsapp.net";
  const quoted = { key: { id: "orig" }, pushName: "Test" };

  const len = await sendWaMenuMessage(fakeSock, jid, { user: "Test", quoted });

  const text = buildWaMenu({ user: "Test" });
  // Le menu est rendu en "petites capitales" (smallcaps) : on applique la même
  // transformation aux commandes attendues avant de chercher dans le texte.
  const SC = { a:"ᴀ",b:"ʙ",c:"ᴄ",d:"ᴅ",e:"ᴇ",f:"ꜰ",g:"ɢ",h:"ʜ",i:"ɪ",j:"ᴊ",k:"ᴋ",l:"ʟ",m:"ᴍ",n:"ɴ",o:"ᴏ",p:"ᴘ",q:"ǫ",r:"ʀ",s:"ꜱ",t:"ᴛ",u:"ᴜ",v:"ᴠ",w:"ᴡ",x:"x",y:"ʏ",z:"ᴢ" };
  const sc = (v) => String(v).replace(/[A-Za-z]/g, (c) => SC[c.toLowerCase()] || c);
  // Nouveau style WhatsApp : commandes en petites capitales, sans préfixe.
  // La section BUG est masquée (les commandes crash répondent le message premium).
  const HIDDEN = new Set(["bugmenu", "bug", "bugreport", "report", "menuhelp", "howtomenu"]);
  const visible = SECTIONS.filter((s) => s.name !== "BUG");
  const expected = visible.flatMap((s) => s.items).filter((c) => !HIDDEN.has(c));

  let ok = true;
  const check = (name, cond, extra = "") => {
    console.log(`${cond ? "✅" : "❌"} ${name}${extra ? " — " + extra : ""}`);
    if (!cond) ok = false;
  };

  check("1 seul appel sendMessage", calls.length === 1, `appels=${calls.length}`);
  check("type = texte (pas de légende d'image)", !!(calls[0] && calls[0][1] && calls[0][1].text) && !calls[0][1].caption);
  check("quoted transmis", calls[0] && calls[0][2] && calls[0][2].quoted === quoted);
  const ad = calls[0] && calls[0][1] && calls[0][1].contextInfo && calls[0][1].contextInfo.externalAdReply;
  check("photo du bot jointe (externalAdReply.thumbnail)", !!(ad && Buffer.isBuffer(ad.thumbnail) && ad.thumbnail.length > 1000), ad ? `${ad.thumbnail?.length} octets` : "absent");
  check("le message contient TOUT le menu", calls[0] && calls[0][1].text === text);
  check("longueur < limite texte WhatsApp", text.length <= WA_TEXT_LIMIT, `${text.length} / ${WA_TEXT_LIMIT}`);
  check("longueur < 65535 (1 message)", text.length < 65535, `${text.length}`);
  check("retourne la longueur", len === text.length, `${len}`);
  check("toutes les catégories présentes", visible.every((s) => text.includes(`*${s.name}*`)), visible.map((s) => s.name).join(", "));
  const missing = expected.filter((c) => !text.includes(`> ⫹⫺ ${sc(c)}`));
  check(`toutes les commandes présentes (${expected.length})`, missing.length === 0, missing.length ? "manquantes: " + missing.join(", ") : "");

  console.log(`\nMenu: ${text.length} caractères, ${SECTIONS.length} sections, ${expected.length} commandes.`);
  console.log(ok ? "\nRÉSULTAT: OK" : "\nRÉSULTAT: ÉCHEC");
  process.exit(ok ? 0 : 1);
})();
