// Banner: nombre y titular a la izquierda; a la derecha, un escaparate
// animado que resume lo que hago en el día a día. Es la misma tienda (mismo
// código, misma maqueta) que va cambiando de marca, de color y de idioma
// cada vez que el cursor pulsa el selector de idioma.

import { ANCHO, Lienzo, enAmbosTemas, glifo, leerPerfil, r } from "./comun.mjs";

const P = leerPerfil();
const ALTO = 360;
const CICLO = 9; // segundos: tres marcas × tres segundos

// Una marca se ve durante su tercio del ciclo, con fundidos cortos.
function fase(i) {
  if (i === 0) return { values: "1;1;0;0;1", keyTimes: "0;.323;.343;.99;1" };
  if (i === 1) return { values: "0;0;1;1;0;0", keyTimes: "0;.323;.343;.656;.676;1" };
  return { values: "0;0;1;1;0", keyTimes: "0;.656;.676;.99;1" };
}
const opacidad = (i) => {
  const { values, keyTimes } = fase(i);
  return `<animate attributeName="opacity" values="${values}" keyTimes="${keyTimes}" dur="${CICLO}s" repeatCount="indefinite"/>`;
};
const colores = (atr, [a, b, c]) =>
  `<animate attributeName="${atr}" values="${a};${a};${b};${b};${c};${c};${a}" keyTimes="0;.323;.343;.656;.676;.99;1" dur="${CICLO}s" repeatCount="indefinite"/>`;

/** Tres versiones de un texto, una por marca, que se van turnando. */
function turnos(L, x, y, textos, o) {
  return textos
    .map((tx, i) => `<g opacity="${i === 0 ? 1 : 0}">${opacidad(i)}${L.t(x, y, tx, o)}</g>`)
    .join("");
}

