// Vérifie la barre de chargement du menu WhatsApp : aucun texte, barre ▰ qui
// se remplit jusqu'à 100 %, puis le menu complet (photo + texte).
// Usage: node test-menu-loading.js
process.env.SESSION_DIR = process.env.SESSION_DIR || "/tmp/menu-loading-test";

const fs = require("fs");
const src = fs.readFileSync(require("path").join(__dirname, "lib/whatsapp.js"), "utf8");
const { sendWaMenuMessage } = require("./lib/whatsapp");
const { buildWaMenu } = require("./menu");

let ok = true;
const check = (name, cond, extra = "") => {
  console.log(`${cond ? "✅" : "❌"} ${name}${extra ? " — " + extra : ""}`);
  if (!cond) ok = false;
};

// On extrait la fonction telle qu'elle est dans le module (même source).
const consts = src.match(/const LOADING_SEGMENTS[\s\S]*?const LOADING_STEP_MS = \d+;/)[0];
const fn = src.match(/function renderLoadingBar[\s\S]*?\n}/)[0];
const renderLoadingBar = new Function(`${consts}\n${fn}\nreturn renderLoadingBar;`)();

const frames = [0, 25, 50, 75, 100].map(renderLoadingBar);
frames.forEach((f, i) => console.log(`   ${[0, 25, 50, 75, 100][i]}% → ${f}`));

check("frame 0% vide", frames[0].split("").every((c) => c === "▱"));
check("frame 100% pleine", frames[4].split("").every((c) => c === "▰"));
check("barre volumineuse (≥ 12 segments)", frames[0].length >= 12, `${frames[0].length} segments`);
check("progression croissante", frames.every((f, i) => i === 0 || f.split("▰").length >= frames[i - 1].split("▰").length));
check("aucun texte dans la frame", frames.every((f) => /^[▰▱]+$/.test(f)), "uniquement des blocs");
check("chargement rapide (< 1,5 s)", 4 * 70 <= 1500, `${4 * 70} ms`);

// Le menu arrive après (photo + texte complet).
(async () => {
  const calls = [];
  const sock = { sendMessage: async (...args) => { calls.push(args); return { key: { id: "m" } }; } };
  const menu = buildWaMenu({ user: "Test" });
  await sendWaMenuMessage(sock, "123@s.whatsapp.net", { user: "Test" });
  const payload = calls[0]?.[1] || {};
  check("menu = 1 seul message", calls.length === 1);
  check("menu contient tout le texte", payload.text === menu, `${menu.length} caractères`);
  check("photo du bot dans le menu", Buffer.isBuffer(payload?.contextInfo?.externalAdReply?.thumbnail));
  console.log(ok ? "\nRÉSULTAT: OK" : "\nRÉSULTAT: ÉCHEC");
  process.exit(ok ? 0 : 1);
})();
