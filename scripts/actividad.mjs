// Actividad en GitHub durante el último año: cifras, una barra por semana que
// crece al cargar y el reparto de lenguajes de los repositorios públicos.
//
// Las contribuciones en repos privados de la empresa no salen en el calendario
// de GitHub; se suman aparte (ver privadas.mjs) y se pintan encima de cada
// barra en otro tono.
//
// Necesita un token: GITHUB_TOKEN en el workflow o, en local, el de `gh`.

import { execSync } from "node:child_process";
import { contribucionesPrivadas } from "./privadas.mjs";
import { ANCHO, CABECERA, MARGEN, Lienzo, enAmbosTemas, leerPerfil, medir, r, tarjeta } from "./comun.mjs";

const P = leerPerfil();

function token() {
  if (process.env.GITHUB_TOKEN) return process.env.GITHUB_TOKEN;
  try {
    return execSync("gh auth token", { encoding: "utf8" }).trim();
  } catch {
    throw new Error("Hace falta GITHUB_TOKEN (o haber iniciado sesión con gh).");
  }
}

async function graphql(query) {
  const res = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: { Authorization: `bearer ${token()}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables: { u: P.usuario } }),
  });
  const json = await res.json();
  if (json.errors) throw new Error(`GraphQL: ${JSON.stringify(json.errors)}`);
  return json.data.user;
}

// --- datos -------------------------------------------------------------------

const u = await graphql(`query($u: String!) { user(login: $u) {
  contributionsCollection { contributionCalendar { weeks { contributionDays { date contributionCount } } } }
  repositories(first: 100, ownerAffiliations: OWNER, isFork: false, privacy: PUBLIC) {
    nodes { name languages(first: 12) { edges { size node { name color } } } } } } }`);

const privadas = await contribucionesPrivadas(P.usuario);
const semanas = u.contributionsCollection.contributionCalendar.weeks.map((s) =>
  s.contributionDays.map((d) => {
    const priv = privadas.dias[d.date] ?? 0;
    return { fecha: new Date(d.date + "T12:00:00Z"), pub: d.contributionCount, priv, n: d.contributionCount + priv };
  }),
);
const dias = semanas.flat();

const total = dias.reduce((a, d) => a + d.n, 0);
const totalPriv = dias.reduce((a, d) => a + d.priv, 0);
const activos = dias.filter((d) => d.n).length;

let larga = 0, seguidos = 0;
for (const d of dias) {
  seguidos = d.n ? seguidos + 1 : 0;
  larga = Math.max(larga, seguidos);
}
// hoy sin nada todavía no rompe la racha: el día no ha terminado
const hasta = dias.at(-1)?.n === 0 ? dias.slice(0, -1) : dias;
let actual = 0;
for (let i = hasta.length - 1; i >= 0 && hasta[i].n; i--) actual++;

const mejor = dias.reduce((a, d) => (d.n > a.n ? d : a), dias[0]);
const NOMBRES_DIA = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
const porDia = Array(7).fill(0);
for (const d of dias) porDia[d.fecha.getUTCDay()] += d.n;
const diaTop = NOMBRES_DIA[porDia.indexOf(Math.max(...porDia))];

const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const fechaCorta = (f) => `${f.getUTCDate()} ${MESES[f.getUTCMonth()]}`;
const rango = `${fechaCorta(dias[0].fecha)} ${dias[0].fecha.getUTCFullYear()} – ${fechaCorta(dias.at(-1).fecha)} ${dias.at(-1).fecha.getUTCFullYear()}`;

const repos = u.repositories.nodes.filter((x) => x.name.toLowerCase() !== P.usuario.toLowerCase());
const lenguajes = new Map();
const coloresL = new Map();
for (const repo of repos)
  for (const e of repo.languages.edges) {
    lenguajes.set(e.node.name, (lenguajes.get(e.node.name) ?? 0) + e.size);
    coloresL.set(e.node.name, e.node.color);
  }
const sumaL = [...lenguajes.values()].reduce((a, b) => a + b, 0) || 1;
let reparto = [...lenguajes.entries()].sort((a, b) => b[1] - a[1]).map(([n, v]) => [n, v / sumaL]);
if (reparto.length > 6) {
  const resto = reparto.slice(5).reduce((a, [, v]) => a + v, 0);
  reparto = [...reparto.slice(0, 5), ["Otros", resto]];
}

const fmt = (n) => n.toLocaleString("es-ES");
const pct = (v) => `${(v * 100).toFixed(1).replace(".", ",")} %`;

// --- dibujo ------------------------------------------------------------------------

async function dibujar(tema) {
  const alto = CABECERA + 452;
  const L = new Lienzo(ANCHO, alto, tema, {
    titulo: "Actividad en GitHub",
    desc:
      `Actividad en GitHub del ${rango}: ${fmt(total)} contribuciones (${fmt(totalPriv)} en repositorios privados de empresa) en ${activos} días, racha más larga de ${larga} días, ` +
      `mejor día el ${fechaCorta(mejor.fecha)} con ${mejor.n}, y el ${diaTop} como día más activo. ` +
      `Lenguajes de ${repos.length} repositorios públicos: ${reparto.map(([n, v]) => `${n} ${pct(v)}`).join(", ")}.`,
  });
  const T = L.T;
  let s = tarjeta(L, "Actividad", rango);

  // cifras
  const cifras = [
    [fmt(total), "contribuciones", totalPriv ? `${fmt(totalPriv)} en repos privados` : `mejor día: ${fechaCorta(mejor.fecha)} · ${mejor.n}`],
    [String(activos), "días con actividad", `de ${dias.length} en el último año`],
    [`${larga}`, "días de racha máxima", actual ? `racha actual: ${actual} ${actual === 1 ? "día" : "días"}` : "racha actual: a por ella"],
    [diaTop, "día más activo", "el que más commits suma"],
  ];
  const gap = 12, wT = (ANCHO - 2 * MARGEN - gap * 3) / 4;
  cifras.forEach(([valor, etiqueta, sub], i) => {
    const x = MARGEN + i * (wT + gap), y = CABECERA + 24;
    s += `<g class="entra" style="animation-delay:${(i * 0.1).toFixed(1)}s">`;
    s += `<rect x="${r(x)}" y="${y}" width="${r(wT)}" height="96" rx="14" fill="${T.panel}" stroke="${T.linea}"/>`;
    s += L.t(x + 18, y + 44, valor, { f: "sans800", s: 30, c: i === 0 ? "acento" : "tinta", ls: -0.6 });
    s += L.t(x + 18, y + 66, etiqueta, { f: "sans600", s: 13, c: "tinta" });
    s += L.t(x + 18, y + 84, sub, { f: "mono400", s: 10.5, c: "suave" });
    s += `</g>`;
  });

  // una barra por semana
  const y0 = CABECERA + 152;
  s += L.t(MARGEN, y0, "CONTRIBUCIONES POR SEMANA", { f: "mono500", s: 11, c: "suave", ls: 1.6 });
  const base = y0 + 168, altoMax = 130;
  const porSemana = semanas.map((sem) => sem.reduce((a, d) => a + d.n, 0));
  const privSemana = semanas.map((sem) => sem.reduce((a, d) => a + d.priv, 0));
  const maxS = Math.max(1, ...porSemana);
  const n = porSemana.length;
  const paso = (ANCHO - 2 * MARGEN) / n, wb = paso - 4;
  // rejilla de fondo
  for (let k = 1; k <= 3; k++) {
    const yy = base - (altoMax * k) / 3;
    s += `<line x1="${MARGEN}" y1="${r(yy)}" x2="${ANCHO - MARGEN}" y2="${r(yy)}" stroke="${T.rejilla}" stroke-dasharray="2 4"/>`;
  }
  // leyenda: públicas y privadas
  if (totalPriv) {
    const lx = ANCHO - MARGEN - 190;
    s += `<rect x="${lx}" y="${y0 - 9}" width="10" height="10" rx="3" fill="url(#barra)"/>`;
    s += L.t(lx + 16, y0, "públicas", { f: "mono400", s: 10.5, c: "suave" });
    s += `<rect x="${lx + 88}" y="${y0 - 9}" width="10" height="10" rx="3" fill="url(#rayas)" stroke="${T.acento}" stroke-width=".8"/>`;
    s += L.t(lx + 104, y0, "privadas", { f: "mono400", s: 10.5, c: "suave" });
  }
  s += L.t(ANCHO - MARGEN, base - altoMax - 8, `máx. ${maxS} / semana`, { f: "mono400", s: 10.5, c: "suave", a: "end" });
  s += `<defs><linearGradient id="barra" x1="0" y1="${base - altoMax}" x2="0" y2="${base}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${T.acento2}"/><stop offset=".55" stop-color="${T.acento}"/><stop offset="1" stop-color="${T.profundo}"/></linearGradient>`;
  s += `<pattern id="rayas" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="5" height="5" fill="${T.acento}" opacity=".28"/><rect width="2" height="5" fill="${T.acento}" opacity=".85"/></pattern></defs>`;
  porSemana.forEach((v, i) => {
    const x = MARGEN + i * paso + 2;
    if (!v) {
      s += `<rect x="${r(x)}" y="${base - 3}" width="${r(wb)}" height="3" rx="1.5" fill="${T.linea}"/>`;
      return;
    }
    const h = Math.max(6, (v / maxS) * altoMax);
    const hp = privSemana[i] ? Math.max(3, (privSemana[i] / maxS) * altoMax) : 0;
    const d = r((i / n) * 0.55);
    // la barra entera crece desde abajo: se escala un grupo anclado en la base
    s += `<g transform="translate(${r(x)} ${base})"><g opacity="${v === maxS ? 1 : 0.92}">`;
    s += `<animateTransform attributeName="transform" type="scale" values="1 0;1 0;1 1" keyTimes="0;${d};1" dur="1.6s" calcMode="spline" keySplines="0 0 1 1;.2 .8 .2 1"/>`;
    s += `<clipPath id="b${i}"><rect y="${r(-h)}" width="${r(wb)}" height="${r(h)}" rx="${r(Math.min(4, wb / 2))}"/></clipPath><g clip-path="url(#b${i})">`;
    s += `<rect y="${r(-h)}" width="${r(wb)}" height="${r(h)}" fill="url(#barra)"/>`;
    if (hp) s += `<rect y="${r(-h)}" width="${r(wb)}" height="${r(hp)}" fill="${T.fondo}"/><rect y="${r(-h)}" width="${r(wb)}" height="${r(hp)}" fill="url(#rayas)"/>`;
    s += `</g></g></g>`;
  });
  // hoy: un punto que late al final
  const xh = MARGEN + (n - 1) * paso + 2 + wb / 2;
  s += `<circle cx="${r(xh)}" cy="${base + 10}" r="3" fill="${T.acento2}" class="latido"/><circle cx="${r(xh)}" cy="${base + 10}" r="3" fill="${T.acento2}"/>`;
  // meses debajo
  let mesAnterior = -1;
  semanas.forEach((sem, i) => {
    const m = sem[0].fecha.getUTCMonth();
    if (m !== mesAnterior && i > 0 && i < n - 2) {
      s += L.t(MARGEN + i * paso + 2, base + 24, MESES[m], { f: "mono400", s: 10.5, c: "suave" });
    }
    mesAnterior = m;
  });
  s += L.t(xh, base + 24, "hoy", { f: "mono500", s: 10.5, c: "acento2", a: "end" });

  // lenguajes
  const yl = base + 62;
  s += L.t(MARGEN, yl, "LENGUAJES", { f: "mono500", s: 11, c: "suave", ls: 1.6 });
  s += L.t(ANCHO - MARGEN, yl, `${repos.length} repositorios públicos`, { f: "mono400", s: 11, c: "suave", a: "end" });
  // cada lenguaje con su color de GitHub; "Otros" en un gris neutro
  const paleta = reparto.map(([nombre]) => coloresL.get(nombre) ?? T.tenue);
  const wTotal = ANCHO - 2 * MARGEN;
  let x = MARGEN;
  s += `<clipPath id="lb"><rect x="${MARGEN}" y="${yl + 14}" width="${wTotal}" height="10" rx="5"/></clipPath><g clip-path="url(#lb)">`;
  reparto.forEach(([, v], i) => {
    const w = v * wTotal;
    s += `<rect x="${r(x)}" y="${yl + 14}" width="${r(Math.max(w - 2, 1))}" height="10" fill="${paleta[i % paleta.length]}"><animate attributeName="width" values="0;${r(Math.max(w - 2, 1))}" dur="1.2s" calcMode="spline" keyTimes="0;1" keySplines=".2 .8 .2 1"/></rect>`;
    x += w;
  });
  s += `</g>`;
  x = MARGEN;
  reparto.forEach(([nombre, v], i) => {
    s += `<circle cx="${r(x + 4)}" cy="${yl + 45}" r="4" fill="${paleta[i % paleta.length]}"/>`;
    s += L.t(x + 14, yl + 49.5, nombre, { f: "sans600", s: 12.5 });
    const wn = medir(nombre, "sans600", 12.5);
    s += L.t(x + 20 + wn, yl + 49.5, pct(v), { f: "mono400", s: 11, c: "suave" });
    x += 20 + wn + medir(pct(v), "mono400", 11) + 24;
  });

  return L.svg(s);
}

await enAmbosTemas("actividad", dibujar);