function escaparate(L, ox, oy) {
  const M = P.escaparate.marcas;
  const W = 360, H = 262;
  const col = M.map((m) => m.color);
  const claro = M.map((m) => (L.tema === "dark" ? m.color : m.claro));
  const C0 = col[0];
  let s = `<g transform="translate(${ox} ${oy})">`;

  // sombra suave y ventana
  s += `<rect x="6" y="14" width="${W - 12}" height="${H - 6}" rx="16" fill="${L.color("profundo")}" opacity="${L.tema === "dark" ? 0.18 : 0.06}" filter="url(#difumina)"/>`;
  s += `<rect x=".5" y=".5" width="${W - 1}" height="${H - 1}" rx="12" fill="${L.color("panel")}" stroke="${L.color("linea")}"/>`;
  // barra del navegador
  s += `<path d="M.5 34V12.5a12 12 0 0 1 12-12h${W - 25}a12 12 0 0 1 12 12V34z" fill="${L.color("panel2")}"/>`;
  s += `<line x1="0" y1="34" x2="${W}" y2="34" stroke="${L.color("linea")}"/>`;
  ["#6d28d9", "#8b5cf6", "#c4b5fd"].forEach((c, i) => (s += `<circle cx="${16 + i * 14}" cy="17" r="4.5" fill="${c}" opacity=".85"/>`));
  s += `<rect x="64" y="8" width="${W - 80}" height="18" rx="9" fill="${L.color("fondo")}" stroke="${L.color("linea")}"/>`;
  s += `<path d="M77 15.5v-1.5a2.5 2.5 0 0 1 5 0v1.5" fill="none" stroke="${L.color("suave")}" stroke-width="1.2"/><rect x="75.5" y="15.5" width="8" height="5.5" rx="1.2" fill="${L.color("suave")}"/>`;
  s += turnos(L, 90, 21, M.map((m) => m.url), { f: "mono400", s: 10.5, c: "suave" });

  // cabecera de la tienda: logo, enlaces y selector de idioma
  s += `<rect x="14" y="46" width="16" height="16" rx="5" fill="${C0}">${colores("fill", col)}</rect>`;
  s += turnos(L, 36, 58.5, M.map((m) => m.url.split(".")[0]), { f: "sans800", s: 12 });
  [0, 1, 2].forEach((i) => (s += `<rect x="${170 + i * 38}" y="51.5" width="28" height="5" rx="2.5" fill="${L.color("tenue")}" opacity=".7"/>`));
  s += `<rect x="296" y="45" width="50" height="18" rx="9" fill="${C0}">${colores("fill", col)}</rect>`;
  s += turnos(L, 321, 57.5, M.map((m) => m.url.split("/")[1].toUpperCase() + " ▾"), { f: "mono500", s: 10, c: "#ffffff", a: "middle" });

  // hero
  s += `<rect x="14" y="74" width="332" height="88" rx="10" fill="${C0}">${colores("fill", col)}</rect>`;
  s += `<rect x="14" y="74" width="332" height="88" rx="10" fill="url(#velo)"/>`;
  s += `<circle cx="300" cy="104" r="26" fill="#ffffff" opacity=".16"><animate attributeName="cy" values="104;96;104" dur="4s" repeatCount="indefinite"/></circle>`;
  s += `<circle cx="266" cy="138" r="13" fill="#ffffff" opacity=".22"><animate attributeName="cy" values="138;144;138" dur="3.2s" repeatCount="indefinite"/></circle>`;
  s += `<rect x="318" y="132" width="16" height="16" rx="4" fill="#ffffff" opacity=".18" transform="rotate(18 326 140)"/>`;
  s += turnos(L, 28, 104, M.map((m) => m.titulo), { f: "sans800", s: 19, c: "#ffffff" });
  s += `<rect x="28" y="113" width="132" height="5" rx="2.5" fill="#ffffff" opacity=".55"/>`;
  s += `<rect x="28" y="133" width="104" height="22" rx="11" fill="#ffffff"/>`;
  s += M.map((m, i) => `<g opacity="${i === 0 ? 1 : 0}">${opacidad(i)}${L.t(80, 148, m.boton, { f: "sans700", s: 10.5, c: m.color, a: "middle" })}</g>`).join("");

  // productos
  for (let k = 0; k < 3; k++) {
    const x = 14 + k * 114;
    s += `<rect x="${x}" y="174" width="104" height="76" rx="9" fill="${L.color("fondo")}" stroke="${L.color("linea")}"/>`;
    s += `<rect x="${x + 6}" y="180" width="92" height="36" rx="6" fill="${claro[0]}" opacity="${L.tema === "dark" ? 0.28 : 1}">${colores("fill", claro)}</rect>`;
    const forma =
      k === 0
        ? `<circle cx="${x + 52}" cy="198" r="10" fill="${C0}">${colores("fill", col)}</circle>`
        : k === 1
          ? `<rect x="${x + 42}" y="188" width="20" height="20" rx="5" fill="${C0}">${colores("fill", col)}</rect>`
          : `<path d="M${x + 52} 187l11 20h-22z" fill="${C0}">${colores("fill", col)}</path>`;
    s += forma;
    s += `<rect x="${x + 8}" y="224" width="54" height="5" rx="2.5" fill="${L.color("tenue")}"/>`;
    s += turnos(L, x + 8, 242, M.map((m) => m.precio), { f: "mono500", s: 9.5, c: "tinta" });
    s += `<circle cx="${x + 90}" cy="238" r="7" fill="${C0}">${colores("fill", col)}</circle>`;
    s += `<path d="M${x + 87} 238h6M${x + 90} 235v6" stroke="#fff" stroke-width="1.4" stroke-linecap="round"/>`;
  }

  // cursor: pasea por los productos, pasa por el botón y pulsa el idioma
  const A = [70, 205], B = [96, 146], Cc = [322, 56];
  const pasos = [];
  const tiempos = [];
  for (let f = 0; f < 3; f++) {
    const o = f / 3;
    const prod = [A[0] + f * 114, A[1]];
    [[prod, 0], [prod, 0.07], [B, 0.15], [B, 0.2], [Cc, 0.28], [Cc, 0.3333]].forEach(([p, t]) => {
      pasos.push(`${p[0]} ${p[1]}`);
      tiempos.push(r(Math.min(o + t, 1)));
    });
  }
  pasos.push(`${A[0]} ${A[1]}`);
  tiempos.push(1);
  // quita tiempos repetidos en las fronteras entre fases
  const vals = [], kt = [];
  tiempos.forEach((t, i) => {
    if (kt.length && t <= kt[kt.length - 1]) return;
    vals.push(pasos[i]);
    kt.push(t);
  });
  kt[0] = 0;
  kt[kt.length - 1] = 1;
  const ondas = [0, 1, 2]
    .map((f) => {
      const a = r(f / 3 + 0.29), b = r(f / 3 + 0.33);
      return `<circle cx="${Cc[0]}" cy="${Cc[1]}" r="0" fill="none" stroke="#ffffff" stroke-width="2" opacity="0"><animate attributeName="r" values="0;0;16;16" keyTimes="0;${a};${b};1" dur="${CICLO}s" repeatCount="indefinite"/><animate attributeName="opacity" values="0;0;.9;0;0" keyTimes="0;${a};${r(a + 0.005)};${b};1" dur="${CICLO}s" repeatCount="indefinite"/></circle>`;
    })
    .join("");
  s += ondas;
  s += `<g><animateTransform attributeName="transform" type="translate" values="${vals.join(";")}" keyTimes="${kt.join(";")}" dur="${CICLO}s" repeatCount="indefinite" calcMode="spline" keySplines="${kt.slice(1).map(() => ".4 0 .2 1").join(";")}"/>`;
  s += `<path d="M0 0v15l4-3.6 2.6 6 2.6-1.1-2.6-5.9H12z" fill="#ffffff" stroke="#1d1430" stroke-width="1.1" stroke-linejoin="round"/></g>`;

  s += `</g>`;
  s += L.t(ox + W / 2, oy + H + 26, P.escaparate.pie, { f: "mono400", s: 11, c: "suave", a: "middle", ls: 0.3 });
  return s;
}

