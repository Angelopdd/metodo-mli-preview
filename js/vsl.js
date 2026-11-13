/* Método M.L.I. · player da VSL.
   Mesmo comportamento do player do Do Bruto ao Pronto: começa sozinho e sem som, um clique liga o som (e volta ao 0:00),
   sem controles nativos, sem pausa, sem loop. O único controle visível é o de som (liga/desliga).
   A barra de progresso é só pintura: o vídeo, o tempo e o áudio seguem na velocidade real. */
(function () {
  "use strict";

  var raiz = document.querySelector("[data-vsl]");
  if (!raiz) return;

  var v = raiz.querySelector(".vsl-video");
  var som = raiz.querySelector("[data-vsl-som]");
  var rotulo = raiz.querySelector("[data-vsl-rotulo]");
  var sub = raiz.querySelector("[data-vsl-sub]");
  var barra = raiz.querySelector(".vsl-barra i");
  var erro = raiz.querySelector(".vsl-erro");
  var tentar = raiz.querySelector("[data-vsl-tentar]");
  var reduzido = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var iniciado = false;   // já houve o primeiro clique (som liberado)
  var largou = false;     // o vídeo já começou a carregar
  var raf = 0;
  var vigia = 0;

  function estado(e) { raiz.setAttribute("data-estado", e); }

  /* Texto e rótulo do botão de som conforme o momento */
  function rotular() {
    if (!iniciado) {
      var bloqueado = raiz.getAttribute("data-estado") === "bloqueado";
      rotulo.textContent = bloqueado ? "Clique para assistir" : "Clique para ouvir";
      sub.textContent = bloqueado ? "Apresentação com cerca de 16 minutos" : "O vídeo já começou, sem som";
      som.setAttribute("aria-label", bloqueado ? "Assistir ao vídeo, com som" : "Ouvir o vídeo, com som");
    } else {
      som.setAttribute("aria-label", v.muted ? "Ativar o som do vídeo" : "Desativar o som do vídeo");
    }
  }

  /* ---------- Progresso (só visual) ----------
     A barra segue o progresso real (p = currentTime / duration), mas desenhada por uma curva perceptível: sai correndo no
     início, quase não anda no meio e acelera de novo na reta final. A velocidade visual é w(p) = M + A·e^(-p/S1) + C·e^(-(1-p)/S2)
     (sempre positiva) e a barra mostra f(p) = integral de w de 0 a p dividida pela integral de 0 a 1, em forma fechada:
     f(0) = 0, f(1) = 1, sempre crescente e sem saltos, e nunca chega a 100% antes de o vídeo acabar. */
  var CV_M = 0.3, CV_A = 2.8, CV_S1 = 0.11, CV_C = 2.2, CV_S2 = 0.14;
  var CV_TOTAL = CV_M + CV_A * CV_S1 * (1 - Math.exp(-1 / CV_S1)) + CV_C * CV_S2 * (1 - Math.exp(-1 / CV_S2));
  function curva(p) {
    if (p <= 0) return 0;
    if (p >= 1) return 1;
    return (CV_M * p + CV_A * CV_S1 * (1 - Math.exp(-p / CV_S1)) + CV_C * CV_S2 * (Math.exp(-(1 - p) / CV_S2) - Math.exp(-1 / CV_S2))) / CV_TOTAL;
  }
  window.vslCurvaBarra = curva;
  function pintar() {
    var d = v.duration;
    var p = d > 0 && isFinite(d) ? Math.min(1, Math.max(0, v.currentTime / d)) : 0;
    barra.style.transform = "scaleX(" + curva(p).toFixed(4) + ")";
  }
  function laco() {
    pintar();
    raf = v.paused || v.ended ? 0 : requestAnimationFrame(laco);
  }
  function seguir() { if (!raf) raf = requestAnimationFrame(laco); }

  /* ---------- Falha ---------- */
  function falhar() {
    clearTimeout(vigia);
    try { v.pause(); } catch (e) { /* sem efeito */ }
    estado("erro");
    som.hidden = true;
    erro.hidden = false;
    tentar.focus({ preventScroll: true });
  }

  /* ---------- Início ---------- */
  function autoplayMudo() {
    v.muted = !iniciado;
    var p = v.play();
    if (!p || !p.then) return;
    p.then(function () { if (!iniciado) estado("mudo"); }, function (e) {
      if (e && e.name === "AbortError") return;
      if (!iniciado) { estado("bloqueado"); rotular(); }   // o navegador barrou o autoplay
    });
  }

  function partir() {
    largou = true;
    estado("carregando");
    erro.hidden = true;
    som.hidden = false;
    clearTimeout(vigia);
    vigia = setTimeout(function () { if (v.readyState < 2) falhar(); }, 20000);
    if (reduzido && !iniciado) { estado("bloqueado"); rotular(); return; }   // sem movimento automático para quem pediu menos movimento
    autoplayMudo();
  }

  /* O vídeo só começa a carregar quando a área dele aparece na tela */
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (es) {
      if (!es[0].isIntersecting) return;
      io.disconnect();
      if (!largou) partir();
    }, { threshold: 0.2 });
    io.observe(raiz);
  } else {
    partir();
  }

  /* Botão de som: o primeiro clique volta ao 0:00 e liga o som; depois só liga e desliga */
  function primeiroClique() {
    iniciado = true;
    raiz.setAttribute("data-iniciado", "");
    if (!largou) largou = true;
    try { v.currentTime = 0; } catch (e) { /* o play() começa do zero */ }
    v.muted = false;
    v.volume = 1;
    rotular();
    var p = v.play();
    if (p && p.catch) p.catch(function (e) {
      if (e && e.name === "AbortError") return;
      v.muted = true;                                    // som barrado: segue mudo em vez de travar
      v.play().catch(function () {
        iniciado = false;
        raiz.removeAttribute("data-iniciado");
        estado("bloqueado");
        rotular();
      });
    });
  }

  function alternarSom() {
    if (!iniciado) return primeiroClique();
    v.muted = !v.muted;
    if (!v.muted && v.volume === 0) v.volume = 1;
    if (v.paused && !v.ended) v.play().catch(function () { /* sem efeito */ });
  }

  som.addEventListener("click", alternarSom);
  tentar.addEventListener("click", function () {
    v.removeAttribute("src");
    while (v.firstChild) v.removeChild(v.firstChild);
    var s = document.createElement("source");
    s.src = "assets/video/vsl-720p.mp4";
    s.type = "video/mp4";
    v.appendChild(s);
    v.load();
    partir();
  });

  v.addEventListener("playing", function () {
    clearTimeout(vigia);
    raiz.classList.add("is-on");
    if (iniciado) estado("tocando");
    else if (raiz.getAttribute("data-estado") !== "mudo") estado("mudo");
    seguir();
  });
  v.addEventListener("pause", pintar);
  v.addEventListener("ended", pintar);
  v.addEventListener("timeupdate", pintar);
  v.addEventListener("loadeddata", function () { clearTimeout(vigia); });
  v.addEventListener("volumechange", function () {
    raiz.setAttribute("data-som", v.muted || v.volume === 0 ? "off" : "on");
    rotular();
  });
  /* erro de rede ou de arquivo: o evento vem do <source> */
  v.addEventListener("error", falhar, true);

  /* Sem botão de pausa: se o celular pausar ao trocar de aba ou bloquear a tela, retoma ao voltar */
  document.addEventListener("visibilitychange", function () {
    if (!document.hidden && raiz.classList.contains("is-on") && v.paused && !v.ended) v.play().catch(function () { /* sem efeito */ });
  });

  /* Sem velocidade, sem menu do navegador, sem teclas de mídia de salto */
  v.addEventListener("ratechange", function () { if (v.playbackRate !== 1) v.playbackRate = 1; });
  raiz.addEventListener("contextmenu", function (e) { e.preventDefault(); });
  if ("mediaSession" in navigator) {
    ["seekto", "seekforward", "seekbackward", "previoustrack", "nexttrack", "pause"].forEach(function (a) {
      try { navigator.mediaSession.setActionHandler(a, function () { /* sem salto nem pausa */ }); } catch (e) { /* ação não suportada */ }
    });
  }
})();
