// /book.html（購入者専用・シナリオ全文 Web 閲覧版）を R2 から配る。
// 32MB あり Cloudflare Pages の 1 ファイル上限（25MiB）を超えるため、本体は R2 の
// yumegatari-dl バケットの site/book.html に置いている。StatiCrypt で暗号化済みなので
// 中身はパスワードが無いと読めない。更新手順は README.md の「book.html の更新」。
export async function onRequestGet({ env }) {
  const obj = await env.SITE_FILES.get("site/book.html");
  if (!obj) return new Response("Not found", { status: 404 });
  return new Response(obj.body, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "public, max-age=600",
      "x-robots-tag": "noindex",
      etag: obj.httpEtag,
    },
  });
}

export async function onRequestHead({ env }) {
  const obj = await env.SITE_FILES.head("site/book.html");
  if (!obj) return new Response(null, { status: 404 });
  return new Response(null, {
    headers: { "content-type": "text/html; charset=utf-8", "content-length": String(obj.size), etag: obj.httpEtag },
  });
}