async function dibujar(tema) {
  const L = new Lienzo(ANCHO, ALTO, tema, {
    titulo: P.nombre,
    desc: `${P.nombre}. ${P.titular}: ${P.subtitular}. ${P.banner.map((b) => b[1]).join(". ")}. Animación de una tienda que cambia de marca, color e idioma con el mismo código.`,
  });
  const T = L.T;
  let s = "";

  const defs =
    `<radialGradient id="halo" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(660 150) scale(360 240)"><stop offset="0" stop-color="${T.profundo}" stop-opacity="${T.brillo}"/><stop offset="1" stop-color="${T.profundo}" stop-opacity="0"/></radialGradient>` +
    `<radialGradient id="halo2" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(90 360) scale(300 160)"><stop offset="0" stop-color="${T.acento2}" stop-opacity="${T.brillo * 0.45}"/><stop offset="1" stop-color="${T.acento2}" stop-opacity="0"/></radialGradient>` +
    `<pattern id="puntos" width="18" height="18" patternUnits="userSpaceOnUse"><circle cx="1.5" cy="1.5" r="1.1" fill="${T.tenue}" opacity=".45"/></pattern>` +
    `<linearGradient id="desvanece" x1="0" x2="1"><stop offset=".35" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#fff" stop-opacity="1"/></linearGradient>` +
    `<mask id="mascara"><rect width="${ANCHO}" height="${ALTO}" fill="url(#desvanece)"/></mask>` +
    `<linearGradient id="velo" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".18"/><stop offset="1" stop-color="#000" stop-opacity=".12"/></linearGradient>` +
    `<filter id="difumina" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="14"/></filter>` +
    `<clipPath id="recorte"><rect x="1" y="1" width="${ANCHO - 2}" height="${ALTO - 2}" rx="17"/></clipPath>` +
    // brillo que recorre el nombre de izquierda a derecha
    `<linearGradient id="nombre" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="420" y2="0">` +
    `<stop offset="0" stop-color="${T.tinta}"/><stop offset=".38" stop-color="${T.tinta}"/><stop offset=".5" stop-color="${T.acento}"/><stop offset=".6" stop-color="${T.acento2}"/><stop offset=".72" stop-color="${T.tinta}"/><stop offset="1" stop-color="${T.tinta}"/>` +
    `<animateTransform attributeName="gradientTransform" type="translate" values="-420 0;420 0;420 0" keyTimes="0;.55;1" dur="7s" repeatCount="indefinite"/></linearGradient>`;

  s += `<rect x=".5" y=".5" width="${ANCHO - 1}" height="${ALTO - 1}" rx="18" fill="${T.fondo}" stroke="${T.linea}"/>`;
  s += `<g clip-path="url(#recorte)"><rect width="${ANCHO}" height="${ALTO}" fill="url(#puntos)" mask="url(#mascara)"/><rect width="${ANCHO}" height="${ALTO}" fill="url(#halo)"/><rect width="${ANCHO}" height="${ALTO}" fill="url(#halo2)"/></g>`;

  // izquierda
  const x = 40;
  s += `<g class="entra">`;
  s += L.t(x, 84, P.saludo.toUpperCase(), { f: "mono500", s: 12, c: "acento", ls: 2.4 });
  s += `<rect class="cursor" x="${x + 96}" y="74" width="7" height="12" rx="1" fill="${T.acento}"/>`;
  s += L.t(x - 2, 142, P.nombre, { f: "sans800", s: 52, c: "url(#nombre)", ls: -1.4 });
  s += L.t(x, 178, P.titular, { f: "sans600", s: 21, c: "tinta" });
  const partes = P.subtitular.split(" · ");
  s += L.tramos(x, 204, partes.flatMap((p, i) => (i ? [[" · ", "acento"], [p, "suave"]] : [[p, "suave"]])), { f: "mono400", s: 14 });
  s += `</g>`;

  P.banner.forEach(([ico, texto], i) => {
    const y = 250 + i * 30;
    s += `<g class="entra" style="animation-delay:${0.15 + i * 0.12}s">`;
    s += `<rect x="${x}" y="${y - 16}" width="24" height="24" rx="7" fill="${T.panel2}" stroke="${T.linea}"/>`;
    s += glifo(ico, x + 5, y - 11, 14, T.acento, 2);
    s += L.t(x + 36, y + 0.5, texto, { f: "sans500", s: 14, c: "suave" });
    s += `</g>`;
  });

  s += escaparate(L, 470, 36);
  return L.svg(s, { defs });
}

await enAmbosTemas("banner", dibujar);
