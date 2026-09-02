/**
 * 夢語りはティータイムのあとで 公式サイト — 通過者の感想掲示板 API
 *
 * エンドポイント
 *   POST /gate            {answer}                → {token}   通過者ゲート(設問の答え合わせ)
 *   GET  /posts           Authorization: Bearer <token>       → {posts:[…]}
 *   POST /posts           Authorization: Bearer <token>, {name,role,ho,body,website}
 *   GET  /posts?all=1     Authorization: Bearer <ADMIN_TOKEN> → 非表示分も含む
 *   POST /admin/hide      Authorization: Bearer <ADMIN_TOKEN>, {id,hidden}
 *
 * 設計メモ
 *   - 設問の正解はサーバ側の secret(GATE_ANSWERS)だけが知っている。HTMLにもリポにも置かない。
 *   - ゲートを通ると30日有効のHMAC署名トークンを返す。閲覧も投稿もトークン必須=ネタバレ本文は未通過者に出ない。
 *   - ゲート総当たり対策: 同一IP(ハッシュ)で1時間に10回失敗したらロック(gate_fails表)。
 *   - スパム対策: ハニーポット(website)・文字数制限・同一IP(ハッシュ)の連投制限(60秒/1件、1日20件)。
 *     連投制限は INSERT … WHERE NOT EXISTS の単一SQLで判定するので、並列POSTでも突破できない。
 *   - 削除は物理削除でなく hidden=1(誤操作から戻せる)。
 */

const TOKEN_TTL_SEC = 60 * 60 * 24 * 30; // 30日
const POST_INTERVAL_SEC = 60;
const POST_DAILY_CAP = 20;
const BODY_MIN = 10;
const GATE_FAIL_LIMIT = 10;      // 1時間あたりの不正解上限(IPハッシュ単位)
const GATE_FAIL_WINDOW_SEC = 3600;
const ROLES = ["KP", "PL", "KP・PL"];
const HOS = ["", "HO1", "HO2", "HO3", "HO4"];

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin") || "";
    const cors = corsHeaders(origin, env);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors });
    }
    // Originがあるのに許可外なら拒否(curl等のOrigin無しは通す。トークンで守る)
    if (origin && !isAllowedOrigin(origin, env)) {
      return json({ error: "origin not allowed" }, 403, cors);
    }

    try {
      const path = url.pathname.replace(/\/+$/, "") || "/";
      if (request.method === "GET" && path === "/") {
        return json({ ok: true, service: "yumegatari-reviews" }, 200, cors);
      }
      if (request.method === "POST" && path === "/gate") return handleGate(request, env, cors);
      if (request.method === "GET" && path === "/posts") return handleList(request, env, cors, url);
      if (request.method === "POST" && path === "/posts") return handleCreate(request, env, cors);
      if (request.method === "POST" && path === "/admin/hide") return handleHide(request, env, cors);
      return json({ error: "not found" }, 404, cors);
    } catch (err) {
      console.error(err);
      return json({ error: "internal error" }, 500, cors);
    }
  },
};

/* ---------------- handlers ---------------- */

async function handleGate(request, env, cors) {
  const body = await readJson(request);
  const answer = normalizeAnswer(String(body.answer || ""));
  if (!answer) return json({ error: "answer required" }, 400, cors);

  const accepted = String(env.GATE_ANSWERS || "")
    .split(",")
    .map((s) => normalizeAnswer(s))
    .filter(Boolean);

  // 総当たり対策: 直近1時間の失敗回数を見る
  const ipHash = await hashIp(request, env);
  const nowSec = Math.floor(Date.now() / 1000);
  const rec = await env.DB.prepare("SELECT fails, window_start FROM gate_fails WHERE ip_hash = ?1").bind(ipHash).first();
  let fails = 0;
  let windowStart = nowSec;
  if (rec && nowSec - Number(rec.window_start) < GATE_FAIL_WINDOW_SEC) {
    fails = Number(rec.fails) || 0;
    windowStart = Number(rec.window_start);
  }
  if (fails >= GATE_FAIL_LIMIT) {
    return json({ ok: false, error: "gate_locked" }, 429, cors);
  }

  if (!accepted.includes(answer)) {
    await env.DB.prepare(
      "INSERT INTO gate_fails (ip_hash, fails, window_start) VALUES (?1, ?2, ?3) ON CONFLICT(ip_hash) DO UPDATE SET fails = ?2, window_start = ?3"
    ).bind(ipHash, fails + 1, windowStart).run();
    await sleep(600);
    return json({ ok: false, error: "wrong_answer" }, 403, cors);
  }
  if (rec) await env.DB.prepare("DELETE FROM gate_fails WHERE ip_hash = ?1").bind(ipHash).run();
  const token = await issueToken(env);
  return json({ ok: true, token, expiresIn: TOKEN_TTL_SEC }, 200, cors);
}

