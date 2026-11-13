(() => {
  const copy = {
    fr: {
      title: "DENTSU MINI BOT · Jumelage WhatsApp",
      eyebrow: "Jumelage WhatsApp sécurisé",
      pageTitle: "DENTSU MINIBOT",
      intro: "Entre ton numéro ou utilise un QR pour relier ton compte au bot.",
      methodCode: "Par numéro", methodQr: "Par QR",
      phoneLabel: "Ton numéro WhatsApp", phoneHint: "Indicatif international inclus, de 8 à 15 chiffres.",
      phonePlaceholder: "+242 06 123 45 67", generateCode: "Générer mon code", generatingCode: "Génération du code…",
      phoneInvalid: "Entre un numéro international valide, avec l’indicatif du pays.",
      pairError: "Impossible de générer le code. Réessaie plus tard.", missingCode: "Aucun code n’a été reçu. Réessaie plus tard.",
      errRateLimited: "Trop de demandes. Patiente quelques minutes puis réessaie.",
      errPhoneInvalid: "Entre un numéro international valide, avec l’indicatif du pays.",
      errPhoneCooldown: "Un code a déjà été demandé pour ce numéro. Attends 60 secondes.",
      errPairInProgress: "Une demande de jumelage est déjà en cours pour ce numéro.",
      errPairFailed: "WhatsApp n’a pas pu générer le code. Réessaie plus tard.",
      errQrBusy: "Trop de sessions QR actives. Réessaie dans un instant.",
      errQrNotFound: "Cette session QR a expiré. Génère un nouveau QR.",
      errNotFound: "Service indisponible. Réessaie plus tard.",
      errNetwork: "Connexion au serveur impossible. Vérifie ta connexion internet.",
      codeHeading: "TON CODE DE JUMELAGE", codeHint: "Saisis-le dans WhatsApp sur ton téléphone.",
      copyCode: "Copier le code", copied: "Code copié ✓", copyError: "Copie impossible. Sélectionne le code et copie-le manuellement.",
      steps: "WhatsApp → Appareils connectés → Connecter un appareil → Associer avec un numéro.",
      codeReady: "Code prêt. Saisis-le dans WhatsApp sur ton téléphone.", expiredCode: "Le code a expiré. Tu peux en générer un nouveau.", expiredLabel: "Expiré", seconds: "s",
      qrPlaceholder: "Ton QR apparaîtra ici", qrPlaceholderHint: "Il est créé uniquement pour ta session.",
      generateQr: "Générer un QR sécurisé", qrStarting: "Préparation de ta session QR…", qrWaiting: "En attente de WhatsApp… garde cette page ouverte.",
      qrReady: "QR prêt à scanner.", qrConnected: "WhatsApp est connecté ✓", qrExpired: "Le QR a expiré. Génère-en un nouveau.",
      qrFailed: "Impossible de créer le QR. Réessaie plus tard.", qrInstructions: "Dans WhatsApp, ouvre Appareils connectés, puis scanne ce QR.",
      securityText: "Utilise uniquement ton propre compte. Ne partage jamais ton code ni ton QR.",
      mediaEyebrow: "SON EN BOUCLE", mediaTitle: "Musique de DENTSU", mediaDescription: "La vidéo tourne en boucle. Active le son pour écouter.",
      videoSoundOn: "Activer le son", videoSoundOff: "Couper le son", videoPlaybackBlocked: "Appuie sur lecture dans la vidéo pour la démarrer.", videoLoadError: "La vidéo n’a pas pu être chargée.",
      consentEyebrow: "AVANT DE CONTINUER", consentTitle: "Confidentialité et conditions",
      consentIntro: "Nous mémorisons ton choix avec un cookie nécessaire. La langue et le thème peuvent être conservés sur cet appareil. Aucun cookie publicitaire ou analytique n’est configuré.",
      consentCookieChoice: "J’accepte le cookie nécessaire au consentement et le stockage de mes préférences (langue et thème).",
      consentTerms: 'J’ai lu et j’accepte les <a href="/terms.txt" target="_blank" rel="noopener">conditions d’utilisation</a>.', consentAccept: "Accepter et continuer", consentStorageError: "Impossible d’enregistrer ton choix. Autorise les cookies nécessaires dans ton navigateur puis réessaie.",
      themeToLight: "Mode clair", themeToDark: "Mode sombre", themeLightAria: "Activer le mode clair", themeDarkAria: "Activer le mode sombre"
    },
    en: {
      title: "DENTSU MINI BOT · WhatsApp pairing",
      eyebrow: "Secure WhatsApp pairing",
      pageTitle: "DENTSU MINIBOT",
      intro: "Enter your number or use a QR code to link your account to the bot.",
      methodCode: "Phone number", methodQr: "QR code",
      phoneLabel: "Your WhatsApp number", phoneHint: "Include the country code; use 8 to 15 digits.",
      phonePlaceholder: "+242 06 123 45 67", generateCode: "Get pairing code", generatingCode: "Generating code…",
      phoneInvalid: "Enter a valid international number with its country code.",
      pairError: "Could not generate the code. Try again later.", missingCode: "No code was received. Try again later.",
      errRateLimited: "Too many requests. Wait a few minutes and try again.",
      errPhoneInvalid: "Enter a valid international number with its country code.",
      errPhoneCooldown: "A code was already requested for this number. Wait 60 seconds.",
      errPairInProgress: "A pairing request is already in progress for this number.",
      errPairFailed: "WhatsApp could not generate the code. Try again later.",
      errQrBusy: "Too many QR sessions are active. Try again shortly.",
      errQrNotFound: "This QR session expired. Generate a new QR.",
      errNotFound: "Service unavailable. Try again later.",
      errNetwork: "Could not reach the server. Check your internet connection.",
      codeHeading: "YOUR PAIRING CODE", codeHint: "Enter it in WhatsApp on your phone.",
      copyCode: "Copy code", copied: "Code copied ✓", copyError: "Copy is unavailable. Select the code and copy it manually.",
      steps: "WhatsApp → Linked devices → Link a device → Link with phone number.",
      codeReady: "Code ready. Enter it in WhatsApp on your phone.", expiredCode: "The code expired. You can generate another.", expiredLabel: "Expired", seconds: "s",
      qrPlaceholder: "Your QR will appear here", qrPlaceholderHint: "It is created only for your session.",
      generateQr: "Generate secure QR", qrStarting: "Preparing your QR session…", qrWaiting: "Waiting for WhatsApp… keep this page open.",
      qrReady: "QR ready to scan.", qrConnected: "WhatsApp connected ✓", qrExpired: "The QR expired. Generate a new one.",
      qrFailed: "Could not create the QR. Try again later.", qrInstructions: "Open Linked devices in WhatsApp, then scan this QR.",
      securityText: "Only connect your own account. Never share your code or QR.",
      mediaEyebrow: "LOOPING MUSIC", mediaTitle: "DENTSU music", mediaDescription: "The video loops. Turn on sound to listen.",
      videoSoundOn: "Turn on sound", videoSoundOff: "Mute sound", videoPlaybackBlocked: "Press play on the video to start it.", videoLoadError: "The video could not be loaded.",
      consentEyebrow: "BEFORE YOU CONTINUE", consentTitle: "Privacy and terms",
      consentIntro: "We remember your choice with a necessary consent cookie. Your language and theme may be saved on this device. No advertising or analytics cookies are configured.",
      consentCookieChoice: "I accept the necessary consent cookie and the storage of my preferences (language and theme).",
      consentTerms: 'I have read and accept the <a href="/terms.txt" target="_blank" rel="noopener">Terms of Use</a>.', consentAccept: "Accept and continue", consentStorageError: "Your choice could not be saved. Allow necessary cookies in your browser and try again.",
      themeToLight: "Light mode", themeToDark: "Dark mode", themeLightAria: "Switch to light mode", themeDarkAria: "Switch to dark mode"
    }
  };
  const $ = (selector) => document.querySelector(selector);
  const consentCookieName = "dentsu-consent";
  let consentGiven = document.cookie.split(";").some((entry) => entry.trim() === consentCookieName + "=terms-v1");
  let locale = "fr";
  let theme = "dark";
  if (consentGiven) {
    try {
      locale = localStorage.getItem("dentsu-locale") === "en" ? "en" : "fr";
      theme = localStorage.getItem("dentsu-theme") === "light" ? "light" : "dark";
    } catch {}
  }

  function t(key) { return copy[locale][key] || copy.fr[key] || key; }
  const pairingVideo = $("#pairing-video");
  const videoSoundToggle = $("#video-sound-toggle");
  const videoStatus = $("#video-status");
  function loadPairingVideo() {
    const source = pairingVideo.querySelector("source");
    if (!source || !source.dataset.src || source.src) return;
    source.src = source.dataset.src;
    pairingVideo.load();
    pairingVideo.play().catch(() => {
      videoStatus.textContent = t("videoPlaybackBlocked");
      videoStatus.hidden = false;
    });
  }
  function updateVideoSoundButton() {
    if (!pairingVideo || !videoSoundToggle) return;
    videoSoundToggle.textContent = t(pairingVideo.muted ? "videoSoundOn" : "videoSoundOff");
    videoSoundToggle.setAttribute("aria-pressed", String(!pairingVideo.muted));
  }
  function applyLanguage() {
    document.documentElement.lang = locale;
    document.title = t("title");
    document.querySelectorAll("[data-i18n]").forEach((el) => { el.textContent = t(el.dataset.i18n); });
    document.querySelectorAll("[data-i18n-html]").forEach((el) => { el.innerHTML = t(el.dataset.i18nHtml); });
    document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => { el.placeholder = t(el.dataset.i18nPlaceholder); });
    document.querySelectorAll("[data-language]").forEach((button) => button.setAttribute("aria-pressed", String(button.dataset.language === locale)));
    updateVideoSoundButton();
    applyTheme();
    if (codeActive) updateExpiry();
  }
  function applyTheme() {
    document.documentElement.dataset.theme = theme;
    const light = theme === "light";
    const button = $("#theme-toggle");
    button.setAttribute("aria-pressed", String(!light));
    button.setAttribute("aria-label", t(light ? "themeDarkAria" : "themeLightAria"));
    $("#theme-label").textContent = t(light ? "themeToDark" : "themeToLight");
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = light ? "#f7f0f2" : "#12070b";
  }
  function showStatus(message, type) {
    const status = $("#status-message");
    status.textContent = message;
    status.className = "status-message" + (type ? " " + type : "");
    status.hidden = false;
  }
  // Traduit la réponse du backend (Railway) : on s'appuie sur `code`, jamais
  // sur le texte anglais, pour que le frontend (Vercel) reste en français.
  function serverError(data, fallbackKey) {
    const map = {
      rateLimited: "errRateLimited", phoneInvalid: "errPhoneInvalid",
      phoneCooldown: "errPhoneCooldown", pairInProgress: "errPairInProgress",
      pairFailed: "errPairFailed", qrBusy: "errQrBusy",
      qrNotFound: "errQrNotFound", notFound: "errNotFound", badRequest: fallbackKey,
    };
    const key = map[data && data.code];
    return t(key || fallbackKey);
  }
  function fetchFailed() {
    return new Error(t("errNetwork"));
  }
  function setMethod(method) {
    document.querySelectorAll("[data-method]").forEach((button) => {
      const selected = button.dataset.method === method;
      button.classList.toggle("active", selected);
      button.setAttribute("aria-selected", String(selected));
    });
    document.querySelectorAll("[data-method-view]").forEach((view) => { view.hidden = view.dataset.methodView !== method; });
  }

  let codeTimer = null;
  let codeExpiresAt = 0;
  let codeActive = false;
  function updateExpiry() {
    if (!codeActive) return;
    const seconds = Math.max(0, Math.ceil((codeExpiresAt - Date.now()) / 1000));
    $("#expiry-label").textContent = `${seconds} ${t("seconds")}`;
  }
  function clearCodeTimer() {
    if (codeTimer) window.clearInterval(codeTimer);
    codeTimer = null;
  }

  const form = $("#pair-form");
  const phoneInput = $("#phone-number");
  const generateButton = $("#generate-button");
  const codePanel = $("#code-panel");
  const codeOutput = $("#pair-code");
  const copyButton = $("#copy-button");
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (codeActive) return;
    const phoneNumber = phoneInput.value.trim();
    const digits = phoneNumber.replace(/\D/g, "").replace(/^00/, "");
    if (!/^\d{8,15}$/.test(digits)) {
      showStatus(t("phoneInvalid"), "error");
      phoneInput.focus();
      return;
    }
    clearCodeTimer();
    codePanel.hidden = true;
    $("#status-message").hidden = true;
    generateButton.disabled = true;
    generateButton.querySelector(".button-label").textContent = t("generatingCode");
    try {
      const response = await fetch("/api/pair", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber })
      }).catch(() => { throw fetchFailed(); });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(serverError(data, "pairError"));
      if (!data.code) throw new Error(t("missingCode"));
      codeOutput.textContent = data.code;
      codePanel.hidden = false;
      copyButton.disabled = false;
      copyButton.textContent = t("copyCode");
      codeActive = true;
      codeExpiresAt = Date.now() + Math.max(1, Number(data.expiresIn) || 60) * 1000;
      updateExpiry();
      showStatus(t("codeReady"), "success");
      generateButton.disabled = true;
      codeTimer = window.setInterval(() => {
        updateExpiry();
        if (Date.now() >= codeExpiresAt) {
          clearCodeTimer();
          codeActive = false;
          codeOutput.textContent = t("expiredCode");
          copyButton.disabled = true;
          $("#expiry-label").textContent = t("expiredLabel");
          generateButton.disabled = false;
          showStatus(t("expiredCode"), "error");
        }
      }, 500);
    } catch (error) {
      codeActive = false;
      showStatus(error.message || t("pairError"), "error");
      generateButton.disabled = false;
    } finally {
      generateButton.querySelector(".button-label").textContent = t("generateCode");
    }
  });

  copyButton.addEventListener("click", async () => {
    if (!codeActive || !codeOutput.textContent) return;
    try {
      await navigator.clipboard.writeText(codeOutput.textContent);
    } catch {
      const range = document.createRange();
      range.selectNodeContents(codeOutput);
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
      const copied = document.execCommand("copy");
      selection.removeAllRanges();
      if (!copied) { showStatus(t("copyError"), "error"); return; }
    }
    copyButton.textContent = t("copied");
    showStatus(t("copied"), "success");
    window.setTimeout(() => { if (codeActive) copyButton.textContent = t("copyCode"); }, 1800);
  });

  const qrButton = $("#start-qr");
  const qrImage = $("#qr-image");
  const qrPlaceholder = $("#qr-placeholder");
  let qrSessionId = null;
  let qrPoller = null;
  let qrTerminal = false;
  function clearQrPoller() {
    if (qrPoller) window.clearInterval(qrPoller);
    qrPoller = null;
  }
  function showQrStatus(message, state) {
    const status = $("#qr-state");
    status.textContent = message;
    status.dataset.state = state || "";
  }
  function setQrPlaceholder(title, hint = t("qrPlaceholderHint")) {
    $("#qr-placeholder-title").textContent = title;
    $("#qr-placeholder-hint").textContent = hint;
    qrPlaceholder.hidden = false;
    qrImage.hidden = true;
    qrImage.removeAttribute("src");
  }
  async function pollQr() {
    if (!qrSessionId || qrTerminal) return;
    try {
      const response = await fetch(`/api/qr/${encodeURIComponent(qrSessionId)}`, { cache: "no-store" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(serverError(data, "qrFailed"));
      if (data.status === "ready" && data.svg) {
        qrImage.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(data.svg);
        qrImage.hidden = false;
        qrPlaceholder.hidden = true;
        showQrStatus(t("qrReady"), "ready");
        const seconds = Math.max(0, Math.ceil(Number(data.expiresIn || 0) / 1000));
        $("#qr-expiry").textContent = `${seconds} ${t("seconds")}`;
        $("#qr-expiry").hidden = seconds === 0;
      } else if (data.status === "connected") {
        qrTerminal = true;
        clearQrPoller();
        qrButton.disabled = false;
        $("#qr-expiry").hidden = true;
        showQrStatus(t("qrConnected"), "success");
      } else if (data.status === "expired") {
        qrTerminal = true;
        clearQrPoller();
        qrButton.disabled = false;
        $("#qr-expiry").hidden = true;
        setQrPlaceholder(t("qrExpired"));
        showQrStatus(t("qrExpired"), "expired");
      } else if (data.status === "error") {
        qrTerminal = true;
        clearQrPoller();
        qrButton.disabled = false;
        $("#qr-expiry").hidden = true;
        showQrStatus(t("qrFailed"), "error");
      } else {
        showQrStatus(t("qrWaiting"), "waiting");
      }
    } catch {
      qrTerminal = true;
      clearQrPoller();
      qrButton.disabled = false;
      showQrStatus(t("qrFailed"), "error");
    }
  }
  qrButton.addEventListener("click", async () => {
    if (qrSessionId && !qrTerminal) return;
    qrButton.disabled = true;
    qrButton.querySelector(".button-label").textContent = t("qrStarting");
    qrTerminal = false;
    qrSessionId = null;
    setQrPlaceholder(t("qrPlaceholder"));
    $("#qr-expiry").hidden = true;
    showQrStatus(t("qrStarting"), "starting");
    try {
      const response = await fetch("/api/qr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}"
      }).catch(() => { throw fetchFailed(); });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.sessionId) throw new Error(serverError(data, "qrFailed"));
      qrSessionId = data.sessionId;
      await pollQr();
      if (qrSessionId && !qrTerminal) qrPoller = window.setInterval(pollQr, 1500);
    } catch {
      qrTerminal = true;
      qrSessionId = null;
      qrButton.disabled = false;
      showQrStatus(t("qrFailed"), "error");
    } finally {
      qrButton.querySelector(".button-label").textContent = t("generateQr");
    }
  });

  document.querySelectorAll("[data-language]").forEach((button) => {
    button.addEventListener("click", () => {
      locale = button.dataset.language === "en" ? "en" : "fr";
      if (consentGiven) { try { localStorage.setItem("dentsu-locale", locale); } catch {} }
      applyLanguage();
    });
  });
  document.querySelectorAll("[data-method]").forEach((button) => button.addEventListener("click", () => setMethod(button.dataset.method)));
  $("#theme-toggle").addEventListener("click", () => {
    theme = theme === "dark" ? "light" : "dark";
    if (consentGiven) { try { localStorage.setItem("dentsu-theme", theme); } catch {} }
    applyTheme();
  });
  const consentGate = $("#consent-gate");
  const consentCookieCheck = $("#consent-cookie");
  const consentTermsCheck = $("#consent-terms");
  const consentAccept = $("#consent-accept");
  const consentError = $("#consent-error");
  function updateConsentButton() {
    consentAccept.disabled = !(consentCookieCheck.checked && consentTermsCheck.checked);
    consentError.hidden = true;
  }
  consentCookieCheck.addEventListener("change", updateConsentButton);
  consentTermsCheck.addEventListener("change", updateConsentButton);
  consentAccept.addEventListener("click", () => {
    if (consentAccept.disabled) return;
    const secure = location.protocol === "https:" ? "; Secure" : "";
    document.cookie = consentCookieName + "=terms-v1; Max-Age=15552000; Path=/; SameSite=Lax" + secure;
    consentGiven = document.cookie.split(";").some((entry) => entry.trim() === consentCookieName + "=terms-v1");
    if (!consentGiven) {
      consentError.textContent = t("consentStorageError");
      consentError.hidden = false;
      return;
    }
    try {
      localStorage.setItem("dentsu-locale", locale);
      localStorage.setItem("dentsu-theme", theme);
    } catch {}
    consentGate.hidden = true;
    document.body.classList.remove("consent-open");
    loadPairingVideo();
  });
  consentGate.hidden = consentGiven;
  document.body.classList.toggle("consent-open", !consentGiven);
  if (consentGiven) loadPairingVideo();
  videoSoundToggle.addEventListener("click", async () => {
    pairingVideo.muted = !pairingVideo.muted;
    updateVideoSoundButton();
    videoStatus.hidden = true;
    if (pairingVideo.paused) {
      try { await pairingVideo.play(); } catch {
        videoStatus.textContent = t("videoPlaybackBlocked");
        videoStatus.hidden = false;
      }
    }
  });
  pairingVideo.addEventListener("error", () => {
    videoStatus.textContent = t("videoLoadError");
    videoStatus.hidden = false;
  });
  applyLanguage();
  setMethod("code");
})();
