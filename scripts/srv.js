// Petit serveur du site de jumelage seul (sans bot), pour la prévisualisation.
// Usage : node scripts/srv.js   (écoute sur $PORT, 3000 par défaut)
const { startWebServer } = require("../lib/web");
startWebServer({ port: process.env.PORT || 3000 });
