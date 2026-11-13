// Vérifie que le menu ne contient aucun caractère « tofu » (carré ▣) sur les
// téléphones Android, c'est-à-dire absent des polices système courantes.
// Usage: node test-menu-glyphs.js
const { buildWaMenu, buildTelegramMenu } = require("./menu");

// Plages sûres : latin, petites capitales phonétiques, symboles courants,
// cadres, emoji. On bloque explicitement les blocs « idéographiques » et les
// rares symboles CJK/Kangxi utilisés comme décoration (U+2FF0–U+2FFF).
const RISKY_RANGES = [
  [0x2ff0, 0x2fff, "traits idéographiques (⿻, ⿰…) : carré ▣ sur Android"],
  [0x31c0, 0x31ef, "traits CJK"],
  [0x2e80, 0x2eff, "radicaux CJK"],
  [0x3000, 0x303f, "ponctuation CJK"],
  [0xf900, 0xfaff, "idéogrammes de compatibilité"],
];

let ok = true;
const check = (name, cond, extra = "") => {
  console.log(`${cond ? "✅" : "❌"} ${name}${extra ? " — " + extra : ""}`);
  if (!cond) ok = false;
};

function findRisky(text) {
  const found = new Map();
  for (const ch of text) {
    const cp = ch.codePointAt(0);
    const hit = RISKY_RANGES.find(([start, end]) => cp >= start && cp <= end);
    if (hit) found.set(ch, `U+${cp.toString(16).toUpperCase()} (${hit[2]})`);
  }
  return found;
}

const wa = buildWaMenu({ user: "Test" });
const tg = buildTelegramMenu();

const waRisky = findRisky(wa);
check("menu WhatsApp sans caractère à risque", waRisky.size === 0,
  [...waRisky].map(([c, why]) => `"${c}" ${why}`).join(" | "));

const tgRisky = findRisky(tg);
check("menu Telegram sans caractère à risque", tgRisky.size === 0,
  [...tgRisky].map(([c, why]) => `"${c}" ${why}`).join(" | "));

// Toutes les lignes de contenu doivent utiliser la même puce.
const lines = wa.split("\n").filter((l) => l.startsWith("│"));
check("toutes les lignes ont la puce •", lines.every((l) => l.startsWith("│• ")), `${lines.length} lignes`);

// Aucune paire de substitution / caractère de remplacement.
check("pas de U+FFFD (caractère de remplacement)", !wa.includes("\uFFFD"));

console.log(`\nMenu WhatsApp : ${wa.length} caractères.`);
console.log(ok ? "\nRÉSULTAT: OK" : "\nRÉSULTAT: ÉCHEC");
process.exit(ok ? 0 : 1);
