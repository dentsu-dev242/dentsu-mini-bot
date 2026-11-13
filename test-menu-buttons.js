// Vérifie le message de boutons du menu (WEBSITE + PING + footer).
// Usage: node test-menu-buttons.js
process.env.SESSION_DIR = process.env.SESSION_DIR || "/tmp/menu-buttons-test";

const { buildWaMenu } = require("./menu");
const { sendMenuButtons } = require("./lib/whatsapp");
const { buildMenuButtons, FOOTER } = require("./lib/menuButtons");
const config = require("./config");

// Le vrai encodage protobuf de Baileys (comme sur le serveur).
let proto = null;
try { proto = require("@whiskeysockets/baileys").proto; } catch {}

let ok = true;
const check = (name, cond, extra = "") => {
  console.log(`${cond ? "✅" : "❌"} ${name}${extra ? " — " + extra : ""}`);
  if (!cond) ok = false;
};

(async () => {
  const calls = [];
  const sock = {
    user: { id: "242065141056@s.whatsapp.net" },
    relayMessage: async (...args) => { calls.push(args); return "ok"; },
  };
  const menu = buildWaMenu({ user: "Test" });
  const quoted = { key: { id: "orig", remoteJid: "123456@s.whatsapp.net", fromMe: false }, message: { conversation: ".menu" } };

  await sendMenuButtons(sock, "123456@s.whatsapp.net", { menuBody: menu, quoted });

  check("1 seul message de boutons envoyé", calls.length === 1, `appels=${calls.length}`);
  const [jid, message, opts] = calls[0] || [];
  check("envoyé au bon chat", jid === "123456@s.whatsapp.net");
  const inner = message?.viewOnceMessage?.message?.interactiveMessage;
  check("message interactif bien encapsulé", !!inner);
  check("footer = Made with ❤️ By NatsuTech's", inner?.footer?.text === FOOTER, inner?.footer?.text);
  const buttons = (inner?.nativeFlowMessage?.buttons || []).map((b) => {
    let p = {};
    try { p = JSON.parse(b.buttonParamsJson || "{}"); } catch {}
    return { name: b.name, text: p.display_text, url: p.url, id: p.id };
  });
  check("2 boutons", buttons.length === 2, JSON.stringify(buttons.map((b) => b.text)));
  check("bouton WEBSITE -> lien Vercel", buttons[0]?.text === "WEBSITE" && /vercel\.app/.test(buttons[0]?.url || ""), buttons[0]?.url);
  check("bouton PING (quick_reply)", buttons[1]?.name === "quick_reply" && buttons[1]?.id === ".ping", buttons[1]?.id);
  // Baileys encode la citation dans contextInfo : on vérifie qu'elle est là.
  const ctx = inner?.contextInfo;
  check("citation présente (contextInfo.stanzaId)", ctx?.stanzaId === "orig", ctx?.stanzaId);

  if (proto) {
    const encoded = proto.Message.fromObject(message);
    const decoded = proto.Message.toObject(encoded, { defaults: false });
    const back = decoded.viewOnceMessage?.message?.interactiveMessage;
    check("protobuf valide (encodage/décodage)", !!back, "ok");
    check("footer survit à l'encodage", back?.footer?.text === FOOTER);
    const backButtons = (back?.nativeFlowMessage?.buttons || []).map((b) => JSON.parse(b.buttonParamsJson || "{}").display_text);
    check("boutons survivent à l'encodage", JSON.stringify(backButtons) === JSON.stringify(["WEBSITE", "PING"]), backButtons.join(", "));
  }

  // Repli quand le corps dépasse 1 024 caractères.
  const huge = buildMenuButtons({ menuBody: "x".repeat(2000) });
  check("corps > 1 024 détecté", huge.bodyTooLong === true);
  console.log(`\nFooter : ${FOOTER}\nMenu : ${menu.length} caractères (le corps interactif utilise un texte court s'il dépasse 1 024).`);
  console.log(ok ? "\nRÉSULTAT: OK" : "\nRÉSULTAT: ÉCHEC");
  process.exit(ok ? 0 : 1);
})();
