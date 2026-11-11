const fs = require("fs");
    const path = require("path");

    const modeFile = path.join(__dirname, "..", "auth_info", ".bot-mode.json");
    const listeners = new Set();
    let privateMode = false;

    try {
    privateMode = JSON.parse(fs.readFileSync(modeFile, "utf8")).privateMode === true;
    } catch {}

    function isPrivateMode() {
    return privateMode;
    }

    function onPrivateModeChange(listener) {
    if (typeof listener !== "function") return () => {};
    listeners.add(listener);
    try { listener(privateMode); } catch (error) {
      console.error("Private-mode listener error:", error.message);
    }
    return () => listeners.delete(listener);
    }

    function setPrivateMode(enabled) {
    const next = Boolean(enabled);
    const changed = next !== privateMode;
    privateMode = next;

    try {
      fs.mkdirSync(path.dirname(modeFile), { recursive: true });
      fs.writeFileSync(modeFile, JSON.stringify({ privateMode }), { encoding: "utf8", mode: 0o600 });
    } catch (error) {
      console.error("Could not persist bot access mode:", error.message);
    }

    if (changed) {
      for (const listener of listeners) {
        try { listener(privateMode); } catch (error) {
          console.error("Private-mode listener error:", error.message);
        }
      }
    }
    return privateMode;
    }

    module.exports = { isPrivateMode, setPrivateMode, onPrivateModeChange };
    