async function handleList(request, env, cors, url) {
  const bearer = getBearer(request);
  const isAdmin = !!env.ADMIN_TOKEN && bearer === env.ADMIN_TOKEN;
  if (!isAdmin && !(await verifyToken(bearer, env))) {
    return json({ error: "gate required" }, 401, cors);
  }
  const showAll = isAdmin && url.searchParams.get("all") === "1";
  const stmt = showAll
    ? env.DB.prepare("SELECT id, created_at, name, role, ho, body, hidden, allow_quote FROM posts ORDER BY id DESC LIMIT 300")
    : env.DB.prepare("SELECT id, created_at, name, role, ho, body, hidden FROM posts WHERE hidden = 0 ORDER BY id DESC LIMIT 300");
  const { results } = await stmt.all();
  return json({ ok: true, admin: isAdmin, posts: results || [] }, 200, cors);
}

async function handleCreate(request, env, cors) {
  const bearer = getBearer(request);
  if (!(await verifyToken(bearer, env))) return json({ error: "gate required" }, 401, cors);

  const data = await readJson(request);
  // ハニーポット: 人間には見えない欄。埋まっていたらbotとみなし、成功したふりをして捨てる
  if (data.website) return json({ ok: true, id: 0 }, 200, cors);

  const nameMax = toInt(env.NAME_MAX, 24);
  const bodyMax = toInt(env.BODY_MAX, 1500);

  let name = cleanText(String(data.name || ""), true);
  if (!name) name = "匿名の探索者";
  if ([...name].length > nameMax) return json({ error: `name too long (max ${nameMax})` }, 400, cors);

  const role = String(data.role || "");
  if (!ROLES.includes(role)) return json({ error: "invalid role" }, 400, cors);
  const ho = String(data.ho || "");
  if (!HOS.includes(ho)) return json({ error: "invalid ho" }, 400, cors);

  const body = cleanText(String(data.body || ""));
  const allowQuote = data.allow_quote === true || data.allow_quote === 1 || data.allow_quote === "1" ? 1 : 0;
  const len = [...body].length;
  if (len < BODY_MIN) return json({ error: `body too short (min ${BODY_MIN})` }, 400, cors);
  if (len > bodyMax) return json({ error: `body too long (max ${bodyMax})` }, 400, cors);
  if ((body.match(/https?:\/\//gi) || []).length > 2) {
    return json({ error: "too many links" }, 400, cors);
  }

  const ipHash = await hashIp(request, env);
  const now = new Date();
  const since1m = new Date(now.getTime() - POST_INTERVAL_SEC * 1000).toISOString();
  const since1d = new Date(now.getTime() - 86400 * 1000).toISOString();
  // 連投判定とINSERTを1文にまとめる(SQLiteは単一ライターなので並列POSTでも二重に通らない)
  const res = await env.DB.prepare(
    "INSERT INTO posts (created_at, name, role, ho, body, ip_hash, hidden, allow_quote) " +
      "SELECT ?1, ?2, ?3, ?4, ?5, ?6, 0, ?7 " +
      "WHERE NOT EXISTS (SELECT 1 FROM posts WHERE ip_hash = ?6 AND created_at > ?8) " +
      "AND (SELECT COUNT(*) FROM posts WHERE ip_hash = ?6 AND created_at > ?9) < ?10"
  ).bind(now.toISOString(), name, role, ho, body, ipHash, allowQuote, since1m, since1d, POST_DAILY_CAP).run();

  if (!res.meta || !res.meta.changes) {
    const cnt = await env.DB.prepare("SELECT COUNT(*) AS d FROM posts WHERE ip_hash = ?1 AND created_at > ?2").bind(ipHash, since1d).first();
    const code = cnt && Number(cnt.d) >= POST_DAILY_CAP ? "daily_cap" : "too_fast";
    return json({ error: code }, 429, cors);
  }
  return json({ ok: true, id: res.meta.last_row_id }, 200, cors);
}

async function handleHide(request, env, cors) {
  const bearer = getBearer(request);
  if (!env.ADMIN_TOKEN || bearer !== env.ADMIN_TOKEN) return json({ error: "admin only" }, 403, cors);
  const data = await readJson(request);
  const id = Number(data.id);
  if (!Number.isInteger(id) || id <= 0) return json({ error: "invalid id" }, 400, cors);
  const hidden = data.hidden === false || data.hidden === 0 || data.hidden === "0" ? 0 : 1;
  const res = await env.DB.prepare("UPDATE posts SET hidden = ?1 WHERE id = ?2").bind(hidden, id).run();
  return json({ ok: true, changed: res.meta && res.meta.changes }, 200, cors);
}

/* ---------------- helpers ---------------- */

function corsHeaders(origin, env) {
  const h = {
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
  };
  if (origin && isAllowedOrigin(origin, env)) h["Access-Control-Allow-Origin"] = origin;
  return h;
}

function isAllowedOrigin(origin, env) {
  // ローカルプレビュー(python http.server等)はポートが変わるので localhost 系を丸ごと許可
  if (/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return true;
  return String(env.ALLOWED_ORIGINS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .includes(origin);
}

function json(obj, status, headers) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...headers },
  });
}

