// @ts-check
// Copia a una carpeta adicional (por ejemplo una memoria USB): si el portátil se daña, la copia sigue viva fuera de él.
import fs from 'node:fs';
import path from 'node:path';
import { crearCopia, aplicarRetencion } from './respaldo.js';
import { ErrorValidacion } from '../servicios/academico.js';

/** @typedef {import('node:sqlite').DatabaseSync} Db */
const CLAVE = 'respaldo.carpeta_extra';

/** @param {Db} db @returns {string} carpeta configurada, o '' si no hay */
export function leerCarpetaExtra(db) {
  const f = /** @type {{ valor: string } | undefined} */ (db.prepare('select valor from config where clave = ?').get(CLAVE));
  return f?.valor ?? '';
}

/**
 * Guarda la carpeta extra (vacía = quitarla). Debe ser una ruta completa; se intenta crearla para avisar ya si no se puede.
 * @param {Db} db @param {string} carpeta
 */
export function guardarCarpetaExtra(db, carpeta) {
  const c = String(carpeta ?? '').trim();
  if (!c) { db.prepare('delete from config where clave = ?').run(CLAVE); return ''; }
  if (!path.isAbsolute(c)) throw new ErrorValidacion('Escriba la ruta completa de la carpeta, por ejemplo E:\\Respaldos (la letra de su memoria USB)');
  try { fs.mkdirSync(c, { recursive: true }); fs.accessSync(c, fs.constants.W_OK); }
  catch { throw new ErrorValidacion('No se puede escribir en esa carpeta. Revise que la memoria USB esté conectada y que la ruta esté bien escrita'); }
  db.prepare('insert into config(clave, valor) values (?, ?) on conflict(clave) do update set valor = excluded.valor').run(CLAVE, c);
  return c;
}

/**
 * Hace una copia en la carpeta extra, si hay. Nunca lanza: si la memoria no está conectada, lo informa y el programa sigue.
 * @param {Db} db @param {string} motivo @param {number} retencion
 * @returns {{ estado: 'sin-configurar' | 'ok' | 'fallo', carpeta: string, mensaje: string }}
 */
export function copiarAExtra(db, motivo, retencion) {
  const carpeta = leerCarpetaExtra(db);
  if (!carpeta) return { estado: 'sin-configurar', carpeta: '', mensaje: '' };
  try {
    crearCopia(db, carpeta, motivo); aplicarRetencion(carpeta, retencion);
    return { estado: 'ok', carpeta, mensaje: `Copia guardada también en ${carpeta}` };
  } catch (e) {
    return { estado: 'fallo', carpeta, mensaje: `No se pudo copiar a ${carpeta}: ${/** @type {Error} */ (e).message}. ¿Está conectada la memoria USB?` };
  }
}
