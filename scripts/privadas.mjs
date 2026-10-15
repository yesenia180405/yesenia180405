// Contribuciones en repositorios privados de otras organizaciones (la
// empresa). GitHub no las mete en el calendario de contribuciones, así que
// las sacamos de la búsqueda: commits, pull requests e issues por día.
//
// Hace falta un token con acceso a esos repos: PERFIL_TOKEN en el workflow o,
// en local, el de `gh`. Sin él (el GITHUB_TOKEN del workflow no ve repos de
// otras organizaciones) se usa lo último guardado en datos/privadas.json, que
// solo lleva recuentos por día y por organización, nunca nombres de repos.

import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { RAIZ } from "./comun.mjs";

const CACHE = path.join(RAIZ, "datos", "privadas.json");

function tokenConAcceso() {
  if (process.env.PERFIL_TOKEN) return process.env.PERFIL_TOKEN;
  if (process.env.CI) return null;
  try {
    return execSync("gh auth token", { encoding: "utf8" }).trim();
  } catch {
    return null;
  }
}

const diaMadrid = (iso) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(iso));

async function buscar(token, tipo, q) {
  const todos = [];
  for (let pagina = 1; pagina <= 10; pagina++) {
    const url = `https://api.github.com/search/${tipo}?q=${encodeURIComponent(q)}&per_page=100&page=${pagina}`;
    let res;
    for (let intento = 0; intento < 3; intento++) {
      res = await fetch(url, { headers: { Authorization: `bearer ${token}`, Accept: "application/vnd.github+json" } });
      // la búsqueda permite ~30 peticiones por minuto: si nos pasamos, esperamos
      if (res.status !== 403 && res.status !== 429) break;
      const reset = Number(res.headers.get("x-ratelimit-reset")) * 1000;
      const espera = Math.min(Math.max(reset - Date.now(), 1000) + 1000, 65000);
      console.log(`  límite de búsqueda; espero ${Math.round(espera / 1000)} s`);
      await new Promise((ok) => setTimeout(ok, espera));
    }
    if (!res.ok) throw new Error(`Búsqueda ${tipo}: HTTP ${res.status}`);
    const json = await res.json();
    todos.push(...json.items);
    if (todos.length >= json.total_count || json.items.length < 100) break;
  }
  return todos;
}

/** { dias: { "AAAA-MM-DD": n }, organizaciones: [{ org, repos, commits, prs, issues }] } */
export async function contribucionesPrivadas(usuario) {
  const token = tokenConAcceso();
  if (token) {
    try {
      return await consultar(token, usuario);
    } catch (e) {
      console.warn(`  privadas: ${e.message}; uso lo guardado`);
    }
  }
  if (fs.existsSync(CACHE)) return JSON.parse(fs.readFileSync(CACHE, "utf8"));
  return { dias: {}, organizaciones: [] };
}

async function consultar(token, usuario) {
  const ajena = (repo) => repo.private && repo.owner.login.toLowerCase() !== usuario.toLowerCase();
  const dias = {};
  const orgs = new Map();
  const org = (login) => {
    if (!orgs.has(login)) orgs.set(login, { org: login, repos: new Set(), commits: 0, prs: 0, issues: 0 });
    return orgs.get(login);
  };

  for (const c of await buscar(token, "commits", `author:${usuario}`)) {
    if (!ajena(c.repository)) continue;
    // la fecha del autor ya viene en su hora local
    const dia = c.commit.author.date.slice(0, 10);
    dias[dia] = (dias[dia] ?? 0) + 1;
    const o = org(c.repository.owner.login);
    o.repos.add(c.repository.full_name);
    o.commits++;
  }
  for (const [tipo, campo] of [["pr", "prs"], ["issue", "issues"]]) {
    for (const it of await buscar(token, "issues", `author:${usuario} type:${tipo} is:private`)) {
      const [dueno] = it.repository_url.split("/repos/")[1].split("/");
      if (dueno.toLowerCase() === usuario.toLowerCase()) continue;
      const dia = diaMadrid(it.created_at);
      dias[dia] = (dias[dia] ?? 0) + 1;
      const o = org(dueno);
      o.repos.add(it.repository_url);
      o[campo]++;
    }
  }

  const datos = {
    _comentario: "Generado por scripts/privadas.mjs. Solo recuentos: ni nombres de repos ni contenido.",
    dias: Object.fromEntries(Object.entries(dias).sort()),
    organizaciones: [...orgs.values()].map((o) => ({ org: o.org, repos: new Set([...o.repos].map((r) => r.split("/").pop())).size, commits: o.commits, prs: o.prs, issues: o.issues })),
  };
  fs.writeFileSync(CACHE, JSON.stringify(datos, null, 2) + "\n");
  return datos;
}
