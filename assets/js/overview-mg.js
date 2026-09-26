/* Motion graphics for overview.html and the compact trailer on index.html. */
(function () {
  "use strict";

  document.documentElement.classList.add("mg-js");

  function ready(fn) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", fn, { once: true });
    } else {
      fn();
    }
  }

  ready(function () {
    var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var narrowVideo = window.matchMedia("(max-width: 820px)").matches;

    initPlayers(narrowVideo);
    initReveals(reduceMotion);

    if (!reduceMotion) {
      initHeroClock();
      initParticles();
      initParallax();
      initSmoothAnchor();
    }
  });

  function initPlayers(use720) {
    document.querySelectorAll("[data-mg-player]").forEach(function (shell) {
      var video = shell.querySelector("video");
      var source = video && video.querySelector("source");
      var button = shell.querySelector(".mg-play-button");
      if (!video || !source) return;

      if (use720) {
        source.setAttribute("src", "assets/video/yumeti-trailer-720.mp4");
        video.load();
      }

      video.addEventListener("play", function () {
        shell.classList.add("is-playing");
        video.controls = true;
      });

      if (!button) return;
      // 再生前は自前ボタンだけを見せる（標準の操作バーと重ねない）。JS無効時は controls 属性のまま
      video.controls = false;
      button.addEventListener("click", function () {
        video.muted = false;
        video.volume = 1;
        var promise = video.play();
        if (promise && typeof promise.catch === "function") {
          promise.catch(function () {
            shell.classList.remove("is-playing");
            video.controls = true;
          });
        }
      });
    });
  }

  function initReveals(reduceMotion) {
    var targets = Array.prototype.slice.call(document.querySelectorAll(
      ".mg-reveal, .mg-section-reveal, .mg-sequence"
    ));
    if (!targets.length || reduceMotion) return;

    var groups = new Map();
    targets.forEach(function (el) {
      var parent = el.parentElement;
      var index = groups.get(parent) || 0;
      el.style.setProperty("--mg-delay", Math.min(index * 0.09, 0.54).toFixed(2) + "s");
      groups.set(parent, index + 1);
    });

    document.querySelectorAll(".mg-stars i").forEach(function (star, index) {
      star.style.setProperty("--mg-star-delay", (0.22 + (index % 5) * 0.11).toFixed(2) + "s");
    });
    document.querySelectorAll(".mg-ho-icon").forEach(function (svg) {
      svg.querySelectorAll("polyline").forEach(function (line, index) {
        line.style.setProperty("--mg-line-delay", Math.min(index * 0.055, 1.1).toFixed(3) + "s");
      });
    });

    var pending = targets.slice();
    var timer = 0;
    var ticking = false;

    function viewportHeight() {
      return window.innerHeight || document.documentElement.clientHeight || 800;
    }

    function check() {
      var limit = viewportHeight() * 0.91;
      for (var index = pending.length - 1; index >= 0; index -= 1) {
        var el = pending[index];
        var rect = el.getBoundingClientRect();
        if (rect.top < limit && rect.bottom > 0) {
          el.classList.add("mg-in");
          animateCountWithin(el);
          pending.splice(index, 1);
        }
      }
      if (!pending.length) {
        window.removeEventListener("scroll", requestCheck);
        window.removeEventListener("resize", requestCheck);
        if (timer) window.clearInterval(timer);
      }
    }

    function requestCheck() {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(function () {
        ticking = false;
        check();
      });
    }

    window.addEventListener("scroll", requestCheck, { passive: true });
    window.addEventListener("resize", requestCheck, { passive: true });
    timer = window.setInterval(check, 450);
    check();
  }

  function animateCountWithin(container) {
    var counter = container.matches("[data-mg-count]") ? container : container.querySelector("[data-mg-count]");
    if (!counter || counter.dataset.mgDone === "true") return;
    counter.dataset.mgDone = "true";

    var end = Number(counter.dataset.mgCount);
    var template = counter.dataset.mgTemplate || "{n}";
    var useComma = counter.dataset.mgFormat === "comma";
    var duration = end > 100 ? 1250 : 900;
    var start = performance.now();

    function render(now) {
      var progress = Math.min((now - start) / duration, 1);
      var eased = 1 - Math.pow(1 - progress, 3);
      var value = Math.round(end * eased);
      var shown = useComma ? value.toLocaleString("ja-JP") : String(value);
      counter.textContent = template.replace("{n}", shown);
      if (progress < 1) {
        window.requestAnimationFrame(render);
      } else {
        var finalValue = useComma ? end.toLocaleString("ja-JP") : String(end);
        counter.textContent = template.replace("{n}", finalValue);
      }
    }
    window.requestAnimationFrame(render);
  }

  function initHeroClock() {
    var clock = document.querySelector("[data-mg-clock]");
    if (!clock) return;
    var started = Date.now();
    window.setInterval(function () {
      var elapsed = Math.floor((Date.now() - started) / 1000) % 6000;
      var minutes = Math.floor(elapsed / 60);
      var seconds = elapsed % 60;
      clock.textContent = String(minutes).padStart(2, "0") + ":" + String(seconds).padStart(2, "0");
    }, 1000);
  }

  function initSmoothAnchor() {
    var link = document.querySelector(".mg-watch-link[href^='#']");
    if (!link) return;
    link.addEventListener("click", function (event) {
      var target = document.querySelector(link.getAttribute("href"));
      if (!target) return;
      event.preventDefault();
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  function initParallax() {
    var section = document.querySelector(".mg-handout-section");
    if (!section) return;
    var ticking = false;

    function update() {
      ticking = false;
      var rect = section.getBoundingClientRect();
      var height = window.innerHeight || 800;
      if (rect.bottom < 0 || rect.top > height) return;
      var centerOffset = (rect.top + rect.height / 2 - height / 2) / height;
      section.style.setProperty("--mg-parallax", Math.max(-24, Math.min(24, centerOffset * -20)).toFixed(1) + "px");
    }

    function requestUpdate() {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(update);
    }
    window.addEventListener("scroll", requestUpdate, { passive: true });
    window.addEventListener("resize", requestUpdate, { passive: true });
    update();
  }

  function initParticles() {
    var canvas = document.querySelector(".mg-particles");
    var hero = canvas && canvas.closest(".mg-hero");
    if (!canvas || !hero) return;

    var context = canvas.getContext("2d");
    if (!context) return;
    var particles = [];
    var frame = 0;
    var running = false;
    var width = 0;
    var height = 0;
    var lastTime = performance.now();

    function makeParticle(randomY) {
      return {
        x: Math.random() * width,
        y: randomY ? Math.random() * height : height + Math.random() * 35,
        radius: 0.35 + Math.random() * 1.25,
        speed: 5 + Math.random() * 13,
        sway: 5 + Math.random() * 17,
        phase: Math.random() * Math.PI * 2,
        alpha: 0.18 + Math.random() * 0.52
      };
    }

    function resize() {
      var rect = hero.getBoundingClientRect();
      width = Math.max(1, Math.round(rect.width));
      height = Math.max(1, Math.round(rect.height));
      var ratio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      canvas.style.width = width + "px";
      canvas.style.height = height + "px";
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      var amount = width < 620 ? 24 : 58;
      particles = Array.from({ length: amount }, function () { return makeParticle(true); });
    }

    function isHeroVisible() {
      var rect = hero.getBoundingClientRect();
      return !document.hidden && rect.bottom > 0 && rect.top < (window.innerHeight || 800);
    }

    function draw(now) {
      if (!running) return;
      var delta = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;
      context.clearRect(0, 0, width, height);
      particles.forEach(function (particle) {
        particle.y -= particle.speed * delta;
        particle.phase += delta * 0.5;
        if (particle.y < -15) Object.assign(particle, makeParticle(false));
        var x = particle.x + Math.sin(particle.phase) * particle.sway;
        var pulse = 0.66 + Math.sin(now * 0.0014 + particle.phase) * 0.34;
        context.beginPath();
        context.arc(x, particle.y, particle.radius, 0, Math.PI * 2);
        context.fillStyle = "rgba(224,194,122," + Math.max(0, particle.alpha * pulse).toFixed(3) + ")";
        context.fill();
      });
      frame = window.requestAnimationFrame(draw);
    }

    function sync() {
      var shouldRun = isHeroVisible();
      if (shouldRun && !running) {
        running = true;
        lastTime = performance.now();
        frame = window.requestAnimationFrame(draw);
      } else if (!shouldRun && running) {
        running = false;
        if (frame) window.cancelAnimationFrame(frame);
        frame = 0;
      }
    }

    var resizeTimer = 0;
    window.addEventListener("resize", function () {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(function () { resize(); sync(); }, 120);
    }, { passive: true });
    window.addEventListener("scroll", sync, { passive: true });
    document.addEventListener("visibilitychange", sync);
    window.setInterval(sync, 700);
    resize();
    sync();
  }
})();
