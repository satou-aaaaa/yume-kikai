// 夢の機械、入る？の検査。考える問題の作り方（18種類×3000問：選び肢・答えは1つ・答えと2段目が論文の数字と文のとおり・出典がある）・
// 夢の機械の進み方（5つの問い・いまの所に残った答えの数・答え方の形）・今日の回と上級の組み方（3年分）・とことんの並び（何百回作って1回の中で重ならない）・通しで遊ぶ・
// まちがい・ヒント・続きから・上級・練習・とことん・考え帳・実績・カレンダー・あとから・文字の大きさ・言い方（研究の数は1回の結果と書く）・スマホ幅・PWA・引き継ぎ・見やすさを確かめる。
// 使い方: node qa/run.mjs   失敗があれば終了コード 1。結果は qa-report/report.md。
import { chromium } from "playwright";
import { mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { createRequire } from "node:module";
import { createServer } from "node:http";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { checkTransfer } from "./transfer-check.mjs";
import { checkSwStall } from "./sw-check.mjs";
import { checkDepth } from "./depth-check.mjs";
import { checkCore } from "./core-check.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const results = [];
const check = (name, ok, detail = "") => results.push({ name, ok: !!ok, detail: String(detail).slice(0, 400) });
const firstClose = async (q) => { if (await q.locator("#howto[open]").count()) await q.click("#howto-ok"); if (await q.evaluate(() => !!(window.Core && Core.coach && Core.coach.active()))) { await q.evaluate(() => { Core.coach.leave(); scrollTo(0, 0); }); await q.waitForTimeout(100); } }; // はじめての練習の吹き出しをやめてホームへ（sync-template の migrateFirstQa が足した）
const G = createRequire(import.meta.url)(path.join(root, "data.js"));
const PIN = "m-res:5:木村さん:yama"; // 第1回の1問目（変わったら過去の日の問題が変わった印）
// ---- 1. 問題の作り方（ブラウザを使わない）----
// 論文の数字（ゲームとは別に書いた表。data.js の ST と答え・2段目がこれと合うかを見る）。機械を選んだ人の割合（%）
// 出典：Weijers 2014 Philosophical Psychology 27(4)：ノージックのまま 13/79（p.519）・自分 27/79（p.520）・知らない人 43/82（p.523）・
// いまの暮らしを外した知らない人 42/77（p.525・本文「約55%」）・いとこ 35/77・友だち 35/81（p.523–524）。
// De Brigard 2010 Philosophical Psychology 23(1)：何も知らせない 残る46%（p.48）・刑務所 87%（p.47）・芸術家 50%（p.47–48）・研究2 59%（80人。p.49）。2026-11-27 に読んだ
const TB = { noz: 16, wself: 34, wst: 52, wnsq: 55, wcou: 45.5, wfri: 43.2, dbn: 46, dbneg: 87, dbpos: 50, db2: 59 };
const TBN = { noz: 79, wself: 79, wst: 82, wnsq: 77, wcou: 77, wfri: 81, dbn: 24, dbneg: 24, dbpos: 24, db2: 80 };
const TBK = { noz: 13, wself: 27, wst: 43, wnsq: 42, wcou: 35, wfri: 35 };
// 変えた条件（いまいる所・外の暮らしの中身・だれのことか）
const TBC = { "noz>dbn": "ima", "dbn>dbneg": "soto", "dbn>dbpos": "soto", "dbn>db2": "soto", "dbpos>dbneg": "soto", "wself>wst": "dare", "wst>wnsq": "ima", "wst>wcou": "dare", "wst>wfri": "dare" };
const condOf = (a, b) => TBC[a + ">" + b] || TBC[b + ">" + a];
{
  const bad = {}, seen = {}, N = 3000;
  for (const id of Object.keys(TB)) {
    const s = G.ST[id];
    if (!s || s.mach !== TB[id] || s.n !== TBN[id] || (TBK[id] && s.k !== TBK[id]) || Math.abs(s.pa + s.mach - 100) > 0.01) bad["ST:" + id] = "論文の数字とちがう";
    if (TBK[id] && Math.abs(TBK[id] / TBN[id] * 100 - TB[id]) > 0.6) bad["TB:" + id] = "人数と割合が合わない";
  }
  check("研究の数字：data.js の ST が論文の数字（別に書いた表）と同じ・人数と割合が合う", Object.keys(bad).length === 0 && Object.keys(G.ST).length === Object.keys(TB).length, JSON.stringify(bad));
  for (const k of G.KINDS) {
    seen[k.id] = new Set();
    for (let s = 0; s < N; s++) {
      const P = G.make(`${k.id}|qa${s}`), why = [];
      if (!P) { bad[k.id] = "作れない"; break; }
      const n = P.type === "kata" ? 4 : 3;
      if (P.opts.length !== n || new Set(P.opts).size !== n || !P.opts.includes(P.ans)) why.push(`選び肢が${n}つちがう・答えを含まない`);
      if ([P.q, P.media, P.ask, P.why, ...P.opts].some((x) => typeof x !== "string" || !x || /undefined|NaN|null|\$\{|＠/.test(x))) why.push("中身が空");
      if (P.grp && (!P.g2.includes(P.grp) || !P.g2.every((g) => G.GROUPS[g]) || !P.ask2 || !P.gwhy)) why.push("2段目の答えが選び肢に無い");
      if (!Array.isArray(P.src) || !P.src.length || !P.src.every((x) => Object.values(G.SRC).includes(x))) why.push("出典が無い");
      if (P.type === "riyuu") { if (P.ans !== G.R3[["r-do", "r-be", "r-real"].indexOf(k.id)]) why.push("理由の答えがちがう"); }
      else if (P.type === "kikai") { if (P.ans !== G.M3[["m-exp", "m-trans", "m-res"].indexOf(k.id)]) why.push("機械の答えがちがう"); }
      else if (P.type === "kata") {
        const out = (P.q.match(/外では「(入る|入らない)」/) || [])[1], inn = (P.q.match(/中だと知ると「(出る|残る)」/) || [])[1];
        const a = out === "入らない" && inn === "残る" ? "いまの所に残る" : out === "入らない" && inn === "出る" ? "いつも本物" : out === "入る" && inn === "残る" ? "いつも機械" : out === "入る" && inn === "出る" ? "いつも動く" : null;
        if (!a || P.ans !== a) why.push("答え方の形が文とちがう");
      } else if (P.type === "jouken") {
        const [A, B] = P.q.split("\n").map((x) => x.replace(/^[AB]：/, "")), d = [];
        const place = (t) => (/もう|中。/.test(t) ? 1 : 0), dare = (t) => (/知らない人/.test(t) ? 1 : 0), soto = (t) => (t.match(/外(のことは知らない|はつらい暮らし|ははなやかな暮らし)/) || [])[1] || "";
        if (place(A) !== place(B)) d.push("いまいる所"); if (dare(A) !== dare(B)) d.push("だれのことか"); if (soto(A) !== soto(B) && place(A) && place(B)) d.push("外の暮らしの中身");
        if (d.length !== 1 || P.ans !== d[0]) why.push("ちがう条件が1つでない・答えとちがう:" + d.join());
      } else if (P.type === "tasuu") {
        const id = P.v, m = TB[id], a = 100 - m > 70 ? `「${G.ST[id].A}」が7割より多い` : m > 70 ? `「${G.ST[id].B}」が7割より多い` : m >= 30 && m <= 70 ? "どちらも3割から6割" : null;
        if (!a || P.ans !== a || (m > 60 && m <= 70) || (m < 40 && m >= 30)) why.push("多かった答えが論文の数字とちがう（6割〜7割の数は出さない）");
        const c = G.TCMP[id]; if (c && condOf(c[0], id) !== P.grp) why.push("2段目（変えた条件）がちがう");
        if (!P.why.includes(String(m) + "%")) why.push("説明に数字が無い");
      } else if (P.type === "yosou") {
        const [a, b] = P.v.split(">"), d = TB[b] - TB[a], y = d >= 10 ? "ふえた" : d <= -10 ? "へった" : Math.abs(d) <= 5 ? "ほぼ同じ" : null;
        if (!y || P.ans !== y) why.push("ふえた・へったが論文の数字とちがう");
        if (condOf(a, b) !== P.grp) why.push("2段目（変えた条件）がちがう");
      } else why.push("知らない形");
      if (P.q.includes(P.ans)) why.push("問いに答えの名前が出ている");
      if (JSON.stringify(G.make(`${k.id}|qa${s}`)) !== JSON.stringify(P)) why.push("同じ種で同じ問題にならない");
      seen[k.id].add(G.keyOf(P));
      if (why.length && !bad[k.id]) bad[k.id] = why.join("・") + "：" + P.q + " " + P.opts.join(" / ") + " " + P.ask2;
    }
  }
  check(`問題：${G.KINDS.length}種類×${N}問で、選び肢（形4・ほか3）・答えは1つ・答えと2段目が論文の数字と文のとおり・出典がある`, Object.keys(bad).length === 0, JSON.stringify(bad));
  const total = Object.values(seen).reduce((a, s) => a + s.size, 0), few = G.KINDS.filter((k) => seen[k.id].size < (k.lv === 2 ? 3 : 12)).map((k) => `${k.id}:${seen[k.id].size}`);
  check("問題の数：全部で300通り以上・やさしい・ふつうの種類は12通り以上・研究の数字は3通り以上（好きなだけ遊んでも同じ問題が続かない。game-dev.md F6）", total >= 300 && few.length === 0, `${total}通り ${few.join(",")}`);
  check("問題：種類は18（やさしい6・ふつう7・むずかしい5）", G.KINDS.length === 18 && [0, 1, 2].map((l) => G.kindsOf(l).length).join() === "6,7,5");
  const used = new Set(G.KINDS.flatMap((k) => [...Array(300)].map((_, j) => G.make(`${k.id}|u${j}`).v)).filter((v) => /^[a-z0-9]+$/.test(v) && G.ST[v]));
  check("研究の数字の問題：ノージックのまま・逆向き（何も知らせない・刑務所・芸術家・まったくちがう）・知らない人・いまの暮らしを外す・いとこ・友だちが全部出る", ["noz", "dbn", "dbneg", "dbpos", "db2", "wst", "wnsq", "wcou", "wfri"].every((x) => used.has(x)), [...used].join());
  const g2 = new Set(G.KINDS.flatMap((k) => [...Array(200)].map((_, j) => G.make(`${k.id}|g${j}`).grp)).filter(Boolean));
  check("2段目の答えは3つとも出る（いまいる所・外の暮らしの中身・だれのことか）", Object.keys(G.GROUPS).every((g) => g2.has(g)), [...g2].join());
  const ys = new Set(); for (const k of ["y-up", "y-down", "y-same"]) for (let j = 0; j < 200; j++) ys.add(G.make(`${k}|y${j}`).v);
  check("ふえた・へった・ほぼ同じの組は14とも出る", ys.size === G.YP.length && G.YP.length === 14, ys.size);
  const longWhy = [], longLook = [], longOpt = [];
  for (const k of G.KINDS) { if ([...k.look].length > 45 || [...k.key].length > 60) longLook.push(k.id); for (let s = 0; s < 200; s++) { const P = G.make(`${k.id}|len${s}`); if ([...P.why].length > 110) longWhy.push(P.why); for (const o of P.opts) if ([...o].length > 20) longOpt.push(o); if ([...P.q].length > 80) longOpt.push(P.q); } }
  check("説明は110字以内・ヒントは45字・60字以内・選び肢は20字以内・問いは80字以内（やさしい日本語。一文を短く）", !longWhy.length && !longLook.length && !longOpt.length, longWhy.concat(longLook, longOpt.slice(0, 3)).slice(0, 3).join(","));
  check("答えの出典は Nozick 1974・De Brigard 2010（doi）・Weijers 2014（doi）の3つ", Object.keys(G.SRC).length === 3 && G.SRC.noz[1] === "https://rintintin.colorado.edu/~vancecd/phil3160/Nozick1.pdf" && G.SRC.db[1] === "https://doi.org/10.1080/09515080903532290" && G.SRC.wj[1] === "https://doi.org/10.1080/09515089.2012.757889");
}
{
  // 夢の機械：5つの問い・いまの所に残った答えの数・答え方の形（ブラウザの関数と同じ決め方を、ここでは別に書いて比べる）
  check("夢の機械の問いは5つ（外で入る・中で出る・外は刑務所・外は芸術家・知らない人）で、くらべる研究は論文の数字", G.STEPS.length === 5 && G.STEPS.map((s) => s.st).join() === "noz,dbn,dbneg,dbpos,wnsq" && G.STEPS.every((s) => s.opts.length === 3 && s.mk.length === 3 && s.opts[2] === "迷う" && s.opts[s.mach] && (s.stay === -1 || s.opts[s.stay])));
  const bad = [];
  for (let n = 0; n < 243; n++) { const a = [0, 1, 2, 3, 4].map((i) => Math.floor(n / 3 ** i) % 3); const p = (a[0] === 1) + (a[1] === 1) + (a[2] === 1) + (a[3] === 1); if (G.stayScore(a) !== p) bad.push(a.join("")); const k = G.kataOf(a), e = a[0] === 2 || a[1] === 2 ? -1 : a[0] === 1 && a[1] === 1 ? 0 : a[0] === 1 && a[1] === 0 ? 1 : a[0] === 0 && a[1] === 1 ? 2 : 3; if (k !== e) bad.push("形" + a.join("")); }
  check("いまの所に残った答え（入らない・残る×3）の数と答え方の形が、243通りの答えで別に書いた決め方と同じ", bad.length === 0, bad.slice(0, 5).join(","));
  const days = new Set(); for (let i = 0; i < 60; i++) days.add(G.themeOf(new Date(Date.parse("2026-11-27") + i * 864e5).toISOString().slice(0, 10)));
  check("今日の機械のお題は日付で決まり、2か月で5つとも出る", days.size === 5 && G.THEMES.length === 5);
}
{
  // 今日の5問・上級の組み方（3年分）
  const bad = [], cover = new Set(); let sameAsPrev = 0, prev = "";
  const d0 = Date.parse("2026-11-27");
  for (let i = 0; i < 365 * 3; i++) {
    const d = new Date(d0 + i * 864e5).toISOString().slice(0, 10), dl = G.dailyTags(d), hl = G.hardTags(d);
    const dk = dl.map((t) => t.split("|")[0]), hk = hl.map((t) => t.split("|")[0]);
    if (dl.length !== 5 || new Set(dk).size !== 5 || dk.map((k) => G.BY[k].lv).join() !== "0,0,1,1,2") bad.push(d + " 今日");
    if (hl.length !== 3 || new Set(hk).size !== 3 || hk.some((k) => G.BY[k].lv !== 2) || hk.includes(dk[4])) bad.push(d + " 上級");
    if (JSON.stringify(dl) !== JSON.stringify(G.dailyTags(d))) bad.push(d + " 同じにならない");
    if ([...dl, ...hl].some((t) => !G.make(t))) bad.push(d + " 作れない");
    if (dk.join() === prev) sameAsPrev++; prev = dk.join();
    if (i < 60) [...dk, ...hk].forEach((k) => cover.add(k));
  }
  check("今日の5問（やさしい2・ふつう2・むずかしい1、種類は重ねない）と上級（むずかしい3・今日のむずかしいと別）を3年分作れる", bad.length === 0, bad.slice(0, 5).join(","));
  check(`2か月のうちに${G.KINDS.length}種類が全部出る・前の日と同じ組の日が少ない`, cover.size === G.KINDS.length && sameAsPrev < 20, `${cover.size}種類・前の日と同じ ${sameAsPrev}日`);
  // 過去の日の問題が変わらない（data.js を直したときの見張り。値は 2026-11-27 に作ったもの）
  const P0 = G.make(G.dailyTags("2026-11-27")[0]);
  check("第1回（2026-11-27）の1問目と機械のお題が作ったときのまま（並べ替え・削除で過去の日の問題を変えない）", `${P0.kind}:${P0.v}:${G.themeOf("2026-11-27")}` === PIN, `${P0.kind}:${P0.v}:${G.themeOf("2026-11-27")}`);
}
// ---- 2. ファイルの中身 ----
const html = readFileSync(path.join(root, "index.html"), "utf8"), gen = readFileSync(path.join(root, "data.js"), "utf8"), readme = readFileSync(path.join(root, "README.md"), "utf8");
const ext = [...html.matchAll(/(?:src|href)="(https?:[^"]+)"/g)].map((m) => m[1]).filter((u) => !/^https:\/\/fonts\.googleapis\.com(\/|$)|^https:\/\/ko-fi\.com\/satouaaaaa$/.test(u));
check("外から読むのは文字（Google Fonts）だけ。スクリプト・広告・解析を入れない（出典のリンクは押したときに開くだけ）", ext.length === 0 && ![...html.matchAll(/<script[^>]+src="([^"]+)"/g)].some((m) => /^https?:/.test(m[1])), ext.join(","));
check("CSP で通信先を自分だけにしている（connect-src は 'self' だけ。CodeRabbit menkyo-nenrei#1）", (html.match(/connect-src[^;"]*/g) || []).map((s) => s.trim()).join("|") === "connect-src 'self'");
check("Math.random は練習・とことんの種だけ（今日の5問・上級は日付の乱数。data.js には無い）", (html.match(/Math\.random/g) || []).length === 2 && !/Math\.random/.test(gen));
check("乱数は sort の比較の中で引かない（ブラウザで引く回数が変わる）", !/\.sort\(\s*\([^)]*\)\s*=>[^\n;]*\b(R|rng|rand|Math\.random)\s*\(/.test(html + gen));
{ const inl = html.split("<script>").slice(1).map((x) => x.split("</" + "script>")[0]).join("\n"); // index.html の中の script も見る（nemuri-kotsu#1 で行の途中に // を入れて画面が動かなくなった）
  check("一行の式の途中にコメント // を足さない（行の残りが消える。rosen-hitofude 2026-11-04・nemuri-kotsu#1）", !/;\s*\/\/[^\n]*;\s*\w/.test((gen + "\n" + inl).split("\n").filter((l) => !l.trim().startsWith("//")).join("\n"))); }
check("言い方：「必ず」「絶対」と言い切らない（政令の例外もある）・画像を入れない", !/絶対に|必ず(当て|わか|見分|建て)/.test(html + gen + readme) && !/<img/.test(html));
{ const howto = (html.match(/<dialog id="howto"[\s\S]*?<\/dialog>/) || [""])[0], ab = (html.match(/function about\(\)[\s\S]*?\n}/) || [""])[0], dis = (t) => /1回の結果/.test(t) && /人みんなの答えではありません/.test(t) && /論文で確かめてください/.test(t) && /短く(やさしく)?言いかえ/.test(t) && /正解(は|が)(あり|無い)/.test(t);
  check("言い方：遊び方・「このゲームについて」・README のどれにも、論文を言いかえた文であること・研究の数は1回の結果で人みんなの答えではないこと・論文で確かめること・夢の機械に正解が無いことがある", dis(howto) && dis(ab) && dis(readme), `遊び方 ${dis(howto)}・について ${dis(ab)}・README ${dis(readme)}`); }
check("写し元（感想フォームも見る・どこから砂山？とその元の どこの裁判所？・裁判の期限・会社の任期と期限・何年とっておく？・特許は何年？・免許は何歳から？・駐車禁止は何m？・届け出いつまで？・危険物の類あて・用途地域あて・岩石系統分け・SDGsの目標あて・憲法のしくみ）の言葉が残っていない（共通部品 store の中は除く・game-dev.md A 手順5）", !/砂山|砂の|1粒|人だかり|予報用語|気象庁|猛暑|真夏日|冬日|sunayama|sny|SNY|ソリテス|エウブリデス|ことば帳|決めた線|裁判所|簡易|控訴|上告|訴訟|審判|少額|140万円|管轄|不服|三審|saibansho|ssd|SSD|岩石|ganseki|GNK|gnk|産総研|地質|gsj|火成|堆積|変成|SDG|ターゲット|仮訳|外務省|アジェンダ|震度|地震|ようす帳|憲法|kenpo|kps|KPS|用途地域|都市計画|建築基準|youto|yto|YTO|危険物|消防法|第何類|固体|液体|品名|kikenbutsu|kbr|KBR|届け出|市区町村|税務署|todokede|tdk|TDK|駐車|停車|chusha|ckr|CKR|場所帳|免許|menkyo|mkn|MKN|道路交通法|特許|商標|意匠|tokkyo|tkk|TKK|期間帳|期限帳|保存期間|hozon|hzk|HZK|カルテ|処方|会社の任期|会社帳|kaisha|ksk|KSK|取締役|監査役|株主|裁判の期限|saiban-kigen|sbk|SBK|勾留|逮捕|送致|支払督促|刑事訴訟法|期間は？/.test(html.replace(/<!-- store:begin[\s\S]*?<!-- store:end -->/, "") + gen + readme + readFileSync(path.join(root, ".github/ISSUE_TEMPLATE/feedback.yml"), "utf8") + readFileSync(path.join(root, "manifest.webmanifest"), "utf8")));
check("画面にお笑いの言葉を入れない（本物っぽく）", !/お笑い|ギャグ|ツッコミ|なんでやねん|（うそ）/.test(html + gen));
check("引き継ぎ：transfer.js をゲームの script より前に、このゲームの記録のキー（記録・文字・復習）だけで読む・depth.js も前に読む", /<script src="transfer\.js" data-game="yume-kikai" data-keys="ymk-v1,ymk-fs,ymk-depth"><\/script>\s*<script src="depth\.js" data-game="yume-kikai" data-key="ymk-depth"><\/script>\s*<\/head>/.test(html) && html.indexOf('src="transfer.js"') < html.indexOf('src="data.js"') && /data-hk/.test(html) && existsSync(path.join(root, "transfer.js")));
check("好きなだけ遊べる：チケット・回数の上限・🔒で開くモードを入れない（game-dev.md F1・F2）", !/🎫|チケット|すると開く|🔒/.test(html) && !/\blife\b|ELIFE/.test(html));
{ const og = (k) => (html.match(new RegExp(`<meta (?:property|name)="${k}" content="([^"]+)"`)) || [])[1] || "";
  const png = readFileSync(path.join(root, "og.png"));
  check("SNS で貼ると絵と題が出る（OGP・1200×630・絶対URL）", og("og:title") && og("og:description") && og("og:image") === "https://satou-aaaaa.github.io/yume-kikai/og.png" && og("twitter:card") === "summary_large_image" && png.readUInt32BE(16) === 1200 && png.readUInt32BE(20) === 630); }
{ const mk = readFileSync(path.join(root, "tools/make-og.cjs"), "utf8");
  check("SNS の絵に今日の問題と答えを出さない：問題の文・正解の印を make-og に書かない（CodeRabbit mansion-kimari#1）", !/[>"'`]正解/.test(mk) && G.KINDS.every((k) => !mk.includes(k.name) && [...Array(30)].every((_, j) => !mk.includes(G.make(`${k.id}|o${j}`).q))));
}
{ const fy = readFileSync(path.join(root, ".github/ISSUE_TEMPLATE/feedback.yml"), "utf8");
  check("感想フォームの name が3字以上（2字だとフォームが出ない。shared-workflows incidents/2026-11-05-feedback-form-not-shown.md）", [...((fy.match(/^name:\s*(.+)$/m) || [])[1] || "").trim()].length >= 3);
  check("感想フォームは名前・メールを聞かない", /id: fun/.test(fy) && !/id: (name|email|mail)/.test(fy) && /labels: \["感想"\]/.test(fy)); }
check("README の URL のすぐ後ろに全角の字を続けない（Link check が URL の一部と読む）", !/https?:\/\/[\x21-\x7e]*[^\x00-\x7f]/.test(readme.replace(/\]\(https?:\/\/[^)\s]+\)/g, "").replace(/<https?:\/\/[^>\s]+>/g, "")));
{ const sw = readFileSync(path.join(root, "sw.js"), "utf8"), mf = JSON.parse(readFileSync(path.join(root, "manifest.webmanifest"), "utf8"));
  const shell = JSON.parse(sw.match(/SHELL = (\[[^\]]+\])/)[1]);
  check("PWA：sw.js は画面のファイルを全部保存し（引き継ぎの transfer.js・深さの depth.js も）、取り直して保存し、外へ何も送らない", ["./index.html", "./data.js", "./transfer.js", "./transfer-qr.js", "./depth.js", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png"].every((f) => shell.includes(f)) && /cache: "reload"/.test(sw) && !/https?:\/\//.test(sw.replace(/^\/\/.*$/gm, "")));
  { const st = await checkSwStall(sw); check("PWA：通信が止まっても4秒ほどで保存した画面に切り替わり、少しずつ届く受信は待ち、何も無ければ60秒で返す（shared-workflows template/qa/sw-check.mjs）", st.ok, JSON.stringify(st)); }
  check("PWA：manifest にアイコン2つと名前がある", mf.name === "夢の機械、入る？" && mf.icons.length >= 2 && mf.start_url === "./"); }

// ---- 3. ブラウザで遊ぶ ----
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".png": "image/png", ".webmanifest": "application/manifest+json" };
const server = createServer((req, res) => {
  const p = decodeURIComponent(new URL(req.url, "http://x").pathname), f = path.join(root, p === "/" ? "index.html" : p);
  if ((f !== root && !f.startsWith(root + path.sep)) || !existsSync(f)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { "content-type": TYPES[path.extname(f)] || "application/octet-stream" }); res.end(readFileSync(f));
}).listen(0, "127.0.0.1");
await new Promise((r) => server.once("listening", r));
const url = `http://127.0.0.1:${server.address().port}/`;
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const errors = [];
const TODAY = new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);
const dayBefore = (n) => new Date(Date.parse(TODAY) - n * 864e5).toISOString().slice(0, 10);
async function newPage(w = 390, ctx) {
  const c = ctx || await browser.newContext({ viewport: { width: w, height: 800 } });
  await c.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  const p = await c.newPage();
  p.on("pageerror", (e) => errors.push(e.message));
  p.on("console", (m) => { if (m.type() === "error" && !/ERR_FAILED|net::/.test(m.text())) errors.push(m.text()); });
  await p.goto(url); await p.waitForTimeout(200);
  return p;
}
const closeHow = async (p) => { await firstClose(p); };
const ansIdx = (p) => p.evaluate(() => { const c = __nm.cur(); return c.P.opts.indexOf(c.P.ans); });
const wrongIdx = (p) => p.evaluate(() => { const c = __nm.cur(); return c.P.opts.findIndex((o) => o !== c.P.ans && !c.wrong.includes(o)); });
const mem = (p) => p.evaluate(() => JSON.parse(localStorage.getItem("ymk-v1") || "{}"));
// 2段目「どのきまり？」が出たら、正しい系統を押す
const why = async (p) => { await p.waitForSelector(".verdict, .why button"); if (await p.locator(".verdict").count()) return; await p.click(`.why button[data-g="${await p.evaluate(() => __nm.cur().P.grp)}"]`); };
// 今日の回のはじめの夢の機械：5つに答え（はじめは「入らない」「残る」…）、研究の答えを見たら考える問題の5問へ
const heap = async (p, ans = [1, 1, 1, 1, 0]) => {
  for (let k = 0; k < 10 && await p.locator(".hans").count(); k++) { const i = await p.evaluate(() => { const r = __nm.load().runs[__nm.mode()]; return r && r.mc ? r.mc.a.length : 0; }); await p.click(`.hans button[data-a="${ans[i] ?? 0}"]`); }
  if (await p.locator("#hp-go").count()) await p.click("#hp-go");
};
async function solve(p, { wrong = 0 } = {}) {
  for (let i = 0; i < wrong; i++) await p.click(`.ch[data-j="${await wrongIdx(p)}"]`);
  await p.click(`.ch[data-j="${await ansIdx(p)}"]`);
  await why(p);
  await p.waitForSelector(".verdict");
}

try {
  // はじめて：遊び方が出る・文字の大きさ
  const p = await newPage();
  check("はじめて開くと遊び方が出る", await p.locator("#core-coach").waitFor({ timeout: 3000 }).then(() => true, () => false));
  { const c = await browser.newContext(); const r = await c.newPage(); await r.goto(url); await r.waitForTimeout(200); let again = 0;
    for (let i = 0; i < 10; i++) { await r.evaluate(() => localStorage.clear()); await r.reload(); await r.waitForTimeout(200); await r.keyboard.press("Escape"); await r.reload(); await r.waitForTimeout(200); again += await r.locator("#howto[open]").count() + await r.locator("#core-coach").count(); }
    check("遊び方を Esc で閉じてすぐ読み直しても出ない（10回）", again === 0);
  { const c = await browser.newContext(); const r = await c.newPage(); const big = []; // 題が h1{flex:1} で縦に伸び（伸びない形と比べて4pxより高ければ失敗）、iPad の縦で大きなすき間が出た（shared-workflows incidents/2026-11-07-title-stretched.md）
    for (const [w, h] of [[820, 1180], [390, 844], [1280, 800]]) { await r.setViewportSize({ width: w, height: h }); await r.goto(url); await r.waitForTimeout(200); await r.keyboard.press("Escape"); await r.waitForTimeout(100);
      const v = await r.evaluate(() => { const e = [...document.querySelectorAll(".title")].find((x) => x.offsetParent); if (!e) return null; const h = e.getBoundingClientRect().height; const f = e.style.flex; e.style.flex = "none"; const n = e.getBoundingClientRect().height; e.style.flex = f; return h - n; });
      if (v === null || v > 4) big.push(`${w}x${h}:${v === null ? "題なし" : "+" + Math.round(v) + "px"}`); }
    check("ホームの題は縦長の画面でも縦に伸びない（820×1180・390×844・1280×800）", big.length === 0, big.join(" ")); await c.close(); }
    await r.evaluate(() => localStorage.clear()); await r.reload(); await r.waitForTimeout(200);
    check("はじめての練習が始まったその場で「見た」が残る", await r.evaluate(() => { return Object.keys(localStorage).some((k) => { try { return JSON.parse(localStorage.getItem(k)).tut === true; } catch { return false; } }); })); await firstClose(r);
    await r.reload(); await r.waitForTimeout(200); check("遊び方を「わかった」で閉じてすぐ読み直しても出ない（その場で残す）", await r.locator("#howto[open]").count() === 0); await c.close(); }
  await firstClose(p);
  check("文字の大きさ：はじめは「大きい」（19px）", await p.evaluate(() => getComputedStyle(document.documentElement).fontSize) === "19px");
  await p.click('.fsrow button[data-fs="3"]');
  await p.reload(); await p.waitForTimeout(150);
  check("文字の大きさ：「とても大きい」にすると開き直しても残る", await p.evaluate(() => getComputedStyle(document.documentElement).fontSize) === "23px" && await p.locator('.fsrow button[data-fs="3"][aria-pressed="true"]').count() === 1);
  await p.click('.fsrow button[data-fs="2"]');
  check("ホームに今日のきほんが出る", (await p.textContent("#tip")).includes("今日のきほん"));

  // 今日の5問：1問目はまちがえる、2問目はヒント2回、ほかはそのまま
  await p.click("#go-d"); await heap(p);
  const tags = await p.evaluate(() => __nm.load().runs.d.list);
  check("今日の5問は日付から決まる（data.js の dailyTags と同じ）", JSON.stringify(tags) === JSON.stringify(G.dailyTags(TODAY)));
  check("問題の画面：場面の問いと、押せる行3つか4つ（高さ56px以上）", await p.locator("#card").count() === 1 && (await p.$$eval(".ch", (b) => b.map((x) => x.getBoundingClientRect().height))).every((h) => h >= 56) && await p.locator(".ch").count() === await p.evaluate(() => __nm.cur().P.opts.length) && await p.locator(".ch").count() >= 3 && (await p.textContent("#card .sit")).length > 5);
  check("押せる行には読み上げ用の名前がある", (await p.$$eval(".ch", (t) => t.filter((x) => !x.getAttribute("aria-label")).length)) === 0);
  await p.click(`.ch[data-j="${await wrongIdx(p)}"]`);
  check("まちがえると ✕ の印と「ちがう」の文字（色だけで分けない）・知らせは role=status", await p.locator(".ch.ng").count() === 1 && (await p.evaluate(() => getComputedStyle(document.querySelector(".ch.ng"), "::after").content)).includes("ちがう") && /✕/.test(await p.textContent("#msg")) && await p.getAttribute("#msg", "role") === "status");
  // 開き直しても、まちがえた選び肢は残る
  await p.reload(); await p.waitForTimeout(150); await p.click("#go-d"); await heap(p);
  check("途中で閉じても続きから（同じ問題・まちがえた印のまま）", await p.locator(".ch.ng").count() === 1 && await p.evaluate(() => __nm.cur().i) === 0);
  await solve(p);
  check("正解すると「正解」の判・なぜの説明・出典のリンク・★2（まちがい1回）", await p.locator(".ch.ok").count() === 1 && /正解/.test(await p.evaluate(() => getComputedStyle(document.querySelector(".ch.ok"), "::after").content)) && (await p.textContent(".verdict .why")).length > 20 && await p.locator(".verdict .src a").count() >= 1 && (await p.getAttribute(".verdict .stars", "aria-label")) === "星2つ");
  await p.click("#next");
  await p.click("#hint");
  check("ヒント1は見るところを言う（答えは言わない）", (await p.textContent("#hintbox")).includes("💡") && await p.locator(".ch.ng").count() === 0);
  await p.click("#hint");
  check("ヒント2はまちがいを消して2つにしぼり、表の言葉も見せる・ヒントは2回まで", await p.locator(".ch:not(.ng)").count() === 2 && (await p.textContent("#hintbox")).includes(await p.evaluate(() => __nm.cur().P.key)) && await p.locator("#hint:disabled").count() === 1);
  await solve(p);
  check("ヒント2回は★1", (await p.getAttribute(".verdict .stars", "aria-label")) === "星1つ");
  await p.click("#next");
  check("次の問題へ進むと、フォーカスが問題（#card）に移る", await p.evaluate(() => document.activeElement && document.activeElement.id) === "card");
  for (let i = 2; i < 5; i++) { await solve(p); await p.click("#next"); }
  await p.waitForTimeout(150);
  const s1 = await mem(p);
  check("5問で結果：今日の記録に1問ごとのまちがい（1・2・0・0・0）", JSON.stringify(s1.days[TODAY]?.m) === "[1,2,0,0,0]");
  const share = await p.textContent(".share");
  check("シェアの文に答え・問題を出さない（印だけ）", /第\d+回/.test(share) && /🟢/.test(share) && !G.KINDS.some((k) => share.includes(k.name)) && ![...G.R3, ...G.M3, ...G.Y3, ...G.COND].some((o) => share.includes(o)), share);
  check("まちがいのある日は Ko-fi の一言を出さない", await p.locator(".kofi").count() === 0);
  check("結果に「あと少しの実績」と、続けて遊ぶ・上級のボタン", await p.locator("#achnext").count() === 1 && await p.locator("#go-e").count() === 1 && await p.locator("#go-h").count() === 1);
  check("考え帳に解いた種類が載る", Object.keys(s1.dex).length === 5);
  await p.click("#back");
  check("今日を終えたら、ホームは「今日の結果を見る」と上級", (await p.textContent("#go-d")).includes("結果") && await p.locator("#go-h").count() === 1);
  // 上級：ヒントなし・3問
  await p.click("#go-h");
  check("上級はヒントのボタンが無い・3問", await p.locator("#hint").count() === 0 && (await p.evaluate(() => __nm.load().runs.h.list.length)) === 3);
  for (let i = 0; i < 3; i++) { await solve(p); await p.click("#next"); }
  await p.waitForTimeout(150);
  check("上級の記録は hdays に入る", (await mem(p)).hdays[TODAY]?.m.length === 3);
  // 練習：記録を増やさない
  await p.click("#back"); await p.click("#go-p"); await p.click('.lv button[data-t="2"]');
  const before = await mem(p);
  for (let i = 0; i < 5; i++) { await solve(p); await p.click("#next"); }
  await p.waitForTimeout(150);
  const after = await mem(p);
  check("練習は今日の記録を増やさない（考え帳の数はふえる）", JSON.stringify(after.days) === JSON.stringify(before.days) && Object.values(after.dex).reduce((a, b) => a + b) === Object.values(before.dex).reduce((a, b) => a + b) + 5);
  // 考え帳からその種類だけで練習
  await p.click("#back"); await p.click("#go-dex");
  const firstKind = await p.getAttribute(".book button", "data-k");
  await p.click(".book button");
  check("考え帳の種類を押すと、その種類だけで練習", (await p.evaluate(() => __nm.load().runs.p.list)).every((t) => t.startsWith(firstKind + "|")));
  // とことん：まちがえてもヒントを使っても続き、「ここで降りる」で終わる（game-dev.md F1）
  await p.click("#back"); await p.click("#go-e");
  check("とことんは60問の並びから・ライフ（🌸・🎫）が無い", (await p.evaluate(() => __nm.load().runs.e.list.length)) === 60 && !("life" in await p.evaluate(() => __nm.load().runs.e)) && await p.locator("#quit").count() === 1);
  await solve(p); await p.click("#next"); await solve(p); await p.click("#next");
  await solve(p, { wrong: 1 }); await p.click("#next");
  await p.click("#hint"); await p.click("#hint"); await solve(p); await p.click("#next");
  check("とことんはまちがい・ヒント2回でも終わらない", await p.locator(".ch").count() >= 3 && await p.evaluate(() => __nm.load().runs.e.res.length) === 4);
  await p.click("#hint"); await p.click("#hint");
  await p.evaluate(() => { const c = __nm.cur(); [...document.querySelectorAll(".ch:not(.ng)")].find((b) => c.P.opts[+b.dataset.j] !== c.P.ans).click(); });
  await p.waitForTimeout(50);
  check("ヒント2のあとにまちがいを選ぶと、正解だけが押せる（saibanin-shikumi #1）", await p.locator(".ch.ng").count() === await p.evaluate(() => __nm.cur().P.opts.length) - 1 && await p.locator(".ch:not(.ng)").count() === 1 && await p.evaluate(() => { const c = __nm.cur(); const b = document.querySelector(".ch:not(.ng)"); return !!b && !b.disabled && c.P.opts[+b.dataset.j] === c.P.ans; }));
  await p.reload(); await p.waitForTimeout(200);
  check("とことんは閉じても続きから", (await p.textContent("#go-e")).includes("続きから"));
  await p.click("#go-e");
  {
    // 別のタブでこの回を終えて新しい回を始めていたら、古い画面の「ここで降りる」は新しい回を終えない（funka-level #1 の CodeRabbit）
    const keep0 = await p.evaluate(() => __nm.load().runs.e);
    await p.evaluate(() => __nm.save((s) => { s.runs.e = Object.assign({}, s.runs.e, { id: "other-tab-run", res: [] }); }));
    await p.click("#quit"); await p.waitForTimeout(150);
    check("古い画面の「ここで降りる」は、別のタブで始めた新しい回を終えない", (await p.evaluate(() => __nm.load().runs.e && __nm.load().runs.e.id)) === "other-tab-run");
    await p.evaluate((r) => __nm.save((s) => { s.runs.e = r; }), keep0);
    await p.evaluate(() => __nm.play("e"));
  }
  await p.click("#quit"); await p.waitForTimeout(150);
  check("「ここで降りる」で終わり、一度で見抜いた数（2問）が自己ベストに残る", (await mem(p)).ebest === 2 && (await p.textContent("#eres")).includes("4問") && !("e" in (await mem(p)).runs && (await mem(p)).runs.e));
  {
    // とことんの並びを何百回作って、1回の中で同じ問題が無い・続けて同じ種類が無い・足しても重ならない
    const r = await p.evaluate(() => { const K = __nm.G, bad = []; for (let n = 0; n < 300; n++) { const l = __nm.endlessList(), more = l.concat(__nm.moreList(l)); const ks = more.map((t) => K.keyOf(K.make(t))); if (new Set(ks).size !== ks.length) bad.push("重なり"); if (more.some((t, i) => i && t.split("|")[0] === more[i - 1].split("|")[0])) bad.push("同じ種類が続く"); if (l.length !== 60 || more.length !== 100) bad.push("数" + l.length + "/" + more.length); } return bad; });
    check("とことんの並び300回：60問＋足した40問で同じ問題も同じ種類の連続も無い（game-dev.md F6）", r.length === 0, r.slice(0, 3).join(","));
  }
  {
    // 引き継ぎコードなどで数の所に文字が入っても、画面に HTML として出さない（2026-11-05 CodeRabbit）
    const q = await newPage(); await closeHow(q);
    await q.evaluate(() => { const s = JSON.parse(localStorage.getItem("ymk-v1")) || { v: 1 }; s.ebest = '<img id="xss" src=x>'; s.dex = { e: '"><b id="xss2">' }; s.runs = { e: { mode: "e", id: '"><i id="xss3">', date: "2026-11-07", list: ["t-db|1"], res: [] }, h: { list: "bad", res: [] }, p: { mode: "p", id: "y", date: "2026-11-07", list: ["constructor|1"], res: [] }, d: { mode: "d", id: "z", date: "x", list: ["t-db|1"], res: [] }, "a:2026-11-06": { mode: "a", id: "a1", date: "2026-11-06", list: ["t-db|1"], res: [null] }, "a:2026-11-05": { mode: "a", id: "a2", date: "2026-11-05", list: "bad", res: [] }, "a:2026-11-04": { mode: "a", id: "a3", date: "2026-11-04", list: ["t-db|1", "t-db|2"], res: [{ m: 0 }], cur: { i: 1, tag: "t-db|2", wrong: "x", hints: 0 } } }; s.days = { "2026-11-07": { m: "x" }, bad: { m: [0] }, "2026-02-30": { m: [0] } }; localStorage.setItem("ymk-v1", JSON.stringify(s)); });
    await q.reload(); await q.waitForTimeout(250);
    const st = await q.evaluate(() => __nm.load());
    check("記録の形を直す：数の所の文字は0に・形のちがう途中経過と日ごとの記録は捨てる", st.ebest === 0 && st.dex.e === 0 && st.runs.e && !("h" in st.runs) && !("p" in st.runs) && !("d" in st.runs) && !("a:2026-11-06" in st.runs) && !("a:2026-11-05" in st.runs) && st.runs["a:2026-11-04"] && st.runs["a:2026-11-04"].cur === null && Object.keys(st.days).length === 0);
    await q.click("#go-e").catch(() => {}); await q.waitForTimeout(150);
    {
      // 知らない mode や、置き場とちがう mode の途中経過は捨てる（ホームが出なくなるのを防ぐ。2026-11-07 CodeRabbit）
      const z = await newPage(); await closeHow(z);
      await z.evaluate(() => { const s = JSON.parse(localStorage.getItem("ymk-v1")) || { v: 1 }; s.v = 1; s.runs = { d: { mode: "x", date: "2026-11-07", list: [], res: [] }, h: { mode: "d", date: "2026-11-07", list: [], res: [] } }; localStorage.setItem("ymk-v1", JSON.stringify(s)); });
      await z.reload(); await z.waitForTimeout(200);
      const r = await z.evaluate(() => __nm.load().runs);
      check("知らない mode の途中経過は捨て、ホームが出る", !("d" in r) && !("h" in r) && await z.locator("#go-d").count() === 1);
      // 別のタブで終えたまま記録していない上級の回は、次の回を始める前に記録する
      await z.evaluate(() => { const s = __nm.load(), y = "2026-11-06", G = __nm.G; s.runs.h = { mode: "h", date: y, list: G.hardTags(y), res: [{ m: 0 }, { m: 0 }, { m: 0 }], cur: null, id: "old" }; localStorage.setItem("ymk-v1", JSON.stringify(s)); });
      await z.reload(); await z.waitForTimeout(200); await z.evaluate(() => __nm.start("h"));
      check("終えたまま残った前の日の回は、上書きする前に記録する", !!(await mem(z)).hdays["2026-11-06"]);
      // とことんで足せる問題が無くても、くり返し呼んで固まらない
      const ok = await z.evaluate(() => { const s = __nm.load(); s.runs.e = { mode: "e", date: __nm.todayKey(), list: ["t-db|1", "k-stay|1"], res: [{ m: 0 }, { m: 0 }], cur: null, id: "e1" }; localStorage.setItem("ymk-v1", JSON.stringify(s)); const ml = __nm.setMore(() => []); try { __nm.play("e"); return true; } catch (e) { return String(e); } finally { __nm.setMore(ml); } });
      check("とことんで足せる問題が無くても固まらずに終える", ok === true && await z.locator("#eres").count() === 1, String(ok));
      await z.context().close();
    }
    check("記録の文字を HTML として出さない", await q.locator("#xss, #xss2, #xss3").count() === 0);
    await q.context().close();
  }
  // 実績・このゲームについて
  await p.click("#back"); await p.click("#go-ach");
  check("実績は14個で、腕前・集める・続けるの3つの組", await p.locator(".ach").count() === 14 && await p.locator(".agrp").count() === 3 && await p.locator(".ach.got").count() >= 3);
  check("達成した実績は ✓ の文字も付く（色だけで分けない）", (await p.textContent(".ach.got b")).startsWith("✓"));
  await p.click("#back"); await p.click("#f-about");
  check("このゲームについて：夢の機械に正解が無いこと・研究の数は1回の結果であること・出典", (await p.textContent("#about")).includes("1回の結果") && (await p.textContent("#about")).includes("正解がありません") && await p.locator("#about a").count() >= 4);
  await p.context().close();

  // まちがいなしの日は Ko-fi を1回だけ
  {
    const q = await newPage(); await closeHow(q); await q.click("#go-d"); await heap(q);
    for (let i = 0; i < 5; i++) { await solve(q); await q.click("#next"); }
    await q.waitForTimeout(150);
    check("全部まちがいなしで初めて終えたときだけ Ko-fi の一言", await q.locator(".kofi").count() === 1 && (await q.textContent(".big")).includes("まちがいなし"));
    await q.click("#back"); await q.click("#go-d"); await heap(q);
    check("結果をもう一度見ても Ko-fi は出さない", await q.locator(".kofi").count() === 0);
    await q.context().close();
  }

  // カレンダー・あとから：過去の日の記録を置いて見る。第1回から日がたっていなくても見られるよう、時計を10日進める
  {
    const SHIFT = 10 * 864e5, TODAY = new Date(Date.now() + 9 * 3600e3 + SHIFT).toISOString().slice(0, 10), dayBefore = (n) => new Date(Date.parse(TODAY) - n * 864e5).toISOString().slice(0, 10);
    const cx = await browser.newContext({ viewport: { width: 390, height: 800 } });
    await cx.addInitScript((sh) => { const o = Date.now; Date.now = () => o() + sh; }, SHIFT);
    const q = await newPage(390, cx);
    await q.evaluate(([d2, d3]) => { localStorage.setItem("ymk-v1", JSON.stringify({ v: 1, tut: true, days: { [d2]: { m: [0, 0, 0, 0, 0], k: [] }, [d3]: { m: [1, 0, 0, 2, 0], k: [] } }, hdays: {}, adays: {}, dex: {}, runs: {}, kofi: {}, ach: {}, ebest: 0 })); }, [dayBefore(2), dayBefore(3)]);
    await q.reload(); await q.waitForTimeout(150);
    check("ホームの「続けて」は、きのうを休んだら — （休んだ日を責めない）", (await q.textContent(".stats")).includes("—"));
    await q.click("#go-cal");
    const lateList = await q.evaluate(() => __nm.lateDays(__nm.load()));
    const exp = [1, 4, 5, 6, 7].map(dayBefore).filter((d) => d >= "2026-11-07");
    check("カレンダー：取りこぼした過去7日（第1回より後）を押せる", JSON.stringify(lateList) === JSON.stringify(exp), lateList.join(","));
    check("カレンダー：遊んだ日は★の数の文字も付く", (await q.locator(".cal .c.p3").count()) + (await q.locator(".cal .c.p2").count()) + (await q.locator(".cal .c.p1").count()) >= (dayBefore(3).slice(0, 7) === TODAY.slice(0, 7) ? 2 : 0));
    if (lateList.length) {
      const d = lateList[0];
      await q.evaluate((d) => { const b = document.querySelector(`.cal .miss[data-k="${d}"]`); if (b) b.click(); else { const m = document.querySelector(".calnav #prev"); m && m.click(); } }, d);
      if (!(await q.locator(".ch, .hans").count())) await q.click(`.cal .miss[data-k="${d}"]`);
      check("あとから：その日の夢の機械のお題で始まる", (await q.evaluate((d) => __nm.load().runs["a:" + d].mc.t, d)) === G.themeOf(d));
      await heap(q);
      check("あとから：その日の今日の5問と同じ問題", JSON.stringify(await q.evaluate((d) => __nm.load().runs["a:" + d].list, d)) === JSON.stringify(G.dailyTags(d)));
      for (let i = 0; i < 5; i++) { await solve(q); await q.click("#next"); }
      await q.waitForTimeout(150);
      const s = await mem(q);
      check("あとからは adays に入り、今日の記録・続けた日には数えない", s.adays[d] && !s.days[d] && (await q.locator(".share").count()) === 0 && (await q.locator(".kofi").count()) === 0);
    } else check("あとから：遊べる日がある", false, "第1回の日から日がたっていない");
    await q.context().close();
  }

  // 終えた回（gone）がある側の保存に失敗し、別のタブが古い回を新しく保存しても、終えた回を戻さない（menkyo-nenrei PR #1 の CodeRabbit）
  {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 800 } });
    const g = await newPage(390, ctx);
    const left = await g.evaluate(() => {
      const r = { mode: "e", date: __nm.todayKey(), list: ["t-db|1", "k-stay|1"], res: [{ m: 0 }], cur: null, id: "gone1" };
      const base = __nm.load();
      const a = JSON.parse(JSON.stringify(base)); a.runs.e = null; a.gone = { gone1: 1 }; a.t = 100;
      const b = JSON.parse(JSON.stringify(base)); b.runs.e = r; b.t = 200;
      localStorage.setItem("ymk-v1", JSON.stringify(b)); __nm.setMem(JSON.stringify(a));
      try { return __nm.load().runs.e; } finally { __nm.setMem(null); }
    });
    check("終えた回は、別のタブが新しく保存した古い写しから戻さない", !left, JSON.stringify(left));
    await ctx.close();
  }
  // 同じ問題の途中で、保存に失敗した側と保存できた側のまちがいを合わせる（CodeRabbit menkyo-nenrei#1）
  {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 800 } });
    const g = await newPage(390, ctx);
    const got = await g.evaluate(() => {
      const base = __nm.load(), mk = (w, w2) => ({ mode: "p", date: __nm.todayKey(), list: ["t-db|m1", "k-stay|m1"], res: [], cur: { i: 0, tag: "t-db|m1", wrong: w, hints: 0, step: 2, w2 }, id: "mg1" });
      const a = JSON.parse(JSON.stringify(base)); a.runs.p = mk(["x1"], ["ima"]); a.t = 100;
      const b = JSON.parse(JSON.stringify(base)); b.runs.p = mk(["x2"], ["dare"]); b.t = 200;
      localStorage.setItem("ymk-v1", JSON.stringify(b)); __nm.setMem(JSON.stringify(a));
      try { return __nm.load().runs.p.cur; } finally { __nm.setMem(null); }
    });
    check("同じ問題の途中なら、保存に失敗した側のまちがい（1段目・2段目）も消さずに合わせる", got && got.wrong.includes("x1") && got.wrong.includes("x2") && got.w2.includes("ima") && got.w2.includes("dare"), JSON.stringify(got));
    const n = await g.evaluate(() => { __nm.save((s) => { s.runs.p = { mode: "p", date: __nm.todayKey(), list: ["t-db|s1", "k-stay|s1"], res: [], cur: null, id: "sc1" }; }); __nm.play("p"); __nm.sureCount(true); __nm.sureCount(true); return __nm.load().runs.p.ds; });
    check("「自信あり」の数は1問につき1回だけ（2つのタブで同じ問題を当てても2回足さない）", n && n.n === 1 && n.ok === 1, JSON.stringify(n));
    await ctx.close();
  }

  // 古いタブ：同じ問題を2つのタブで開き、片方で答えたら、もう片方は二重に入れない
  {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 800 } });
    const a = await newPage(390, ctx); await closeHow(a); await a.click("#go-d"); await heap(a);
    const b = await ctx.newPage(); b.on("pageerror", (e) => errors.push(e.message)); await b.goto(url); await b.waitForTimeout(150); await b.click("#go-d"); await heap(b);
    await solve(a);
    await b.click(`.ch[data-j="${await ansIdx(b)}"]`);
    await b.waitForTimeout(200);
    const s = await mem(a);
    check("古いタブで同じ問題に答えても二重に数えない", s.runs.d.res.length === 1 && Object.values(s.dex).reduce((x, y) => x + y) === 1);
    // ヒントの数は、別のタブで使った分も減らさない
    await a.click("#next"); await b.goto(url); await b.waitForTimeout(150); await b.click("#go-d"); await heap(b);
    await a.click("#hint"); await a.click("#hint");
    await b.click("#hint");
    check("別のタブで使ったヒントの数を減らさない", (await mem(a)).runs.d.cur.hints === 2);
    // 正解した時も、別のタブで使ったヒントを合わせて★を数える（2026-11-07 CodeRabbit）
    await b.click(`.ch[data-j="${await ansIdx(b)}"]`); await why(b); await b.waitForTimeout(150);
    check("正解の時も別のタブのヒントを合わせて数える（★1）", (await mem(b)).runs.d.res[1].m === 2);
    await ctx.close();
  }

  // 1問を深くする（shared-workflows routines/game-dev.md「1問を深くする」）：自信をかける・2段目「どのきまり？」・復習
  {
    const q = await newPage(); await closeHow(q);
    await q.evaluate((tags) => __nm.save((s) => { s.runs.p = { mode: "p", date: __nm.todayKey(), list: tags, res: [], cur: null, id: "dp" }; }), ["t-db|dp1", "k-stay|dp2", "y-up|dp3"]);
    await q.evaluate(() => { Depth.runStart(); __nm.play("p"); });
    const sb = await q.$eval("#dp-sure", (b) => [b.getBoundingClientRect().height, b.getAttribute("aria-pressed"), b.textContent]);
    check("自信のボタン：高さ44px以上・はじめは押していない", sb[0] >= 44 && sb[1] === "false", sb.join(","));
    await q.click("#dp-sure");
    check("自信のボタンを押すと ✓ が出る（色だけで分けない）", (await q.getAttribute("#dp-sure", "aria-pressed")) === "true" && (await q.textContent("#dp-sure")).includes("✓"));
    await q.click(`.ch[data-j="${await wrongIdx(q)}"]`);
    check("自信ありでまちがえると、知らせに「思いこみ」と出て、自信は変えられない", (await q.textContent("#msg")).includes("思いこみ") && await q.locator("#dp-sure:disabled").count() === 1);
    check("まちがえたその時に復習へ入る（解き終えずにやめても残る。2026-11-11 CodeRabbit）", await q.evaluate(() => { const d = JSON.parse(localStorage.getItem("ymk-depth") || "{}"); return !!(d.rv && d.rv[__nm.cur().tag]); }));
    await q.click(`.ch[data-j="${await ansIdx(q)}"]`);
    check("正解すると、2段目「変えた条件は？」が3つ出る（押せる所は44px以上）", await q.locator(".why button").count() === 3 && await q.locator(".verdict").count() === 0 && (await q.$$eval(".why button", (b) => b.every((x) => Math.round(x.getBoundingClientRect().height) >= 44))));
    check("2段目の読み上げは、2段目の問いと2段目の選び肢だけ（1段目の選び肢を読まない。funka-level #1 の CodeRabbit）", await q.evaluate(() => { const e = [...document.querySelectorAll("[data-a11y-say]")]; const P = __nm.cur().P; return e.length === 1 + P.g2.length && e[0].textContent === P.ask2 && e.slice(1).every((x) => x.matches(".why button")); }));
    check("2段目の間は、1段目の選び肢は押せない", await q.evaluate(() => [...document.querySelectorAll(".ch")].every((b) => b.disabled)));
    await q.reload(); await q.waitForTimeout(150); await q.evaluate(() => __nm.play("p"));
    check("2段目の途中で閉じても、2段目から続く", await q.locator(".why button").count() === 3);
    const wg = await q.evaluate(() => __nm.cur().P.g2.find((x) => x !== __nm.cur().P.grp));
    await q.click(`.why button[data-g="${wg}"]`);
    check("2段目でまちがえると ✕ ちがう（破線）・もう一度選べる", await q.locator(".why button.ng").count() === 1 && (await q.textContent("#msg")).includes("✕"));
    check("2段目でまちがえると「変えたのは1つだけ」と見る所が出る", (await q.textContent("#msg")).includes("変えたのは1つだけ"));
    await q.click("#hint");
    const ng1 = await q.locator(".why button:disabled").count();
    check("2段目のヒントは、まちがえた系統とは別のちがう系統を消す（★を使って何も消えないことが無い。2026-11-11 CodeRabbit）", ng1 === 2 && await q.locator(".why button:not(:disabled)").count() === 1, ng1);
    await q.reload(); await q.waitForTimeout(150); await q.evaluate(() => __nm.play("p"));
    check("2段目のヒントで消した系統は、閉じて開き直しても消えたまま（ヒントも押せないまま）", await q.locator(".why button:disabled").count() === ng1 && ng1 >= 1 && await q.locator("#hint:disabled").count() === 1 && (await q.textContent("#hintbox")).includes("消しました"));
    await why(q); await q.waitForSelector(".verdict");
    const m0 = await q.evaluate(() => __nm.load().runs.p.res[0].m);
    check("★は1段目と2段目のまちがい・ヒントを合わせて数える（1＋1＋1＝3）", m0 === 3, m0);
    check("見抜いた画面に、系統と、自信ありでまちがえたことが出る", (await q.textContent(".verdict")).includes(G.GROUPS[G.make("t-db|dp1").grp].name) && (await q.textContent(".verdict")).includes("自信ありでまちがえた"));
    await q.click("#next");
    await q.click(`.ch[data-j="${await ansIdx(q)}"]`); await why(q); await q.click("#next");
    await q.click(`.ch[data-j="${await ansIdx(q)}"]`);
    check("研究の数字の問題は2段目「変えた条件は？」が出る", await q.locator(".why button").count() === 3);
    await why(q); await q.waitForSelector(".verdict");
    await q.click("#next"); await q.waitForTimeout(150);
    check("終えた直後の結果に「自信ありの当たり」が出る", (await q.textContent("#surestat")).includes("0/1"));
    const dp = await q.evaluate(() => JSON.parse(localStorage.getItem("ymk-depth") || "{}"));
    check("まちがえた・ヒントを使った問題だけ復習に入る", Object.keys(dp.rv || {}).join() === "t-db|dp1", Object.keys(dp.rv || {}).join(","));
    await q.evaluate(() => { const d = JSON.parse(localStorage.getItem("ymk-depth")); for (const k in d.rv) d.rv[k].due = "2026-01-01"; localStorage.setItem("ymk-depth", JSON.stringify(d)); });
    await q.goto(url); await q.waitForTimeout(150);
    check("日の来た復習があると、ホームに「復習 1問」", (await q.textContent("#go-r")).includes("復習 1問"));
    const before = await mem(q);
    await q.click("#go-r");
    check("復習の画面は「復習」と出る・同じ問題", (await q.textContent("header")).includes("復習") && await q.evaluate(() => __nm.cur().tag) === "t-db|dp1");
    await solve(q); await q.click("#next"); await q.waitForTimeout(150);
    const after = await mem(q), dp2 = await q.evaluate(() => JSON.parse(localStorage.getItem("ymk-depth")));
    check("復習を終えると結果は「復習」・今日の記録は増えない・シェアは出ない", (await q.textContent("h1")).includes("復習") && JSON.stringify(after.days) === JSON.stringify(before.days) && await q.locator("#share").count() === 0);
    check("復習で一度で正解すると、次は3日後へ進む", dp2.rv["t-db|dp1"] && dp2.rv["t-db|dp1"].s === 1 && dp2.rv["t-db|dp1"].due === new Date(Date.parse(TODAY) + 3 * 864e5).toISOString().slice(0, 10));
    await q.goto(url); await q.waitForTimeout(150);
    check("復習を終えたら、ホームの「復習」は消える", await q.locator("#go-r").count() === 0);
    await q.evaluate(() => { const d = JSON.parse(localStorage.getItem("ymk-depth")); d.rv["nai|1"] = { s: 0, due: "2026-01-01", t: 1 }; d.rv["constructor|x"] = { s: 0, due: "2026-01-01", t: 2 }; localStorage.setItem("ymk-depth", JSON.stringify(d)); });
    await q.goto(url); await q.waitForTimeout(150);
    check("作り直せない鍵（無い種類・constructor）は復習に数えず、ホームも出る", await q.locator("#go-d").count() === 1 && await q.locator("#go-r").count() === 0);
    // 別のタブで2段目へ進んでいたら、この画面も2段目になる・別のタブで先に進んだ古い画面は復習の段を戻さない（2026-11-11 CodeRabbit）
    { const tq = "t-db|dq1";
      await q.goto(url); await q.waitForTimeout(150);
      await q.evaluate((t) => { __nm.save((s) => { s.runs.p = { mode: "p", date: __nm.todayKey(), list: [t], res: [], cur: null, id: "dq" }; }); __nm.play("p"); }, tq);
      await q.evaluate((t) => __nm.save((s) => { s.runs.p.cur = { i: 0, tag: t, wrong: [], hints: 0, step: 2, w2: [] }; }), tq);
      await q.click("#hint"); await q.waitForTimeout(100);
      check("別のタブで2段目へ進んでいたら、この画面も2段目になる", await q.locator(".why button").count() === 3 && await q.evaluate(() => __nm.cur().step) === 2);
      await q.evaluate((t) => { __nm.save((s) => { s.runs.p.res.push({ m: 0 }); s.runs.p.cur = null; }); const d = JSON.parse(localStorage.getItem("ymk-depth")); d.rv[t] = { s: 2, due: "2099-01-01", t: 9 }; localStorage.setItem("ymk-depth", JSON.stringify(d)); }, tq);
      await q.click("#hint"); await q.waitForTimeout(50);
      check("別のタブで先に進んだ古い画面でヒントを押しても、復習の段は戻らない", await q.evaluate((t) => JSON.parse(localStorage.getItem("ymk-depth")).rv[t].s, tq) === 2);
    }
    // 復習の途中でヒント・まちがいがあって日の来た問題が0になっても、ホームの「復習の続きから」で戻れる（2026-11-11 CodeRabbit）
    { const rk = Object.keys(dp2.rv)[0];
      await q.evaluate((k) => { const d = JSON.parse(localStorage.getItem("ymk-depth")); d.rv = { [k]: { s: 0, due: "2026-01-01", t: 3 } }; localStorage.setItem("ymk-depth", JSON.stringify(d)); }, rk);
      await q.goto(url); await q.waitForTimeout(150); await q.click("#go-r"); await q.click("#hint");
      await q.evaluate(() => __nm.save((s) => { s.runs.r.date = "2026-01-02"; }));
      await q.goto(url); await q.waitForTimeout(150);
      check("復習の途中でヒントを使って日の来た問題が0になっても・日が替わっても、ホームの「復習の続きから」で戻れる", ((await q.locator("#go-r").count()) ? await q.textContent("#go-r") : "").includes("続きから"));
      if (await q.locator("#go-r").count()) { await q.click("#go-r"); check("復習の続きは同じ問題・使ったヒントはそのまま", await q.evaluate(() => __nm.cur().tag) === rk && await q.evaluate(() => __nm.cur().hints) === 1); }
    }
    await q.context().close();
  }
  // スマホ幅・とても大きい文字でもはみ出さない・押す所は44px以上
  {
    const bad = [], small = [];
    for (const [w, fs] of [[320, 3], [390, 2], [320, 1]]) {
      const q = await newPage(w); await closeHow(q);
      await q.evaluate((fs) => localStorage.setItem("ymk-fs", String(fs)), fs); await q.reload(); await q.waitForTimeout(150);
      for (const go of [null, "#go-d", "heapline", "solve", "#go-cal", "#go-dex", "#go-ach", "#go-e"]) {
        if (go === "solve") { await heap(q); await solve(q); }
        else if (go === "heapline") { for (let k = 0; k < 10 && await q.locator(".hans").count(); k++) await q.click('.hans button[data-a="2"]'); } // あなたの答えと研究の答えの画面
        else if (go) { await q.goto(url); await q.waitForTimeout(100); await q.click(go); }
        await q.waitForTimeout(100);
        const ov = await q.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        if (ov > 0) bad.push(`${w}px 文字${fs} ${go || "ホーム"} ${ov}px`);
        small.push(...(await q.$$eval("button:not([disabled]), a[href]", (bs) => bs.filter((b) => b.checkVisibility() && !b.closest(".cal")).filter((b) => Math.round(b.getBoundingClientRect().height) < 44).map((b) => (b.id || b.className || b.textContent).slice(0, 20)))).map((x) => `${w}/${fs}/${go}:${x}`));
      }
      await q.context().close();
    }
    check("幅320px・とても大きい文字でも横にはみ出さない", bad.length === 0, bad.join(" / "));
    check("押せる所は高さ44px以上", small.length === 0, [...new Set(small)].slice(0, 8).join(","));
  }

  // 見やすさの設定を全部入れても、ページの一番下まで動ける（読み上げの class が html に当たって固まった。2026-11-05）
  {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 700 } });
    await ctx.addInitScript(() => localStorage.setItem("a11y-v1", JSON.stringify({ read: true, cvd: true, calm: true, say: true, ruby: true })));
    const q = await newPage(390, ctx); await closeHow(q);
    const r = await q.evaluate(() => { window.scrollTo(0, 1e5); const f = document.querySelector("footer").getBoundingClientRect(); return [scrollY, Math.round(f.bottom), innerHeight, getComputedStyle(document.documentElement).position]; });
    check("見やすさの設定を全部入れても、いちばん下まで動ける（html が固定されない）", r[0] > 0 && r[1] <= r[2] && r[3] === "static", r.join(","));
    await ctx.close();
  }
  // キーボードだけで遊べる（Tab と Enter）
  {
    // focus() で直接動かさず、Tab を押して目当ての所まで進み、Enter で押す。Tab で届かなければ失敗（CodeRabbit yume-kikai#1）
    const q = await newPage(); await closeHow(q);
    const miss = [];
    const tabTo = async (sel) => { for (let t = 0; t < 120; t++) { await q.keyboard.press("Tab"); if (await q.evaluate((s) => !!document.activeElement && document.activeElement.matches(s), sel)) return true; } miss.push(sel); return false; };
    const press = async (sel) => { if (await tabTo(sel)) { await q.keyboard.press("Enter"); await q.waitForTimeout(80); } };
    await press("#go-d");
    for (let k = 0; k < 10 && !miss.length && await q.locator(".hans").count(); k++) await press(`.hans button[data-a="${k % 3}"]`);
    if (!miss.length) await press("#hp-go");
    if (!miss.length) await press(`.ch[data-j="${await ansIdx(q)}"]`);
    if (!miss.length && await q.locator(".why button").count()) await press(`.why button[data-g="${await q.evaluate(() => __nm.cur().P.grp)}"]`);
    check("キーボードだけ（Tab と Enter）で夢の機械に答え、考える問題も2段目まで答えられる", !miss.length && await q.locator(".verdict").count() === 1, miss.join(","));
    await q.context().close();
  }
  // 夢の機械（正解の無い問い）：絵・問い・3つの答え・5つの聞き方・続きから・研究の答えとくらべる
  {
    const q = await newPage(); await closeHow(q); await q.click("#go-d");
    const mc0 = await q.evaluate(() => __nm.load().runs.d.mc);
    check("今日の回は夢の機械から始まり、お題は日付で決まる（だれでも同じ）", mc0 && mc0.t === G.themeOf(TODAY) && await q.locator(".hans").count() === 1);
    const th = G.THEME_BY[mc0.t];
    check("夢の機械の画面：絵（読み上げの名前）・お題の体験の文・3つの答え（記号と文字・高さ44px以上）・正解が無いと書く", (await q.getAttribute("#mc svg", "aria-label")) === "機械の外にいる人" && (await q.textContent("#mc .sit")).includes(th.exp) && (await q.$$eval(".hans button", (b) => b.map((x) => [Math.round(x.getBoundingClientRect().height), x.textContent]))).every(([h, t], i) => h >= 44 && t.includes(["入る", "入らない", "迷う"][i]) && /[🌙🚶？]/.test(t)) && (await q.textContent("#mc")).includes("正解はありません"));
    await q.click('.hans button[data-a="1"]');
    check("2つ目は逆向きの問い（もう機械の中。出る？）", (await q.textContent("#mc .sit")).includes("もう機械の中") && (await q.textContent("#mc .ask")).includes("出る") && (await q.getAttribute("#mc svg", "aria-label")) === "機械の中にいる人");
    await q.click('.hans button[data-a="1"]');
    await q.reload(); await q.waitForTimeout(150); await q.click("#go-d");
    check("夢の機械の途中で閉じても続きから（3つ目：外は刑務所）", (await q.textContent("#mc .sit")).includes("刑務所") && (await q.textContent("header")).includes("3/5"));
    { // 古いタブ：同じ問いに2つのタブで答えても二重に入れない
      const b = await q.context().newPage(); b.on("pageerror", (e) => errors.push(e.message)); await b.goto(url); await b.waitForTimeout(150); await b.click("#go-d");
      await q.click('.hans button[data-a="1"]'); await b.click('.hans button[data-a="0"]'); await b.waitForTimeout(100);
      check("夢の機械で古いタブが答えても二重に入れない", JSON.stringify((await mem(q)).runs.d.mc.a) === "[1,1,1]"); await b.close();
    }
    await q.click('.hans button[data-a="0"]'); await q.click('.hans button[data-a="2"]');
    const s = await mem(q), h = s.mc[TODAY];
    check("夢の機械を終えると答えが記録に残る（お題・5つの答え・いまの所に残った数3）", h && h.t === th.id && JSON.stringify(h.a) === "[1,1,1,0,2]" && h.p === 3, JSON.stringify(h));
    const lt = await q.textContent("#lines");
    check("研究の答えとくらべる：残った数3/4・形「いまの所に残る」・16%・46%・87%・50%・55%と出典（De Brigard・Weijers）", lt.includes("3/4") && lt.includes("いまの所に残る") && ["16%", "46%", "87%", "50%", "55%"].every((x) => lt.includes(x)) && await q.locator("#lines a[href='https://doi.org/10.1080/09515080903532290']").count() === 1 && await q.locator("#lines a[href='https://doi.org/10.1080/09515089.2012.757889']").count() === 1 && await q.locator("#lines .meter").count() === 5);
    check("夢の機械の答えは★・自信・復習に入れない（正解が無い）", (await mem(q)).runs.d.res.length === 0 && !Object.keys(JSON.parse(await q.evaluate(() => localStorage.getItem("ymk-depth") || "{}")).rv || {}).length);
    await q.click("#hp-go");
    check("「次は考える問題を5問」で1問目へ", await q.locator("#card").count() === 1 && await q.evaluate(() => __nm.cur().i) === 0);
    for (let i = 0; i < 5; i++) { await solve(q); await q.click("#next"); }
    await q.waitForTimeout(150);
    check("今日の回の結果にも、研究の答えとくらべる表・シェアの文に残った数", await q.locator("#lines").count() === 1 && (await q.textContent(".share")).includes("いまの所に残った答え 3/4"));
    // 練習の夢の機械：何度でも・今日の記録を増やさない
    const before = await mem(q);
    await q.goto(url); await q.waitForTimeout(150); await q.click("#go-p"); await q.click("#go-mc");
    check("練習の夢の機械：すぐ始まる", await q.locator(".hans").count() === 1);
    await heap(q);
    const after = await mem(q);
    check("練習の夢の機械は今日の記録・答えの記録を増やさず、終えたら「もう一度」", JSON.stringify(after.days) === JSON.stringify(before.days) && JSON.stringify(after.mc) === JSON.stringify(before.mc) && !after.runs.p && await q.locator("#hp-again").count() === 1);
    await q.click("#hp-again");
    check("「もう一度」で次の夢の機械", await q.locator(".hans").count() === 1);
    await q.goto(url); await q.waitForTimeout(150); await q.click("#go-dex");
    check("考え帳に夢の機械の答えの記録が出る", (await q.textContent("#mylines")).includes("いまの所に残った答え"));
    await q.context().close();
  }
} catch (e) { check("ブラウザでの検査が最後まで動く", false, e.stack.split("\n").slice(0, 3).join(" ")); }

