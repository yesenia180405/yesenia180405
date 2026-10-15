// Colaboraciones: repositorios de otras personas o equipos en los que he
// participado, con mis commits, pull requests y revisiones en cada uno.
// Debajo, un resumen del trabajo en repos privados de empresa (solo
// recuentos, sin nombres de repositorio).

import { execSync } from "node:child_process";
import {
  ANCHO, CABECERA, MARGEN, Lienzo, enAmbosTemas, glifo, leerPerfil, medir, r, tarjeta,
} from "./comun.mjs";
import { contribucionesPrivadas } from "./privadas.mjs";

const P = leerPerfil();

function token() {
  if (process.env.GITHUB_TOKEN) return process.env.GITHUB_TOKEN;
  return execSync("gh auth token", { encoding: "utf8" }).trim();
}
const cabeceras = () => ({ Authorization: `bearer ${token()}`, Accept: "application/vnd.github+json" });

async function graphql(query) {
  const res = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: { ...cabeceras(), "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables: { u: P.usuario } }),
  });
  const json = await res.json();
  if (json.errors) throw new Error(`GraphQL: ${JSON.stringify(json.errors)}`);
  return json.data.user;
}

async function cuantos(tipo, q) {
  for (let intento = 0; intento < 3; intento++) {
    const res = await fetch(`https://api.github.com/search/${tipo}?q=${encodeURIComponent(q)}&per_page=1`, { headers: cabeceras() });
    if (res.ok) return (await res.json()).total_count;
    if (res.status !== 403 && res.status !== 429) throw new Error(`Búsqueda: HTTP ${res.status}`);
    const reset = Number(res.headers.get("x-ratelimit-reset")) * 1000;
    await new Promise((ok) => setTimeout(ok, Math.min(Math.max(reset - Date.now(), 1000) + 1000, 65000)));
  }
  throw new Error("Búsqueda: límite superado");
}

// --- datos -------------------------------------------------------------------

const u = await graphql(`query($u: String!) { user(login: $u) {
  repositoriesContributedTo(first: 30, contributionTypes: [COMMIT, PULL_REQUEST, PULL_REQUEST_REVIEW, ISSUE], includeUserRepositories: false, privacy: PUBLIC) {
    nodes { nameWithOwner name owner { login } description url primaryLanguage { name color } } } } }`);

// GitHub detecta las plantillas Blade de Laravel como "Hack"
const EQUIVALENCIAS = { Hack: { name: "PHP", color: "#4F5D95" } };

const repos = [];
for (const repo of u.repositoriesContributedTo.nodes) {
  const q = `repo:${repo.nameWithOwner}`;
  const commits = await cuantos("commits", `author:${P.usuario} ${q}`);
  const prs = await cuantos("issues", `type:pr author:${P.usuario} ${q}`);
  const revisiones = await cuantos("issues", `type:pr reviewed-by:${P.usuario} -author:${P.usuario} ${q}`);
  const primaryLanguage = EQUIVALENCIAS[repo.primaryLanguage?.name] ?? repo.primaryLanguage;
  repos.push({ ...repo, primaryLanguage, commits, prs, revisiones });
}
repos.sort((a, b) => b.commits + b.prs - (a.commits + a.prs));
const privadas = await contribucionesPrivadas(P.usuario);

// --- dibujo ------------------------------------------------------------------------

/** Recorta `texto` con "…" para que quepa en `ancho`. */
function recortar(texto, f, px, ancho) {
  if (medir(texto, f, px) <= ancho) return texto;
  let t = texto;
  while (t.length > 1 && medir(t + "…", f, px) > ancho) t = t.slice(0, -1);
  return t.trimEnd().replace(/[,.;:]$/, "") + "…";
}

const GLIFO_REPO = `<path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/>`;
const GLIFO_CANDADO = `<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>`;
const trazo = (inner, x, y, lado, color) =>
  `<g transform="translate(${r(x)} ${r(y)}) scale(${r(lado / 24)})" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${inner}</g>`;

