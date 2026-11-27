# AGENTS.md

夢の機械、入る？：入れば望む体験がつづく夢の機械（ノージックの経験機械）に、「入る？」「もう中にいたら出る？」など5つ答える（正解の無い問い）。自分の答えと研究で多かった答えをくらべ、いまいる所に残った答えの数（現状維持）を見る。続けて、ノージックの3つの理由・3つの機械・答え方の形・どの条件がちがうか・研究で多かった答えの問題を1日5問（正解がある）。`index.html` と `data.js`（問題の種類と機械のお題）を GitHub Pages で公開する。

## 準備（最初に一度）

```bash
bash scripts/setup.sh   # Node.js（版は .nvmrc）を確かめ、検査の依存とブラウザを入れる。何度実行してもよい
```

Claude Code のクラウドセッションでは `.claude/settings.json` のフックが自動で実行する。

## push する前の確認

```bash
node qa/run.mjs   # 問題（18種類×3000問：答えと2段目が論文の数字どおり）・夢の機械の進み方・今日の回と上級（3年分）・とことん・通しで遊ぶ・続きから・復習・幅320px・PWA・引き継ぎ・見やすさ（CI の QA と同じ）
```

## このリポジトリの決まり

- 問題の中身は Nozick 1974（pp.42–45）・De Brigard 2010（Philosophical Psychology 23(1)）・Weijers 2014（Philosophical Psychology 27(4)）に書いてあることだけ（2026-11-27 に読んだ）。研究の数字は `data.js` の `ST` にまとめ、論文で確かめたものだけ使う（確かめられない数字は足さない）。数字を足すときは論文を読み、`qa/run.mjs` の `TB`（別に書いた数字の表）にも足す。調べた要点は共有フォルダ `games/yume-kikai-research.md`。
- 夢の機械には正解を出さない（好みに正解は無い）。答えのある問いは「研究で多かった答え」「どの条件がちがうか」「ノージックの理由・機械のどれか」「答え方の形」だけ。夢の機械の答えは自信をかける・復習・★に入れない。
- 研究の数は大学生などに聞いた1回の結果で、人みんなの答えではないことを、遊び方と「このゲームについて」と README に書く（QA が見る）。特定の人・国のよい悪いをくらべない。お笑いを入れない。
- 2段目：研究の数字の問題（`t-*`・`y-*`）は「変えた条件は？」（いまいる所・外の暮らしの中身・だれのことか）。
- 今日の回（夢の機械5つ＋やさしい2・ふつう2・むずかしい1）・上級（むずかしい3）・機械のお題は日本時間の日付の種で決まり、だれでも同じ。`Math.random()` は練習・とことんの種だけ。`KINDS`・`THEMES`・`THEME_DAY`・文の表は最後に足すだけ（QA の `PIN` が第1回を見る）。`data.js` を変える PR は自動ではマージされない（`hold_paths`）。
- ★はまちがい＋ヒントの数（0で★3・1で★2・2以上で★1）。上級はヒントなし。時間制限なし。
- 好きなだけ遊べる：チケット・ライフ・回数制限・🔒で開くモードを入れない（shared-workflows `routines/game-dev.md` F1〜F7。QA が見る）。練習の夢の機械は何度でも。
- 記録 `ymk-v1`・文字 `ymk-fs`・復習 `ymk-depth`。`depth.js`・`qa/depth-check.mjs`・見やすさ（`<!-- a11y:begin -->`〜`end`・`qa/a11y.mjs`）・引き継ぎ（`transfer.js`・`qa/transfer-check.mjs`）は shared-workflows `template/` の写しで、ここでは直さない。
- 画面の土台は どこから砂山？（sunayama-doko）から写した。写し元の言葉が残っていないかを QA が見る。
- 共有は遊ぶ人が押したときに開くリンクだけ。シェアの文に問題・答えを出さない（夢の機械の残った数は正解の無い答えなので出す）。外へ通信しない（CSP の `connect-src 'self'` を広げない）。
- PWA：画面のファイルを足したら `sw.js` の `SHELL` にも足し、中身を大きく変えたら `CACHE` の版を上げる。アイコンは `node tools/make-icons.cjs`、`og.png` は `node tools/make-og.cjs`。
- 公開リポジトリなので、個人情報・鍵を入れない。

## 公開

- GitHub Pages は `main` のルート（`/`）を公開する。PR の QA と Secret scan が ✅ になると `automerge.yml` が自動でマージする。止めたいときは下書きにするか、ラベル「自動マージしない」を付ける。
- `sw.js`・`manifest.webmanifest`・`data.js` を変える PR は自動ではマージされない（`hold_paths`）。CodeRabbit のレビューを読み、手でマージする直前に今の head へのレビューを読み直す。CodeRabbit は PR に `@coderabbitai review` とコメントして頼む。

## 共通のきまり

- PR の作り方・マージの仕方は satou-aaaaa/shared-workflows の `routines/pr.md`、全体のきまりは `routines/common.md` に従う。
- CI の部品は shared-workflows の共通部品を呼ぶ。リポジトリ側の .github/workflows には呼び出しと設定値だけを書く。
- Claude 以外の AI・人が作業するときは、shared-workflows の `routines/tool-map.md` と `routines/without-claude.md` を読む。
