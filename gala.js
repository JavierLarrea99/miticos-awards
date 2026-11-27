/* MOTY 2026 · pantalla de la gala en directo (1920x1080, para OBS) */
(function () {
  "use strict";
  const C = window.CONFIG || {};
  const DEMO = !C.SUPABASE_URL || C.SUPABASE_URL.includes("TU-PROYECTO") || !window.supabase;
  const sb = DEMO ? null : window.supabase.createClient(C.SUPABASE_URL, C.SUPABASE_ANON_KEY);
  const PUNTOS = [10, 7, 5, 3, 1];
  const lienzo = document.getElementById("lienzo");
  const hud = document.getElementById("hud");
  const pasos = window.MOTY_PASOS();
  const cats = Object.fromEntries((window.MITICOS.categorias || []).map((c) => [c.id, c]));
  const G = { paso: -1, admin: false, resultados: {}, sonido: true, ajustes: null, cargando: false, propio: 0 };
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const espera = (ms) => new Promise((r) => setTimeout(r, ms));

  // ---------- escalar el lienzo 1920x1080 a la ventana ----------
  function escalar() {
    const k = Math.min(innerWidth / 1920, innerHeight / 1080);
    for (const el of [lienzo, document.getElementById("confeti")]) el.style.transform = `translate(-50%, -50%) scale(${k})`;
  }
  addEventListener("resize", escalar); escalar();

  // ---------- sonido (sintetizado, sin archivos) ----------
  let ac = null;
  function audio() { if (!ac) { try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { ac = null; } } if (ac && ac.state === "suspended") ac.resume(); return ac; }
  function ruido(dur) {
    const a = audio(); const b = a.createBuffer(1, a.sampleRate * dur, a.sampleRate); const d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const s = a.createBufferSource(); s.buffer = b; return s;
  }
  let redoble = null;
  const SFX = {
    whoosh() {
      const a = audio(); if (!a || !G.sonido) return; const t = a.currentTime;
      const s = ruido(1.2), f = a.createBiquadFilter(), g = a.createGain();
      f.type = "bandpass"; f.Q.value = 1.2; f.frequency.setValueAtTime(300, t); f.frequency.exponentialRampToValueAtTime(3000, t + .5); f.frequency.exponentialRampToValueAtTime(500, t + 1.1);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.22, t + .35); g.gain.exponentialRampToValueAtTime(.001, t + 1.1);
      s.connect(f).connect(g).connect(a.destination); s.start(t); s.stop(t + 1.2);
    },
    impacto() {
      const a = audio(); if (!a || !G.sonido) return; const t = a.currentTime;
      const o = a.createOscillator(), og = a.createGain(); o.type = "sine"; o.frequency.setValueAtTime(110, t); o.frequency.exponentialRampToValueAtTime(38, t + .9);
      og.gain.setValueAtTime(.7, t); og.gain.exponentialRampToValueAtTime(.001, t + 1.2); o.connect(og).connect(a.destination); o.start(t); o.stop(t + 1.3);
      const s = ruido(3), f = a.createBiquadFilter(), g = a.createGain(); f.type = "highpass"; f.frequency.value = 5000;
      g.gain.setValueAtTime(.35, t); g.gain.exponentialRampToValueAtTime(.001, t + 2.8); s.connect(f).connect(g).connect(a.destination); s.start(t); s.stop(t + 3);
      [523.25, 659.25, 783.99, 1046.5].forEach((fr, i) => { const p = a.createOscillator(), pg = a.createGain(); p.type = "triangle"; p.frequency.value = fr;
        pg.gain.setValueAtTime(0, t + .05 * i); pg.gain.linearRampToValueAtTime(.09, t + .05 * i + .03); pg.gain.exponentialRampToValueAtTime(.001, t + 2.2);
        p.connect(pg).connect(a.destination); p.start(t + .05 * i); p.stop(t + 2.3); });
    },
    redoble() {
      const a = audio(); if (!a || !G.sonido) return; SFX.parar();
      const t = a.currentTime, dur = 12, master = a.createGain(); master.gain.setValueAtTime(.05, t); master.gain.linearRampToValueAtTime(.3, t + 6); master.connect(a.destination);
      for (let k = 0; k < dur * 17; k++) { const tt = t + k / 17 + (Math.random() - .5) * .012; const s = ruido(.07), f = a.createBiquadFilter(), g = a.createGain();
        f.type = "bandpass"; f.frequency.value = 1700 + Math.random() * 400; f.Q.value = .8; g.gain.setValueAtTime(.8, tt); g.gain.exponentialRampToValueAtTime(.001, tt + .06);
        s.connect(f).connect(g).connect(master); s.start(tt); s.stop(tt + .07); }
      redoble = master;
    },
    parar() { if (redoble && ac) { const t = ac.currentTime; redoble.gain.cancelScheduledValues(t); redoble.gain.setValueAtTime(redoble.gain.value, t); redoble.gain.linearRampToValueAtTime(0, t + .08); setTimeout(() => redoble && redoble.disconnect(), 200); redoble = null; } },
  };

  // ---------- confeti ----------
  function confeti() {
    const cv = document.getElementById("confeti"), x = cv.getContext("2d"); const cols = ["#ffe2a8", "#e0a84a", "#fff", "#c98a2e", "#f6c76b"];
    const P = Array.from({ length: 260 }, (_, i) => ({ x: 960 + (Math.random() - .5) * 200, y: 560, vx: (Math.random() - .5) * 34, vy: -Math.random() * 30 - 10,
      w: 8 + Math.random() * 12, h: 4 + Math.random() * 8, r: Math.random() * 6, vr: (Math.random() - .5) * .4, c: cols[i % cols.length] }));
    const t0 = performance.now();
    (function frame(t) {
      x.clearRect(0, 0 , 1920, 1080); const vivo = t - t0 < 5200;
      P.forEach((p) => { p.vy += .55; p.vx *= .985; p.x += p.vx; p.y += p.vy; p.r += p.vr;
        x.save(); x.translate(p.x, p.y); x.rotate(p.r); x.fillStyle = p.c; x.globalAlpha = Math.max(0, 1 - (t - t0) / 5200); x.fillRect(-p.w / 2, -p.h / 2, p.w, p.h * Math.abs(Math.cos(p.r * 2))); x.restore(); });
      if (vivo) requestAnimationFrame(frame); else x.clearRect(0, 0, 1920, 1080);
    })(t0);
  }

  // ---------- datos ----------
  async function cargarResultados(catId) {
    if (DEMO) {
      let v = {}; try { v = JSON.parse(localStorage.getItem("ma_votos")) || {}; } catch (e) { /* vacío */ }
      const r = {}; (v[catId] || []).forEach((n, i) => { r[n] = r[n] || { nominado: n, puntos: 0, primeros: 0 }; r[n].puntos += PUNTOS[i]; if (!i) r[n].primeros++; });
      G.resultados[catId] = Object.values(r); return;
    }
    for (let intento = 0; intento < 6; intento++) {
      const { data } = await sb.rpc("resultados");
      const filas = (data || []).filter((f) => f.categoria === catId);
      if (filas.length || intento === 5) { G.resultados[catId] = filas; return; }
      await espera(700); // la categoría se está revelando
    }
  }
  const ordenadas = (catId) => (G.resultados[catId] || []).slice().sort((a, b) => b.puntos - a.puntos || b.primeros - a.primeros);
  const nom = (cat, id) => (cat.nominados || []).find((n) => n.id === id) || { titulo: id };

  // ---------- piezas ----------
  const ESTATUA = `<svg class="estatua" viewBox="0 0 120 200" aria-hidden="true"><defs><linearGradient id="go" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe7b3"/><stop offset=".5" stop-color="#e0a84a"/><stop offset="1" stop-color="#7d4f17"/></linearGradient></defs>
    <circle cx="60" cy="16" r="11" fill="url(#go)"/><path fill="url(#go)" d="M60 30c-6 0-9 4-10 9L28 8c-2-3-6-1-5 2l20 40c2 5 4 9 5 14l2 46h20l2-46c1-5 3-9 5-14l20-40c1-3-3-5-5-2L70 39c-1-5-4-9-10-9z"/>
    <path fill="url(#go)" d="M50 112h20l4 40H46z" opacity=".9"/><path fill="url(#go)" d="M34 156h52l6 14H28zM22 174h76v16H22z"/></svg>`;
  const SOBRE = `<svg class="sobre" viewBox="0 0 120 84"><defs><linearGradient id="gs" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe7b3"/><stop offset="1" stop-color="#b47a2a"/></linearGradient></defs>
    <rect x="2" y="2" width="116" height="80" rx="6" fill="url(#gs)"/><path d="M2 8l58 42 58-42" fill="none" stroke="#7d4f17" stroke-width="4"/><circle cx="60" cy="50" r="10" fill="#9c2a1f"/></svg>`;
  const HACES = '<div class="haces"></div><div class="haces b"></div>';
  const media = (cat, n, ganador) => {
    if (cat.tipo === "juego" || n.imagen) return `<div class="m juego"><img src="${esc(n.imagen)}" alt=""></div>`;
    if (!n.video) return "";
    return ganador ? `<div class="m"><video src="${esc(n.video)}" playsinline preload="auto"></video></div>`
      : `<div class="m"><video src="${esc(n.video)}" ${n.poster ? `poster="${esc(n.poster)}"` : ""} muted loop playsinline autoplay preload="auto"></video></div>`;
  };

  const ESCENAS = {
    intro: () => `<div class="esc">${HACES}${ESTATUA.replace('class="estatua"', 'class="estatua sube"')}
      <div class="moty ancha oro">${"MOTY".split("").map((l, i) => `<span style="animation-delay:${1 + i * .14}s">${l}</span>`).join("")}</div>
      <div class="sub esp a" style="animation-delay:1.9s">Míticos of the year</div>
      <div class="a" style="animation-delay:2.3s"><span class="anio esp">2026</span></div>
      <div class="linea" style="animation-delay:2.5s"></div>
      <div class="desc-cat a" style="animation-delay:2.9s">La gala de los premios del año</div></div>`,
    titulo: (p, cat) => `<div class="esc">${HACES}
      <div class="num-cat esp a">${cat.principal ? "La categoría reina" : `Categoría ${p.n} de ${p.total}`}</div>
      <div class="nombre-cat ancha oro barrido ${cat.nombre.length > 18 ? "largo" : ""}" style="animation-delay:.35s">${esc(cat.nombre)}</div>
      <div class="linea" style="animation-delay:1.1s"></div>
      <div class="desc-cat a" style="animation-delay:1.5s">${esc(cat.descripcion || "")}</div></div>`,
    nominados: (p, cat) => {
      const ns = cat.nominados, n = ns.length, clase = n > 8 ? "muchisimos" : n > 6 ? "muchos" : "n" + n;
      return `<div class="esc"><div class="cab-nom"><div class="esp a">Los nominados</div><h2 class="ancha oro a" style="animation-delay:.15s">${esc(cat.nombre)}</h2></div>
        <div class="rejilla ${clase}">${ns.map((x, i) => `<div class="tarjeta zoom" style="animation-delay:${.6 + i * (n > 6 ? .22 : .45)}s">${media(cat, x)}
          <div class="t">${esc(x.titulo)}${x.juego || x.mes ? `<small>${esc([x.juego, x.mes].filter(Boolean).join(" · "))}</small>` : ""}</div></div>`).join("")}</div></div>`;
    },
    suspense: (p, cat) => {
      const frase = "es para...";
      return `<div class="esc oscuro">${HACES}<div class="y-el esp a">Y el MOTY a</div>
        <div class="suspense-cat ancha oro zoom" style="animation-delay:.5s">${esc(cat.nombre)}</div>
        <div class="es-para ancha">${frase.split("").map((l, i) => `<span style="animation-delay:${1.6 + i * .12}s">${l === " " ? "&nbsp;" : l}</span>`).join("")}</div>
        <div class="a" style="animation-delay:2.6s">${SOBRE}</div></div>`;
    },
    ganador: (p, cat) => {
      const f = ordenadas(cat.id);
      if (!f.length) return `<div class="esc">${HACES}<div class="esp a">${esc(cat.nombre)}</div><h1 class="ancha oro zoom" style="font-size:110px">Sin votos</h1></div>`;
      const g = nom(cat, f[0].nominado), m = media(cat, g, true);
      return `<div class="esc"><div class="flash"></div>${HACES}
        <div class="gan ${m ? "" : "sin-media"}">${m ? `<div class="zoom" style="animation-delay:.2s">${m}</div>` : ""}
          <div><span class="etiqueta esp a" style="animation-delay:.5s">Ganador</span>
            <div class="cat-peq esp a" style="animation-delay:.7s">${esc(cat.nombre)}</div>
            <h1 class="ancha oro zoom" style="animation-delay:.9s;font-size:${m ? (g.titulo.length > 22 ? 50 : g.titulo.length > 12 ? 64 : 92) : 120}px">${esc(g.titulo)}</h1>
            ${g.juego ? `<div class="desc-cat a" style="animation-delay:1.2s;font-size:30px;margin-top:14px">${esc(g.juego)}</div>` : ""}
            <div class="pts a" style="animation-delay:1.5s">${f[0].puntos} puntos · ${f[0].primeros} ${f[0].primeros === 1 ? "voto" : "votos"} como 1º</div></div></div></div>`;
    },
    tabla: (p, cat) => {
      const f = ordenadas(cat.id).slice(0, 5), max = (f[0] && f[0].puntos) || 1;
      return `<div class="esc">${HACES}<div class="esp a" style="font-size:26px;color:var(--gold)">Así ha quedado</div>
        <h2 class="ancha oro a" style="font-size:72px;margin:14px 0 0;animation-delay:.15s">${esc(cat.nombre)}</h2>
        <div class="tabla-g">${f.map((r, i) => `<div class="fila ${i ? "" : "primera"}" style="animation-delay:${.5 + (f.length - 1 - i) * .35}s">
          <div class="p">${i + 1}º</div><div class="b"><i data-w="${(100 * r.puntos) / max}"></i><span>${esc(nom(cat, r.nominado).titulo)}</span></div>
          <div class="v" data-pts="${r.puntos}">0<small>pts</small></div></div>`).join("") || '<p class="desc-cat">Nadie votó esta categoría.</p>'}</div></div>`;
    },
    final: () => {
      const vistas = [...new Set(pasos.filter((p) => p.cat).map((p) => p.cat))];
      return `<div class="esc">${HACES}<div class="esp a" style="font-size:28px;color:var(--gold)">Los ganadores</div>
        <h1 class="ancha oro zoom" style="font-size:120px;margin:10px 0 0">MOTY 2026</h1>
        <div class="ganadores">${vistas.map((id, i) => { const c = cats[id], f = ordenadas(id); return `<div style="animation-delay:${.8 + i * .18}s"><small>${esc(c.nombre)}</small><b>${f.length ? esc(nom(c, f[0].nominado).titulo) : "—"}</b></div>`; }).join("")}</div>
        <div class="desc-cat a" style="animation-delay:${1.2 + vistas.length * .18}s;margin-top:44px">Gracias por un año mítico. Nos vemos en 2027.</div></div>`;
    },
  };

  // ---------- ir a un paso ----------
  async function irA(i) {
    i = Math.max(0, Math.min(pasos.length - 1, i));
    if (i === G.paso || G.cargando) return;
    G.cargando = true;
    const p = pasos[i], cat = cats[p.cat];
    if (p.t === "ganador" || p.t === "tabla") await cargarResultados(p.cat);
    if (p.t === "final") await Promise.all([...new Set(pasos.filter((x) => x.cat).map((x) => x.cat))].map(cargarResultados));
    const vieja = lienzo.querySelector(".esc");
    if (vieja) { vieja.classList.add("sale"); lienzo.querySelectorAll("video").forEach((v) => v.pause()); await espera(420); }
    G.paso = i;
    lienzo.innerHTML = ESCENAS[p.t](p, cat);
    G.cargando = false;
    pintarHud();
    // efectos de cada escena
    if (p.t === "suspense") SFX.redoble(); else SFX.parar();
    if (p.t === "ganador") { SFX.impacto(); confeti(); const v = lienzo.querySelector(".gan video"); if (v) { v.muted = !G.sonido; setTimeout(() => v.play().catch(() => { v.muted = true; v.play().catch(() => {}); }), 1200); } }
    else if (p.t !== "suspense") SFX.whoosh();
    if (p.t === "tabla") setTimeout(() => {
      lienzo.querySelectorAll(".fila").forEach((fila) => {
        const d = parseFloat(fila.style.animationDelay) * 1000 + 300;
        setTimeout(() => { fila.querySelector("i").style.width = fila.querySelector("i").dataset.w + "%"; contar(fila.querySelector(".v")); }, d);
      });
    }, 50);
  }
  function contar(el) {
    const fin = +el.dataset.pts, t0 = performance.now();
    (function f(t) { const k = Math.min(1, (t - t0) / 1200); el.innerHTML = Math.round(fin * (1 - Math.pow(1 - k, 3))) + "<small>pts</small>"; if (k < 1) requestAnimationFrame(f); })(t0);
  }

  // ---------- mando: teclado aquí o botones en Admin (se sincroniza) ----------
  async function mover(d) {
    const i = Math.max(0, Math.min(pasos.length - 1, G.paso + d));
    if (G.admin && !DEMO) {
      G.propio = Date.now();
      const cambios = { gala_paso: i };
      const p = pasos[i];
      if (p.t === "ganador" && !(G.ajustes?.categorias_reveladas || []).includes(p.cat)) cambios.categorias_reveladas = [...(G.ajustes?.categorias_reveladas || []), p.cat];
      const { error } = await sb.from("ajustes").update(cambios).eq("id", 1);
      if (!error) G.ajustes = { ...G.ajustes, ...cambios };
    }
    irA(i);
  }
  addEventListener("keydown", (e) => {
    quitarPortada();
    if (["ArrowRight", " ", "PageDown", "Enter"].includes(e.key)) { e.preventDefault(); mover(1); }
    else if (["ArrowLeft", "PageUp", "Backspace"].includes(e.key)) { e.preventDefault(); mover(-1); }
    else if (e.key.toLowerCase() === "f") { document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen().catch(() => {}); }
    else if (e.key.toLowerCase() === "h") { hud.hidden = !hud.hidden; pintarHud(); }
    else if (e.key.toLowerCase() === "m") { G.sonido = !G.sonido; if (!G.sonido) SFX.parar(); pintarHud(); }
  });
  function quitarPortada() { audio(); document.getElementById("empezar").classList.add("fuera"); }
  document.getElementById("empezar").addEventListener("click", quitarPortada);
  function pintarHud() {
    if (hud.hidden) return; const p = pasos[G.paso] || {};
    hud.innerHTML = `Paso ${G.paso + 1}/${pasos.length}: <b>${window.MOTY_PASO_NOMBRE[p.t] || ""}</b> ${p.cat ? "· " + esc(cats[p.cat].nombre) : ""}<br>
      ${DEMO ? "Modo prueba" : G.admin ? "Mandas tú (también desde Admin en el móvil)" : "Sigue al mando de Admin"} · Sonido ${G.sonido ? "sí" : "no"} (M) · H oculta esto`;
  }

  // ---------- arranque ----------
  (async function () {
    if (!DEMO) {
      const { data } = await sb.auth.getSession();
      const email = data.session?.user?.email?.toLowerCase();
      if (email) { const { data: v } = await sb.from("votantes").select("es_admin").eq("email", email).maybeSingle(); G.admin = !!v?.es_admin; }
      const leer = async () => {
        const { data: a } = await sb.from("ajustes").select("*").eq("id", 1).maybeSingle();
        if (a && Date.now() - G.propio > 2500) { G.ajustes = a; const i = a.gala_paso ?? 0; if (i !== G.paso && !G.cargando) irA(i); }
      };
      await leer(); setInterval(leer, 1000);
      if (G.paso < 0) irA(0);
    } else irA(0);
  })();
})();