// 深さの部品（shared-workflows template/qa/depth-check.mjs）
{ const e = await checkDepth(readFileSync(path.join(root, "depth.js"), "utf8")); check("depth.js（自信をかける・復習）の動き", e.length === 0, e.join(" / ")); }
// 2段目の系統：どの種類にもある（3つのどれか）
{ const q = await newPage(); await closeHow(q);
  check("保存に失敗したら、保存できるまで帯（#savewarn）で知らせ続け、保存できたら消す", await q.evaluate(async () => { const orig = Storage.prototype.setItem; Storage.prototype.setItem = function () { throw new Error("full"); }; __nm.save(() => {}); __nm.save(() => {}); const one = document.querySelectorAll("#savewarn").length === 1 && document.getElementById("savewarn").textContent.includes("保存できませんでした"); await new Promise((r) => setTimeout(r, 1500)); const stay = !!document.getElementById("savewarn"); Storage.prototype.setItem = orig; __nm.save(() => {}); return one && stay && !document.getElementById("savewarn"); }));
  await q.evaluate(() => __nm.start("e")); await q.waitForTimeout(100);
  await q.click(`.ch[data-j="${await ansIdx(q)}"]`); await why(q); await q.waitForSelector(".verdict");
  await q.click("#quit"); await q.waitForTimeout(150);
  check("とことんで正解した直後でも「ここで降りる」が効き、その問題も数える", (await q.textContent("#eres")).includes("1問"), await q.textContent("body"));
  // 保存に失敗したまま「ここで降りる」を押しても、保存してあった途中の回を戻さない（CodeRabbit kumo-namae#1）
  await q.evaluate(() => __nm.start("e")); await q.waitForTimeout(100);
  await q.click(`.ch[data-j="${await ansIdx(q)}"]`); await why(q); await q.waitForSelector(".verdict");
  { const eid = await q.evaluate(() => __nm.load().runs.e.id);
    await q.evaluate(() => { window.__origSet = Storage.prototype.setItem; Storage.prototype.setItem = function () { throw new Error("full"); }; });
    await q.click("#quit"); await q.waitForTimeout(150);
    const back = await q.evaluate(() => { const r = __nm.load().runs.e; return r ? r.id : null; });
    await q.evaluate(() => { Storage.prototype.setItem = window.__origSet; __nm.save(() => {}); });
    check("保存に失敗したまま「ここで降りる」を押しても、終えた回が「とことんの続き」に戻らない", back === null && (await q.evaluate(() => __nm.load().runs.e)) === null, `${eid} → ${back}`); }
  await q.close(); }
{ const q = await newPage(); await closeHow(q);
  await q.evaluate(() => { localStorage.setItem("ymk-v1", JSON.stringify({ v: 1, tut: true, days: {}, hdays: {}, adays: {}, dex: { constructor: 1, toString: 2, "t-db": 1 }, runs: {}, kofi: {}, ach: {}, ebest: 0 })); }); await q.reload(); await q.waitForTimeout(150);
  check("記録に constructor などの鍵が入っても、考え帳と実績の種類に数えない（CodeRabbit funka-level#1）", (await q.textContent("#go-dex")).includes(`1/${G.KINDS.length}`) && await q.evaluate(() => __nm.tally(__nm.load()).kinds) === 1, await q.textContent("#go-dex"));
  await q.close(); }
{ const bad = G.KINDS.filter((k) => k.lv === 2).filter((k) => { for (let i = 0; i < 200; i++) { const P = G.make(`${k.id}|g${i}`); if (P.v === "noz") continue; if (!G.GROUPS[P.grp] || P.g2.length !== 3 || !P.ask2) return true; } return false; }).map((k) => k.id);
  check("2段目：研究の数字の問題（ノージックのままの数を除く）は、3つの選び肢と問い（変えた条件は？）がある", bad.length === 0, bad.join(",")); }
