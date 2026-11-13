// Boutons du menu WhatsApp (rendu identique à un message interactif natif) :
//   ┌───────────────┐
//   │  ... Voir plus│
//   │ Made with ❤️ By NatsuTech's   19:51
//   │   ↗ 🌐 WEBSITE
//   │   ↶ 🔴 PING
//   └───────────────┘
// Le texte sous le menu est le FOOTER du message interactif ; la couleur est
// décidée par WhatsApp (gris sur thème sombre) : elle ne peut pas être forcée
// depuis le bot.
const config = require("../config");

const FOOTER = require("../menu").WA_MENU_FOOTER;
// Le bouton doit pointer vers le site Vercel public, pas vers l'URL Railway
// (webPairing) ni vers l'ancienne URL Render.
const SITE_URL = () => config.LINKS?.website || "https://dentsu-mini-bot.vercel.app";

// Limite pratique du corps d'un message interactif WhatsApp.
const WA_INTERACTIVE_BODY_LIMIT = 1024;

function buildMenuButtons({ menuBody }) {
  const body = String(menuBody || "");
  return {
    footer: FOOTER,
    bodyTooLong: body.length > WA_INTERACTIVE_BODY_LIMIT,
    interactiveMessage: {
      header: { title: config.BOT_NAME || "DENTSU MINI BOT", hasMediaAttachment: false },
      body: { text: body },
      footer: { text: FOOTER },
      nativeFlowMessage: {
        buttons: [
          {
            name: "cta_url",
            buttonParamsJson: JSON.stringify({
              display_text: "WEBSITE",
              url: SITE_URL(),
              merchant_url: SITE_URL(),
            }),
          },
          {
            name: "quick_reply",
            buttonParamsJson: JSON.stringify({ display_text: "PING", id: `${config.PREFIX}ping` }),
          },
        ],
      },
    },
  };
}

module.exports = { buildMenuButtons, FOOTER, SITE_URL, WA_INTERACTIVE_BODY_LIMIT };
