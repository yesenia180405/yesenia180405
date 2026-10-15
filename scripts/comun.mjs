// Piezas compartidas por los generadores del perfil.
//
// - La paleta morada, en tema claro y oscuro.
// - La tipografía: Plus Jakarta Sans y DM Mono van incrustadas en cada SVG,
//   recortadas a los caracteres que se usan. Así se ven igual en cualquier
//   sistema y el texto se puede medir para partir líneas de verdad.
// - `Lienzo`, que monta un SVG y apunta qué caracteres usa cada fuente.
// - `tarjeta`, el marco común: cada sección se presenta como un componente
//   de Vue (<SobreMi />, <Stack />…), que es el mundo en el que trabajo.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as fontkit from "fontkit";
import subsetFont from "subset-font";

export const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const ASSETS = path.join(RAIZ, "assets");
const FUENTES = path.join(ASSETS, "fuentes");
const CACHE_ICONOS = path.join(ASSETS, "iconos");

// Ancho de diseño: el de la columna del README en escritorio.
export const ANCHO = 860;

const SIMPLE_ICONS = (slug) => `https://cdn.jsdelivr.net/npm/simple-icons@13.21.0/icons/${slug}.svg`;

export const TEMAS = {
  dark: {
    fondo: "#0e0a18",
    panel: "#151025",
    panel2: "#1b1430",
    linea: "#2a2142",
    rejilla: "#1a1429",
    tinta: "#efeaf8",
    suave: "#a79fbd",
    tenue: "#5d5378",
    acento: "#a78bfa",
    acento2: "#c4b5fd",
    profundo: "#7c3aed",
    ok: "#4ade80",
    brillo: 0.55,
    // de más intenso a más apagado
    morados: ["#c4b5fd", "#a78bfa", "#8b5cf6", "#6d28d9", "#4c1d95", "#2e1065"],
  },
  light: {
    fondo: "#fdfbff",
    panel: "#f7f2ff",
    panel2: "#efe7fd",
    linea: "#e4d9f7",
    rejilla: "#f1eafc",
    tinta: "#1d1430",
    suave: "#675d80",
    tenue: "#b9acd6",
    acento: "#7c3aed",
    acento2: "#5b21b6",
    profundo: "#6d28d9",
    ok: "#16a34a",
    brillo: 0.22,
    morados: ["#4c1d95", "#6d28d9", "#7c3aed", "#a78bfa", "#c4b5fd", "#ede9fe"],
  },
};

// Animaciones CSS compartidas. Lo que se mueve "de verdad" va con SMIL en cada
// pieza; aquí solo lo pequeño y repetido.
export const CSS_ANIM =
  "@keyframes parpadeo{0%,100%{opacity:1}50%{opacity:0}}" +
  ".cursor{animation:parpadeo 1.1s steps(1) infinite}" +
  "@keyframes latido{0%{transform:scale(1);opacity:.7}100%{transform:scale(2.6);opacity:0}}" +
  ".latido{transform-box:fill-box;transform-origin:center;animation:latido 2s ease-out infinite}" +
  "@keyframes entra{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}" +
  ".entra{animation:entra .7s ease-out both}" +
  "@media (prefers-reduced-motion:reduce){.cursor,.latido,.entra{animation:none}}";

// --- tipografía ------------------------------------------------------------

// clave -> [fichero, peso del eje wght (null si es estática), familia CSS]
const DEF_FUENTES = {
  sans400: ["PlusJakartaSans.ttf", 400, "YT Sans 400"],
  sans500: ["PlusJakartaSans.ttf", 500, "YT Sans 500"],
  sans600: ["PlusJakartaSans.ttf", 600, "YT Sans 600"],
  sans700: ["PlusJakartaSans.ttf", 700, "YT Sans 700"],
  sans800: ["PlusJakartaSans.ttf", 800, "YT Sans 800"],
  mono400: ["DMMono-Regular.ttf", null, "YT Mono 400"],
  mono500: ["DMMono-Medium.ttf", null, "YT Mono 500"],
};

const RESPALDO = {
  sans: "-apple-system, 'Segoe UI', Helvetica, Arial, sans-serif",
  mono: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
};

const cacheFuentes = new Map();
function fuente(clave) {
  if (!cacheFuentes.has(clave)) {
    const [fichero, peso] = DEF_FUENTES[clave];
    const buffer = fs.readFileSync(path.join(FUENTES, fichero));
    let f = fontkit.create(buffer);
    if (peso) f = f.getVariation({ wght: peso });
    cacheFuentes.set(clave, { f, buffer });
  }
  return cacheFuentes.get(clave);
}

