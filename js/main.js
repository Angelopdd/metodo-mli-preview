/* Método M.L.I. — interações do protótipo */
(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* Aviso para os botões demonstrativos */
  var toast = document.querySelector("[data-toast]");
  var toastTimer;
  var messages = {
    video: "Protótipo: o vídeo da VSL entra neste espaço após a aprovação.",
    checkout: "Protótipo: este botão será ligado ao checkout depois da aprovação."
  };
  function showToast(text) {
    if (!toast) return;
    toast.textContent = text;
    toast.classList.add("is-on");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toast.classList.remove("is-on"); }, 3600);
  }
  document.addEventListener("click", function (e) {
    var el = e.target.closest("[data-demo]");
    if (!el) return;
    var kind = el.getAttribute("data-demo");
    if (kind === "video" && el.tagName === "A") {
      // rola até o vídeo e avisa
      e.preventDefault();
      document.getElementById("video").scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "center" });
    } else {
      e.preventDefault();
    }
    showToast(messages[kind] || "Protótipo: ação demonstrativa.");
  });

  /* Abas dos módulos */
  var shell = document.querySelector("[data-tabs]");
  if (shell) {
    var tabs = Array.prototype.slice.call(shell.querySelectorAll('[role="tab"]'));
    var panels = tabs.map(function (t) { return document.getElementById(t.getAttribute("aria-controls")); });

    function select(i, focus) {
      tabs.forEach(function (t, j) {
        var on = i === j;
        t.setAttribute("aria-selected", on ? "true" : "false");
        t.tabIndex = on ? 0 : -1;
        panels[j].hidden = !on;
      });
      if (focus) tabs[i].focus();
      tabs[i].scrollIntoView({ block: "nearest", inline: "nearest", behavior: reduceMotion ? "auto" : "smooth" });
    }
    tabs.forEach(function (t, i) {
      t.addEventListener("click", function () { select(i, false); });
      t.addEventListener("keydown", function (e) {
        var n = tabs.length, k = e.key, next = null;
        if (k === "ArrowDown" || k === "ArrowRight") next = (i + 1) % n;
        if (k === "ArrowUp" || k === "ArrowLeft") next = (i - 1 + n) % n;
        if (k === "Home") next = 0;
        if (k === "End") next = n - 1;
        if (next !== null) { e.preventDefault(); select(next, true); }
      });
    });
    // sem JS, todos os painéis ficam visíveis; com JS, mostra só o primeiro
    panels.forEach(function (p, j) { p.hidden = j !== 0; });
  }

  /* Resumo da operação: barra de custos x lucro e contagem dos valores */
  var ledger = document.querySelector("[data-ledger]");
  var fmt = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
  function countUp(el, target, ms) {
    var start = performance.now();
    function frame(now) {
      var t = Math.min(1, (now - start) / ms);
      var eased = 1 - Math.pow(1 - t, 4);
      el.textContent = fmt.format(target * eased);
      if (t < 1) requestAnimationFrame(frame);
      else el.textContent = fmt.format(target);
    }
    requestAnimationFrame(frame);
  }
  if (ledger && "IntersectionObserver" in window && !reduceMotion) {
    ledger.classList.add("is-pending");
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        io.disconnect();
        ledger.querySelectorAll("[data-count]").forEach(function (el, i) {
          setTimeout(function () { countUp(el, parseFloat(el.getAttribute("data-count")), 1300); }, i * 180);
        });
        requestAnimationFrame(function () { ledger.classList.remove("is-pending"); });
      });
    }, { threshold: 0.45 });
    io.observe(ledger);
  }

  /* CTA fixo no celular: aparece depois do topo e some na oferta */
  var sticky = document.querySelector("[data-sticky]");
  var hero = document.querySelector(".hero");
  var offer = document.getElementById("oferta");
  if (sticky && hero && offer && "IntersectionObserver" in window) {
    var heroVisible = true, offerVisible = false;
    function update() {
      var show = !heroVisible && !offerVisible;
      sticky.classList.toggle("is-visible", show);
      sticky.setAttribute("aria-hidden", show ? "false" : "true");
      var link = sticky.querySelector("a");
      if (link) link.tabIndex = show ? 0 : -1;
    }
    new IntersectionObserver(function (e) { heroVisible = e[0].isIntersecting; update(); }).observe(hero);
    new IntersectionObserver(function (e) { offerVisible = e[0].isIntersecting; update(); }, { threshold: 0.15 }).observe(offer);
  }
})();