// 引き継ぎコード（shared-workflows template/qa/transfer-check.mjs）
try {
  const sample = { "ymk-v1": JSON.stringify({ v: 1, tut: true, days: { "2026-11-13": { m: [0, 1, 0, 0, 2], k: ["r-do", "m-exp", "k-stay", "j-soto", "t-db"] } }, hdays: {}, adays: {}, dex: { "r-do": 1, "m-exp": 1, "k-stay": 1, "j-soto": 1, "t-db": 1 }, mc: { "2026-11-13": { t: "tabi", a: [1, 1, 1, 0, 2], p: 3 } }, runs: {}, kofi: {}, ach: {}, ebest: 7, t: 1 }), "ymk-fs": "3", "ymk-depth": JSON.stringify({ v: 1, rv: { "t-db|x1": { s: 1, due: "2026-11-20", t: 5 } } }) }; // 復習の記録も引き継ぐかを見る（CodeRabbit menkyo-nenrei#1）
  await checkTransfer({ browser, url, game: "yume-kikai", sample, check, open: async (pg) => { await firstClose(pg); } });
} catch (e) { check("引き継ぎの検査が最後まで動く", false, e.message.split("\n")[0]); }
// 共通部品 game-core（はじめての案内・感想・遊び方のボタン・不具合の帯。shared-workflows template/qa/core-check.mjs）
try { await checkCore({ browser, url, check, solve: async (pg) => { await heap(pg); await pg.waitForSelector("#lines"); } }); } catch (e) { check("game-core の検査が最後まで動く", false, e.message.split("\n")[0]); }
await browser.close();
server.close();
check("画面のエラーが無い", errors.length === 0, errors.slice(0, 3).join(" | "));

{ // 見やすさ・読みやすさ・偏り（shared-workflows template/qa/a11y.mjs の写し）
  const { spawnSync } = await import("node:child_process");
  const a = spawnSync(process.execPath, [path.join(root, "qa", "a11y.mjs")], { encoding: "utf8", env: process.env });
  check("見やすさ・読みやすさの検査（qa/a11y.mjs。中身は qa-report/a11y.md）", a.status === 0, (a.stdout.match(/^- ❌.*$/gm) || []).join(" / ") || (a.status ? a.stderr.slice(-300) : ""));
}

const ng = results.filter((r) => !r.ok);
const md = `# 夢の機械、入る？ QA\n\n${results.map((r) => `- ${r.ok ? "✅" : "❌"} ${r.name}${r.detail ? `（${r.detail}）` : ""}`).join("\n")}\n\n${ng.length ? `❌ ${ng.length}件` : `✅ ${results.length}項目すべて通過`}\n`;
mkdirSync(path.join(root, "qa-report"), { recursive: true });
writeFileSync(path.join(root, "qa-report/report.md"), md);
console.log(md);
process.exit(ng.length ? 1 : 0);