/** Ancho en px de `texto` con la fuente `clave` a tamaño `px`. */
export function medir(texto, clave, px, espaciado = 0) {
  const { f } = fuente(clave);
  const run = f.layout(texto);
  return (run.advanceWidth / f.unitsPerEm) * px + espaciado * Math.max(texto.length - 1, 0);
}

/** Parte `texto` en líneas que no pasen de `ancho` px. */
export function partir(texto, clave, px, ancho) {
  const lineas = [];
  let actual = "";
  for (const palabra of texto.split(/\s+/)) {
    const prueba = actual ? `${actual} ${palabra}` : palabra;
    if (actual && medir(prueba, clave, px) > ancho) {
      lineas.push(actual);
      actual = palabra;
    } else actual = prueba;
  }
  if (actual) lineas.push(actual);
  return lineas;
}

export const esc = (s) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// --- lienzo ------------------------------------------------------------------

export class Lienzo {
  constructor(ancho, alto, tema, { titulo, desc }) {
    Object.assign(this, { ancho, alto, tema, titulo, desc });
    this.T = TEMAS[tema];
    this.usados = new Map();
  }

  color(c) {
    return this.T[c] ?? c;
  }

  usar(clave, texto) {
    if (!this.usados.has(clave)) this.usados.set(clave, new Set());
    for (const ch of texto) this.usados.get(clave).add(ch);
  }

  /** Texto con fuente registrada. `o.f` fuente, `o.s` tamaño, `o.c` color. */
  t(x, y, texto, o = {}) {
    const { f = "sans400", s = 14, c = "tinta", a = "start", ls = 0, extra = "" } = o;
    this.usar(f, texto);
    const anc = a === "start" ? "" : ` text-anchor="${a}"`;
    const esp = ls ? ` letter-spacing="${ls}"` : "";
    return `<text x="${r(x)}" y="${r(y)}" class="${f}" font-size="${s}" fill="${this.color(c)}"${anc}${esp}${extra}>${esc(texto)}</text>`;
  }

  /** Igual que `t`, pero con trozos de distinto color en la misma línea. */
  tramos(x, y, partes, o = {}) {
    const { f = "sans400", s = 14, a = "start", extra = "" } = o;
    const spans = partes
      .map(([texto, c]) => {
        this.usar(f, texto);
        return `<tspan fill="${this.color(c)}">${esc(texto)}</tspan>`;
      })
      .join("");
    const anc = a === "start" ? "" : ` text-anchor="${a}"`;
    return `<text x="${r(x)}" y="${r(y)}" class="${f}" font-size="${s}" xml:space="preserve"${anc}${extra}>${spans}</text>`;
  }

  async svg(cuerpo, { defs = "", css = "" } = {}) {
    const caras = [];
    const clases = [];
    for (const [clave, chars] of this.usados) {
      const [, peso, familia] = DEF_FUENTES[clave];
      const texto = [...chars].join("") + " ";
      const opciones = { targetFormat: "woff2" };
      if (peso) opciones.variationAxes = { wght: peso };
      const sub = await subsetFont(fuente(clave).buffer, texto, opciones);
      caras.push(`@font-face{font-family:'${familia}';src:url(data:font/woff2;base64,${sub.toString("base64")}) format('woff2')}`);
      const resp = clave.startsWith("mono") ? RESPALDO.mono : RESPALDO.sans;
      clases.push(`.${clave}{font-family:'${familia}',${resp};font-weight:${peso ?? (clave.endsWith("500") ? 500 : 400)}}`);
    }
    return (
      `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${this.ancho}" height="${this.alto}" viewBox="0 0 ${this.ancho} ${this.alto}" role="img" aria-labelledby="titulo desc">` +
      `<title id="titulo">${esc(this.titulo)}</title><desc id="desc">${esc(this.desc)}</desc>` +
      `<style>${caras.join("")}${clases.join("")}${CSS_ANIM}${css}</style>` +
      (defs ? `<defs>${defs}</defs>` : "") +
      cuerpo +
      `</svg>`
    );
  }
}

export const r = (n) => (Number.isInteger(n) ? n : Math.round(n * 100) / 100);

// --- marco común ---------------------------------------------------------------

export const CABECERA = 64;
export const MARGEN = 32;

/**
 * Fondo y cabecera de una tarjeta: `<Componente />` a la izquierda y un
 * texto pequeño a la derecha (la "ruta" del componente o un dato).
 */
