"use strict";

const fs = require("fs");
const path = require("path");

// auth_info is the persistent Render disk mount and is excluded from Git.
const STORAGE_DIR = path.join(__dirname, "..", "auth_info");
const STORAGE_FILE = path.join(STORAGE_DIR, "telegram-subscribers.json");

function normalizeChatId(chatId) {
  const value = String(chatId == null ? "" : chatId).trim();
  if (!/^-?\d+$/.test(value)) throw new TypeError("Invalid Telegram chat ID.");
  return value;
}

function readSubscribers() {
  let parsed;
  try {
    parsed = JSON.parse(fs.readFileSync(STORAGE_FILE, "utf8"));
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw new Error(`Could not read Telegram subscriber list: ${error.message}`);
  }
  if (!Array.isArray(parsed)) throw new Error("Telegram subscriber list is not an array.");
  return [...new Set(parsed.map(normalizeChatId))];
}

function writeSubscribers(subscribers) {
  fs.mkdirSync(STORAGE_DIR, { recursive: true });
  const temporaryFile = `${STORAGE_FILE}.${process.pid}.tmp`;
  fs.writeFileSync(temporaryFile, JSON.stringify(subscribers, null, 2) + "\n", { mode: 0o600 });
  fs.renameSync(temporaryFile, STORAGE_FILE);
}

function addTelegramSubscriber(chatId) {
  const normalized = normalizeChatId(chatId);
  const subscribers = readSubscribers();
  if (subscribers.includes(normalized)) return false;
  subscribers.push(normalized);
  writeSubscribers(subscribers);
  return true;
}

function removeTelegramSubscriber(chatId) {
  const normalized = normalizeChatId(chatId);
  const subscribers = readSubscribers();
  const updated = subscribers.filter((id) => id !== normalized);
  if (updated.length === subscribers.length) return false;
  writeSubscribers(updated);
  return true;
}

function listTelegramSubscribers() {
  return readSubscribers();
}

module.exports = { addTelegramSubscriber, listTelegramSubscribers, removeTelegramSubscriber };
