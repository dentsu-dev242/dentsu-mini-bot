// Vérifie le handshake réel avec WhatsApp via le fork Anime Baileys :
// lance une session QR et attend le premier QR (prouve que la connexion
// WebSocket + noise handshake fonctionne).
// Usage: node test-handshake.js
process.env.SESSION_DIR = process.env.SESSION_DIR || "/tmp/handshake-test";

const fs = require("fs");
const path = require("path");
const { startWhatsApp, stopWhatsApp } = require("./lib/whatsapp");

const dir = "/tmp/handshake-test";
fs.rmSync(dir, { recursive: true, force: true });

let qrCount = 0;
const timer = setTimeout(async () => {
  console.log(`\n❌ Aucun QR en 45 s (${qrCount} reçus) — handshake en échec.`);
  await stopWhatsApp("hs-test").catch(() => {});
  process.exit(1);
}, 45_000);

startWhatsApp({
  authSubdir: "hs-test",
  qrOnly: true,
  onQr: async (qr) => {
    qrCount += 1;
    console.log(`✅ QR #${qrCount} reçu (${qr.length} car.) — handshake WhatsApp OK`);
    clearTimeout(timer);
    await stopWhatsApp("hs-test").catch(() => {});
    process.exit(0);
  },
  onConnectionClose: ({ loggedOut, reason }) => {
    console.log("⚠️ connection close:", reason, loggedOut ? "(loggedOut)" : "");
  },
}).catch((e) => {
  console.log("❌ Erreur startWhatsApp:", e.message);
  process.exit(1);
});
