// Contrôle automatique du rendu (couleurs, textes, ordre) de la capture.
const { chromium } = require("playwright");
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 380, height: 420 } });
  await page.goto("file:///tmp/menu-buttons.html");
  const info = await page.evaluate(() => {
    const g = (s) => document.querySelector(s);
    const cs = (el) => getComputedStyle(el);
    return {
      bubbleBg: cs(g(".bubble")).backgroundColor,
      bodyText: g(".body").textContent,
      footer: g(".footer span").textContent,
      footerColor: cs(g(".footer span")).color,
      buttons: [...document.querySelectorAll(".btn")].map((b) => ({ text: b.textContent.trim(), color: cs(b).color })),
      overflow: document.body.scrollWidth > 380,
    };
  });
  console.log(JSON.stringify(info, null, 2));
  await browser.close();
})();
