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

  /* ---------- ヒーロータイトルの一字ずつ浮かび上がり ---------- */
  var heroTitle = document.querySelector(".hero-title");
  if (heroTitle && !reduceMotion) {
    var text = heroTitle.textContent;
    heroTitle.textContent = "";
    var delay = 0.15;
    for (var i = 0; i < text.length; i++) {
      var c = text[i];
      if (c === "\n" || c === " " || c === "　") {
        heroTitle.appendChild(document.createTextNode(c));
        continue;
      }
      var span = document.createElement("span");
      span.className = "ch";
      span.textContent = c;
      span.style.animationDelay = delay.toFixed(2) + "s";
      delay += 0.05;
      heroTitle.appendChild(span);
    }
    // タイトルの後に続く要素は遅れてふわっと
    var late = [
      document.querySelector(".hero-sub"),
      document.querySelector(".hero-tagline"),
      document.querySelector(".hero .cta-row")
    ];
    late.forEach(function (el, idx) {
      if (!el) return;
      el.classList.add("fade-late");
      el.style.animationDelay = (delay + 0.15 + idx * 0.25).toFixed(2) + "s";
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

  /* ---------- スクロール連動フェードイン ---------- */
  var selector = [
    ".section-head", ".link-card", ".card", ".kw-item", ".chara-entry",
    ".ho-card", ".ho-hub-card", ".story-lead", ".story-block", ".story-divider",
    ".spec-list li", ".recommend-list li", ".badge-row", ".price-block",
    ".gallery-strip figure", ".notice", ".note-box", ".prose",
    ".tagline-badge", ".hero-banner", ".cta-row"
  ].join(",");
  var targets = Array.prototype.filter.call(
    document.querySelectorAll(selector),
    function (el) { return !el.closest(".hero"); }
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
  }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });

  targets.forEach(function (el) { io.observe(el); });
});
