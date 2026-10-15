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
  web: { glifo: "web", etiqueta: "portfolio", valor: (u) => u.replace(/^https?:\/\//, "").replace(/\/$/, "") },
  linkedin: { glifo: "linkedin", etiqueta: "linkedin", valor: (u) => u.replace(/^https?:\/\/(www\.)?linkedin\.com\//, "").replace(/\/$/, "") },
  email: { glifo: "correo", etiqueta: "correo", valor: (u) => u },
};

export const contactosActivos = () => Object.keys(CONTACTOS).filter((k) => P.contacto[k]);

async function contacto(tipo, tema) {
  const n = contactosActivos().length;
  const ancho = Math.round(ANCHO / n);
  const alto = 96;
  const def = CONTACTOS[tipo];
  const valor = def.valor(P.contacto[tipo]);
  const L = new Lienzo(ancho, alto, tema, { titulo: def.etiqueta, desc: `${def.etiqueta}: ${valor}` });
  const T = L.T;
  // el texto grande se encoge si no cabe
  const disponible = ancho - 32 - 64 - 24 - 60;
  let px = n === 1 ? 26 : 20;
  while (px > 13 && medir(valor, "sans600", px) > disponible) px -= 1;
  let s = "";
  s += `<defs><linearGradient id="borde" x1="0" x2="1"><stop offset="0" stop-color="${T.acento}" stop-opacity=".9"/><stop offset=".5" stop-color="${T.acento2}" stop-opacity=".5"/><stop offset="1" stop-color="${T.linea}"/></linearGradient>`;
  s += `<linearGradient id="caja" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${T.acento}"/><stop offset="1" stop-color="${T.acento2}"/></linearGradient></defs>`;
  s += `<rect x="1" y="1" width="${ancho - 2}" height="${alto - 2}" rx="18" fill="${T.panel}" stroke="url(#borde)" stroke-width="1.5"/>`;
  s += `<rect x="28" y="24" width="48" height="48" rx="14" fill="url(#caja)"/>`;
  s += glifo(def.glifo, 40, 36, 24, "#ffffff", 2);
  s += L.t(96, 42, def.etiqueta, { f: "mono400", s: 12, c: "suave", ls: 1.2 });
  s += L.t(96, 42 + px + 4, valor, { f: "sans600", s: px, c: "tinta" });
  // flecha que "empuja" hacia fuera de vez en cuando
  const fx = ancho - 56;
  s += `<circle cx="${fx + 12}" cy="48" r="20" fill="${T.panel2}" stroke="${T.linea}"/>`;
  s += `<g>${glifo("flecha", fx, 36, 24, T.acento, 2)}<animateTransform attributeName="transform" type="translate" values="0 0;0 0;3 -3;0 0" keyTimes="0;.7;.85;1" dur="3s" repeatCount="indefinite"/></g>`;
  return L.svg(s);
}

// --- sobre mí ----------------------------------------------------------------------

async function sobreMi(tema) {
  const S = P.sobre_mi;
  const colTexto = 470;
  const px = 15, lh = 25;
  const parrafos = S.texto.map((t) => partir(t, "sans400", px, colTexto));
  const altoTexto = parrafos.reduce((a, p) => a + p.length * lh + 14, -14);

  const xd = 548, anchoD = ANCHO - MARGEN - xd;
  // valores en píldoras, repartidas en filas
  const pild = [];
  let px0 = xd, py0 = 0;
  for (const v of S.valores) {
    const w = medir(v, "sans500", 12.5) + 24;
    if (px0 + w > xd + anchoD) { px0 = xd; py0 += 34; }
    pild.push([px0, py0, w, v]);
    px0 += w + 8;
  }
  const altoDcha = 22 + S.formacion.length * 62 + 34 + py0 + 28;
  const alto = CABECERA + 32 + Math.max(altoTexto, altoDcha) + 32;

  const L = new Lienzo(ANCHO, alto, tema, {
    titulo: "Sobre mí",
    desc: `Sobre mí. ${S.texto.join(" ")} Formación: ${S.formacion.map((f) => `${f.titulo} (${f.estado})`).join(", ")}. Valores: ${S.valores.join(", ")}.`,
  });
  const T = L.T;
  let s = tarjeta(L, "SobreMi", "components/SobreMi.vue");

  let y = CABECERA + 32 + 12;
  parrafos.forEach((lineas, i) => {
    for (const l of lineas) {
      s += L.t(MARGEN, y, l, { f: "sans400", s: px, c: i === 0 ? "tinta" : "suave" });
      y += lh;
    }
    y += 14;
  });

  // columna derecha
  s += `<line x1="${xd - 28}" y1="${CABECERA + 32}" x2="${xd - 28}" y2="${alto - 32}" stroke="${T.linea}"/>`;
  let yd = CABECERA + 32 + 10;
  s += L.t(xd, yd, "FORMACIÓN", { f: "mono500", s: 11, c: "suave", ls: 1.6 });
  yd += 26;
  const yIni = yd;
  S.formacion.forEach((f, i) => {
    const yy = yd + i * 62;
    if (f.actual) {
      s += `<circle cx="${xd + 6}" cy="${yy}" r="6" fill="${T.acento}" class="latido"/>`;
      s += `<circle cx="${xd + 6}" cy="${yy}" r="6" fill="${T.acento}"/>`;
    } else {
      s += `<circle cx="${xd + 6}" cy="${yy}" r="7" fill="${T.panel2}" stroke="${T.acento}" stroke-width="1.5"/>`;
      s += glifo("check", xd + 1.5, yy - 4.5, 9, T.acento, 3);
    }
    const lineas = partir(f.titulo, "sans600", 14, anchoD - 28);
    lineas.forEach((l, j) => (s += L.t(xd + 24, yy + 5 + j * 19, l, { f: "sans600", s: 14 })));
    s += L.t(xd + 24, yy + 5 + lineas.length * 19, f.estado, { f: "mono400", s: 11.5, c: f.actual ? "acento" : "suave" });
  });
  s += `<line x1="${xd + 6}" y1="${yIni + 8}" x2="${xd + 6}" y2="${yIni + 62 - 9}" stroke="${T.linea}" stroke-dasharray="3 3"/>`;
  yd += S.formacion.length * 62 + 4;
  s += L.t(xd, yd, "VALORES", { f: "mono500", s: 11, c: "suave", ls: 1.6 });
  yd += 14;
  for (const [x, dy, w, v] of pild) {
    s += `<rect x="${r(x)}" y="${yd + dy}" width="${r(w)}" height="26" rx="13" fill="${T.panel2}" stroke="${T.linea}"/>`;
    s += L.t(x + w / 2, yd + dy + 17.5, v, { f: "sans500", s: 12.5, c: "tinta", a: "middle" });
  }
  return L.svg(s);
}

// --- qué hago ------------------------------------------------------------------------

async function queHago(tema) {
  const items = P.que_hago;
  const cols = 3, gap = 14;
  const w = (ANCHO - 2 * MARGEN - gap * (cols - 1)) / cols;
  const textos = items.map((it) => partir(it.texto, "sans400", 13, w - 36));
  const filas = Math.ceil(items.length / cols);
  const altos = [];
  for (let f = 0; f < filas; f++) {
    const fila = textos.slice(f * cols, f * cols + cols);
    altos.push(84 + Math.max(...fila.map((t) => t.length)) * 19 + 16);
  }
  const alto = CABECERA + 28 + altos.reduce((a, b) => a + b + gap, -gap) + 28;
  const L = new Lienzo(ANCHO, alto, tema, {
    titulo: "Qué hago",
    desc: `Qué hago. ${items.map((i) => `${i.titulo}: ${i.texto}`).join(" ")}`,
  });
  const T = L.T;
  let s = tarjeta(L, "QueHago", `${items.length} cosas que hago a diario`);
  s = `<defs><linearGradient id="ico" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${T.acento}"/><stop offset="1" stop-color="${T.acento2}"/></linearGradient></defs>` + s;
  let y = CABECERA + 28;
  items.forEach((it, i) => {
    const c = i % cols, f = Math.floor(i / cols);
    const x = MARGEN + c * (w + gap);
    const yy = y + altos.slice(0, f).reduce((a, b) => a + b + gap, 0);
    const h = altos[f];
    s += `<g class="entra" style="animation-delay:${(i * 0.08).toFixed(2)}s">`;
    s += `<rect x="${r(x)}" y="${yy}" width="${r(w)}" height="${h}" rx="14" fill="${T.panel}" stroke="${T.linea}"/>`;
    s += `<rect x="${r(x + 18)}" y="${yy + 18}" width="36" height="36" rx="10" fill="url(#ico)" opacity=".14"/>`;
    s += glifo(it.icono, x + 27, yy + 27, 18, T.acento, 2);
    s += L.t(x + w - 18, yy + 32, String(i + 1).padStart(2, "0"), { f: "mono400", s: 11, c: "tenue", a: "end" });
    s += L.t(x + 18, yy + 76, it.titulo, { f: "sans700", s: 15 });
    textos[i].forEach((l, j) => (s += L.t(x + 18, yy + 100 + j * 19, l, { f: "sans400", s: 13, c: "suave" })));
    s += `</g>`;
  });
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
  // núcleo con mis iniciales
  s += `<circle cx="${cx}" cy="${cy}" r="30" fill="${T.acento}" opacity=".35" class="latido"/>`;
  s += `<circle cx="${cx}" cy="${cy}" r="30" fill="url(#nucleo)"/>`;
  const ini = P.nombre.split(" ").map((p) => p[0]).join("");
  s += L.t(cx, cy + 7, ini, { f: "sans800", s: 20, c: "#ffffff", a: "middle", ls: -0.5 });
  s += `</g>`;
  return L.svg(s);
}

// --- proyectos ----------------------------------------------------------------------------

async function cabeceraProyectos(tema) {
  const L = new Lienzo(ANCHO, CABECERA, tema, { titulo: "Proyectos", desc: "Proyectos destacados" });
  const T = L.T;
  // una barra de título: las tarjetas de cada proyecto van debajo
  let s = `<rect x=".5" y=".5" width="${ANCHO - 1}" height="${CABECERA - 1}" rx="18" fill="${T.fondo}" stroke="${T.linea}"/>`;
  s += `<defs><linearGradient id="gP" x1="0" x2="1"><stop offset="0" stop-color="${T.acento}"/><stop offset=".5" stop-color="${T.acento2}"/><stop offset="1" stop-color="${T.acento}" stop-opacity="0"/></linearGradient></defs>`;
  s += `<rect x="${MARGEN}" y="0" width="160" height="2" rx="1" fill="url(#gP)"/>`;
  s += L.tramos(MARGEN, 37, [["<", "tenue"], ["Proyectos", "acento"], [" />", "tenue"]], { f: "mono500", s: 13 });
  s += L.t(ANCHO - MARGEN, 37, "pulsa una tarjeta para abrir la web", { f: "mono400", s: 12, c: "suave", a: "end" });
  return L.svg(s);
}

async function proyecto(pr, tema) {
  const ancho = 430, alto = 400;
  const L = new Lienzo(ancho, alto, tema, {
    titulo: pr.nombre,
    desc: `Proyecto ${pr.nombre}: ${pr.texto} Hecho con ${pr.etiquetas.join(", ")}. Web: ${pr.web}`,
  });
  const T = L.T;
  const img = fs.readFileSync(path.join(ASSETS, "capturas", pr.captura)).toString("base64");
  const x0 = 24, wv = ancho - 48, hv = Math.round(wv * 0.5625 * 0.86);
  let s = `<defs><clipPath id="v${pr.id}"><rect x="${x0}" y="58" width="${wv}" height="${hv}" rx="0"/></clipPath>`;
  s += `<linearGradient id="sombra${pr.id}" x1="0" y1="0" x2="0" y2="1"><stop offset=".6" stop-color="${T.panel}" stop-opacity="0"/><stop offset="1" stop-color="${T.panel}" stop-opacity=".9"/></linearGradient></defs>`;
  s += `<rect x=".5" y=".5" width="${ancho - 1}" height="${alto - 1}" rx="18" fill="${T.fondo}" stroke="${T.linea}"/>`;
  // ventana con la captura
  s += `<rect x="${x0 - 0.5}" y="23.5" width="${wv + 1}" height="${hv + 35}" rx="12" fill="${T.panel2}" stroke="${T.linea}"/>`;
  ["#ff6b8b", "#fbbf24", "#a78bfa"].forEach((c, i) => (s += `<circle cx="${x0 + 16 + i * 13}" cy="41" r="4" fill="${c}" opacity=".85"/>`));
  const dominio = pr.web.replace(/^https?:\/\//, "");
  s += `<rect x="${x0 + 60}" y="32" width="${wv - 76}" height="18" rx="9" fill="${T.fondo}" stroke="${T.linea}"/>`;
  s += L.t(x0 + 72, 44.5, dominio, { f: "mono400", s: 10, c: "suave" });
  s += `<g clip-path="url(#v${pr.id})"><image x="${x0}" y="58" width="${wv}" height="${Math.round(wv * 0.625)}" preserveAspectRatio="xMidYMin slice" href="data:image/jpeg;base64,${img}"/>`;
  // un brillo diagonal que cruza la captura de vez en cuando
  s += `<rect x="-160" y="40" width="70" height="${hv + 40}" fill="#ffffff" opacity=".10" transform="skewX(-20)"><animate attributeName="x" values="-160;-160;${ancho + 120}" keyTimes="0;.7;1" dur="6s" repeatCount="indefinite"/></rect>`;
  s += `<rect x="${x0}" y="58" width="${wv}" height="${hv}" fill="url(#sombra${pr.id})"/></g>`;
  s += `<path d="M${x0 - 0.5} 58.5h${wv + 1}" stroke="${T.linea}"/>`;

  let y = 58 + hv + 44;
  s += L.t(x0, y, pr.nombre, { f: "sans800", s: 20 });
  s += L.t(ancho - x0, y - 1, `github.com/${P.usuario}/${pr.repo}`.length > 40 ? pr.repo : `/${pr.repo}`, { f: "mono400", s: 11, c: "suave", a: "end" });
  y += 24;
  for (const l of partir(pr.texto, "sans400", 13.5, ancho - 2 * x0)) {
    s += L.t(x0, y, l, { f: "sans400", s: 13.5, c: "suave" });
    y += 20;
  }
  y = alto - 38;
  let x = x0;
  for (const e of pr.etiquetas) {
    const w = medir(e, "mono400", 11) + 18;
    s += `<rect x="${r(x)}" y="${y}" width="${r(w)}" height="22" rx="6" fill="${T.panel}" stroke="${T.linea}"/>`;
    s += L.t(x + w / 2, y + 15, e, { f: "mono400", s: 11, c: "suave", a: "middle" });
    x += w + 6;
  }
  const bw = 92;
  s += `<rect x="${ancho - x0 - bw}" y="${y - 2}" width="${bw}" height="26" rx="13" fill="${T.acento}"/>`;
  s += L.t(ancho - x0 - bw / 2 - 7, y + 15, "ver web", { f: "sans700", s: 12, c: tema === "dark" ? "#0e0a18" : "#ffffff", a: "middle" });
  s += glifo("flecha", ancho - x0 - 26, y + 5, 12, tema === "dark" ? "#0e0a18" : "#ffffff", 2.6);
  return L.svg(s);
}

// --- salida ----------------------------------------------------------------------------------

for (const tipo of contactosActivos()) await enAmbosTemas(`contacto-${tipo}`, (t) => contacto(tipo, t));
await enAmbosTemas("sobre-mi", sobreMi);
await enAmbosTemas("que-hago", queHago);
await enAmbosTemas("stack", stack);
await enAmbosTemas("proyectos", cabeceraProyectos);
for (const pr of P.proyectos) await enAmbosTemas(`proyecto-${pr.id}`, (t) => proyecto(pr, t));