async function dibujar(tema) {
  const FILA = 78, gap = 10;
  const orgs = privadas.organizaciones ?? [];
  const alto = CABECERA + 24 + (repos.length + orgs.length) * (FILA + gap) - gap + 28;
  const L = new Lienzo(ANCHO, alto, tema, {
    titulo: "Colaboraciones",
    desc:
      `Colaboraciones en repositorios de otros equipos: ${repos.map((x) => `${x.nameWithOwner} (${x.commits} commits, ${x.prs} pull requests, ${x.revisiones} revisiones)`).join("; ")}. ` +
      orgs.map((o) => `${o.org}: ${o.repos} repositorios privados, ${o.commits} commits y ${o.prs} pull requests.`).join(" "),
  });
  const T = L.T;
  let s = tarjeta(L, "Colaboraciones", `${repos.length + orgs.reduce((a, o) => a + o.repos, 0)} repositorios de otros equipos`);
  const maxC = Math.max(1, ...repos.map((x) => x.commits), ...orgs.map((o) => o.commits));

  // chips de cifras alineados a la derecha; devuelve el ancho ocupado
  const chips = (lista, y, destacar) => {
    let x = ANCHO - MARGEN - 18;
    let out = "";
    for (const [n, et] of [...lista].reverse()) {
      if (!n) continue;
      const w = medir(String(n), "mono500", 11) + medir(` ${et}`, "mono400", 10.5) + 18;
      x -= w;
      out += `<rect x="${r(x)}" y="${y}" width="${r(w)}" height="22" rx="7" fill="${destacar ? T.panel2 : T.fondo}" stroke="${T.linea}"/>`;
      out += L.tramos(x + 9, y + 15, [[String(n), "tinta"], [` ${et}`, "suave"]], { f: "mono400", s: 10.5 });
      x -= 6;
    }
    return { out, izquierda: x };
  };

  let y = CABECERA + 24, k = 0;
  for (const repo of repos) {
    s += `<g class="entra" style="animation-delay:${(k * 0.08).toFixed(2)}s">`;
    s += `<rect x="${MARGEN}" y="${y}" width="${ANCHO - 2 * MARGEN}" height="${FILA}" rx="14" fill="${T.panel}" stroke="${T.linea}"/>`;
    s += `<rect x="${MARGEN + 16}" y="${y + 16}" width="30" height="30" rx="9" fill="${T.panel2}" stroke="${T.linea}"/>`;
    s += trazo(GLIFO_REPO, MARGEN + 23, y + 23, 16, T.acento);
    const c = chips([[repo.commits, "commits"], [repo.prs, "PRs"], [repo.revisiones, "revisiones"]], y + 16, false);
    s += c.out;
    const xt = MARGEN + 60;
    const anchoT = c.izquierda - xt - 14;
    const dueno = `${repo.owner.login}/`;
    const wd = medir(dueno, "mono400", 12.5);
    s += L.t(xt, y + 30, dueno, { f: "mono400", s: 12.5, c: "suave" });
    s += L.t(xt + wd, y + 30, recortar(repo.name, "mono500", 12.5, anchoT - wd), { f: "mono500", s: 12.5, c: "tinta" });
    if (repo.description) s += L.t(xt, y + 50, recortar(repo.description, "sans400", 12.5, ANCHO - MARGEN - 18 - xt - 110), { f: "sans400", s: 12.5, c: "suave" });
    if (repo.primaryLanguage) {
      const nombre = repo.primaryLanguage.name;
      const wl = medir(nombre, "sans500", 12);
      s += `<circle cx="${r(ANCHO - MARGEN - 18 - wl - 10)}" cy="${y + 46}" r="4.5" fill="${repo.primaryLanguage.color ?? T.tenue}"/>`;
      s += L.t(ANCHO - MARGEN - 18, y + 50, nombre, { f: "sans500", s: 12, c: "suave", a: "end" });
    }
    // barra de peso: mis commits respecto al repo donde más he aportado
    const wb = ((ANCHO - 2 * MARGEN - 32) * repo.commits) / maxC;
    s += `<rect x="${MARGEN + 16}" y="${y + FILA - 12}" width="${ANCHO - 2 * MARGEN - 32}" height="3" rx="1.5" fill="${T.linea}"/>`;
    s += `<rect x="${MARGEN + 16}" y="${y + FILA - 12}" width="${r(Math.max(wb, 3))}" height="3" rx="1.5" fill="${T.acento}"><animate attributeName="width" values="0;0;${r(Math.max(wb, 3))}" keyTimes="0;${r(0.1 + k * 0.06)};1" dur="1.6s" calcMode="spline" keySplines="0 0 1 1;.2 .8 .2 1"/></rect>`;
    s += `</g>`;
    y += FILA + gap;
    k++;
  }

  // trabajo en repos privados de empresa
  for (const o of orgs) {
    s += `<g class="entra" style="animation-delay:${(k * 0.08).toFixed(2)}s">`;
    s += `<defs><linearGradient id="emp" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${T.profundo}" stop-opacity="${tema === "dark" ? 0.35 : 0.12}"/><stop offset="1" stop-color="${T.panel}"/></linearGradient></defs>`;
    s += `<rect x="${MARGEN}" y="${y}" width="${ANCHO - 2 * MARGEN}" height="${FILA}" rx="14" fill="url(#emp)" stroke="${T.acento}" stroke-opacity=".45" stroke-dasharray="4 4"/>`;
    s += `<rect x="${MARGEN + 16}" y="${y + 16}" width="30" height="30" rx="9" fill="${T.acento}"/>`;
    s += trazo(GLIFO_CANDADO, MARGEN + 23, y + 22, 16, "#ffffff");
    const c = chips([[o.commits, "commits"], [o.prs, "PRs"], [o.issues, "issues"]], y + 16, true);
    s += c.out;
    const xt = MARGEN + 60;
    s += L.t(xt, y + 30, o.org, { f: "mono500", s: 12.5, c: "tinta" });
    s += L.t(xt, y + 50, `${o.repos} repositorios privados · trabajo en empresa`, { f: "sans400", s: 12.5, c: "suave" });
    const wb = ((ANCHO - 2 * MARGEN - 32) * o.commits) / maxC;
    s += `<rect x="${MARGEN + 16}" y="${y + FILA - 12}" width="${ANCHO - 2 * MARGEN - 32}" height="3" rx="1.5" fill="${T.linea}"/>`;
    s += `<rect x="${MARGEN + 16}" y="${y + FILA - 12}" width="${r(wb)}" height="3" rx="1.5" fill="url(#rayasC)"><animate attributeName="width" values="0;0;${r(wb)}" keyTimes="0;${r(0.1 + k * 0.06)};1" dur="1.6s" calcMode="spline" keySplines="0 0 1 1;.2 .8 .2 1"/></rect>`;
    s += `<defs><pattern id="rayasC" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="5" height="5" fill="${T.acento}" opacity=".35"/><rect width="2.5" height="5" fill="${T.acento}"/></pattern></defs>`;
    s += `</g>`;
    y += FILA + gap;
    k++;
  }
  return L.svg(s);
}

await enAmbosTemas("colaboraciones", dibujar);
