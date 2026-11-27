/* MOTY 2026 · Míticos Of The Year · lógica de la web (sin frameworks) */
(function () {
  "use strict";
  const C = window.CONFIG || {};
  const PUNTOS = [10, 7, 5, 3, 1];
  const DEMO = !C.SUPABASE_URL || C.SUPABASE_URL.includes("TU-PROYECTO") || !window.supabase;
  const sb = DEMO ? null : window.supabase.createClient(C.SUPABASE_URL, C.SUPABASE_ANON_KEY);
  const app = document.getElementById("app");

  const S = { usuario: null, votante: null, ajustes: { votacion_abierta: true, resultados_publicos: false, registro_abierto: true, categorias_reveladas: [] }, votos: {}, borrador: {} };

  // ---------- utilidades ----------
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const toast = (msg) => { const t = document.getElementById("toast"); t.textContent = msg; t.classList.add("ver"); clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove("ver"), 2600); };
  const todasCategorias = () => (window.MITICOS?.categorias || []).filter((c) => !c.oculta);
  const lista = (c) => (c.nominados || []).length >= (C.MIN_NOMINADOS || 3);
  const categorias = () => todasCategorias().filter(lista);
  const categoria = (id) => categorias().find((c) => c.id === id);
  const nominado = (cat, id) => cat.nominados.find((n) => n.id === id);
  const maxTop = (cat) => Math.min(5, cat.nominados.length);
  const ord = (i) => `${i + 1}º`;
  const ICON = {
    up: '<svg viewBox="0 0 24 24"><path d="M6 15l6-6 6 6"/></svg>',
    down: '<svg viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg>',
    x: '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    play: '<svg viewBox="0 0 24 24"><path d="M7 4l13 8-13 8z"/></svg>',
    sobre: '<svg viewBox="0 0 48 48"><rect x="5" y="11" width="38" height="27" rx="3"/><path d="M5 14l19 13 19-13"/></svg>',
  };

  // ---------- datos: modo demo (este navegador) o Supabase ----------
  const LS = {
    get(k, d) { try { return JSON.parse(localStorage.getItem("ma_" + k)) ?? d; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem("ma_" + k, JSON.stringify(v)); } catch (e) { /* sin almacenamiento */ } },
  };

  const API = {
    async sesion() {
      if (DEMO) { S.usuario = LS.get("usuario", null); S.votante = S.usuario ? { nombre: "Prueba", es_admin: true } : null; return; }
      const { data } = await sb.auth.getSession();
      S.usuario = data.session?.user || null;
      S.votante = null;
      if (S.usuario) {
        const { data: v } = await sb.from("votantes").select("nombre, es_admin").eq("email", S.usuario.email.toLowerCase()).maybeSingle();
        S.votante = v || null;
      }
    },
    async ajustes() {
      if (DEMO) { S.ajustes = LS.get("ajustes", S.ajustes); return; }
      const { data } = await sb.from("ajustes").select("*").eq("id", 1).maybeSingle();
      if (data) S.ajustes = data;
    },
    async misVotos() {
      S.votos = {};
      if (!S.usuario) return;
      if (DEMO) { S.votos = LS.get("votos", {}); return; }
      const { data } = await sb.from("votos").select("categoria, ranking");
      (data || []).forEach((r) => { S.votos[r.categoria] = r.ranking; });
    },
    async guardar(cat, ranking) {
      if (DEMO) { const v = LS.get("votos", {}); v[cat] = ranking; LS.set("votos", v); S.votos[cat] = ranking; return null; }
      const peticion = sb.from("votos").upsert({ email: S.usuario.email.toLowerCase(), categoria: cat, ranking, actualizado: new Date().toISOString() });
      const limite = new Promise((ok) => setTimeout(() => ok({ error: { message: "sin respuesta del servidor, recarga la página y prueba otra vez" } }), 15000));
      const { error } = await Promise.race([peticion, limite]);
      if (!error) S.votos[cat] = ranking;
      return error;
    },
    async resultados() {
      if (DEMO) {
        const v = LS.get("votos", {}); const out = [];
        Object.entries(v).forEach(([cat, r]) => {
          const a = S.ajustes;
          if (!(a.resultados_publicos || S.votante?.es_admin || a.categorias_reveladas.includes(cat))) return;
          r.forEach((n, i) => out.push({ categoria: cat, nominado: n, puntos: PUNTOS[i], primeros: i === 0 ? 1 : 0, votantes: 1 }));
        });
        return out;
      }
      const { data } = await sb.rpc("resultados");
      return data || [];
    },
    async cambiarAjustes(cambios) {
      if (DEMO) { S.ajustes = { ...S.ajustes, ...cambios }; LS.set("ajustes", S.ajustes); return null; }
      const { error } = await sb.from("ajustes").update(cambios).eq("id", 1);
      if (!error) S.ajustes = { ...S.ajustes, ...cambios };
      return error;
    },
    async votante(correo, nombre) {
      if (DEMO) return null;
      const { error } = await sb.rpc("guardar_votante", { correo, nombre_v: nombre }); return error;
    },
    async quitarVotante(correo) {
      if (DEMO) return null;
      const { error } = await sb.rpc("quitar_votante", { correo }); return error;
    },
    async quienHaVotado() {
      if (DEMO) return [{ nombre: "Prueba", email: "prueba@demo", categorias: Object.keys(LS.get("votos", {})).length }];
      const { data } = await sb.rpc("quien_ha_votado");
      return data || [];
    },
  };

  // ---------- cabecera ----------
  function pintarMenu(ruta) {
    document.querySelectorAll(".menu [data-nav]").forEach((a) => a.classList.toggle("activo", a.dataset.nav === ruta));
    document.getElementById("nav-admin").hidden = !S.votante?.es_admin;
    document.getElementById("nav-entrar").hidden = !!S.usuario;
    document.getElementById("nav-salir").hidden = !S.usuario;
    document.getElementById("aviso-demo").hidden = !DEMO;
  }
  document.getElementById("nav-salir").addEventListener("click", async () => {
    if (DEMO) LS.set("usuario", null); else await sb.auth.signOut();
    S.usuario = null; S.votante = null; S.votos = {};
    location.hash = "#/"; router();
  });

  // ---------- vistas ----------
  function vistaInicio() {
    const cats = todasCategorias();
    app.innerHTML = `
      <section class="hero">
        <div class="haces" aria-hidden="true"></div><div class="haces b" aria-hidden="true"></div>
        <svg class="estatua" viewBox="0 0 120 200" aria-hidden="true">
          <defs><linearGradient id="go" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe7b3"/><stop offset=".5" stop-color="#e0a84a"/><stop offset="1" stop-color="#7d4f17"/></linearGradient></defs>
          <circle cx="60" cy="16" r="11" fill="url(#go)"/>
          <path fill="url(#go)" d="M60 30c-6 0-9 4-10 9L28 8c-2-3-6-1-5 2l20 40c2 5 4 9 5 14l2 46h20l2-46c1-5 3-9 5-14l20-40c1-3-3-5-5-2L70 39c-1-5-4-9-10-9z"/>
          <path fill="url(#go)" d="M50 112h20l4 40H46z" opacity=".9"/>
          <path fill="url(#go)" d="M34 156h52l6 14H28zM22 174h76v16H22z"/>
        </svg>
        <h1 class="oro moty">MOTY</h1>
        <p class="awards">Míticos of the year</p>
        <span class="anio">2026</span><div class="linea-oro"></div>
        <p class="lema">Un año entero de clips, gritos y partidas. Ahora toca decidir qué fue lo mejor.</p>
        <div class="cuenta" id="cuenta" hidden></div>
        <div class="acciones">
          <a class="btn oro-b" href="#/votar">${S.ajustes.votacion_abierta ? "Votar ahora" : "Ver mis votos"}</a>
          <a class="btn linea" href="#/resultados">Resultados</a>
        </div>
      </section>
      <section class="reglas" aria-label="Cómo se vota">
        <div class="regla"><h3>Tu top 5</h3><p class="muted">En cada categoría eliges tus 5 favoritos, del 1º al 5º.</p>
          <div class="puntos">${PUNTOS.map((p, i) => `<span>${ord(i)} · ${p} pts</span>`).join("")}</div></div>
        <div class="regla"><h3>Un correo, un voto</h3><p class="muted">Entras con tu correo y puedes cambiar tus votos hasta que se cierre la votación.</p></div>
        <div class="regla"><h3>${cats.length} categorías</h3><p class="muted">Gana quien sume más puntos. Si empatan, el que tenga más primeros puestos.</p></div>
      </section>
      <h2 style="margin-bottom:18px">Categorías</h2>
      <div class="cats">${cats.map((c) => `
        <${lista(c) ? "a" : "div"} class="cat ${c.principal ? "principal" : ""} ${lista(c) ? "" : "pronto"}" ${lista(c) ? `href="#/votar/${c.id}"` : ""}>
          ${c.principal ? '<p class="eyebrow">Categoría principal</p>' : ""}
          <h3>${esc(c.nombre)}</h3>
          <p class="muted" style="margin:0">${esc(c.descripcion || "")}</p>
          <span class="estado">${lista(c) ? c.nominados.length + " nominados" : "Nominados próximamente"}</span>
        </${lista(c) ? "a" : "div"}>`).join("")}</div>`;
    cuentaAtras();
  }

  function cuentaAtras() {
    const el = document.getElementById("cuenta");
    if (!el || !C.FECHA_GALA) return;
    const fin = new Date(C.FECHA_GALA).getTime();
    const tick = () => {
      const d = Math.max(0, fin - Date.now());
      if (!document.body.contains(el)) return;
      const u = [Math.floor(d / 864e5), Math.floor(d / 36e5) % 24, Math.floor(d / 6e4) % 60, Math.floor(d / 1e3) % 60];
      el.hidden = false;
      el.innerHTML = ["Días", "Horas", "Min", "Seg"].map((t, i) => `<div><b>${String(u[i]).padStart(2, "0")}</b><span>${t}</span></div>`).join("");
      if (d > 0) setTimeout(tick, 1000);
    };
    tick();
  }

  function pideEntrar() {
    app.innerHTML = `<div class="caja"><p class="eyebrow">Solo para el grupo</p><h2>Entra para votar</h2>
      <p class="muted">Necesitamos tu correo para que cada uno vote una sola vez.</p>
      <a class="btn oro-b" href="#/entrar">Entrar con mi correo</a></div>`;
  }

  function vistaEntrar() {
    if (S.usuario) { location.hash = "#/votar"; return; }
    app.innerHTML = `
      <form class="caja" id="f-correo" novalidate>
        <p class="eyebrow">Paso 1 de 2</p><h2>Entra con tu correo</h2>
        <p class="muted">Te mandaremos un enlace para entrar. Ábrelo en este mismo móvil u ordenador.</p>
        <label for="correo">Tu correo</label>
        <input id="correo" type="email" autocomplete="email" required placeholder="tucorreo@gmail.com">
        <p class="error" id="e1" hidden></p>
        <button class="btn oro-b" type="submit">Enviarme el enlace</button>
      </form>
      <form class="caja" id="f-codigo" novalidate hidden>
        <p class="eyebrow">Paso 2 de 2</p><h2>Mira tu correo</h2>
        <p class="muted">Te ha llegado un correo de Supabase ("Your sign-in link"). Pulsa <b>Sign in</b> y entrarás directamente. Mira también en spam. Si en vez de enlace te llega un código, escríbelo aquí:</p>
        <label for="codigo">Código</label>
        <input id="codigo" class="codigo" type="text" inputmode="numeric" autocomplete="one-time-code" maxlength="6" required>
        <p class="error" id="e2" hidden></p>
        <button class="btn oro-b" type="submit">Entrar</button>
      </form>`;
    const f1 = document.getElementById("f-correo"), f2 = document.getElementById("f-codigo");
    let correo = "";
    const err = (id, m) => { const e = document.getElementById(id); e.textContent = m; e.hidden = !m; };
    f1.addEventListener("submit", async (ev) => {
      ev.preventDefault(); err("e1", "");
      correo = document.getElementById("correo").value.trim().toLowerCase();
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(correo)) return err("e1", "Ese correo no parece válido.");
      const b = f1.querySelector("button"); b.disabled = true;
      if (DEMO) { LS.set("usuario", { email: correo }); await API.sesion(); await API.misVotos(); location.hash = "#/votar"; return; }
      const { data: ok, error: e0 } = await sb.rpc("puede_entrar", { correo });
      if (e0 || !ok) { b.disabled = false; return err("e1", "Ahora mismo no se aceptan correos nuevos. Pídele a Fitxi que te añada."); }
      const { error } = await sb.auth.signInWithOtp({ email: correo, options: { emailRedirectTo: location.origin + location.pathname } });
      b.disabled = false;
      if (error) return err("e1", error.status === 429 ? "Demasiados intentos. Espera un minuto y vuelve a probar." : "No se pudo enviar el correo: " + error.message);
      f1.hidden = true; f2.hidden = false; document.getElementById("codigo").focus();
    });
    f2.addEventListener("submit", async (ev) => {
      ev.preventDefault(); err("e2", "");
      const token = document.getElementById("codigo").value.replace(/\D/g, "");
      if (token.length < 6) return err("e2", "El código tiene 6 cifras.");
      const b = f2.querySelector("button"); b.disabled = true;
      const { error } = await sb.auth.verifyOtp({ email: correo, token, type: "email" });
      b.disabled = false;
      if (error) return err("e2", "Código incorrecto o caducado. Pide uno nuevo si hace falta.");
      await iniciarSesion(); location.hash = "#/votar";
    });
  }

  function vistaUnirme() {
    const sugerido = (S.usuario.email || "").split("@")[0].slice(0, 20);
    if (!S.ajustes.registro_abierto) {
      app.innerHTML = `<div class="caja"><p class="eyebrow">MOTY 2026</p><h2>Inscripción cerrada</h2>
        <p class="muted">Tu correo (${esc(S.usuario.email)}) no está en la lista y ya no se admiten nuevos votantes. Habla con Fitxi.</p></div>`;
      return;
    }
    app.innerHTML = `<form class="caja" id="f-unirme" novalidate><p class="eyebrow">Último paso</p><h2>¿Cómo te llamas?</h2>
      <p class="muted">Es el nombre que verá el grupo. Has entrado como ${esc(S.usuario.email)}.</p>
      <label for="mi-nombre">Tu nombre o apodo</label>
      <input id="mi-nombre" type="text" maxlength="24" required value="${esc(sugerido)}">
      <p class="error" id="e3" hidden></p>
      <button class="btn oro-b" type="submit">Entrar a votar</button></form>`;
    const f = document.getElementById("f-unirme");
    f.addEventListener("submit", async (ev) => {
      ev.preventDefault();
      const nombre = document.getElementById("mi-nombre").value.trim();
      const e3 = document.getElementById("e3");
      if (nombre.length < 2) { e3.textContent = "Pon al menos 2 letras."; e3.hidden = false; return; }
      f.querySelector("button").disabled = true;
      const { error } = await sb.rpc("unirme", { nombre_v: nombre });
      if (error) { e3.textContent = "No se pudo: " + error.message; e3.hidden = false; f.querySelector("button").disabled = false; return; }
      await iniciarSesion(); toast("¡Bienvenido a los MOTY, " + nombre + "!"); router();
    });
  }

  function vistaVotar() {
    if (!S.usuario) return pideEntrar();
    if (!DEMO && !S.votante) return vistaUnirme();
    const cats = categorias();
    const hechas = cats.filter((c) => S.votos[c.id]?.length).length;
    app.innerHTML = `
      <div class="cabecera-seccion">
        <div><p class="eyebrow">${S.votante ? "Hola, " + esc(S.votante.nombre) : "Tu papeleta"}</p><h2>Tus votos</h2>
          ${S.ajustes.votacion_abierta ? "" : '<p class="muted">La votación está cerrada. Ya no se pueden cambiar los votos.</p>'}
</div>
        <div class="progreso"><span class="muted">${hechas} de ${cats.length} categorías votadas</span>
          <div class="barra"><i style="width:${cats.length ? (100 * hechas) / cats.length : 0}%"></i></div></div>
      </div>
      <div class="cats">${todasCategorias().map((c, i) => {
        const v = S.votos[c.id];
        if (!lista(c)) return `<div class="cat pronto"><span class="num">${String(i + 1).padStart(2, "0")}</span>
          <h3>${esc(c.nombre)}</h3><p class="muted" style="margin:0">${esc(c.descripcion || "")}</p>
          <span class="estado">Nominados próximamente</span></div>`;
        return `<a class="cat ${c.principal ? "principal" : ""}" href="#/votar/${c.id}">
          ${c.principal ? '<p class="eyebrow">Categoría principal</p>' : ""}
          <span class="num">${String(i + 1).padStart(2, "0")}</span>
          <h3>${esc(c.nombre)}</h3><p class="muted" style="margin:0">${esc(c.descripcion || "")}</p>
          <span class="estado ${v?.length ? "hecho" : ""}">${v?.length ? "Votado · tu 1º: " + esc(nominado(c, v[0])?.titulo || "—") : "Pendiente"}</span></a>`;
      }).join("")}</div>`;
  }

  function mediaNominado(cat, n, enGanador) {
    if (cat.tipo === "juego" || n.imagen) return `<div class="media juego"><img src="${esc(n.imagen)}" alt="${esc(n.titulo)}" loading="lazy"></div>`;
    if (enGanador) return `<div class="media"><video src="${esc(n.video)}" poster="${esc(n.poster || "")}" controls playsinline preload="metadata"></video></div>`;
    return `<div class="media" data-video="${esc(n.video)}">
      ${n.poster ? `<img class="poster" src="${esc(n.poster)}" alt="" loading="lazy">` : ""}
      <button class="play" type="button" aria-label="Ver el clip ${esc(n.titulo)}"><span>${ICON.play}</span></button></div>`;
  }

  function vistaCategoria(id) {
    if (!S.usuario) return pideEntrar();
    if (!DEMO && !S.votante) return vistaUnirme();
    const cat = categoria(id);
    if (!cat) { app.innerHTML = '<p class="vacio-msg">Esta categoría no existe o aún no tiene nominados.</p>'; return; }
    const abierta = S.ajustes.votacion_abierta && (DEMO || S.votante);
    let sel = (S.borrador[id] || S.votos[id] || []).filter((x) => nominado(cat, x));
    const M = maxTop(cat);
    const idx = categorias().findIndex((c) => c.id === id);
    const sig = categorias()[idx + 1];

    function pintar() {
      S.borrador[id] = sel;
      const cambiado = JSON.stringify(sel) !== JSON.stringify(S.votos[id] || []);
      app.innerHTML = `
        <a class="volver" href="#/votar">← Todas las categorías</a>
        <div class="cabecera-seccion"><div>
          <p class="eyebrow">${cat.principal ? "Categoría principal" : "Categoría " + (idx + 1) + " de " + categorias().length}</p>
          <h2>${esc(cat.nombre)}</h2><p class="muted" style="margin:6px 0 0">${esc(cat.descripcion || "")}</p></div></div>
        <div class="votar-cat">
          <div class="nominados">${cat.nominados.map((n) => {
            const p = sel.indexOf(n.id);
            return `<article class="nom ${p >= 0 ? "elegido" : ""}">
              ${p >= 0 ? `<span class="badge">${ord(p)}</span>` : ""}
              ${mediaNominado(cat, n)}
              <div class="info"><h4>${esc(n.titulo)}</h4>
                ${n.juego || n.mes ? `<span class="meta">${esc([n.juego, n.mes].filter(Boolean).join(" · "))}</span>` : ""}
                ${abierta ? `<button type="button" class="btn ${p >= 0 ? "linea" : "oro-b"} peq" data-elegir="${esc(n.id)}" ${p < 0 && sel.length >= M ? "disabled" : ""}>
                  ${p >= 0 ? "Quitar de mi top" : sel.length >= M ? "Top completo" : "Añadir como " + ord(sel.length)}</button>` : ""}
              </div></article>`;
          }).join("")}</div>
          <aside class="top5" aria-label="Tu top ${M}">
            <h3>Tu top ${M}</h3><p class="muted" style="margin:0;font-size:14px">Pulsa los nominados en orden. Reordena con las flechas.</p>
            <ol>${Array.from({ length: M }, (_, i) => {
              const n = sel[i] && nominado(cat, sel[i]);
              return `<li class="${n ? "" : "vacio"}"><span class="pos">${ord(i)}<small>${PUNTOS[i]} pts</small></span>
                <span class="nombre">${n ? esc(n.titulo) : "Sin elegir"}</span>
                ${n && abierta ? `<span class="ctrls">
                  <button class="icono" type="button" data-mover="${i}" data-dir="-1" aria-label="Subir" ${i === 0 ? "disabled" : ""}>${ICON.up}</button>
                  <button class="icono" type="button" data-mover="${i}" data-dir="1" aria-label="Bajar" ${i === sel.length - 1 ? "disabled" : ""}>${ICON.down}</button>
                  <button class="icono" type="button" data-quitar="${i}" aria-label="Quitar">${ICON.x}</button></span>` : "<span></span>"}</li>`;
            }).join("")}</ol>
            ${abierta ? `<button class="btn oro-b guardar" type="button" id="guardar" ${!sel.length || !cambiado ? "disabled" : ""}>${S.votos[id]?.length && !cambiado ? "Guardado ✓" : "Guardar mi top"}</button>
            <p class="nota">${sel.length < M ? "Puedes guardar aunque no llenes los " + M + " puestos." : "¡Top completo!"}</p>` : '<p class="nota">La votación está cerrada.</p>'}
            ${sig ? `<a class="btn linea peq" style="width:100%;margin-top:10px" href="#/votar/${sig.id}">Siguiente: ${esc(sig.nombre)} →</a>` : ""}
          </aside>
          ${abierta ? `<button type="button" class="ir-top btn ${cambiado && sel.length ? "oro-b" : "linea"}" id="ir-top">${cambiado && sel.length ? "Guardar mi top (" + sel.length + "/" + M + ") ↑" : "Mi top (" + sel.length + "/" + M + ") ↑"}</button>` : ""}
        </div>`;

      app.querySelectorAll("[data-elegir]").forEach((b) => b.addEventListener("click", () => {
        const nid = b.dataset.elegir; const p = sel.indexOf(nid);
        sel = p >= 0 ? sel.filter((x) => x !== nid) : sel.length < M ? [...sel, nid] : sel;
        pintar();
      }));
      app.querySelectorAll("[data-mover]").forEach((b) => b.addEventListener("click", () => {
        const i = +b.dataset.mover, j = i + +b.dataset.dir; if (j < 0 || j >= sel.length) return;
        [sel[i], sel[j]] = [sel[j], sel[i]]; sel = [...sel]; pintar();
      }));
      app.querySelectorAll("[data-quitar]").forEach((b) => b.addEventListener("click", () => { sel = sel.filter((_, k) => k !== +b.dataset.quitar); pintar(); }));
      app.querySelectorAll(".media[data-video] .play").forEach((b) => b.addEventListener("click", () => {
        const m = b.parentElement; const src = m.dataset.video;
        app.querySelectorAll(".nominados video").forEach((v) => v.pause());
        m.innerHTML = `<video src="${esc(src)}" controls autoplay playsinline></video>`;
      }));
      const it = document.getElementById("ir-top");
      if (it) it.addEventListener("click", () => app.querySelector(".top5").scrollIntoView({ behavior: "smooth", block: "start" }));
      const g = document.getElementById("guardar");
      if (g) g.addEventListener("click", async () => {
        g.disabled = true; g.textContent = "Guardando...";
        const e = await API.guardar(id, sel);
        if (e) { toast("No se pudo guardar: " + (e.message || "error")); g.disabled = false; g.textContent = "Guardar mi top"; return; }
        delete S.borrador[id];
        toast(sig ? "¡Guardado! Vamos con la siguiente" : "¡Guardado! Has terminado 🏆");
        pintar();
      });
    }
    pintar();
  }

  let pollRes = null;
  async function vistaResultados() {
    const datos = await API.resultados();
    const porCat = {};
    datos.forEach((r) => { (porCat[r.categoria] = porCat[r.categoria] || []).push(r); });
    const a = S.ajustes;
    app.innerHTML = `
      <div class="cabecera-seccion"><div><p class="eyebrow">La gala</p><h2>Resultados</h2>
        <p class="muted" style="margin:6px 0 0">${a.resultados_publicos ? "Todos los premios están revelados." : "Los premios se revelan uno a uno durante la gala. Esta página se actualiza sola."}</p></div></div>
      ${categorias().map((c) => {
        const visible = a.resultados_publicos || a.categorias_reveladas.includes(c.id);
        const filas = (porCat[c.id] || []).slice().sort((x, y) => y.puntos - x.puntos || y.primeros - x.primeros);
        let cuerpo;
        if (!visible) cuerpo = `<div class="sobre">${ICON.sobre}<span>Por revelar</span></div>`;
        else if (!filas.length) cuerpo = '<p class="muted">Nadie ha votado esta categoría.</p>';
        else {
          const g = nominado(c, filas[0].nominado) || { titulo: filas[0].nominado };
          const max = filas[0].puntos || 1;
          cuerpo = `<div class="ganador">${mediaNominado(c, g, true)}
              <div><p class="eyebrow">Ganador</p><h3 class="oro">${esc(g.titulo)}</h3>
              <p class="pts">${filas[0].puntos} puntos · ${filas[0].primeros} ${filas[0].primeros === 1 ? "voto como 1º" : "votos como 1º"}</p></div></div>
            <ol class="tabla">${filas.slice(1).map((r, i) => `<li style="animation-delay:${0.15 * (i + 1)}s"><span class="p">${i + 2}º</span>
              <span class="n"><i style="width:${(100 * r.puntos) / max}%"></i><span>${esc(nominado(c, r.nominado)?.titulo || r.nominado)}</span></span>
              <span class="v">${r.puntos} pts</span></li>`).join("")}</ol>`;
        }
        return `<section class="res-cat ${c.principal ? "principal" : ""}"><header><div>${c.principal ? '<p class="eyebrow">Categoría principal</p>' : ""}<h3>${esc(c.nombre)}</h3></div></header>${cuerpo}</section>`;
      }).join("")}`;
    clearTimeout(pollRes);
    if (!a.resultados_publicos) pollRes = setTimeout(async () => { if (location.hash.startsWith("#/resultados")) { await API.ajustes(); vistaResultados(); } }, 8000);
  }

  async function vistaAdmin() {
    if (!S.votante?.es_admin) { app.innerHTML = '<p class="vacio-msg">Solo el organizador puede entrar aquí.</p>'; return; }
    const quien = await API.quienHaVotado();
    const a = S.ajustes, cats = categorias();
    app.innerHTML = `
      <div class="cabecera-seccion"><div><p class="eyebrow">Organizador</p><h2>Panel de la gala</h2></div></div>
      <section class="regla mando">
        <h3>Gala en directo</h3>
        <p class="muted" style="font-size:14px;margin-top:0">Abre la <a href="gala.html" target="_blank" rel="noopener">pantalla de la gala</a> en el PC que emite (pulsa F para pantalla completa) y manda desde aquí con el móvil. Al llegar a «¡Ganador!» la categoría se revela sola en Resultados.</p>
        ${(() => { const P = window.MOTY_PASOS(), i = Math.min(a.gala_paso || 0, P.length - 1), p = P[i], sig = P[i + 1];
          const nombre = (x) => x ? window.MOTY_PASO_NOMBRE[x.t] + (x.cat ? " · " + esc((categoria(x.cat) || {}).nombre || "") : "") : "Fin";
          return `<div class="paso-actual"><small>Ahora (${i + 1}/${P.length})</small><b>${nombre(p)}</b><small>Siguiente: ${nombre(sig)}</small></div>
          <div class="mando-btns"><button class="btn linea" data-gala="-1" ${i === 0 ? "disabled" : ""}>◀ Atrás</button>
            <button class="btn oro-b" data-gala="1" ${!sig ? "disabled" : ""}>Siguiente ▶</button></div>
          <button class="link" data-gala="reinicio" style="margin-top:10px">Volver a la portada</button>`; })()}
      </section>
      <div class="admin-grid">
        <section class="regla"><h3>Votación</h3>
          <div class="interruptor"><span>Votación ${a.votacion_abierta ? "<b>abierta</b>" : "<b>cerrada</b>"}</span>
            <button class="btn linea peq" data-aj="votacion_abierta">${a.votacion_abierta ? "Cerrar" : "Abrir"}</button></div>
          <div class="interruptor"><span>Resultados ${a.resultados_publicos ? "<b>públicos</b>" : "ocultos"}</span>
            <button class="btn linea peq" data-aj="resultados_publicos">${a.resultados_publicos ? "Ocultar todos" : "Mostrar todos"}</button></div>
          <div class="interruptor"><span>Inscripción ${a.registro_abierto ? "<b>abierta</b> (cualquiera que entre con su correo)" : "<b>cerrada</b> (solo la lista)"}</span>
            <button class="btn linea peq" data-aj="registro_abierto">${a.registro_abierto ? "Cerrar" : "Abrir"}</button></div>
          <p class="muted" style="font-size:14px">En la gala, cierra la votación y revela las categorías una a una aquí abajo. Los demás lo verán en <a href="#/resultados">Resultados</a> a los pocos segundos.</p>
        </section>
        <section class="regla"><h3>Revelar en la gala</h3>
          ${cats.map((c) => { const r = a.categorias_reveladas.includes(c.id); return `<div class="interruptor"><span>${esc(c.nombre)}</span>
            <button class="btn ${r ? "linea" : "oro-b"} peq" data-rev="${c.id}">${r ? "Ocultar" : "Revelar"}</button></div>`; }).join("")}
        </section>
        <section class="regla"><h3>Votantes</h3>
          <table class="tabla-admin"><thead><tr><th>Nombre</th><th>Votadas</th><th></th></tr></thead><tbody>
          ${quien.map((q) => `<tr><td>${esc(q.nombre)}<br><small class="muted">${esc(q.email)}</small></td><td>${q.categorias} / ${cats.length}</td>
            <td>${q.email === (S.usuario?.email || "").toLowerCase() ? "" : `<button class="icono" type="button" data-quitar-v="${esc(q.email)}" aria-label="Quitar a ${esc(q.nombre)}">${ICON.x}</button>`}</td></tr>`).join("") || '<tr><td colspan="3">Aún nadie</td></tr>'}
          </tbody></table>
          <form id="f-votante" style="margin-top:14px">
            <label for="v-nombre">Añadir amigo</label>
            <input id="v-nombre" type="text" placeholder="Nombre" required>
            <input id="v-correo" type="email" placeholder="correo@gmail.com" required style="margin-top:8px">
            <button class="btn oro-b peq" type="submit" style="margin-top:10px">Añadir</button>
          </form></section>
      </div>`;
    document.getElementById("f-votante").addEventListener("submit", async (ev) => {
      ev.preventDefault();
      const correo = document.getElementById("v-correo").value.trim().toLowerCase(), nombre = document.getElementById("v-nombre").value.trim();
      if (!correo || !nombre) return;
      const e = await API.votante(correo, nombre);
      toast(e ? "Error: " + e.message : nombre + " añadido"); vistaAdmin();
    });
    app.querySelectorAll("[data-quitar-v]").forEach((b) => b.addEventListener("click", async () => {
      const e = await API.quitarVotante(b.dataset.quitarV);
      toast(e ? "Error: " + e.message : "Quitado"); vistaAdmin();
    }));
    app.querySelectorAll("[data-gala]").forEach((b) => b.addEventListener("click", async () => {
      const P = window.MOTY_PASOS(), act = Math.min(S.ajustes.gala_paso || 0, P.length - 1);
      const i = b.dataset.gala === "reinicio" ? 0 : Math.max(0, Math.min(P.length - 1, act + +b.dataset.gala));
      const cambios = { gala_paso: i }, p = P[i];
      if (p.t === "ganador" && !S.ajustes.categorias_reveladas.includes(p.cat)) cambios.categorias_reveladas = [...S.ajustes.categorias_reveladas, p.cat];
      b.disabled = true;
      const e = await API.cambiarAjustes(cambios);
      if (e) toast("Error: " + e.message); else if (cambios.categorias_reveladas) toast("¡" + (categoria(p.cat) || {}).nombre + " revelada!");
      vistaAdmin();
    }));
    app.querySelectorAll("[data-aj]").forEach((b) => b.addEventListener("click", async () => {
      const k = b.dataset.aj; const e = await API.cambiarAjustes({ [k]: !S.ajustes[k] });
      if (e) toast("Error: " + e.message); vistaAdmin();
    }));
    app.querySelectorAll("[data-rev]").forEach((b) => b.addEventListener("click", async () => {
      const id = b.dataset.rev; const r = S.ajustes.categorias_reveladas;
      const nuevo = r.includes(id) ? r.filter((x) => x !== id) : [...r, id];
      const e = await API.cambiarAjustes({ categorias_reveladas: nuevo });
      if (e) toast("Error: " + e.message); else toast(r.includes(id) ? "Categoría ocultada" : "¡Categoría revelada!");
      vistaAdmin();
    }));
  }

  // ---------- rutas ----------
  async function router() {
    const [ruta, param] = (location.hash.replace(/^#\/?/, "") || "").split("/");
    pintarMenu(ruta || "inicio");
    clearTimeout(pollRes);
    if (ruta === "entrar") vistaEntrar();
    else if (ruta === "votar" && param) vistaCategoria(param);
    else if (ruta === "votar") vistaVotar();
    else if (ruta === "resultados") await vistaResultados();
    else if (ruta === "admin") await vistaAdmin();
    else vistaInicio();
    app.focus({ preventScroll: true });
    if (!param) window.scrollTo(0, 0);
  }

  async function iniciarSesion() {
    await API.sesion(); await Promise.all([API.ajustes(), API.misVotos()]);
  }

  window.addEventListener("hashchange", router);
  (async function arrancar() {
    // Importante: no llamar a Supabase dentro del callback (se bloquea); se hace en el siguiente tick
    if (!DEMO) sb.auth.onAuthStateChange((ev, ses) => {
      const antes = S.usuario?.email || null, ahora = ses?.user?.email || null;
      if ((ev === "SIGNED_IN" || ev === "SIGNED_OUT") && antes !== ahora) setTimeout(async () => { await iniciarSesion(); router(); }, 0);
    });
    await iniciarSesion();
    router();
  })();
})();
