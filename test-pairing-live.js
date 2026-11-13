// Test réel : demande un code de jumelage à WhatsApp et vérifie que le code
// fixe (config.PAIRING_CODE) est bien accepté par les serveurs WhatsApp.
// Usage: node test-pairing-live.js 242XXXXXXX
process.env.SESSION_DIR = process.env.SESSION_DIR || "/tmp/pairing-live";

const phone = String(process.argv[2] || "").replace(/\D/g, "");
if (!/^\d{8,15}$/.test(phone)) {
  console.error("Usage: node test-pairing-live.js <numero_international_sans_plus>");
  process.exit(1);
}

const { startWhatsApp } = require("./lib/whatsapp");
const config = require("./config");
console.log(`Code attendu : ${config.PAIRING_CODE} (${String(config.PAIRING_CODE).match(/.{1,4}/g).join("-")})`);

let done = false;
const timer = setTimeout(() => {
  if (!done) { console.log("❌ Aucun code reçu en 40 s."); process.exit(1); }
}, 40_000);

startWhatsApp({
  phoneNumber: phone,
  authSubdir: "live-" + phone,
  onPairingCode: (code, err) => {
    done = true;
    clearTimeout(timer);
    if (err || !code) {
      console.log("❌ Échec :", err?.message || "pas de code");
      process.exit(1);
    }
    const ok = code === String(config.PAIRING_CODE).match(/.{1,4}/g).join("-");
    console.log(`Code reçu : ${code} → ${ok ? "✅ code fixe respecté" : "⚠️ code différent (WhatsApp a refusé le code fixe)"}`);
    process.exit(ok ? 0 : 2);
  },
}).catch((e) => { console.log("❌ Erreur :", e.message); process.exit(1); });
