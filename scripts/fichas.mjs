// Tarjetas fijas del perfil: contacto, sobre mí, qué hago, stack y proyectos.
// Todo sale de datos/perfil.json.

import fs from "node:fs";
import path from "node:path";
import {
  ANCHO, ASSETS, CABECERA, MARGEN, Lienzo, enAmbosTemas, glifo, icono, leerPerfil,
  medir, partir, pintarIcono, r, tarjeta,
} from "./comun.mjs";

const P = leerPerfil();

// --- contacto ----------------------------------------------------------------

const CONTACTOS = {
  web: { glifo: "web", titulo: "Portfolio", accion: "visitar", valor: (u) => u.replace(/^https?:\/\//, "").replace(/\/$/, "") },
  linkedin: { glifo: "linkedin", titulo: "LinkedIn", accion: "conectar", valor: (u) => "in/" + u.replace(/^https?:\/\/(www\.)?linkedin\.com\/in\//, "").replace(/\/$/, "") },
  email: { glifo: "correo", titulo: "Correo", accion: "escribir", valor: (u) => u },
};

export const contactosActivos = () => Object.keys(CONTACTOS).filter((k) => P.contacto[k]);

// Una tarjeta por contacto; el README las pone en fila, cada una con su enlace.
// Un brillo las recorre una detrás de otra, como una ola.
async function contacto(tipo, tema) {
  const activos = contactosActivos();
  const n = activos.length, orden = activos.indexOf(tipo);
  const ancho = Math.round(ANCHO / n);
  const alto = 124;
  const def = CONTACTOS[tipo];
  const valor = def.valor(P.contacto[tipo]);
  const L = new Lienzo(ancho, alto, tema, { titulo: def.titulo, desc: `${def.titulo}: ${valor}` });
  const T = L.T;
  const x0 = 22;
  let px = 12;
  while (px > 9.5 && medir(valor, "mono400", px) > ancho - 2 * x0 - 4) px -= 0.5;

  let s = `<defs>`;
  s += `<linearGradient id="borde" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${T.acento}" stop-opacity=".85"/><stop offset=".45" stop-color="${T.linea}"/><stop offset="1" stop-color="${T.linea}"/></linearGradient>`;
  s += `<linearGradient id="caja" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${T.acento}"/><stop offset="1" stop-color="${T.profundo}"/></linearGradient>`;
  s += `<radialGradient id="luz" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(40 30) scale(200 120)"><stop offset="0" stop-color="${T.profundo}" stop-opacity="${T.brillo * 0.55}"/><stop offset="1" stop-color="${T.profundo}" stop-opacity="0"/></radialGradient>`;
  s += `<clipPath id="dentro"><rect x="4" y="2" width="${ancho - 8}" height="${alto - 4}" rx="17"/></clipPath>`;
  s += `</defs>`;
  s += `<rect x="3.5" y="1.5" width="${ancho - 7}" height="${alto - 3}" rx="18" fill="${T.panel}" stroke="url(#borde)" stroke-width="1.5"/>`;
  s += `<g clip-path="url(#dentro)">`;
  s += `<rect width="${ancho}" height="${alto}" fill="url(#luz)"/>`;
  // el glifo en grande, de marca de agua
  s += `<g opacity="${tema === "dark" ? 0.07 : 0.08}" transform="rotate(-12 ${ancho - 50} 70)">${glifo(def.glifo, ancho - 104, 24, 104, T.acento, 1.6)}</g>`;
  // un solo brillo que cruza las tarjetas seguidas, como en proyectos: mismas
  // cuentas en coordenadas de la fila entera, desplazadas según la posición
  const dx = orden * ancho;
  const g0 = -120 - dx, g1 = ANCHO + 160 - dx;
  s += `<rect x="${g0}" y="-20" width="60" height="${alto + 40}" fill="#ffffff" opacity="${tema === "dark" ? 0.07 : 0.35}" transform="skewX(-22)"><animate attributeName="x" values="${g0};${g0};${g1}" keyTimes="0;.55;1" dur="6s" repeatCount="indefinite"/></rect>`;
  s += `</g>`;

  // icono
  s += `<rect x="${x0}" y="20" width="42" height="42" rx="12" fill="url(#caja)"/>`;
  s += `<rect x="${x0}" y="20" width="42" height="21" rx="12" fill="#ffffff" opacity=".12"/>`;
  s += glifo(def.glifo, x0 + 11, 31, 20, "#ffffff", 2);
  // llamada a la acción
  const wa = medir(def.accion, "mono500", 11) + 40;
  const xa = ancho - x0 - wa;
  s += `<rect x="${r(xa)}" y="28" width="${r(wa)}" height="26" rx="13" fill="${T.panel2}" stroke="${T.linea}"/>`;
  s += L.t(xa + 13, 45, def.accion, { f: "mono500", s: 11, c: "acento" });
  s += `<g>${glifo("flecha", xa + wa - 23, 35, 12, T.acento, 2.6)}<animateTransform attributeName="transform" type="translate" values="0 0;0 0;2 -2;0 0" keyTimes="0;.7;.85;1" dur="2.4s" repeatCount="indefinite"/></g>`;
  // textos
  s += L.t(x0, 90, def.titulo, { f: "sans800", s: 18, c: "tinta", ls: -0.2 });
  s += L.t(x0, 108, valor, { f: "mono400", s: px, c: "suave" });
  return L.svg(s);
}

// --- trayectoria: trabajo y formación, de lo más reciente a lo más antiguo -----------

async function trayectoria(tema) {
  const items = P.trayectoria;
  const xf = 196, xc = xf + 28, anchoC = ANCHO - MARGEN - xc;
  const bloques = items.map((it) => {
    const titulo = partir(it.titulo, "sans700", 15.5, anchoC);
    const texto = partir(it.texto, "sans400", 13.5, anchoC);
    const alto = titulo.length * 21 + 20 + texto.length * 20 + (it.etiquetas ? 34 : 0);
    return { it, titulo, texto, alto };
  });
  const sep = 30;
  const alto = CABECERA + 34 + bloques.reduce((a, b) => a + b.alto + sep, -sep) + 34;
  const trabajos = items.filter((i) => i.tipo === "trabajo").length;
  const L = new Lienzo(ANCHO, alto, tema, {
    titulo: "Trayectoria",
    desc: `Trayectoria. ${items.map((i) => `${i.titulo}, ${i.lugar} (${i.desde} – ${i.hasta}). ${i.texto}`).join(" ")}`,
  });
  const T = L.T;
  let s = tarjeta(L, "Trayectoria", `${trabajos} en empresa · ${items.length - trabajos} de formación`);

  let y = CABECERA + 34;
  const yPrimero = y + 6;
  let yUltimo = y;
  bloques.forEach(({ it, titulo, texto, alto: h }, i) => {
    const yy = y + 12;
    yUltimo = yy - 6;
    // fechas y tipo
    s += L.t(MARGEN, yy, `${it.desde} – ${it.hasta}`, { f: "mono500", s: 12, c: it.actual ? "acento" : "tinta" });
    const etq = it.tipo === "trabajo" ? "EMPRESA" : "FORMACIÓN";
    const we = medir(etq, "mono500", 9.5, 1.2) + 16;
    s += `<rect x="${MARGEN}" y="${yy + 10}" width="${r(we)}" height="18" rx="5" fill="${it.tipo === "trabajo" ? T.panel2 : "none"}" stroke="${T.linea}"/>`;
    s += L.t(MARGEN + we / 2, yy + 22.5, etq, { f: "mono500", s: 9.5, c: "suave", a: "middle", ls: 1.2 });
    // p. ej. las prácticas previas en la misma empresa
    if (it.nota_fecha) s += L.t(MARGEN, yy + 46, it.nota_fecha, { f: "mono400", s: 10.5, c: "acento" });
    // punto en la línea
    if (it.actual) {
      s += `<circle cx="${xf}" cy="${yy - 5}" r="6" fill="${T.acento}" class="latido"/>`;
      s += `<circle cx="${xf}" cy="${yy - 5}" r="6" fill="${T.acento}"/>`;
    } else {
      s += `<circle cx="${xf}" cy="${yy - 5}" r="5.5" fill="${T.fondo}" stroke="${T.tenue}" stroke-width="2"/>`;
    }
    // contenido
    let yc = yy;
    titulo.forEach((l) => { s += L.t(xc, yc, l, { f: "sans700", s: 15.5 }); yc += 21; });
    s += L.t(xc, yc, it.lugar, { f: "sans500", s: 13, c: "acento" });
    yc += 22;
    texto.forEach((l) => { s += L.t(xc, yc, l, { f: "sans400", s: 13.5, c: "suave" }); yc += 20; });
    if (it.etiquetas) {
      let x = xc;
      for (const e of it.etiquetas) {
        const w = medir(e, "mono400", 11) + 18;
        s += `<rect x="${r(x)}" y="${yc - 4}" width="${r(w)}" height="22" rx="6" fill="${T.panel}" stroke="${T.linea}"/>`;
        s += L.t(x + w / 2, yc + 11, e, { f: "mono400", s: 11, c: "suave", a: "middle" });
        x += w + 6;
      }
    }
    y += h + sep;
  });
  // la línea de tiempo, debajo de los puntos
  s = s.replace(`<line x1="${MARGEN}" y1="${CABECERA}"`, `<line x1="${xf}" y1="${yPrimero}" x2="${xf}" y2="${yUltimo}" stroke="${T.linea}" stroke-width="2"/><line x1="${MARGEN}" y1="${CABECERA}"`);
  return L.svg(s);
}

// --- qué hago ------------------------------------------------------------------------
//
// Rejilla tipo bento: cada tarjeta lleva arriba una pequeña escena animada que
// enseña de qué va, en vez de solo un icono.

const ESCENAS = {
  // tres barras de métricas que se llenan una detrás de otra
  rayo(L, x, y, w, h) {
    const T = L.T;
    let s = "";
    const filas = [["LCP", 0.9], ["INP", 0.82], ["CLS", 0.95]];
    const xb = x + 50, wb = w - 50 - 56;
    filas.forEach(([et, v], i) => {
      const yy = y + 18 + i * 18;
      s += L.t(x + 16, yy + 4, et, { f: "mono500", s: 10, c: "suave" });
      s += `<rect x="${r(xb)}" y="${yy - 3}" width="${r(wb)}" height="6" rx="3" fill="${T.linea}"/>`;
      const a = r(0.08 + i * 0.1), b = r(0.38 + i * 0.1);
      s += `<rect x="${r(xb)}" y="${yy - 3}" width="${r(wb * v)}" height="6" rx="3" fill="url(#qhBarra)"><animate attributeName="width" values="0;0;${r(wb * v)};${r(wb * v)};0" keyTimes="0;${a};${b};.92;1" dur="5s" repeatCount="indefinite"/></rect>`;
      s += `<g opacity="0"><animate attributeName="opacity" values="0;0;1;1;0" keyTimes="0;${b};${r(+b + 0.04)};.92;1" dur="5s" repeatCount="indefinite"/>`;
      s += `<circle cx="${r(xb + wb + 18)}" cy="${yy}" r="6" fill="${T.ok}" opacity=".18"/>${glifo("check", xb + wb + 13.5, yy - 4.5, 9, T.ok, 3)}</g>`;
    });
    return s;
  },

  // el front le pide datos al CMS y vuelve la respuesta
  enchufe(L, x, y, w, h) {
    const T = L.T;
    const cy = y + h / 2 + 4;
    const caja = (cx, texto) => {
      const bw = medir(texto, "mono500", 10.5) + 22;
      return `<rect x="${r(cx - bw / 2)}" y="${cy - 13}" width="${r(bw)}" height="26" rx="8" fill="${T.panel}" stroke="${T.linea}"/>` + L.t(cx, cy + 3.5, texto, { f: "mono500", s: 10.5, c: "tinta", a: "middle" });
    };
    const xa = x + 54, xb = x + w - 54;
    let s = `<path d="M${xa + 30} ${cy}H${xb - 34}" stroke="${T.tenue}" stroke-dasharray="3 4"/>`;
    s += L.t((xa + xb) / 2, y + 17, "GET /api/contenidos", { f: "mono400", s: 9.5, c: "suave", a: "middle" });
    s += `<circle r="4" cy="${cy}" fill="${T.acento}"><animate attributeName="cx" values="${xa + 30};${xb - 34};${xb - 34}" keyTimes="0;.45;1" dur="2.6s" repeatCount="indefinite"/><animate attributeName="opacity" values="1;1;0;0" keyTimes="0;.45;.46;1" dur="2.6s" repeatCount="indefinite"/></circle>`;
    s += `<circle r="4" cy="${cy}" fill="${T.ok}" opacity="0"><animate attributeName="cx" values="${xb - 34};${xb - 34};${xa + 30}" keyTimes="0;.5;.95" dur="2.6s" repeatCount="indefinite"/><animate attributeName="opacity" values="0;0;1;1;0" keyTimes="0;.5;.51;.95;1" dur="2.6s" repeatCount="indefinite"/></circle>`;
    s += caja(xa, "Nuxt") + caja(xb, "Strapi");
    s += L.t((xa + xb) / 2, y + h - 10, "200 OK · JSON", { f: "mono400", s: 9.5, c: "ok", a: "middle" });
    return s;
  },

  // el mismo saludo en los tres idiomas, con el selector moviéndose
  globo(L, x, y, w, h) {
    const T = L.T;
    const textos = ["Hola", "Hello", "Olá"], codigos = ["ES", "EN", "PT"];
    const fase = ["1;1;0;0;1", "0;0;1;1;0;0", "0;0;1;1;0"];
    const kt = ["0;.31;.34;.97;1", "0;.31;.34;.64;.67;1", "0;.64;.67;.97;1"];
    let s = "";
    textos.forEach((t, i) => {
      s += `<g opacity="${i ? 0 : 1}"><animate attributeName="opacity" values="${fase[i]}" keyTimes="${kt[i]}" dur="6s" repeatCount="indefinite"/>${L.t(x + 16, y + 44, t, { f: "sans800", s: 24, c: "tinta", ls: -0.4 })}</g>`;
    });
    const pw = 30, px0 = x + w - 16 - pw * 3;
    s += `<rect x="${px0}" y="${y + 26}" width="${pw * 3}" height="24" rx="12" fill="${T.panel}" stroke="${T.linea}"/>`;
    s += `<rect x="${px0 + 2}" y="${y + 28}" width="${pw - 4}" height="20" rx="10" fill="${T.acento}"><animate attributeName="x" values="${px0 + 2};${px0 + 2};${px0 + pw + 2};${px0 + pw + 2};${px0 + 2 * pw + 2};${px0 + 2 * pw + 2};${px0 + 2}" keyTimes="0;.31;.34;.64;.67;.97;1" dur="6s" repeatCount="indefinite"/></rect>`;
    codigos.forEach((c, i) => {
      const cx = px0 + pw * i + pw / 2;
      s += L.t(cx, y + 41.5, c, { f: "mono500", s: 9.5, c: "suave", a: "middle" });
      // encima, la versión activa en blanco, a la vez que la píldora
      s += `<g opacity="${i ? 0 : 1}"><animate attributeName="opacity" values="${fase[i]}" keyTimes="${kt[i]}" dur="6s" repeatCount="indefinite"/>${L.t(cx, y + 41.5, c, { f: "mono500", s: 9.5, c: "#ffffff", a: "middle" })}</g>`;
    });
    return s;
  },

  // una terminal que escribe un comando y responde
  datos(L, x, y, w, h) {
    const T = L.T;
    const cmd = "php artisan migrate";
    // el recorte crece letra a letra; al acabar, espera y vuelve a empezar
    let s = `<clipPath id="qhTeclea"><rect x="${x + 28}" y="${y + 10}" width="0" height="20"><animate attributeName="width" values="${Array.from({ length: cmd.length + 1 }, (_, i) => r(medir(cmd.slice(0, i), "mono400", 10.5) + (i ? 1 : 0))).join(";")}" dur="1.8s" begin="0s;qhFin.end" fill="freeze" calcMode="discrete" id="qhEscribe"/></rect></clipPath>`;
    s += `<rect width="0" height="0"><animate id="qhFin" attributeName="width" values="0;0" dur="3.4s" begin="qhEscribe.end"/></rect>`;
    s += L.t(x + 16, y + 24, "$", { f: "mono500", s: 10.5, c: "acento" });
    s += `<g clip-path="url(#qhTeclea)">${L.t(x + 28, y + 24, cmd, { f: "mono400", s: 10.5, c: "tinta" })}</g>`;
    const salida = [["users", "DONE"], ["orders", "DONE"]];
    salida.forEach(([tabla, ok], i) => {
      const yy = y + 44 + i * 16;
      s += `<g opacity="0"><set attributeName="opacity" to="1" begin="qhEscribe.end+${0.3 + i * 0.35}s" dur="${2.7 - i * 0.35}s"/>`;
      s += L.t(x + 16, yy, `${tabla} `.padEnd(Math.floor((w - 70) / 6.3), "."), { f: "mono400", s: 10, c: "tenue" });
      s += L.t(x + w - 16, yy, ok, { f: "mono500", s: 10, c: "ok", a: "end" });
      s += `</g>`;
    });
    return s;
  },

  // del móvil al escritorio: lo mismo en varias pantallas
  movil(L, x, y, w, h) {
    const T = L.T;
    const cy = y + h / 2;
    const xm = x + w / 2 - 70, xe = x + w / 2 + 40;
    let s = "";
    s += `<rect x="${xm - 11}" y="${cy - 20}" width="22" height="38" rx="5" fill="${T.panel}" stroke="${T.acento}" stroke-width="1.6"/><rect x="${xm - 4}" y="${cy + 12}" width="8" height="2" rx="1" fill="${T.acento}"/>`;
    s += `<rect x="${xe - 30}" y="${cy - 20}" width="60" height="36" rx="5" fill="${T.panel}" stroke="${T.acento}" stroke-width="1.6"/><path d="M${xe - 10} ${cy + 22}h20M${xe} ${cy + 16}v6" stroke="${T.acento}" stroke-width="1.6" stroke-linecap="round"/>`;
    // la misma "pantalla" dentro de los dos
    for (const [cx, ww] of [[xm, 14], [xe, 50]]) {
      s += `<rect x="${cx - ww / 2}" y="${cy - 14}" width="${ww}" height="6" rx="2" fill="${T.acento}" opacity=".7"><animate attributeName="opacity" values=".7;.25;.7" dur="2.4s" repeatCount="indefinite"/></rect>`;
      s += `<rect x="${cx - ww / 2}" y="${cy - 5}" width="${ww * 0.7}" height="3" rx="1.5" fill="${T.tenue}"/>`;
      s += `<rect x="${cx - ww / 2}" y="${cy + 1}" width="${ww * 0.5}" height="3" rx="1.5" fill="${T.tenue}"/>`;
    }
    const p = `M${xm + 16} ${cy - 2} C ${xm + 40} ${cy - 26}, ${xe - 54} ${cy - 26}, ${xe - 36} ${cy - 2}`;
    s += `<path d="${p}" fill="none" stroke="${T.tenue}" stroke-dasharray="3 4"/>`;
    s += `<circle r="3.5" fill="${T.acento}"><animateMotion path="${p}" dur="2.4s" repeatCount="indefinite" keyPoints="0;1;1" keyTimes="0;.7;1" calcMode="linear"/></circle>`;
    return s;
  },
};

async function queHago(tema) {
  const items = P.que_hago;
  const gap = 14, util = ANCHO - 2 * MARGEN;
  // de tres en tres: con tres cosas, todo en una sola fila
  const filas = [];
  for (let i = 0; i < items.length; i += 3) filas.push(items.slice(i, i + 3));
  const anchoDe = (fila) => (util - gap * (fila.length - 1)) / fila.length;
  const ESC = 76;
  const textos = filas.map((fila) => fila.map((it) => partir(it.texto, "sans400", 13, anchoDe(fila) - 36)));
  const altos = textos.map((fila) => ESC + 24 + 64 + Math.max(...fila.map((t) => t.length)) * 19);
  const alto = CABECERA + 28 + altos.reduce((a, b) => a + b + gap, -gap) + 28;
  const L = new Lienzo(ANCHO, alto, tema, {
    titulo: "Especialidades",
    desc: `Especialidades. ${items.map((i) => `${i.titulo}: ${i.texto}`).join(" ")}`,
  });
  const T = L.T;
  let s = tarjeta(L, "Especialidades", `${items.length} cosas que hago a diario`);
  s += `<defs><linearGradient id="qhBarra" x1="0" x2="1"><stop offset="0" stop-color="${T.profundo}"/><stop offset="1" stop-color="${T.acento}"/></linearGradient>`;
  s += `<linearGradient id="qhIco" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${T.acento}"/><stop offset="1" stop-color="${T.profundo}"/></linearGradient></defs>`;
  let yy = CABECERA + 28, n = 0;
  filas.forEach((fila, f) => {
    const w = anchoDe(fila), h = altos[f];
    fila.forEach((it, c) => {
      const x = MARGEN + c * (w + gap);
      s += `<g class="entra" style="animation-delay:${(n * 0.08).toFixed(2)}s">`;
      s += `<rect x="${r(x)}" y="${yy}" width="${r(w)}" height="${h}" rx="16" fill="${T.panel}" stroke="${T.linea}"/>`;
      // escena
      const ex = x + 10, ey = yy + 10, ew = w - 20;
      s += `<clipPath id="qhE${n}"><rect x="${r(ex)}" y="${ey}" width="${r(ew)}" height="${ESC}" rx="11"/></clipPath>`;
      s += `<rect x="${r(ex)}" y="${ey}" width="${r(ew)}" height="${ESC}" rx="11" fill="${T.fondo}" stroke="${T.linea}"/>`;
      s += `<g clip-path="url(#qhE${n})"><rect x="${r(ex)}" y="${ey}" width="${r(ew)}" height="${ESC}" fill="url(#puntosQH)"/>${ESCENAS[it.icono]?.(L, ex, ey, ew, ESC) ?? ""}</g>`;
      // título con icono
      const yt = yy + ESC + 24;
      s += `<rect x="${r(x + 18)}" y="${yt}" width="30" height="30" rx="9" fill="url(#qhIco)"/>`;
      s += glifo(it.icono, x + 25, yt + 7, 16, "#ffffff", 2.2);
      s += L.t(x + 60, yt + 20.5, it.titulo, { f: "sans700", s: 15.5 });
      // el número solo si no se pisa con el título
      if (60 + medir(it.titulo, "sans700", 15.5) + 40 < w)
        s += L.t(x + w - 18, yt + 20, String(n + 1).padStart(2, "0"), { f: "mono400", s: 11, c: "tenue", a: "end" });
      textos[f][c].forEach((l, j) => (s += L.t(x + 18, yt + 52 + j * 19, l, { f: "sans400", s: 13, c: "suave" })));
      s += `</g>`;
      n++;
    });
    yy += h + gap;
  });
  s = `<defs><pattern id="puntosQH" width="14" height="14" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r=".9" fill="${T.tenue}" opacity=".35"/></pattern></defs>` + s;
  return L.svg(s);
}

// --- stack: lista + órbitas ------------------------------------------------------------

async function stack(tema) {
  const grupos = P.stack;
  const todos = grupos.flatMap((g) => g.items);
  const trazos = Object.fromEntries(await Promise.all(todos.map(async (it) => [it.icono, await icono(it.icono)])));

  const alto = CABECERA + 410;
  const L = new Lienzo(ANCHO, alto, tema, {
    titulo: "Con qué trabajo",
    desc: `Con qué trabajo. ${grupos.map((g) => `${g.grupo}: ${g.items.map((i) => i.nombre).join(", ")}`).join(". ")}. Ilustrado como órbitas que giran alrededor de mis iniciales.`,
  });
  const T = L.T;
  const color = (it) => (it.color === "tinta" ? T.tinta : it.color);
  let s = tarjeta(L, "Stack", `${todos.length} tecnologías · ${grupos.length} grupos`);

  // izquierda: grupos con chips
  let y = CABECERA + 36;
  const xmax = 440;
  for (const g of grupos) {
    s += L.t(MARGEN, y, g.grupo.toUpperCase(), { f: "mono500", s: 11, c: "suave", ls: 1.6 });
    y += 14;
    let x = MARGEN;
    for (const it of g.items) {
      const w = 12 + 18 + 8 + medir(it.nombre, "sans600", 13) + 12;
      if (x + w > xmax) { x = MARGEN; y += 38; }
      s += `<rect x="${r(x)}" y="${y}" width="${r(w)}" height="30" rx="9" fill="${T.panel}" stroke="${T.linea}"/>`;
      s += pintarIcono(trazos[it.icono], x + 21, y + 15, 16, color(it));
      s += L.t(x + 38, y + 19.5, it.nombre, { f: "sans600", s: 13 });
      x += w + 8;
    }
    y += 30 + 28;
  }

  // derecha: órbitas
  const cx = 632, cy = CABECERA + 205;
  const radios = { 1: 70, 2: 120, 3: 168 };
  const duraciones = { 1: 36, 2: 54, 3: 72 };
  s += `<defs><radialGradient id="nucleo" cx=".35" cy=".3" r=".9"><stop offset="0" stop-color="${T.acento}"/><stop offset="1" stop-color="${T.profundo}"/></radialGradient>`;
  s += `<radialGradient id="aura" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="${T.profundo}" stop-opacity="${T.brillo * 0.8}"/><stop offset="1" stop-color="${T.profundo}" stop-opacity="0"/></radialGradient>`;
  s += `<clipPath id="corta"><rect x="1" y="${CABECERA + 1}" width="${ANCHO - 2}" height="${alto - CABECERA - 2}" rx="17"/></clipPath></defs>`;
  s += `<g clip-path="url(#corta)">`;
  s += `<circle cx="${cx}" cy="${cy}" r="200" fill="url(#aura)"/>`;
  for (const [n, rad] of Object.entries(radios)) {
    s += `<circle cx="${cx}" cy="${cy}" r="${rad}" fill="none" stroke="${T.linea}" stroke-width="1.2" ${n === "2" ? `stroke-dasharray="2 6" stroke-linecap="round"` : ""}/>`;
  }
  // un cometa que recorre la órbita exterior
  s += `<g><animateTransform attributeName="transform" type="rotate" from="0 ${cx} ${cy}" to="360 ${cx} ${cy}" dur="9s" repeatCount="indefinite"/>`;
  s += `<path d="M${cx} ${cy - radios[3]} A${radios[3]} ${radios[3]} 0 0 0 ${r(cx - radios[3] * Math.sin(0.6))} ${r(cy - radios[3] * Math.cos(0.6))}" fill="none" stroke="url(#estela)" stroke-width="2" stroke-linecap="round"/>`;
  s += `<circle cx="${cx}" cy="${cy - radios[3]}" r="3" fill="${T.acento2}"/></g>`;
  s += `<defs><linearGradient id="estela" x1="1" x2="0"><stop offset="0" stop-color="${T.acento2}"/><stop offset="1" stop-color="${T.acento2}" stop-opacity="0"/></linearGradient></defs>`;

  for (const n of [1, 2, 3]) {
    const its = todos.filter((it) => it.orbita === n);
    const rad = radios[n], dur = duraciones[n];
    const sentido = n === 2 ? -1 : 1;
    const desfase = n * 25;
    s += `<g><animateTransform attributeName="transform" type="rotate" from="${desfase} ${cx} ${cy}" to="${desfase + 360 * sentido} ${cx} ${cy}" dur="${dur}s" repeatCount="indefinite"/>`;
    its.forEach((it, i) => {
      const ang = (i / its.length) * Math.PI * 2;
      const x = cx + rad * Math.cos(ang), yy = cy + rad * Math.sin(ang);
      // el icono gira al revés que su órbita para quedarse siempre derecho
      s += `<g transform="translate(${r(x)} ${r(yy)})"><g><animateTransform attributeName="transform" type="rotate" from="${-desfase}" to="${-desfase - 360 * sentido}" dur="${dur}s" repeatCount="indefinite"/>`;
      s += `<circle r="19" fill="${T.panel}" stroke="${T.linea}" stroke-width="1.2"/>`;
      s += pintarIcono(trazos[it.icono], 0, 0, 19, color(it));
      s += `</g></g>`;
    });
    s += `</g>`;
  }
  // núcleo: mi foto, con un aro degradado que gira
  const rf = 36;
  const foto = fs.readFileSync(path.join(ASSETS, "capturas", P.foto)).toString("base64");
  s += `<defs><clipPath id="foto"><circle cx="${cx}" cy="${cy}" r="${rf}"/></clipPath>`;
  s += `<linearGradient id="aro" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${T.acento}"/><stop offset=".5" stop-color="${T.profundo}" stop-opacity=".2"/><stop offset="1" stop-color="${T.acento2}"/></linearGradient></defs>`;
  s += `<circle cx="${cx}" cy="${cy}" r="${rf}" fill="${T.acento}" opacity=".35" class="latido"/>`;
  s += `<circle cx="${cx}" cy="${cy}" r="${rf + 5}" fill="${T.fondo}"/>`;
  s += `<circle cx="${cx}" cy="${cy}" r="${rf + 4}" fill="none" stroke="url(#aro)" stroke-width="2.5"><animateTransform attributeName="transform" type="rotate" from="0 ${cx} ${cy}" to="360 ${cx} ${cy}" dur="6s" repeatCount="indefinite"/></circle>`;
  s += `<image x="${cx - rf}" y="${cy - rf}" width="${rf * 2}" height="${rf * 2}" clip-path="url(#foto)" preserveAspectRatio="xMidYMid slice" href="data:image/jpeg;base64,${foto}"/>`;
  s += `</g>`;
  return L.svg(s);
}

// --- proyectos ----------------------------------------------------------------------------
//
// Dos mitades de una misma tarjeta: cada una es una imagen aparte (para que
// cada proyecto tenga su enlace) pero juntas forman un solo bloque, con la
// cabecera <Proyectos /> repartida entre las dos.

async function proyecto(pr, tema) {
  const lado = P.proyectos.indexOf(pr) === 0 ? "izq" : "dcha";
  const ancho = ANCHO / 2, alto = CABECERA + 392;
  const L = new Lienzo(ancho, alto, tema, {
    titulo: pr.nombre,
    desc: `Proyecto ${pr.nombre}: ${pr.texto} Hecho con ${pr.etiquetas.join(", ")}. Web: ${pr.web}`,
  });
  const T = L.T;
  const img = fs.readFileSync(path.join(ASSETS, "capturas", pr.captura)).toString("base64");
  const rr = 18;
  // contorno: redondeado solo por fuera
  const contorno = lado === "izq"
    ? `M${ancho + 1} .5H${rr + 0.5}A${rr} ${rr} 0 0 0 .5 ${rr + 0.5}V${alto - rr - 0.5}A${rr} ${rr} 0 0 0 ${rr + 0.5} ${alto - 0.5}H${ancho + 1}`
    : `M-1 .5H${ancho - rr - 0.5}A${rr} ${rr} 0 0 1 ${ancho - 0.5} ${rr + 0.5}V${alto - rr - 0.5}A${rr} ${rr} 0 0 1 ${ancho - rr - 0.5} ${alto - 0.5}H-1`;
  let s = `<path d="${contorno}" fill="${T.fondo}" stroke="${T.linea}"/>`;
  // cabecera repartida
  if (lado === "izq") {
    s += `<defs><linearGradient id="gP" x1="0" x2="1"><stop offset="0" stop-color="${T.acento}"/><stop offset=".5" stop-color="${T.acento2}"/><stop offset="1" stop-color="${T.acento}" stop-opacity="0"/></linearGradient></defs>`;
    s += `<rect x="${MARGEN}" y="0" width="160" height="2" rx="1" fill="url(#gP)"/>`;
    s += L.tramos(MARGEN, 40, [["<", "tenue"], ["Proyectos", "acento"], [" />", "tenue"]], { f: "mono500", s: 13 });
    s += `<line x1="${MARGEN}" y1="${CABECERA}" x2="${ancho}" y2="${CABECERA}" stroke="${T.linea}"/>`;
    // separador vertical entre los dos proyectos
    s += `<line x1="${ancho - 0.5}" y1="${CABECERA + 20}" x2="${ancho - 0.5}" y2="${alto - 20}" stroke="${T.linea}" stroke-dasharray="2 5" stroke-linecap="round"/>`;
  } else {
    s += L.t(ancho - MARGEN, 40, "pulsa un proyecto para abrir la web", { f: "mono400", s: 12, c: "suave", a: "end" });
    s += `<line x1="0" y1="${CABECERA}" x2="${ancho - MARGEN}" y2="${CABECERA}" stroke="${T.linea}"/>`;
  }

  const x0 = lado === "izq" ? MARGEN : 22, x1 = lado === "izq" ? ancho - 22 : ancho - MARGEN;
  const wv = x1 - x0, hv = 178, yv = CABECERA + 24;
  s += `<defs><clipPath id="v${pr.id}"><rect x="${x0}" y="${yv + 34}" width="${wv}" height="${hv}"/></clipPath>`;
  s += `<linearGradient id="sombra${pr.id}" x1="0" y1="0" x2="0" y2="1"><stop offset=".55" stop-color="${T.panel}" stop-opacity="0"/><stop offset="1" stop-color="${T.panel}" stop-opacity=".95"/></linearGradient></defs>`;
  // ventana con la captura
  s += `<rect x="${x0 - 0.5}" y="${yv - 0.5}" width="${wv + 1}" height="${hv + 35}" rx="12" fill="${T.panel2}" stroke="${T.linea}"/>`;
  ["#6d28d9", "#8b5cf6", "#c4b5fd"].forEach((c, i) => (s += `<circle cx="${x0 + 16 + i * 13}" cy="${yv + 17}" r="4" fill="${c}" opacity=".85"/>`));
  const dominio = pr.web.replace(/^https?:\/\//, "");
  s += `<rect x="${x0 + 60}" y="${yv + 8}" width="${wv - 76}" height="18" rx="9" fill="${T.fondo}" stroke="${T.linea}"/>`;
  s += L.t(x0 + 72, yv + 20.5, dominio, { f: "mono400", s: 10, c: "suave" });
  s += `<g clip-path="url(#v${pr.id})"><image x="${x0}" y="${yv + 34}" width="${wv}" height="${Math.round(wv * 0.625)}" preserveAspectRatio="xMidYMin slice" href="data:image/jpeg;base64,${img}"/>`;
  // un solo brillo que cruza los dos proyectos seguidos: mismas cuentas en
  // coordenadas de la tarjeta entera, desplazadas en la mitad derecha
  const dx = lado === "izq" ? 0 : ancho;
  const g0 = -160 - dx, g1 = ANCHO + 160 - dx;
  s += `<rect x="${g0}" y="${yv}" width="70" height="${hv + 40}" fill="#ffffff" opacity=".10" transform="skewX(-20)"><animate attributeName="x" values="${g0};${g0};${g1}" keyTimes="0;.6;1" dur="6s" repeatCount="indefinite"/></rect>`;
  s += `<rect x="${x0}" y="${yv + 34}" width="${wv}" height="${hv}" fill="url(#sombra${pr.id})"/></g>`;
  s += `<path d="M${x0 - 0.5} ${yv + 34.5}h${wv + 1}" stroke="${T.linea}"/>`;

  let y = yv + hv + 35 + 36;
  s += L.t(x0, y, pr.nombre, { f: "sans800", s: 20 });
  s += L.t(x1, y - 1, `/${pr.repo}`, { f: "mono400", s: 11, c: "suave", a: "end" });
  y += 24;
  for (const l of partir(pr.texto, "sans400", 13.5, wv)) {
    s += L.t(x0, y, l, { f: "sans400", s: 13.5, c: "suave" });
    y += 20;
  }
  y = alto - 46;
  let x = x0;
  for (const e of pr.etiquetas) {
    const w = medir(e, "mono400", 11) + 18;
    s += `<rect x="${r(x)}" y="${y}" width="${r(w)}" height="22" rx="6" fill="${T.panel}" stroke="${T.linea}"/>`;
    s += L.t(x + w / 2, y + 15, e, { f: "mono400", s: 11, c: "suave", a: "middle" });
    x += w + 6;
  }
  const bw = 92;
  const tintaBoton = tema === "dark" ? "#0e0a18" : "#ffffff";
  s += `<rect x="${x1 - bw}" y="${y - 2}" width="${bw}" height="26" rx="13" fill="${T.acento}"/>`;
  s += L.t(x1 - bw / 2 - 7, y + 15, "ver web", { f: "sans700", s: 12, c: tintaBoton, a: "middle" });
  s += glifo("flecha", x1 - 26, y + 5, 12, tintaBoton, 2.6);
  return L.svg(s);
}

// --- salida ----------------------------------------------------------------------------------

for (const tipo of contactosActivos()) await enAmbosTemas(`contacto-${tipo}`, (t) => contacto(tipo, t));
await enAmbosTemas("trayectoria", trayectoria);
await enAmbosTemas("que-hago", queHago);
await enAmbosTemas("stack", stack);
for (const pr of P.proyectos) await enAmbosTemas(`proyecto-${pr.id}`, (t) => proyecto(pr, t));
