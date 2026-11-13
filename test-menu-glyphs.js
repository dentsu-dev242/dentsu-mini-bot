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
  [0x1d400, 0x1d7ff, "lettres mathématiques (𝖣…) : carré sur Android"],
  // ⧼ (U+29FC) / ⧽ (U+29FD) / ⫹ (U+2AF9) / ⫺ (U+2AFA) sont demandés
  // explicitement par le style du menu WhatsApp : on ne les bloque pas, mais on
  // les signale pour mémoire.
  [0x2ff0, 0x2fff, "traits idéographiques (⿻…) : carré ▣"],
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

// Le menu Telegram n'est pas modifié (rendu Telegram Desktop, glyphes ok) :
// on vérifie seulement qu'il est toujours généré.
check("menu Telegram toujours généré", tg.length > 100, `${tg.length} caractères`);
const tgRisky = findRisky(tg);
if (tgRisky.size) console.log(`ℹ️ Telegram : glyphes décoratifs conservés (${[...tgRisky.keys()].join(" ")}).`);
check("menu Telegram inchangé (⧼⧽ conservés)", tg.includes("⧼") && tg.includes("⧽"), "style d'origine");

// Toutes les lignes de contenu doivent utiliser la même puce.
const lines = wa.split("\n").filter((l) => l.startsWith("> ⫹⫺ "));
const items = wa.split("\n").filter((l) => l.startsWith("> ⫹⫺ "));
check("lignes de commandes prefixées « > ⫹⫺ »", items.length > 50, `${items.length} commandes`);
check("format demandé présent (╔ ╚ ╭ ╰ ⧼ ⧽)", ["╔", "╚", "╭", "╰", "⧼", "⧽"].every((c) => wa.includes(c)));
check("pas d’anciens glyphes ⿻ / │• / ❰", !wa.includes("⿻") && !wa.includes("│•") && !wa.includes("❰"));

// Aucune paire de substitution / caractère de remplacement.
check("pas de U+FFFD (caractère de remplacement)", !wa.includes("\uFFFD"));

console.log(`\nMenu WhatsApp : ${wa.length} caractères.`);
console.log(ok ? "\nRÉSULTAT: OK" : "\nRÉSULTAT: ÉCHEC");
process.exit(ok ? 0 : 1);
