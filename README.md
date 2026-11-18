# 夢語りはティータイムのあとで 公式サイト

クトゥルフ神話TRPG6版シナリオ『夢語りはティータイムのあとで』(通称:夢ティ)の公式サイト。
静的HTML/CSS(+最小限のvanilla JS)のみで構成。**https://yumeti.kaso-kobo.com （Cloudflare Pages）で公開**。

サイト構成は TRPG シナリオサイトの定番構成(HOME / STORY / OVERVIEW / CHARACTER / KEYWORD / HO)を参考にしている。

## ページ構成

| ファイル | 内容 |
|---|---|
| `index.html` | HOME(キャッチコピー・あらすじ・基本情報・各ページ導線) |
| `story.html` | STORY(小説風の導入・物語のはじまり) |
| `overview.html` | OVERVIEW(スペック・公開HO・注意事項) |
| `characters.html` | CHARACTER(登場人物のカードとプロフィール) |
| `keyword.html` | KEYWORD(用語集) |
| `handout.html` | HANDOUT(公開HO一覧と秘匿ページへの入口) |
| `ho1.html`〜`ho4.html` | 🔒 秘匿ハンドアウト(StatiCryptでAES暗号化・パスワード保護) |
| `before-session.html` | 事前情報(喫茶アストレア・永眠事件・店内ギャラリー) |
| `kp-guide.html` | KP向け情報(難度・キャンペーン構成・同梱物一覧) |
| `scenario.html` | 購入ページ(BOOTHリンク・HO診断リンク) |
| `404.html` | 404ページ |

## ディレクトリ

```
assets/
  css/style.css   共通スタイル
  js/main.js      モバイルナビ用の最小JS
  img/            ロゴ・バナー・背景・キャラクターカード(WebP)
_ho_src/          🔒 秘匿HOの平文ソース(gitignore対象・ローカルのみ)
_passwords.md     🔒 パスワード控え(gitignore対象・ローカルのみ)
.staticrypt.json  StatiCryptのsalt(コミット対象。secretではない)
```

## 秘匿ページ(ネタバレ保護)の仕組み

- `ho1.html`〜`ho4.html` は [StatiCrypt](https://github.com/robinmoisson/staticrypt) でAES-256暗号化されており、リポジトリ上にも平文は存在しない。
- 平文ソースは `_ho_src/`(gitignore対象)にのみ存在する。**このフォルダを消すと再編集できなくなるのでバックアップに注意。**
- パスワードは `_passwords.md`(gitignore対象)に控えてある。変更・再暗号化の手順も同ファイルに記載。
- 各HOのパスワードは、KPが担当PLにだけ配布する運用を想定。

## ローカルでの確認方法

```
python3 -m http.server 8000
```

`http://localhost:8000/` を開く。

## 公開（2026-11-18 から Cloudflare Pages）

- 本番: https://yumeti.kaso-kobo.com （Cloudflare Pages のプロジェクト `yumeti`）
- `main` に push すると自動で公開される。ビルド = `bash tools/build-pages.sh` → `dist/` を公開（設定は `wrangler.toml`）。
- `tools/build-pages.sh` は**公開してよい物だけ**を `dist/` に写す（`_worker/`・README・`go/*.md` は載せない）。新しい公開ファイルを足すときは、このスクリプトが拾うか確認する。
- 旧URL `https://siraha0611.github.io/yumegatari-official-site/` は**印刷物のQRが指しているので止めない**。GitHub Pages は `gh-redirect` ブランチ（同じパスの新URLへ移すページだけ）を公開している。

### book.html の更新（R2 に置いている）

book.html は 32MB あり Pages の 1 ファイル上限（25MiB）を超えるので、R2 バケット `yumegatari-dl` の `site/book.html` に置き、`functions/book.html.js` が `/book.html` で配っている。リポジトリの `book.html` は控え。暗号化し直したら、コミットに加えて R2 にも上げる:

```
npx wrangler r2 object put yumegatari-dl/site/book.html --file book.html --content-type "text/html; charset=utf-8" --remote
```

（`--remote` を忘れるとローカルのシミュレータに書かれて本番は変わらない）

## ネタバレ範囲について

- **公開ページ**に掲載している情報は、シナリオ本文中で「PL公開」「事前情報」「公開HO」として明示されている範囲のみ。「炎の神殿」入室以降の展開・真相・結末には触れない。
- **秘匿ページ(ho1〜ho4)** には各HOの秘匿ハンドアウト全文を掲載している。追記時もKP専用情報(真相・NPC真相)は載せない方針(それは製品本文の領分)。
