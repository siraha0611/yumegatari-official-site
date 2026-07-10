document.addEventListener("DOMContentLoaded", function () {
  /* ---------- モバイルナビ ---------- */
  var toggle = document.querySelector(".nav-toggle");
  var nav = document.querySelector(".main-nav");
  if (toggle && nav) {
    toggle.addEventListener("click", function () {
      var open = nav.classList.toggle("open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
  }

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- 見出しの行マスクリビール ----------
     テキストを改行で行に分割し、各行をoverflow:hiddenの箱(.ln)+
     下から迫り上がる中身(.ln-i)に包む。CSSのlnInが実体。 */
  function splitLines(el, baseDelay, step) {
    if (!el || reduceMotion) return 0;
    var lines = el.textContent.split("\n");
    el.textContent = "";
    var d = baseDelay;
    lines.forEach(function (line) {
      var ln = document.createElement("span");
      ln.className = "ln";
      var inner = document.createElement("span");
      inner.className = "ln-i";
      inner.textContent = line.length ? line : " ";
      inner.style.animationDelay = d.toFixed(2) + "s";
      d += step;
      ln.appendChild(inner);
      el.appendChild(ln);
    });
    return d;
  }

  var heroEnd = splitLines(document.querySelector(".hero-title"), 0.25, 0.16);
  splitLines(document.querySelector(".page-hero h1"), 0.1, 0.14);

  // ヒーロータイトル後続要素は遅れてふわっと
  if (heroEnd) {
    [
      document.querySelector(".hero-en"),
      document.querySelector(".hero-sub"),
      document.querySelector(".hero-tagline"),
      document.querySelector(".hero .cta-row")
    ].forEach(function (el, idx) {
      if (!el) return;
      el.classList.add("fade-late");
      el.style.animationDelay = (heroEnd + 0.2 + idx * 0.22).toFixed(2) + "s";
    });
  }

  /* ---------- ヒーローの湯気 ---------- */
  var mark = document.querySelector(".hero-mark");
  if (mark) {
    for (var s = 0; s < 3; s++) {
      var steam = document.createElement("span");
      steam.className = "steam";
      steam.setAttribute("aria-hidden", "true");
      mark.insertBefore(steam, mark.firstChild);
    }
  }

  /* ---------- 煙から立ち上がる行リビール([data-fog]) ----------
     テキストを行に分割し、スクロールで各行がブラー+字間の凝縮を
     ともないながら、ゆっくり立ち上がる。 */
  var fogEls = document.querySelectorAll("[data-fog]");
  if (fogEls.length && !reduceMotion && "IntersectionObserver" in window) {
    var fogLines = [];
    fogEls.forEach(function (el) {
      /* 手書きの.fog-ln子要素(強弱クラス付き)があればそのまま使う */
      var pre = el.querySelectorAll(".fog-ln");
      if (pre.length) {
        var pidx = 0;
        pre.forEach(function (ln) {
          ln.style.setProperty("--fog-delay", ((pidx % 5) * 0.22).toFixed(2) + "s");
          pidx++;
          fogLines.push(ln);
        });
        return;
      }
      var lines = el.textContent.split("\n");
      el.textContent = "";
      var idx = 0;
      lines.forEach(function (line) {
        var ln = document.createElement("span");
        ln.className = "fog-ln";
        if (line.trim().length) {
          ln.textContent = line;
          ln.style.setProperty("--fog-delay", ((idx % 5) * 0.22).toFixed(2) + "s");
          idx++;
          fogLines.push(ln);
        } else {
          ln.innerHTML = "&nbsp;";
          ln.classList.add("in");
        }
        el.appendChild(ln);
      });
    });
    /* スクロール判定方式:
       ビューポート下端の少し手前を越えた行(通過済み含む)を順に現す。
       iframe埋め込みではIntersectionObserverのrootMarginが無効化される
       ため、rectベースで自前判定する。 */
    var pending = fogLines.slice();
    var fogTimer = null;
    function viewportH() {
      return window.innerHeight
        || document.documentElement.clientHeight
        || (window.visualViewport && window.visualViewport.height)
        || 800;
    }
    function checkFog() {
      var limit = viewportH() * 0.92;
      for (var i = pending.length - 1; i >= 0; i--) {
        if (pending[i].getBoundingClientRect().top < limit) {
          pending[i].classList.add("in");
          pending.splice(i, 1);
        }
      }
      if (!pending.length) {
        window.removeEventListener("scroll", onFogScroll);
        window.removeEventListener("resize", onFogScroll);
        if (fogTimer) clearInterval(fogTimer);
      }
    }
    var fogTick = false;
    function onFogScroll() {
      if (fogTick) return;
      fogTick = true;
      requestAnimationFrame(function () { fogTick = false; checkFog(); });
    }
    window.addEventListener("scroll", onFogScroll, { passive: true });
    window.addEventListener("resize", onFogScroll, { passive: true });
    /* scrollイベントが届かない埋め込み環境向けの保険(全行表示済みで自動停止) */
    fogTimer = setInterval(checkFog, 450);
    checkFog();
  }

  /* ---------- スクロール連動フェードイン ---------- */
  var selector = [
    ".section-head", ".link-card", ".card", ".kw-item", ".chara-entry",
    ".ho-card", ".ho-hub-card", ".story-lead", ".story-block", ".story-divider",
    ".spec-list li", ".recommend-list li", ".badge-row", ".price-block",
    ".gallery-strip figure", ".notice", ".note-box", ".prose",
    ".tagline-badge", ".hero-banner", ".cta-row", ".kp-fig"
  ].join(",");
  var targets = Array.prototype.filter.call(
    document.querySelectorAll(selector),
    function (el) { return !el.closest(".hero") && !el.hasAttribute("data-fog"); }
  );

  if (reduceMotion || !("IntersectionObserver" in window)) return;

  // 同じ親を持つ要素同士で時間差(スタッガー)をつける
  var siblingCount = new Map();
  targets.forEach(function (el) {
    var parent = el.parentElement;
    var n = siblingCount.get(parent) || 0;
    el.style.setProperty("--reveal-delay", ((n % 8) * 0.09).toFixed(2) + "s");
    siblingCount.set(parent, n + 1);
    el.classList.add("reveal");
  });

  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add("in");
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: "10000px 0px -40px 0px" });

  targets.forEach(function (el) { io.observe(el); });
});
