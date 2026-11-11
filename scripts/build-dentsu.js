#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const ENTRY = "index.js";
const modules = new Map();

function resolveLocalModule(parentId, request) {
  const base = path.posix.normalize(
    path.posix.join(path.posix.dirname(parentId), request),
  );
  const candidates = [
    base,
    `${base}.js`,
    `${base}.json`,
    path.posix.join(base, "index.js"),
  ];

  for (const id of candidates) {
    const absolute = path.resolve(ROOT, id);
    if (!absolute.startsWith(ROOT + path.sep)) continue;
    if (fs.existsSync(absolute) && fs.statSync(absolute).isFile()) return id;
  }
  return null;
}

function removeBlock(source, startMarker, endMarker, description) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start + startMarker.length);
  if (start < 0 || end < 0 || end < start) {
    throw new Error(`Could not safely remove ${description}; source changed.`);
  }
  return source.slice(0, start) + source.slice(end);
}

function replaceOnce(source, original, replacement, description) {
  const first = source.indexOf(original);
  if (first < 0 || source.indexOf(original, first + original.length) >= 0) {
    throw new Error(`Could not safely update ${description}; source changed.`);
  }
  return source.slice(0, first) + replacement + source.slice(first + original.length);
}

function sanitizeModule(id, source) {
  if (id === "lib/whatsapp.js") {
    source = removeBlock(
      source,
      "  // 💀 BUG MENU — CRASH COMMANDS",
      "    default:\n      // Unknown command: react with ⁉️ ONLY when the prefix was used,",
      "WhatsApp crash and group-disruption handlers",
    );
    source = replaceOnce(
      source,
      "// These commands send spam or payloads intended to crash WhatsApp clients.",
      "// Legacy destructive command names are rejected before dispatch.",
      "disabled-command guard",
    );
    source = removeBlock(
      source,
      "// /ban WhatsApp (déclenché depuis Telegram)",
      "module.exports = { startWhatsApp, stopWhatsApp, listPaired, sendWhatsAppBan };",
      "WhatsApp message-blast handler",
    );
    source = replaceOnce(
      source,
      "module.exports = { startWhatsApp, stopWhatsApp, listPaired, sendWhatsAppBan };",
      "module.exports = { startWhatsApp, stopWhatsApp, listPaired };",
      "WhatsApp exports",
    );
  }

  if (id === "lib/telegram.js") {
    source = replaceOnce(
      source,
      'const { startWhatsApp, stopWhatsApp, listPaired, sendWhatsAppBan } = require("./whatsapp");',
      'const { startWhatsApp, stopWhatsApp, listPaired } = require("./whatsapp");',
      "Telegram WhatsApp imports",
    );
    source = removeBlock(
      source,
      "  // ── /ban (admin) : envoie des warnings sur WhatsApp",
      "  // ── /owner",
      "Telegram message-blast command",
    );
  }

  if (id === "menu.js") {
    const crashMenuStart = source.indexOf(
      '  const displayOnly = "╭─〔 🩸 ᴄʀᴀsʜ ᴍᴇɴᴜ 〕─╮',
    );
    const crashMenuEnd =
      crashMenuStart < 0 ? -1 : source.indexOf("\n", crashMenuStart);
    if (crashMenuStart < 0 || crashMenuEnd < 0) {
      throw new Error("Could not safely remove the crash menu; source changed.");
    }
    source =
      source.slice(0, crashMenuStart) + source.slice(crashMenuEnd + 1);
    source = replaceOnce(
      source,
      '  return header + "\\n\\n" + blocks.join("\\n\\n") + "\\n\\n" + displayOnly + footer;',
      '  return header + "\\n\\n" + blocks.join("\\n\\n") + footer;',
      "WhatsApp menu footer",
    );
    source = replaceOnce(
      source,
      '    "/ban 242xxxx [n]",\n',
      "",
      "Telegram menu message-blast entry",
    );
  }

  return source;
}

