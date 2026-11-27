// アプリのアイコン（icon-192.png・icon-512.png）を作る。夜の藍の地に、星と夢の機械（夢の機械、入る？）。
// 使い方: node tools/make-icons.cjs（qa/ の playwright を使う）
const path = require("path");
const { chromium } = require(path.join(__dirname, "..", "qa", "node_modules", "playwright"));
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  for (const s of [192, 512]) {
    const p = await b.newPage({ viewport: { width: s, height: s } });
    await p.setContent(`<body style="margin:0"><svg width="${s}" height="${s}" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <rect width="100" height="100" fill="#26245e"/>
      <circle cx="16" cy="18" r="1.6" fill="#fff7d6"/><circle cx="84" cy="14" r="1.6" fill="#fff7d6"/><circle cx="78" cy="40" r="1.2" fill="#fff7d6"/><circle cx="20" cy="46" r="1.2" fill="#fff7d6"/>
      <rect x="30" y="16" width="40" height="70" rx="20" fill="#4f4aa8" stroke="#c9c4ff" stroke-width="3"/>
      <rect x="37" y="25" width="26" height="46" rx="13" fill="#8f89e8" fill-opacity=".6"/>
      <circle cx="50" cy="40" r="5" fill="#ffe2a8"/><rect x="45" y="46" width="10" height="16" rx="4" fill="#ffe2a8"/>
      <rect x="10" y="86" width="80" height="4" rx="2" fill="#a8325e"/></svg></body>`);
    await p.screenshot({ path: path.join(__dirname, "..", `icon-${s}.png`), clip: { x: 0, y: 0, width: s, height: s } });
  }
  await b.close();
})();
