/* reviews.html — 通過者の感想(ネタバレ掲示板)
   バックエンド = Cloudflare Worker(_worker/)。ゲート通過トークンをlocalStorageに30日保持する。 */
(function () {
  "use strict";
  var API = "https://yumegatari-reviews.anb14625siraha.workers.dev";
  var TOKEN_KEY = "yumeti_reviews_token";
  var BODY_MAX = 1500;
  var NAME_MAX = 24;

  var $ = function (id) { return document.getElementById(id); };
  var gateSec = $("rv-gate-section");
  var boardSec = $("rv-board-section");
  var gateForm = $("rv-gate-form");
  var gateInput = $("rv-gate-answer");
  var gateMsg = $("rv-gate-msg");
  var postForm = $("rv-post-form");
  var postMsg = $("rv-post-msg");
  var bodyEl = $("rv-body");
  var countEl = $("rv-count");
  var listEl = $("rv-list");
  var submitBtn = $("rv-submit");
  var toolbar = $("rv-toolbar");

  var token = null;
  try { token = localStorage.getItem(TOKEN_KEY); } catch (e) { token = null; }
  // 管理トークンはメモリにだけ持つ(storageに残さない。ページを開き直すたびに入力する)
  var adminToken = null;
  if (/[?&]admin(=|&|$)/.test(location.search)) {
    var t = window.prompt("管理トークンを入力してください(_passwords.md 参照)");
    if (t) adminToken = t.trim();
  }

  function setMsg(el, text, kind) {
    el.textContent = text || "";
    el.className = "rv-msg" + (kind ? " " + kind : "");
  }

  function api(path, opts) {
    opts = opts || {};
    var headers = { "Content-Type": "application/json" };
    if (opts.auth) headers["Authorization"] = "Bearer " + opts.auth;
    return fetch(API + path, {
      method: opts.method || "GET",
      headers: headers,
      body: opts.body ? JSON.stringify(opts.body) : undefined
    }).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (data) {
        data._status = res.status;
        return data;
      });
    });
  }

  function showBoard() {
    gateSec.hidden = true;
    boardSec.hidden = false;
    loadPosts();
  }

  function showGate(msg) {
    boardSec.hidden = true;
    gateSec.hidden = false;
    listEl.innerHTML = "";          // 取得済みのネタバレ本文をDOMから消す
    setMsg(postMsg, "");
    if (msg) setMsg(gateMsg, msg, "err");
    try { localStorage.removeItem(TOKEN_KEY); } catch (e) {}
    token = null;
    adminToken = null;
  }

  /* ---------- ゲート ---------- */
  gateForm.addEventListener("submit", function (e) {
    e.preventDefault();
    var ans = gateInput.value.trim();
    if (!ans) { setMsg(gateMsg, "答えを入力してください。", "err"); return; }
    setMsg(gateMsg, "確認中…");
    gateForm.querySelector("button").disabled = true;
    api("/gate", { method: "POST", body: { answer: ans } }).then(function (d) {
      gateForm.querySelector("button").disabled = false;
      if (d.ok && d.token) {
        token = d.token;
        try { localStorage.setItem(TOKEN_KEY, token); } catch (e) {}
        setMsg(gateMsg, "");
        showBoard();
      } else if (d._status === 403) {
        setMsg(gateMsg, "答えが違うようです。シナリオを最後までプレイした方だけがわかる問いです。", "err");
      } else if (d._status === 429) {
        setMsg(gateMsg, "間違いが続いたため、しばらく受け付けを止めています。1時間ほどおいてからお試しください。", "err");
      } else {
        setMsg(gateMsg, "通信に失敗しました。時間をおいて再度お試しください。", "err");
      }
    }).catch(function () {
      gateForm.querySelector("button").disabled = false;
      setMsg(gateMsg, "通信に失敗しました。時間をおいて再度お試しください。", "err");
    });
  });

  /* ---------- 文字数カウンタ ---------- */
  function updateCount() {
    var n = Array.from(bodyEl.value).length;
    countEl.textContent = n + " / " + BODY_MAX + " 文字";
    countEl.classList.toggle("over", n > BODY_MAX);
  }
  bodyEl.addEventListener("input", updateCount);
  updateCount();

  /* ---------- 投稿 ---------- */
  postForm.addEventListener("submit", function (e) {
    e.preventDefault();
    var name = $("rv-name").value.trim();
    var role = $("rv-role").value;
    var ho = $("rv-ho").value;
    var body = bodyEl.value.replace(/\s+$/, "");
    var n = Array.from(body).length;
    if (Array.from(name).length > NAME_MAX) { setMsg(postMsg, "お名前は" + NAME_MAX + "文字以内でお願いします。", "err"); return; }
    if (n < 10) { setMsg(postMsg, "感想は10文字以上でお願いします。", "err"); return; }
    if (n > BODY_MAX) { setMsg(postMsg, "感想は" + BODY_MAX + "文字以内でお願いします。", "err"); return; }
    if (!$("rv-agree").checked) { setMsg(postMsg, "投稿前の約束事をご確認のうえチェックを入れてください。", "err"); return; }

    submitBtn.disabled = true;
    setMsg(postMsg, "送信中…");
    api("/posts", {
      method: "POST",
      auth: token,
      body: { name: name, role: role, ho: ho, body: body, allow_quote: $("rv-quote").checked, website: $("rv-website").value }
    }).then(function (d) {
      submitBtn.disabled = false;
      if (d.ok) {
        setMsg(postMsg, "投稿しました。ありがとうございます！", "ok");
        bodyEl.value = "";
        $("rv-quote").checked = false;
        $("rv-agree").checked = false;
        updateCount();
        loadPosts();
      } else if (d._status === 401) {
        showGate("有効期限が切れました。もう一度、問いに答えてください。");
      } else if (d._status === 429 && d.error === "daily_cap") {
        setMsg(postMsg, "本日の投稿上限に達しました。日を改めてお願いします。", "err");
      } else if (d._status === 429) {
        setMsg(postMsg, "連続投稿の制限中です。1分ほど待ってからもう一度お試しください。", "err");
      } else {
        setMsg(postMsg, "投稿できませんでした：" + (d.error || "不明なエラー"), "err");
      }
    }).catch(function () {
      submitBtn.disabled = false;
      setMsg(postMsg, "通信に失敗しました。時間をおいて再度お試しください。", "err");
    });
  });

  /* ---------- 一覧 ---------- */
  function fmtDate(iso) {
    var d = new Date(iso);
    if (isNaN(d.getTime())) return "";
    var p = function (x) { return (x < 10 ? "0" : "") + x; };
    return d.getFullYear() + "." + p(d.getMonth() + 1) + "." + p(d.getDate());
  }

  function renderPosts(posts, isAdmin) {
    listEl.innerHTML = "";
    if (!posts.length) {
      var empty = document.createElement("p");
      empty.className = "rv-empty";
      empty.textContent = "まだ感想はありません。最初のひとりになってください。";
      listEl.appendChild(empty);
      return;
    }
    posts.forEach(function (p) {
      var card = document.createElement("article");
      card.className = "rv-card" + (p.hidden ? " is-hidden" : "");

      var meta = document.createElement("div");
      meta.className = "rv-meta";
      var name = document.createElement("span");
      name.className = "rv-name";
      name.textContent = p.name;
      meta.appendChild(name);
      var role = document.createElement("span");
      role.className = "rv-badge";
      role.textContent = p.role;
      meta.appendChild(role);
      if (p.ho) {
        var ho = document.createElement("span");
        ho.className = "rv-badge ho";
        ho.textContent = p.ho;
        meta.appendChild(ho);
      }
      if (isAdmin && p.allow_quote) {
        var q = document.createElement("span");
        q.className = "rv-badge quote";
        q.textContent = "紹介OK";
        meta.appendChild(q);
      }
      var date = document.createElement("time");
      date.className = "rv-date";
      date.dateTime = p.created_at;
      date.textContent = fmtDate(p.created_at);
      meta.appendChild(date);
      card.appendChild(meta);

      var body = document.createElement("p");
      body.className = "rv-body";
      body.textContent = p.body;
      card.appendChild(body);

      if (isAdmin) {
        var bar = document.createElement("div");
        bar.className = "rv-admin-bar";
        var btn = document.createElement("button");
        btn.type = "button";
        btn.textContent = p.hidden ? "再表示する" : "非表示にする";
        btn.addEventListener("click", function () {
          api("/admin/hide", { method: "POST", auth: adminToken, body: { id: p.id, hidden: !p.hidden } })
            .then(function (d) {
              if (d.ok) loadPosts();
              else window.alert("失敗: " + (d.error || d._status));
            });
        });
        bar.appendChild(btn);
        var idTag = document.createElement("span");
        idTag.style.fontSize = "0.75rem";
        idTag.style.color = "var(--cream-dim)";
        idTag.style.alignSelf = "center";
        idTag.textContent = "#" + p.id + (p.hidden ? "（非表示中）" : "");
        bar.appendChild(idTag);
        card.appendChild(bar);
      }
      listEl.appendChild(card);
    });
  }

  function loadPosts() {
    listEl.innerHTML = '<p class="rv-empty">読み込み中…</p>';
    var useAdmin = !!adminToken;
    api("/posts" + (useAdmin ? "?all=1" : ""), { auth: useAdmin ? adminToken : token }).then(function (d) {
      if (d.ok) {
        renderPosts(d.posts || [], !!d.admin);
        if (useAdmin && !d.admin) adminToken = null; // 管理トークンが誤り → 通常表示に戻す
      } else if (d._status === 401 && !useAdmin) {
        showGate("有効期限が切れました。もう一度、問いに答えてください。");
      } else if (useAdmin && (d._status === 401 || d._status === 403)) {
        adminToken = null;
        if (token) loadPosts(); else showGate("管理トークンが違います。通常の入口からどうぞ。");
      } else {
        listEl.innerHTML = '<p class="rv-empty">読み込みに失敗しました。時間をおいて再度お試しください。</p>';
      }
    }).catch(function () {
      listEl.innerHTML = '<p class="rv-empty">読み込みに失敗しました。時間をおいて再度お試しください。</p>';
    });
  }

  /* ---------- ツールバー ---------- */
  if (toolbar) {
    toolbar.addEventListener("click", function (e) {
      var b = e.target.closest("button");
      if (!b) return;
      if (b.dataset.act === "reload") loadPosts();
      if (b.dataset.act === "logout") showGate("");
    });
  }

  /* ---------- 初期表示 ---------- */
  if (token || adminToken) showBoard();
  else showGate("");
})();