async function readJson(request) {
  try {
    return (await request.json()) || {};
  } catch {
    return {};
  }
}

function getBearer(request) {
  const m = /^Bearer\s+(.+)$/i.exec(request.headers.get("Authorization") || "");
  return m ? m[1].trim() : "";
}

function toInt(v, d) {
  const n = parseInt(v, 10);
  return Number.isFinite(n) && n > 0 ? n : d;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/** 制御文字を落とし、3連以上の改行を2つに詰める(singleLine=trueなら1行に潰す) */
function cleanText(s, singleLine) {
  let t = s.replace(/\r\n?/g, "\n").replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g, "");
  t = t.replace(/\n{3,}/g, "\n\n").trim();
  if (singleLine) t = t.replace(/\s+/g, " ");
  return t;
}

/** NFKC → ひらがな→カタカナ → 英数以外の記号・空白を除去 → 小文字 */
function normalizeAnswer(s) {
  let t = s.normalize("NFKC").trim();
  t = t.replace(/[ぁ-ゖ]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) + 0x60));
  t = t.replace(/[^\p{L}\p{N}]/gu, "");
  return t.toLowerCase();
}

async function hmacKey(env) {
  const secret = env.TOKEN_SECRET;
  if (!secret) throw new Error("TOKEN_SECRET not set");
  return crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}

function toHex(buf) {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function issueToken(env) {
  const exp = Math.floor(Date.now() / 1000) + TOKEN_TTL_SEC;
  const nonce = toHex(crypto.getRandomValues(new Uint8Array(8)));
  const payload = `${exp}.${nonce}`;
  const key = await hmacKey(env);
  const sig = toHex(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload)));
  return `${payload}.${sig}`;
}

async function verifyToken(token, env) {
  if (!token || !env.TOKEN_SECRET) return false;
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  const [expStr, nonce, sig] = parts;
  const exp = parseInt(expStr, 10);
  if (!Number.isFinite(exp) || exp < Math.floor(Date.now() / 1000)) return false;
  if (!/^[0-9a-f]{16}$/.test(nonce) || !/^[0-9a-f]{64}$/.test(sig)) return false;
  const key = await hmacKey(env);
  const expected = toHex(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${expStr}.${nonce}`)));
  return timingSafeEqual(expected, sig);
}

function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function hashIp(request, env) {
  const ip = request.headers.get("CF-Connecting-IP") || request.headers.get("X-Forwarded-For") || "0.0.0.0";
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${ip}|${env.TOKEN_SECRET || ""}`));
  return toHex(buf).slice(0, 24);
}
