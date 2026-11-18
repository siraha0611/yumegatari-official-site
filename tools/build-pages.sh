#!/usr/bin/env bash
# Cloudflare Pages 用の公開フォルダ dist/ を作る（2026-11-18）。
# リポジトリには非公開にしたい物（_worker/ の掲示板コード、README、メモ類）も入っているため、
# 公開してよい物だけを選んで dist/ に写す。
# book.html は 25MB 超で Pages に載らないので R2 に置き、functions/book.html.js が配る（README参照）。
set -euo pipefail
cd "$(dirname "$0")/.."
rm -rf dist
mkdir -p dist
for f in *.html robots.txt sitemap.xml; do
  [ "$f" = "book.html" ] && continue
  cp "$f" dist/
done
cp -R assets dist/assets
mkdir -p dist/go
for d in go/*/; do
  mkdir -p "dist/$d"
  cp "$d/index.html" "dist/$d"
done
# 念のため：25MiB を超えるファイルが紛れたら止める（Pages の上限）
big=$(find dist -type f -size +25M)
if [ -n "$big" ]; then echo "25MiB超のファイルがあります: $big" >&2; exit 1; fi
echo "dist/ に $(find dist -type f | wc -l | tr -d ' ') ファイル"