export function tarjeta(L, componente, derecha = "") {
  const { ancho, alto } = L;
  const id = `g${componente}`;
  return (
    `<defs><linearGradient id="${id}" x1="0" x2="1"><stop offset="0" stop-color="${L.color("acento")}"/><stop offset=".5" stop-color="${L.color("acento2")}"/><stop offset="1" stop-color="${L.color("acento")}" stop-opacity="0"/></linearGradient></defs>` +
    `<rect x=".5" y=".5" width="${ancho - 1}" height="${alto - 1}" rx="18" fill="${L.color("fondo")}" stroke="${L.color("linea")}"/>` +
    `<rect x="${MARGEN}" y="0" width="160" height="2" rx="1" fill="url(#${id})"/>` +
    L.tramos(MARGEN, 40, [["<", "tenue"], [componente, "acento"], [" />", "tenue"]], { f: "mono500", s: 13 }) +
    (derecha ? L.t(ancho - MARGEN, 40, derecha, { f: "mono400", s: 12, c: "suave", a: "end" }) : "") +
    `<line x1="${MARGEN}" y1="${CABECERA}" x2="${ancho - MARGEN}" y2="${CABECERA}" stroke="${L.color("linea")}"/>`
  );
}

// --- iconos --------------------------------------------------------------------

/** Trazado de un icono de Simple Icons (viewBox 24), con caché en assets/iconos. */
export async function icono(slug) {
  fs.mkdirSync(CACHE_ICONOS, { recursive: true });
  const fichero = path.join(CACHE_ICONOS, `${slug}.svg`);
  if (!fs.existsSync(fichero)) {
    const res = await fetch(SIMPLE_ICONS(slug));
    if (!res.ok) throw new Error(`Icono ${slug}: HTTP ${res.status}`);
    fs.writeFileSync(fichero, await res.text());
  }
  const svg = fs.readFileSync(fichero, "utf8");
  return [...svg.matchAll(/<path[^>]*\sd="([^"]+)"/g)].map((m) => m[1]).join(" ");
}

/** Pinta un icono de marca centrado en (cx, cy) con lado `lado`. */
export function pintarIcono(d, cx, cy, lado, color) {
  const k = lado / 24;
  return `<path transform="translate(${r(cx - lado / 2)} ${r(cy - lado / 2)}) scale(${r(k)})" d="${d}" fill="${color}"/>`;
}

// Glifos de línea (24×24, trazo 2), dibujados a mano al estilo de Lucide.
export const GLIFOS = {
  bolsa: `<path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/>`,
  rayo: `<path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/>`,
  enchufe: `<path d="M12 22v-5"/><path d="M9 8V2"/><path d="M15 8V2"/><path d="M18 8v5a4 4 0 0 1-4 4h-4a4 4 0 0 1-4-4V8z"/>`,
  globo: `<circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/>`,
  datos: `<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14a9 3 0 0 0 18 0V5"/><path d="M3 12a9 3 0 0 0 18 0"/>`,
  movil: `<rect x="5" y="2" width="14" height="20" rx="2"/><path d="M12 18h.01"/>`,
  formacion: `<path d="M22 10 12 5 2 10l10 5 10-5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/><path d="M22 10v6"/>`,
  correo: `<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>`,
  web: `<circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/>`,
  linkedin: `<path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-4 0v7h-4v-7a6 6 0 0 1 6-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/>`,
  trabajo: `<rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>`,
  ubicacion: `<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="3"/>`,
  flecha: `<path d="M7 17 17 7"/><path d="M7 7h10v10"/>`,
  check: `<path d="M20 6 9 17l-5-5"/>`,
  codigo: `<path d="m16 18 6-6-6-6"/><path d="m8 6-6 6 6 6"/>`,
};

/** Glifo de línea en (x, y) esquina superior izquierda, lado `lado`. */
export function glifo(nombre, x, y, lado, color, grosor = 2) {
  const k = lado / 24;
  return `<g transform="translate(${r(x)} ${r(y)}) scale(${r(k)})" fill="none" stroke="${color}" stroke-width="${grosor}" stroke-linecap="round" stroke-linejoin="round">${GLIFOS[nombre]}</g>`;
}

// --- datos y salida ----------------------------------------------------------------

export function leerPerfil() {
  return JSON.parse(fs.readFileSync(path.join(RAIZ, "datos", "perfil.json"), "utf8"));
}

export function guardar(nombre, contenido) {
  fs.writeFileSync(path.join(ASSETS, nombre), contenido);
  console.log(`  ${nombre}  ${(contenido.length / 1024).toFixed(1)} KB`);
}

/** Genera la pieza en los dos temas. `dibujar(tema)` devuelve el SVG. */
export async function enAmbosTemas(nombre, dibujar) {
  for (const tema of ["dark", "light"]) guardar(`${nombre}-${tema}.svg`, await dibujar(tema));
}
