// Escribe el README a partir de datos/perfil.json, para que añadir un
// contacto o un proyecto no obligue a tocar el HTML a mano.
//
// Va todo en un único bloque HTML, sin líneas en blanco, para que GitHub no
// meta huecos entre tarjetas.

import fs from "node:fs";
import path from "node:path";
import { RAIZ, leerPerfil } from "./comun.mjs";

const P = leerPerfil();

const pieza = (nombre, alt, ancho = "100%") =>
  `<picture><source media="(prefers-color-scheme: dark)" srcset="assets/${nombre}-dark.svg"><img src="assets/${nombre}-light.svg" width="${ancho}" alt="${alt.replace(/"/g, "&quot;")}"></picture>`;
const enlace = (href, html) => `<a href="${href}">${html}</a>`;

const contactos = ["web", "linkedin", "email"].filter((k) => P.contacto[k]);
const anchoC = `${(100 / contactos.length).toFixed(1).replace(/\.0$/, "")}%`;
const ETIQUETA = { web: "Portfolio", linkedin: "LinkedIn", email: "Correo" };
const HREF = { web: (v) => v, linkedin: (v) => v, email: (v) => `mailto:${v}` };

const S = P.sobre_mi;
const lineas = [
  pieza("banner", `${P.nombre}. ${P.titular}: ${P.subtitular}. ${P.banner.map((b) => b[1]).join(". ")}.`),
  contactos.map((k) => enlace(HREF[k](P.contacto[k]), pieza(`contacto-${k}`, `${ETIQUETA[k]}: ${P.contacto[k]}`, anchoC))).join(""),
  pieza("sobre-mi", `Sobre mí. ${S.texto.join(" ")}`),
  pieza("trayectoria", `Trayectoria. ${P.trayectoria.map((i) => `${i.titulo}, ${i.lugar} (${i.desde} – ${i.hasta})`).join(". ")}.`),
  pieza("que-hago", `Qué hago. ${P.que_hago.map((i) => `${i.titulo}: ${i.texto}`).join(" ")}`),
  pieza("stack", `Con qué trabajo: ${P.stack.flatMap((g) => g.items.map((i) => i.nombre)).join(", ")}.`),
  P.proyectos.map((pr) => enlace(pr.web, pieza(`proyecto-${pr.id}`, `${pr.nombre}: ${pr.texto}`, "50%"))).join(""),
  pieza("colaboraciones", "Colaboraciones en repositorios de otros equipos y trabajo en repositorios privados de empresa."),
  pieza("actividad", "Actividad en GitHub durante el último año, incluidas las contribuciones privadas, y lenguajes de mis repositorios públicos."),
  `<br><sub>Hecho con SVG generados desde <a href="datos/perfil.json"><code>datos/perfil.json</code></a> · la actividad se actualiza sola cada día</sub>`,
];

const readme =
  `<!--\n` +
  `  Todo lo que se ve son SVG animados generados con Node desde datos/perfil.json\n` +
  `  (scripts/). Para cambiar algo, edita ese JSON: el workflow "Perfil" vuelve a\n` +
  `  dibujar las tarjetas y este README. La actividad se refresca sola cada día.\n` +
  `-->\n` +
  `<div align="center">\n${lineas.join("\n")}\n</div>\n`;

fs.writeFileSync(path.join(RAIZ, "README.md"), readme);
console.log("  README.md");