function collectModule(id) {
  if (modules.has(id)) return;

  const absolute = path.resolve(ROOT, id);
  if (!absolute.startsWith(ROOT + path.sep) || !fs.existsSync(absolute)) {
    throw new Error(`Bundle source is missing: ${id}`);
  }

  const extension = path.extname(id);
  let source = fs.readFileSync(absolute, "utf8");
  source = extension === ".json"
    ? `module.exports = ${source.trim()};`
    : sanitizeModule(id, source);
  modules.set(id, source);

  const calls = source.matchAll(/\brequire\s*\(([^)]*)\)/g);
  for (const call of calls) {
    const argument = call[1].trim();
    const literal = argument.match(/^(['"])(.*)\1$/s);
    if (!literal) {
      throw new Error(`Dynamic require is not supported in ${id}.`);
    }
    const request = literal[2];
    if (!request.startsWith(".")) continue;

    const dependency = resolveLocalModule(id, request);
    if (!dependency) {
      throw new Error(`Cannot resolve ${request} from ${id}.`);
    }
    collectModule(dependency);
  }
}

function assertSafeBundle() {
  const whatsapp = modules.get("lib/whatsapp.js") || "";
  const telegram = modules.get("lib/telegram.js") || "";
  const menu = modules.get("menu.js") || "";
  const forbiddenHandlers = [
    "_crashAndroid",
    "_crashIos",
    "_killUi",
    "_freezeUi",
    "sendWhatsAppBan",
    "Nuking group",
  ];

  for (const marker of forbiddenHandlers) {
    if (whatsapp.includes(marker) || telegram.includes(marker)) {
      throw new Error(`Unsafe handler remains in bundle: ${marker}`);
    }
  }
  if (/crash menu|\/ban 242xxxx/i.test(menu)) {
    throw new Error("Unsafe command is still displayed in the menu.");
  }
  if (!whatsapp.includes("Legacy destructive command names are rejected")) {
    throw new Error("Disabled-command guard is missing from the bundle.");
  }
}

function buildBundle() {
  collectModule(ENTRY);
  assertSafeBundle();

  const moduleFactories = [...modules.entries()]
    .map(([id, source]) => {
      return `  ${JSON.stringify(id)}: function(module, exports, require, __filename, __dirname) {\n${source}\n  }`;
    })
    .join(",\n");

  return `/* Generated by scripts/build-dentsu.js.
 * Source files are kept intact. Rebuild with: npm run build:bundle
 * Crash/disruption handlers and repeated-message commands are excluded.
 */
"use strict";

const __dentsuPath = require("node:path");
const __dentsuNativeRequire = require;
const __dentsuRoot = __dirname;
const __dentsuModules = {
${moduleFactories}
};
const __dentsuCache = Object.create(null);

function __dentsuResolve(request, parentId) {
  if (!request.startsWith(".")) return null;
  const base = __dentsuPath.posix.normalize(
    __dentsuPath.posix.join(__dentsuPath.posix.dirname(parentId), request),
  );
  const candidates = [
    base,
    base + ".js",
    base + ".json",
    __dentsuPath.posix.join(base, "index.js"),
  ];
  for (const id of candidates) {
    if (Object.prototype.hasOwnProperty.call(__dentsuModules, id)) return id;
  }
  throw new Error("Bundled module not found: " + request + " from " + parentId);
}

function __dentsuLoad(id) {
  if (__dentsuCache[id]) return __dentsuCache[id].exports;
  const factory = __dentsuModules[id];
  if (!factory) throw new Error("Bundled module is missing: " + id);

  const filename = __dentsuPath.join(__dentsuRoot, id);
  const module = { exports: {}, id, filename, loaded: false };
  __dentsuCache[id] = module;

  function localRequire(request) {
    const internal = __dentsuResolve(request, id);
    return internal ? __dentsuLoad(internal) : __dentsuNativeRequire(request);
  }
  localRequire.resolve = (request) => {
    const internal = __dentsuResolve(request, id);
    return internal
      ? __dentsuPath.join(__dentsuRoot, internal)
      : __dentsuNativeRequire.resolve(request);
  };
  module.require = localRequire;

  factory.call(
    module.exports,
    module,
    module.exports,
    localRequire,
    filename,
    __dentsuPath.dirname(filename),
  );
  module.loaded = true;
  return module.exports;
}

if (process.argv.includes("--smoke-menu")) {
  const menu = __dentsuLoad("menu.js");
  const whatsappMenu = menu.buildWaMenu({ user: "Smoke Test" });
  const telegramMenu = menu.buildTelegramMenu();
  if (!whatsappMenu.includes("ᴘɪɴɢ") || !whatsappMenu.includes("ᴘᴀɪʀ")) {
    throw new Error("WhatsApp menu is missing standard commands.");
  }
  if (whatsappMenu.includes("🩸")) {
    throw new Error("WhatsApp menu includes a disabled feature.");
  }
  const disabledEntry = "/" + "ban 242xxxx";
  if (!telegramMenu.includes("/pair") || telegramMenu.includes(disabledEntry)) {
    throw new Error("Telegram menu smoke test failed.");
  }
  console.log("Menu smoke test passed.");
} else {
  __dentsuLoad(${JSON.stringify(ENTRY)});
}
`;
}

const outputPath = path.join(ROOT, "dentsu.js");
fs.writeFileSync(outputPath, buildBundle(), "utf8");
console.log(`Generated dentsu.js with ${modules.size} internal modules.`);
