// Vérifie le code de jumelage fixe (config.PAIRING_CODE) sur les 3 canaux.
// Usage: node test-pairing-code.js
const fs = require("fs");
const path = require("path");

const CONFIG_PATH = path.join(__dirname, "config.js");
const config = require(CONFIG_PATH);

let ok = true;
const check = (name, cond, extra = "") => {
  console.log(`${cond ? "✅" : "❌"} ${name}${extra ? " — " + extra : ""}`);
  if (!cond) ok = false;
};

const expected = "DENTSU11";
check("config.PAIRING_CODE défini", typeof config.PAIRING_CODE === "string", config.PAIRING_CODE);
check("code fixe = DENTSU11", config.PAIRING_CODE === expected, config.PAIRING_CODE);
check("8 caractères (limite WhatsApp)", String(config.PAIRING_CODE).length === 8, String(config.PAIRING_CODE).length);
check("affiché comme DENT-SU11", config.PAIRING_CODE.match(/.{1,4}/g).join("-") === "DENT-SU11", config.PAIRING_CODE.match(/.{1,4}/g).join("-"));

// Le code doit être transmis tel quel à Baileys (2e argument de requestPairingCode).
const whatsappSrc = fs.readFileSync(path.join(__dirname, "lib", "whatsapp.js"), "utf8");
check("WhatsApp utilise le code fixe", /requestPairingCode\(cleaned,\s*candidate\)/.test(whatsappSrc));
check("variante lisible U->V/O->0/I->1", /replace\(\/U\/g, "V"\)/.test(whatsappSrc));
check("repli aléatoire si WhatsApp refuse", /requestPairingCode\(cleaned\);/.test(whatsappSrc));

// Telegram et site de jumelage passent tous par startWhatsApp -> même code.
const telegramSrc = fs.readFileSync(path.join(__dirname, "lib", "telegram.js"), "utf8");
const extraSrc = fs.readFileSync(path.join(__dirname, "commands_extra.js"), "utf8");
const webSrc = fs.readFileSync(path.join(__dirname, "lib", "web.js"), "utf8");
check("Telegram passe par startWhatsApp", /startWhatsApp\(/.test(telegramSrc));
check("Commande .pair passe par startWhatsApp", /startWhatsApp\(/.test(extraSrc));
check("Site de jumelage passe par startWhatsApp", /startWhatsApp\(/.test(webSrc));
check("aucun code aléatoire codé en dur côté web", !/randomBytes.*pair/i.test(webSrc));

console.log(ok ? "\nRÉSULTAT: OK" : "\nRÉSULTAT: ÉCHEC");
process.exit(ok ? 0 : 1);
