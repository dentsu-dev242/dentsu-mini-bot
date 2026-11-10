(() => {
  const form = document.getElementById("pair-form");
  const phoneInput = document.getElementById("phone-number");
  const generateButton = document.getElementById("generate-button");
  const statusMessage = document.getElementById("status-message");
  const codePanel = document.getElementById("code-panel");
  const codeOutput = document.getElementById("pair-code");
  const copyButton = document.getElementById("copy-button");
  const expiryLabel = document.getElementById("expiry-label");
  let countdown = null;
  let activeCode = false;

  function showStatus(message, type) {
    statusMessage.textContent = message;
    statusMessage.className = "status-message" + (type ? " " + type : "");
    statusMessage.hidden = false;
  }

  function clearCountdown() {
    if (countdown) window.clearInterval(countdown);
    countdown = null;
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (activeCode) return;

    const phoneNumber = phoneInput.value.trim();
    const digits = phoneNumber.replace(/\D/g, "").replace(/^00/, "");
    if (!/^\d{8,15}$/.test(digits)) {
      showStatus("Entre un numéro international valide, avec l’indicatif du pays.", "error");
      phoneInput.focus();
      return;
    }

    clearCountdown();
    codePanel.hidden = true;
    statusMessage.hidden = true;
    generateButton.disabled = true;
    generateButton.textContent = "Génération du code…";

    try {
      const response = await fetch("/api/pair", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Impossible de générer le code. Réessaie plus tard.");
      if (!data.code) throw new Error("Aucun code n’a été reçu. Réessaie plus tard.");

      codeOutput.textContent = data.code;
      codePanel.hidden = false;
      copyButton.disabled = false;
      copyButton.textContent = "Copier le code";
      activeCode = true;
      let seconds = Math.max(1, Number(data.expiresIn) || 60);
      expiryLabel.textContent = seconds + " s";
      showStatus("Code prêt. Saisis-le dans WhatsApp sur ton téléphone.", "success");
      generateButton.disabled = true;
      countdown = window.setInterval(() => {
        seconds -= 1;
        expiryLabel.textContent = Math.max(0, seconds) + " s";
        if (seconds <= 0) {
          clearCountdown();
          activeCode = false;
          codeOutput.textContent = "EXPIRÉ";
          copyButton.disabled = true;
          expiryLabel.textContent = "Expiré";
          generateButton.disabled = false;
          showStatus("Le code a expiré. Tu peux en générer un nouveau.", "error");
        }
      }, 1000);
    } catch (error) {
      activeCode = false;
      showStatus(error.message || "Une erreur est survenue. Réessaie.", "error");
      generateButton.disabled = false;
    } finally {
      generateButton.textContent = "Générer mon code →";
    }
  });

  copyButton.addEventListener("click", async () => {
    if (!activeCode || !codeOutput.textContent) return;
    try {
      await navigator.clipboard.writeText(codeOutput.textContent);
    } catch (error) {
      const range = document.createRange();
      range.selectNodeContents(codeOutput);
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
      const copied = document.execCommand("copy");
      selection.removeAllRanges();
      if (!copied) {
        showStatus("Copie impossible. Sélectionne le code et copie-le manuellement.", "error");
        return;
      }
    }
    copyButton.textContent = "Code copié ✓";
    showStatus("Code copié. Entre-le dans WhatsApp.", "success");
    window.setTimeout(() => {
      if (activeCode) copyButton.textContent = "Copier le code";
    }, 1800);
  });
})();