// 夢の機械、入る？の問題を作る（ブラウザと node の両方で使う）。
// 2つの部分がある。
//  1. 夢の機械（STEPS）：入る？・もう中にいたら出る？ などに答える。正解は無い（人の好みに正解はない）。
//     答えのあとで、研究で多かった答えとくらべ、「いまの所に残った答え」の数を見る。
//  2. 考える問題（KINDS）：ノージックの3つの理由・3つの機械・答え方の形・どの条件がちがうか・研究で多かった答え。正解がある。
//     中身は次の3つに書いてあることだけ（2026-11-27 に読んだ）。数字は論文で確かめたものだけ使う。
//     Nozick 1974『Anarchy, State, and Utopia』pp.42–45、De Brigard 2010 Philosophical Psychology 23(1) 43–57、
//     Weijers 2014 Philosophical Psychology 27(4) 513–535。
// 乱数 R は呼ぶ回数が同じ tag なら毎回同じになるように使う（sort の比較の中では引かない）。同じ tag なら、どの端末でも同じ問題になる。
// KINDS・THEMES・THEME_DAY・NAMES・各文の表は最後に足すだけにし、足す種類には since:"YYYY-MM-DD"（出し始める日・公開の翌日以降）を付ける。
(function (root) {
  "use strict";
  const LV = ["やさしい", "ふつう", "むずかしい"];

  // 出典（画面の「なぜ」と「このゲームについて」に出す）
  const SRC = {
    noz: ["Nozick『Anarchy, State, and Utopia』1974 pp.42–45（授業用の抜粋）", "https://rintintin.colorado.edu/~vancecd/phil3160/Nozick1.pdf"],
    db: ["De Brigard 2010「If you like it, does it matter if it's real?」Philosophical Psychology 23(1)", "https://doi.org/10.1080/09515080903532290"],
    wj: ["Weijers 2014「Nozick's experience machine is dead, long live the experience machine!」Philosophical Psychology 27(4)", "https://doi.org/10.1080/09515089.2012.757889"],
  };
  // まとめの読みもの（答えの出どころではなく、「このゲームについて」に出す）
  const MORE = {
    iep: ["Internet Encyclopedia of Philosophy「The Experience Machine」", "https://iep.utm.edu/experience-machine/"],
  };

  // part:ri:begin（shared-workflows の template/parts/data/ri.js の写し。ここでは直さない。node scripts/sync-template.mjs で写す）
  const ri = (R, a, b) => a + Math.floor(R() * (b - a + 1));
  // part:ri:end
  // part:shuffle:begin（shared-workflows の template/parts/data/shuffle.js の写し。ここでは直さない。node scripts/sync-template.mjs で写す）
  function shuffle(R, a) { const b = a.slice(); for (let i = b.length - 1; i > 0; i--) { const j = ri(R, 0, i); [b[i], b[j]] = [b[j], b[i]]; } return b; }
  // part:shuffle:end
  // part:pickN:begin（shared-workflows の template/parts/data/pickN.js の写し。ここでは直さない。node scripts/sync-template.mjs で写す）
  function pickN(R, a, n) { return shuffle(R, a).slice(0, n); }
  // part:pickN:end

  // ---- 研究の数字（論文で確かめたものだけ）----
  // mach：機械を選んだ人の割合（%）。A・B：選び肢（A が機械を選ばないほう）、pa：A の割合（%）
  const ST = {
    noz: { by: "wj", n: 79, k: 13, who: "大学1年生79人", desc: "外にいて、機械に入るか（ノージックの話のまま）", A: "入らない", B: "入る", pa: 84, mach: 16, p: "p.519" },
    dbn: { by: "db", n: 24, who: "大学生24人", desc: "もう中にいると知らされ、出るか（外のことは知らされない）", A: "出る", B: "残る", pa: 54, mach: 46, p: "p.48" },
    dbneg: { by: "db", n: 24, who: "大学生24人", desc: "もう中にいて、外の本当のあなたは刑務所にいる。出るか", A: "出る", B: "残る", pa: 13, mach: 87, p: "p.47" },
    dbpos: { by: "db", n: 24, who: "大学生24人", desc: "もう中にいて、外の本当のあなたはお金持ちの芸術家。出るか", A: "出る", B: "残る", pa: 50, mach: 50, p: "p.47–48" },
    db2: { by: "db", n: 80, who: "大学生80人", desc: "もう中にいて、外の暮らしはいまとまったくちがう。出るか", A: "出る", B: "残る", pa: 41, mach: 59, p: "p.49" },
    wself: { by: "wj", n: 79, k: 27, who: "大学1年生79人", desc: "自分が、機械にずっと入れる席をもらった。入るのがよいか", A: "入らないのがよい", B: "入るのがよい", pa: 66, mach: 34, p: "p.520" },
    wst: { by: "wj", n: 82, k: 43, who: "大学1年生82人", desc: "知らない人が、機械にずっと入れる席をもらった。入るのがよいか", A: "入らないのがよい", B: "入るのがよい", pa: 48, mach: 52, p: "p.523" },
    wnsq: { by: "wj", n: 77, k: 42, who: "大学1年生77人", desc: "知らない人が機械と現実を半分ずつ生きた（楽しいのはほぼ機械）。残りはどちらか", A: "本当の暮らし", B: "機械", pa: 45, mach: 55, p: "p.525" },
    wcou: { by: "wj", n: 77, k: 35, who: "大学1年生77人", desc: "いとこが、機械にずっと入れる席をもらった。入るのがよいか", A: "入らないのがよい", B: "入るのがよい", pa: 54.5, mach: 45.5, p: "p.523–524" },
    wfri: { by: "wj", n: 81, k: 35, who: "大学1年生81人", desc: "友だちが、機械にずっと入れる席をもらった。入るのがよいか", A: "入らないのがよい", B: "入るのがよい", pa: 56.8, mach: 43.2, p: "p.523–524" },
  };
  const BYNAME = { db: "De Brigard 2010", wj: "Weijers 2014" };
  const pc = (v) => (Number.isInteger(v) ? String(v) : v.toFixed(1)) + "%";
  const stText = (s) => `${BYNAME[s.by]}：${s.who}。${s.B} ${pc(s.mach)}・${s.A} ${pc(100 - s.mach)}${s.k ? `（${s.n}人中${s.k}人が${s.B}）` : ""}`;

  // ---- 1. 夢の機械（正解の無い問い）----
  // 日ごとのお題：機械が見せる体験
  const THEMES = [
    { id: "tabi", w: "旅", mk: "🧭", exp: "世界中を旅する" },
    { id: "yama", w: "山", mk: "⛰", exp: "高い山の頂上に立つ" },
    { id: "hon", w: "本", mk: "📖", exp: "名作の本を書き上げる" },
    { id: "nakama", w: "仲間", mk: "🤝", exp: "気の合う仲間と笑いあう" },
    { id: "umi", w: "海", mk: "🐠", exp: "海の底を泳ぐ" },
  ];
  const THEME_BY = Object.fromEntries(THEMES.map((t) => [t.id, t]));
  const THEME_DAY = ["tabi", "yama", "hon", "nakama", "umi"];
  // 5つの問い。opts の番号が答え（0・1・2）。mach：機械を選ぶ答えの番号、stay：いまいる所に残る答えの番号（無ければ -1）、st：くらべる研究
  const STEPS = [
    { id: "in", where: "外", sit: (th) => `夢の機械に一生つながると、${th.exp}ような、望む体験がつづく。2年ごとに選び直せる。中では、機械だと気づかない。`, ask: "入る？", opts: ["入る", "入らない", "迷う"], mk: ["🌙", "🚶", "？"], mach: 0, stay: 1, st: "noz" },
    { id: "out", where: "中", sit: () => "じつは、あなたは もう機械の中。いまの暮らしは、機械が見せている。", ask: "機械から出る？", opts: ["出る", "残る", "迷う"], mk: ["🚪", "🌙", "？"], mach: 1, stay: 1, st: "dbn" },
    { id: "bad", where: "中", sit: () => "もう機械の中。外の本当のあなたは、刑務所にいる。", ask: "出る？", opts: ["出る", "残る", "迷う"], mk: ["🚪", "🌙", "？"], mach: 1, stay: 1, st: "dbneg" },
    { id: "good", where: "中", sit: () => "もう機械の中。外の本当のあなたは、お金持ちの芸術家。", ask: "出る？", opts: ["出る", "残る", "迷う"], mk: ["🚪", "🌙", "？"], mach: 1, stay: 1, st: "dbpos" },
    { id: "other", where: "人", sit: () => "知らない人の話。機械の中と本当の暮らしを半分ずつ生きてきた。楽しいことはほぼ機械の中、いやなことはほぼ本当の暮らしだった。残りの人生を選ぶ。", ask: "その人には、どちらがよい？", opts: ["機械", "本当の暮らし", "迷う"], mk: ["🌙", "🌳", "？"], mach: 0, stay: -1, st: "wnsq" },
  ];
  // いまいる所に残った答えの数（はじめの4つ。5つ目は「いまの暮らし」が無い聞き方なので数えない）
  const stayScore = (a) => STEPS.slice(0, 4).filter((s, i) => a[i] === s.stay).length;
  // はじめの2つの答えの形（外で入るか・中で出るか）
  const KATA = ["いまの所に残る", "いつも本物", "いつも機械", "いつも動く"];
  function kataOf(a) {
    const inn = a[0] === 0 ? 1 : a[0] === 1 ? 0 : -1, stay = a[1] === 1 ? 1 : a[1] === 0 ? 0 : -1; // inn：入る、stay：残る
    if (inn < 0 || stay < 0) return -1;
    return !inn && stay ? 0 : !inn && !stay ? 1 : inn && stay ? 2 : 3;
  }

  // ---- 2. 考える問題（正解のある問い）----
  // 2段目の選び肢：2つの聞き方で、変えた条件は？
  const GROUPS = {
    ima: { name: "いまいる所", sub: "いまの暮らしは、どちらか" },
    soto: { name: "外の暮らしの中身", sub: "つらい・はなやか・いまとちがう" },
    dare: { name: "だれのことか", sub: "自分・知らない人・友だち" },
  };
  const G3 = ["ima", "soto", "dare"];
  const COND = G3.map((g) => GROUPS[g].name);
  const NAMES = ["青木さん", "石田さん", "上野さん", "岡本さん", "川口さん", "木村さん", "小林さん", "佐野さん", "田中さん", "中村さん", "原田さん", "森さん"];

  // ノージックの3つの理由（Nozick 1974 p.43）
  const R3 = ["自分でしたい", "こういう人でありたい", "本物にふれたい"];
  const RS = [
    ["山に登った気分より、自分の足で登りたい", "本を書いた気になるより、本当に書きたい", "友だちを助けた体験より、本当に助けたい", "絵をかいた体験より、自分の手でかきたい", "勝った体験でなく、自分で走って勝ちたい", "料理を作った気分より、本当に作りたい", "役に立った体験より、本当に役に立ちたい", "旅の体験より、自分で道をさがして歩きたい"],
    ["やさしい気分より、本当にやさしい人でいたい", "勇気がある気分より、勇気のある人でありたい", "中にいると、自分がどんな人か分からなくなる", "正直な人だと思いこむより、正直な人でいたい", "考えた気分より、本当に考えられる人でいたい", "人を思いやる人でありたい。気分だけではいや", "がんばる人でいたい。がんばった体験だけではいや", "自分らしい人でいたい。機械にまかせたくない"],
    ["人が作った世界より、本当の世界にふれたい", "作り物の空より、本物の空を見たい", "機械の外にある、本当のことを知りたい", "人が作った夢の中だけで、生きたくない", "本物の海は、機械の海より深いと思う", "作られた体験より、本物の世界がいい", "だれかが作った世界に、とじこめられたくない", "もっと深い、本当のことにふれたい"],
  ];
  const R_WHY = [
    "ノージックの1つ目の理由：体験するだけでなく、自分で何かをしたい（Nozick 1974）。",
    "ノージックの2つ目の理由：ある人でありたい。中では、どんな人かが決まらない（Nozick 1974）。",
    "ノージックの3つ目の理由：人が作った現実にとじこめられる。もっと深い本物にふれたい（Nozick 1974）。",
  ];
  function riyuuQ(r) {
    return (R) => {
      const i = ri(R, 0, RS[r].length - 1), nm = NAMES[ri(R, 0, NAMES.length - 1)];
      return { type: "riyuu", media: "入らない理由", ask: "ノージックの3つの理由のどれ？", q: `${nm}「${RS[r][i]}」`, opts: shuffle(R, R3), ans: R3[r], grp: null, g2: [], ask2: "", gwhy: "", v: `${i}:${nm}` };
    };
  }

  // ノージックの3つの機械（Nozick 1974 p.44）
  const M3 = ["体験の機械", "変身の機械", "結果の機械"];
  const MS = [
    ["雪山をすべる気分を味わいたい", "宇宙を飛ぶ体験がしたい", "ステージで歌う気分を味わいたい", "大きな拍手をあびる体験がしたい", "空を飛ぶ気分を味わいたい", "海の底を泳ぐ体験がしたい", "優勝した気分を味わいたい", "名人と話す体験がしたい"],
    ["もっとやさしい人になりたい", "勇気のある人に変わりたい", "がまん強い人になりたい", "正直な人に変わりたい", "人前で話せる人になりたい", "落ち着いた人になりたい", "思いやりのある人に変わりたい", "明るい人になりたい"],
    ["町に本当に橋がかかってほしい", "病気の人が本当に治ってほしい", "世界に本当に絵が残ってほしい", "山に本当に木が育ってほしい", "川が本当にきれいになってほしい", "本当に家が建ってほしい", "本当に歌が世に出てほしい", "だれかの命が本当に助かってほしい"],
  ];
  const M_WHY = [
    "体験の機械は、望む体験を何でも見せる。中では、機械だと気づかない（Nozick 1974）。",
    "変身の機械は、なりたい人に変える（Nozick 1974）。",
    "結果の機械は、自分が出したい結果を、本当に世界に出す（Nozick 1974）。",
  ];
  function kikaiQ(m) {
    return (R) => {
      const i = ri(R, 0, MS[m].length - 1), nm = NAMES[ri(R, 0, NAMES.length - 1)];
      return { type: "kikai", media: "3つの機械", ask: "かなえるのは、どの機械？", q: `${nm}「${MS[m][i]}」`, opts: shuffle(R, M3), ans: M3[m], grp: null, g2: [], ask2: "", gwhy: "", v: `${i}:${nm}` };
    };
  }

  // 答え方の形（外で入るか・中で出るか）
  const KATA_A = [["入らない", "残る"], ["入らない", "出る"], ["入る", "残る"], ["入る", "出る"]];
  const KATA_WHY = [
    "外では入らず、中では出ない。どちらも、いまいる所を選ぶ。De Brigard 2010 は、これを現状維持のかたよりで説明した。",
    "外では入らず、中では出る。どちらも本物の暮らしを選ぶ。ノージックの考えに近い答え方。",
    "外では入り、中では残る。どちらも機械を選ぶ。体験さえよければよい、という答え方。",
    "外では入り、中では出る。どちらも、いまいる所から動く。",
  ];
  function kataQ(k) {
    return (R) => {
      const nm = NAMES[ri(R, 0, NAMES.length - 1)], th = THEMES[ri(R, 0, THEMES.length - 1)], rev = ri(R, 0, 1), [a, b] = KATA_A[k];
      const s1 = `外では「${a}」`, s2 = `もう中だと知ると「${b}」`;
      return { type: "kata", media: "答え方の形", ask: "この答え方は？", q: `${nm}は${th.w}の機械に、${rev ? s2 + "。" + s1 : s1 + "。" + s2}。`, opts: KATA.slice(), ans: KATA[k], grp: null, g2: [], ask2: "", gwhy: "", v: `${nm}:${th.id}:${rev}` };
    };
  }

  // どの条件がちがう？（2つの聞き方で、1つだけ変える）
  const SOTO = ["外のことは知らない", "外はつらい暮らし", "外ははなやかな暮らし"];
  // 聞き方の文。place：0＝外にいる・1＝もう中、soto：外の暮らし、dare：0＝自分・1＝知らない人
  function sitText(th, place, soto, dare) {
    if (!place) return dare ? `知らない人が${th.w}の機械に入るのはよいか` : `${th.w}の機械に入るか`;
    return dare ? `知らない人はもう中。${SOTO[soto]}。出るのはよいか` : `もう${th.w}の機械の中。${SOTO[soto]}。出るか`;
  }
  // 1つだけちがう組を作る。g：ちがう条件
  function pairOf(R, g) {
    const dare = ri(R, 0, 1);
    if (g === "ima") return [[0, 0, dare], [1, 0, dare]];
    if (g === "soto") { const [x, y] = pickN(R, [0, 1, 2], 2); return [[1, x, dare], [1, y, dare]]; }
    const place = ri(R, 0, 1), soto = place ? ri(R, 0, 2) : 0;
    return [[place, soto, 0], [place, soto, 1]];
  }
  const J_WHY = {
    ima: "変えたのは、いまいる所（外か、もう中か）。De Brigard 2010 は、これだけで答えが変わると考えた。",
    soto: `変えたのは、外の本当の暮らしの中身。De Brigard 2010 では、外が刑務所だと残るが${pc(ST.dbneg.mach)}になった。`,
    dare: `変えたのは、だれのことか（自分か、知らない人か）。Weijers 2014 では、知らない人だと入るのがよいが${pc(ST.wst.mach)}。`,
  };
  function joukenQ(g) {
    return (R) => {
      const th = THEMES[ri(R, 0, THEMES.length - 1)], pr = pairOf(R, g), sw = ri(R, 0, 1), [x, y] = sw ? [pr[1], pr[0]] : pr;
      return { type: "jouken", media: "2つの聞き方", ask: "AとBで、ちがう条件は？", q: `A：${sitText(th, ...x)}。\nB：${sitText(th, ...y)}。`, opts: COND.slice(), ans: GROUPS[g].name, grp: null, g2: [], ask2: "", gwhy: "", v: `${th.id}:${x.join("")}:${y.join("")}` };
    };
  }

  // 研究で多かった答え（7割より多い・どちらも3割から6割）。くらべる元（base）と、変えた条件（g）
  const TCMP = {
    dbn: ["noz", "ima"], dbneg: ["dbn", "soto"], dbpos: ["dbn", "soto"], db2: ["dbn", "soto"],
    wst: ["wself", "dare"], wnsq: ["wst", "ima"], wcou: ["wst", "dare"], wfri: ["wst", "dare"],
  };
  const majOf = (s) => (s.pa > 70 ? `「${s.A}」が7割より多い` : 100 - s.pa > 70 ? `「${s.B}」が7割より多い` : s.pa >= 30 && s.pa <= 60 && 100 - s.pa >= 30 ? "どちらも3割から6割" : null);
  const shortDesc = (s) => s.desc.replace(/（[^）]*）$/, "");
  function tasuuQ(ids) {
    return (R) => {
      const id = ids[ri(R, 0, ids.length - 1)], s = ST[id], ans = majOf(s), c = TCMP[id], b = c ? ST[c[0]] : null;
      return {
        type: "tasuu", media: BYNAME[s.by], ask: "多かった答えは？", q: `${s.who}に聞いた。${s.desc}。`,
        opts: shuffle(R, [`「${s.A}」が7割より多い`, `「${s.B}」が7割より多い`, "どちらも3割から6割"]), ans,
        grp: c ? c[1] : null, g2: c ? G3.slice() : [], ask2: c ? `「${shortDesc(b)}」とくらべて、変えた条件は？` : "",
        gwhy: c ? `${stText(b)}。変えたのは「${GROUPS[c[1]].name}」。` : "",
        why: `${stText(s)}（${s.p}）。`, src: [SRC[s.by]], v: id,
      };
    };
  }

  // 機械を選んだ人は、Aの聞き方からBの聞き方で？（10ポイント以上でふえた・へった、5ポイント以内でほぼ同じ）
  const Y3 = ["ふえた", "へった", "ほぼ同じ"];
  const YP = [
    ["noz", "dbn", "ima"], ["dbn", "dbneg", "soto"], ["dbn", "db2", "soto"], ["dbpos", "dbneg", "soto"], ["wself", "wst", "dare"],
    ["dbn", "noz", "ima"], ["dbneg", "dbn", "soto"], ["db2", "dbn", "soto"], ["dbneg", "dbpos", "soto"], ["wst", "wself", "dare"],
    ["dbn", "dbpos", "soto"], ["dbpos", "dbn", "soto"], ["wst", "wnsq", "ima"], ["wnsq", "wst", "ima"],
  ];
  const yOf = (a, b) => { const d = ST[b].mach - ST[a].mach; return d >= 10 ? 0 : d <= -10 ? 1 : Math.abs(d) <= 5 ? 2 : -1; };
  function yosouQ(y) {
    const ps = YP.filter(([a, b]) => yOf(a, b) === y);
    return (R) => {
      const [a, b, g] = ps[ri(R, 0, ps.length - 1)], sa = ST[a], sb = ST[b];
      return {
        type: "yosou", media: "研究の数字", ask: "機械を選んだ人は、AからBで？", q: `A：${shortDesc(sa)}。\nB：${shortDesc(sb)}。`,
        opts: shuffle(R, Y3), ans: Y3[y], grp: g, g2: G3.slice(), ask2: "AとBで変えた条件は？",
        gwhy: `変えたのは「${GROUPS[g].name}」だけ。`,
        why: `A ${pc(sa.mach)} → B ${pc(sb.mach)}（機械を選んだ人）。${BYNAME[sa.by]}${sa.by !== sb.by ? "・" + BYNAME[sb.by] : ""}。`, src: [...new Set([sa.by, sb.by])].map((x) => SRC[x]), v: `${a}>${b}`,
      };
    };
  }

  // id：種類、lv：難しさ、name：帳に出す名前、look：1回目のヒント、key：2回目のヒント（資料の言葉）、why：説明（資料の名前を書く）、src：出典、make：問題を作る
  const K = (id, lv, src, name, look, key, why, make) => ({ id, lv, src: [src], name, look, key, why, make });
  const KEY_R = "ノージックの理由：①自分でしたい ②ある人でありたい ③人が作った現実はいや。";
  const KEY_M = "体験の機械は体験を、変身の機械は人がらを、結果の機械は世界の結果を出す。";
  const KEY_K = "外では入る・入らない、中では出る・残る。どちらも同じ所を選ぶか見る。";
  const KEY_J = "AとBで、文のちがう所を1つさがします。";
  const KEY_T = "7割より多いのは、ノージックのまま聞いたときと、外が刑務所のときだけ。";
  const KEY_Y = "10ポイント以上ちがえば、ふえた・へった。5ポイント以内なら、ほぼ同じ。";
  const KINDS = [
    // ---- やさしい ----
    K("r-do", 0, "noz", "自分でしたい", "体験でなく、何をしたい話？", KEY_R, R_WHY[0], riyuuQ(0)),
    K("r-be", 0, "noz", "こういう人でありたい", "どんな人でいたいかの話？", KEY_R, R_WHY[1], riyuuQ(1)),
    K("r-real", 0, "noz", "本物にふれたい", "作り物か本物かの話？", KEY_R, R_WHY[2], riyuuQ(2)),
    K("m-exp", 0, "noz", "体験の機械", "ほしいのは気分・体験？", KEY_M, M_WHY[0], kikaiQ(0)),
    K("m-trans", 0, "noz", "変身の機械", "自分の人がらを変えたい？", KEY_M, M_WHY[1], kikaiQ(1)),
    K("m-res", 0, "noz", "結果の機械", "世界で本当に起きてほしい？", KEY_M, M_WHY[2], kikaiQ(2)),
    // ---- ふつう ----
    K("k-stay", 1, "db", "形：いまの所に残る", "外でも中でも、いまの所？", KEY_K, KATA_WHY[0], kataQ(0)),
    K("k-real", 1, "noz", "形：いつも本物", "外でも中でも、本物の暮らし？", KEY_K, KATA_WHY[1], kataQ(1)),
    K("k-mach", 1, "noz", "形：いつも機械", "外でも中でも、機械？", KEY_K, KATA_WHY[2], kataQ(2)),
    K("k-move", 1, "db", "形：いつも動く", "外でも中でも、いまの所から動く？", KEY_K, KATA_WHY[3], kataQ(3)),
    K("j-ima", 1, "db", "いまいる所がちがう", "「入るか」と「出るか」を見ます。", KEY_J, J_WHY.ima, joukenQ("ima")),
    K("j-soto", 1, "db", "外の暮らしがちがう", "外の暮らしの文を見ます。", KEY_J, J_WHY.soto, joukenQ("soto")),
    K("j-dare", 1, "wj", "だれのことかがちがう", "だれが入る・出るかを見ます。", KEY_J, J_WHY.dare, joukenQ("dare")),
    // ---- むずかしい（研究の数字）----
    K("t-db", 2, "db", "逆向きの問いの数字", "もう中にいると、残る人は？", KEY_T, "", tasuuQ(["dbn", "dbneg", "dbpos", "db2"])),
    K("t-wj", 2, "wj", "ノージックのままと、知らない人", "自分のことか、人のことか。", KEY_T, "", tasuuQ(["noz", "wst", "wnsq", "wcou", "wfri"])),
    K("y-up", 2, "db", "機械を選ぶ人がふえる", "どちらがいまの所に残る聞き方？", KEY_Y, "", yosouQ(0)),
    K("y-down", 2, "db", "機械を選ぶ人がへる", "どちらが外を選びやすい聞き方？", KEY_Y, "", yosouQ(1)),
    K("y-same", 2, "db", "ほとんど変わらない", "変えた条件で、残る理由は変わる？", KEY_Y, "", yosouQ(2)),
  ];
  const BY = Object.fromEntries(KINDS.map((k) => [k.id, k]));
  const kindsOf = (lv, date) => KINDS.filter((k) => k.lv === lv && (!date || !k.since || k.since <= date)).map((k) => k.id);
  // part:seedOf:begin（shared-workflows の template/parts/data/seedOf.js の写し。ここでは直さない。node scripts/sync-template.mjs で写す）
  function seedOf(str) { let h = 2166136261; for (const ch of String(str)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
  // part:seedOf:end
  // part:rng:begin（shared-workflows の template/parts/data/rng.js の写し。ここでは直さない。node scripts/sync-template.mjs で写す）
  function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  // part:rng:end
  // 1問を作る。tag は「種類|種」（例 "r-do|2026-11-28:d0"）。同じ tag ならいつも同じ問題
  function make(tag) {
    const [kind] = String(tag).split("|"), k = Object.prototype.hasOwnProperty.call(BY, kind) ? BY[kind] : null;
    if (!k) return null;
    const p = k.make(rng(seedOf(tag)), k.lv);
    if (!p) return null;
    return { tag, kind, lv: k.lv, name: k.name, look: k.look, key: k.key, why: k.why, src: k.src.map((s) => SRC[s]), ...p };
  }
  // 同じ問題かを見分ける鍵（種類・言い方・選び肢の組・2段目）
  const keyOf = (P) => `${P.kind}:${P.q}:${P.opts.slice().sort().join("/")}:${P.ask2}`;
  // 今日の5問（やさしい2・ふつう2・むずかしい1）。種類は重ねない
  function dailyTags(date) {
    const R = rng(seedOf("day:" + date)), e = pickN(R, kindsOf(0, date), 2), n = pickN(R, kindsOf(1, date), 2), h = pickN(R, kindsOf(2, date), 1);
    return [...e, ...n, ...h].map((id, i) => `${id}|${date}:d${i}`);
  }
  // 上級の3問（むずかしいだけ・今日の5問のむずかしいとは別の種類）
  function hardTags(date) {
    const dh = dailyTags(date)[4].split("|")[0], R = rng(seedOf("hard:" + date)), h = pickN(R, kindsOf(2, date).filter((x) => x !== dh), 3);
    return h.map((id, i) => `${id}|${date}:h${i}`);
  }
  // 今日の夢の機械のお題（だれでも同じ）
  const themeOf = (date) => THEME_DAY[seedOf("theme:" + date) % THEME_DAY.length];
  const YMK = { KINDS, BY, GROUPS, G3, LV, SRC, MORE, ST, BYNAME, THEMES, THEME_BY, STEPS, KATA, R3, M3, Y3, COND, kataOf, stayScore, stText, pc, majOf, yOf, YP, TCMP, kindsOf, seedOf, rng, make, keyOf, dailyTags, hardTags, themeOf, pickN };
  if (typeof module !== "undefined" && module.exports) module.exports = YMK; else root.YMK = YMK;
})(typeof self !== "undefined" ? self : this);
