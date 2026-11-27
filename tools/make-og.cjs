// SNS で貼られたときの絵（og.png 1200×630）を作る。今日の問題（答え）は入れず、遊び方の例だけ（問題データにない言い方で、正解の印も付けない。CodeRabbit mansion-kimari#1）。
// 使い方: node tools/make-og.cjs（qa/ の playwright を使う）
const path = require("path");
const { chromium } = require(path.join(__dirname, "..", "qa", "node_modules", "playwright"));
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  const p = await b.newPage({ viewport: { width: 1200, height: 630 } });
  const btn = (mk, t) => `<div style="flex:1;font-size:30px;font-weight:900;padding:14px 8px;border-radius:12px;background:#fff;border:3px solid #1f1d3a;text-align:center">${mk}<br>${t}</div>`;
  let stars = ""; let seed = 7; const R = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let n = 0; n < 40; n++) stars += `<circle cx="${Math.round(R() * 580)}" cy="${Math.round(R() * 150)}" r="2" fill="#fff7d6"/>`;
  await p.setContent(`<body style="margin:0;font-family:'Noto Sans CJK JP','IPAPGothic',sans-serif">
  <div style="width:1200px;height:630px;box-sizing:border-box;padding:48px 64px;background:#f1eefa;color:#1f1d3a;display:flex;gap:48px;align-items:center">
    <div style="flex:0 0 420px">
      <div style="font-size:30px;color:#7d2246;letter-spacing:.06em">経験機械の思考実験</div>
      <div style="font-size:84px;font-weight:900;margin-top:8px;line-height:1.15;color:#26245e">夢の機械、<br><span style="color:#a8325e">入る？</span></div>
      <div style="font-size:36px;margin-top:14px">もう中にいたら<br>出る？</div>
    </div>
    <div style="flex:1;background:#fffdfb;border:4px solid #1f1d3a;border-radius:16px;overflow:hidden">
      <svg width="580" height="210" viewBox="0 0 580 210" style="display:block;background:#26245e">${stars}<rect x="0" y="186" width="580" height="24" fill="#3a376f"/><rect x="230" y="30" width="120" height="156" rx="58" fill="#4f4aa8" stroke="#c9c4ff" stroke-width="4"/><rect x="248" y="50" width="84" height="110" rx="42" fill="#8f89e8" fill-opacity=".55"/><circle cx="120" cy="140" r="14" fill="#ffe2a8"/><rect x="106" y="156" width="28" height="30" rx="10" fill="#ffe2a8"/></svg>
      <div style="display:flex;gap:10px;padding:16px">${btn("🌙", "入る")}${btn("🚶", "入らない")}${btn("？", "迷う")}</div>
    </div>
  </div></body>`);
  await p.screenshot({ path: path.join(__dirname, "..", "og.png") });
  await b.close();
})();
