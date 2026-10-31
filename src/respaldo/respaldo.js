// @ts-check
// Copias de seguridad y recuperación (spec HU-007; constitución, Principio III).
// Las copias se hacen con `VACUUM INTO`: son coherentes aunque la base esté en uso.
import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { VERSION_ESQUEMA } from '../datos/base.js';

const PATRON = /^notas-(\d{8})-(\d{9})-([a-z]+(?:-[a-z]+)*)\.db$/;
const AUTOMATICOS = new Set(['abrir', 'cerrar']);
const MAX_ANTES_DE_RESTAURAR = 5;

let ultimoMs = 0;
/** Marca de tiempo estrictamente creciente en este proceso: YYYYMMDD-HHMMSSmmm (hora local). */
function marca() {
  ultimoMs = Math.max(Date.now(), ultimoMs + 1);
  const d = new Date(ultimoMs);
  const p = (/** @type {number} */ n, /** @type {number} */ l = 2) => String(n).padStart(l, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}${p(d.getMilliseconds(), 3)}`;
}

/** @param {string} ruta */
const sqlRuta = (ruta) => ruta.split(path.sep).join('/').replace(/'/g, "''");

/**
 * Crea una copia íntegra de la base abierta.
 * @param {DatabaseSync} db @param {string} carpeta @param {string} motivo minúsculas y guiones
 * @returns {string} ruta de la copia
 */
export function crearCopia(db, carpeta, motivo) {
  if (!/^[a-z]+(?:-[a-z]+)*$/.test(motivo)) throw new Error('Motivo de copia no válido');
  fs.mkdirSync(carpeta, { recursive: true });
  const ruta = path.join(carpeta, `notas-${marca()}-${motivo}.db`);
  db.exec(`vacuum into '${sqlRuta(ruta)}'`);
  return ruta;
}

/**
 * Copias de una carpeta, de la más nueva a la más vieja. Ignora archivos ajenos.
 * @param {string} carpeta @returns {{ ruta: string, nombre: string, motivo: string }[]}
 */
export function listarCopias(carpeta) {
  if (!fs.existsSync(carpeta)) return [];
  return fs.readdirSync(carpeta)
    .map((nombre) => ({ nombre, m: PATRON.exec(nombre) }))
    .filter((x) => x.m)
    .sort((a, b) => (a.nombre < b.nombre ? 1 : -1))
    .map((x) => ({ ruta: path.join(carpeta, x.nombre), nombre: x.nombre, motivo: /** @type {RegExpExecArray} */ (x.m)[3] }));
}

/**
 * Borra las copias automáticas sobrantes (deja las `n` más nuevas) y las de «antes de restaurar» o
 * «antes de importar» por encima del tope. Las manuales no se borran nunca.
 * @param {string} carpeta @param {number} n
 */
export function aplicarRetencion(carpeta, n) {
  const copias = listarCopias(carpeta);
  const sobrantes = [
    ...copias.filter((c) => AUTOMATICOS.has(c.motivo)).slice(n),
    ...copias.filter((c) => c.motivo.startsWith('antes-de-')).slice(MAX_ANTES_DE_RESTAURAR),
  ];
  for (const c of sobrantes) fs.rmSync(c.ruta, { force: true });
}

/**
 * Comprueba que un archivo es una base íntegra y de una versión que este programa entiende.
 * No modifica nada (apertura de solo lectura).
 * @param {string} ruta @returns {{ ok: true } | { ok: false, motivo: string }}
 */
export function verificarCopia(ruta) {
  if (!fs.existsSync(ruta)) return { ok: false, motivo: 'El archivo no existe' };
  /** @type {DatabaseSync | undefined} */ let db;
  try {
    db = new DatabaseSync(ruta, { readOnly: true });
    const integridad = String(db.prepare('pragma integrity_check').get()?.integrity_check);
    if (integridad !== 'ok') return { ok: false, motivo: `La base está dañada: ${integridad.slice(0, 120)}` };
    const version = Number(db.prepare('pragma user_version').get()?.user_version ?? 0);
    if (version > VERSION_ESQUEMA) return { ok: false, motivo: `La base viene de una versión más nueva del programa (esquema ${version})` };
    if (version < 1) return { ok: false, motivo: 'El archivo no es una base de notas de este programa' };
    return { ok: true };
  } catch (e) {
    return { ok: false, motivo: `No se puede abrir como base de datos: ${/** @type {Error} */ (e).message}` };
  } finally {
    try { db?.close(); } catch { /* ya cerrada */ }
  }
}

/**
 * Restaura una copia sobre la base. La base debe estar CERRADA. Antes de tocar nada verifica la
 * copia; si la base actual existe, la guarda como copia «antes-de-restaurar» para poder deshacer.
 * @param {string} rutaBase @param {string} rutaCopia @param {string} carpetaCopias
 * @returns {{ antes: string | null }}
 */
export function restaurar(rutaBase, rutaCopia, carpetaCopias) {
  const v = verificarCopia(rutaCopia);
  if (!v.ok) throw new Error(`La copia no es válida; no se tocó la base actual. ${v.motivo}`);
  /** @type {string | null} */ let antes = null;
  if (fs.existsSync(rutaBase)) {
    fs.mkdirSync(carpetaCopias, { recursive: true });
    antes = path.join(carpetaCopias, `notas-${marca()}-antes-de-restaurar.db`);
    fs.copyFileSync(rutaBase, antes);
  }
  const tmp = `${rutaBase}.restaurando`;
  fs.copyFileSync(rutaCopia, tmp);
  for (const extra of ['-journal', '-wal', '-shm']) fs.rmSync(rutaBase + extra, { force: true });
  fs.renameSync(tmp, rutaBase);
  return { antes };
}

/**
 * Estado de la base al arrancar. Si está dañada, busca la última copia sana para ofrecerla.
 * No restaura nada por sí sola: decide el docente.
 * @param {string} rutaBase @param {string} carpetaCopias
 * @returns {{ estado: 'nueva' } | { estado: 'ok' } | { estado: 'danada', motivo: string, copiaSana: string | null }}
 */
export function diagnosticar(rutaBase, carpetaCopias) {
  if (!fs.existsSync(rutaBase)) return { estado: 'nueva' };
  const v = verificarCopia(rutaBase);
  if (v.ok) return { estado: 'ok' };
  const sana = listarCopias(carpetaCopias).find((c) => !c.motivo.startsWith('antes-de-') && verificarCopia(c.ruta).ok);
  return { estado: 'danada', motivo: v.motivo, copiaSana: sana ? sana.ruta : null };
}

/**
 * Copia en varias carpetas (por ejemplo un USB). Una carpeta no disponible no impide las demás.
 * @param {DatabaseSync} db @param {string[]} destinos @param {string} motivo
 * @returns {{ hechas: string[], fallidas: { destino: string, motivo: string }[] }}
 */
export function copiarAVarios(db, destinos, motivo) {
  /** @type {string[]} */ const hechas = [];
  /** @type {{ destino: string, motivo: string }[]} */ const fallidas = [];
  for (const destino of destinos) {
    try { hechas.push(crearCopia(db, destino, motivo)); }
    catch (e) { fallidas.push({ destino, motivo: /** @type {Error} */ (e).message }); }
  }
  return { hechas, fallidas };
}
