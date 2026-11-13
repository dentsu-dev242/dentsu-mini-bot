// Rend visuellement le message interactif du menu (vrai protobuf WhatsApp)
// dans une bulle sombre, puis capture une image pour vérification.
// Usage: node scripts/render-menu-buttons.js
const fs = require("fs");
const path = require("path");
const { generateWAMessageFromContent, proto } = require("@whiskeysockets/baileys");
const { buildMenuButtons, FOOTER } = require("../lib/menuButtons");
const { buildWaMenu } = require("../menu");

const quoted = { key: { id: "orig", remoteJid: "123456@s.whatsapp.net", fromMe: false }, message: { conversation: ".menu" } };
const { interactiveMessage } = buildMenuButtons({ menuBody: buildWaMenu({ user: "Test" }) });
interactiveMessage.body.text = "À votre service, Monsieur.";

const msg = generateWAMessageFromContent("123456@s.whatsapp.net", {
  viewOnceMessage: { message: { messageContextInfo: { deviceListMetadata: {}, deviceListMetadataVersion: 2 }, interactiveMessage } },
}, { userJid: "242065141056@s.whatsapp.net", quoted });

// On repasse par le protobuf : ce que l'app WhatsApp recevra réellement.
const decoded = proto.Message.toObject(proto.Message.fromObject(msg.message), { defaults: false });
const im = decoded.viewOnceMessage.message.interactiveMessage;
const buttons = im.nativeFlowMessage.buttons.map((b) => JSON.parse(b.buttonParamsJson));

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8">
<style>
  body{margin:0;background:#0b141a;font-family:'Segoe UI',Roboto,sans-serif;padding:18px;width:340px}
  .bubble{background:#202c33;border-radius:10px 2px 10px 10px;padding:8px 10px 0;color:#e9edef;box-shadow:0 1px 1px rgba(0,0,0,.3)}
  .body{font-size:14px;padding:4px 2px 6px}
  .footer{font-size:12.5px;color:#8696a0;padding:2px 2px 8px;display:flex;justify-content:space-between;gap:10px}
  .time{font-size:11px;color:#8696a0;white-space:nowrap}
  .btns{border-top:1px solid #2f3b43}
  .btn{display:flex;align-items:center;justify-content:center;gap:8px;padding:13px 0;color:#21c063;font-size:14.5px;letter-spacing:.4px;border-top:1px solid #2f3b43;font-weight:500}
  .btn:first-child{border-top:0}
  .ic{font-size:15px}
</style></head><body>
<div class="bubble">
  <div class="body">${esc(im.body.text)}</div>
  <div class="footer"><span>${esc(im.footer.text)}</span><span class="time">20:46</span></div>
  <div class="btns">
    ${buttons.map((b) => `<div class="btn"><span class="ic">${b.display_text === "WEBSITE" ? "↗ 🌐" : "↶ 🔴"}</span>${esc(b.display_text)}</div>`).join("")}
  </div>
</div>
</body></html>`;

fs.writeFileSync("/tmp/menu-buttons.html", html);
console.log("footer:", JSON.stringify(decoded.viewOnceMessage.message.interactiveMessage.footer.text));
console.log("boutons:", buttons.map((b) => `${b.display_text} -> ${b.url || b.id}`).join(" | "));

(async () => {
  const { chromium } = require("playwright");
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 380, height: 420 }, deviceScaleFactor: 2 });
  await page.goto("file:///tmp/menu-buttons.html");
  await page.screenshot({ path: "/tmp/menu-buttons.png", fullPage: true });
  await browser.close();
  console.log("capture: /tmp/menu-buttons.png");
})();
