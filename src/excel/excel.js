// @ts-check
// Excel como seguro de vida (spec HU-008; constitución, Principio IV).
// Exporta todas las tablas a un .xlsx (una hoja por tabla + `_version`) y reconstruye desde él.
// Importar es todo o nada: primero se simula dentro de una transacción que siempre se revierte,
// y solo si no hay errores (y, si había datos, el docente confirmó) se aplica de verdad.
import fs from 'node:fs';
import path from 'node:path';
import ExcelJS from 'exceljs';
import { conTransaccion, VERSION_ESQUEMA } from '../datos/base.js';
import { validarNota } from '../dominio/notas.js';

/** Orden de dependencias: los padres antes que los hijos. */
export const TABLAS = ['anio_lectivo', 'grado', 'materia', 'estudiante', 'matricula', 'nota', 'nivelacion', 'config', 'plan', 'guia', 'tema', 'clase', 'asistencia', 'observacion'];
const COLUMNAS_NOTA = /** @type {Record<string, string[]>} */ ({ nota: ['n1', 'n2', 'n3'], nivelacion: ['nota'] });
const CON_DATOS_DEL_DOCENTE = ['anio_lectivo', 'materia', 'estudiante', 'matricula', 'nota', 'nivelacion', 'config', 'plan', 'guia', 'tema', 'clase', 'asistencia', 'observacion'];

/** @typedef {{ hoja: string, fila: number, columna: string | null, mensaje: string }} ErrorCelda */
/** @typedef {Record<string, { nuevos: number, cambiados: number, iguales: number }>} Resumen */

export class ErrorImportacion extends Error {
  /**
   * @param {'ARCHIVO'|'VERSION'|'INVALIDO'|'CONFIRMACION'|'OTRA_BASE'} codigo @param {string} mensaje
   * @param {{ errores?: ErrorCelda[], resumen?: Resumen | null }} [extra]
   */
  constructor(codigo, mensaje, extra = {}) {
    super(mensaje);
    this.name = 'ErrorImportacion';
    this.codigo = codigo;
    this.errores = extra.errores ?? [];
    this.resumen = extra.resumen ?? null;
  }
}

/** @param {import('node:sqlite').DatabaseSync} db @param {string} tabla */
function columnasDe(db, tabla) {
  return /** @type {{ name: string, type: string, notnull: number, dflt_value: string | null, pk: number }[]} */ (
    /** @type {any} */ (db.prepare(`pragma table_info(${tabla})`).all()));
}

/**
 * @param {import('node:sqlite').DatabaseSync} db @param {string} ruta
 */
export async function exportarExcel(db, ruta) {
  const wb = new ExcelJS.Workbook();
  const v = wb.addWorksheet('_version');
  v.addRow(['esquema', VERSION_ESQUEMA]);
  v.addRow(['programa', 'sistema-de-notas']);
  v.addRow(['base_id', idDeBase(db) ?? '']);
  for (const t of TABLAS) {
    const ws = wb.addWorksheet(t);
    const cols = columnasDe(db, t).map((c) => c.name);
    ws.addRow(cols).font = { bold: true };
    for (const fila of db.prepare(`select * from ${t} order by 1`).all()) ws.addRow(cols.map((c) => /** @type {any} */ (fila)[c]));
  }
  fs.mkdirSync(path.dirname(ruta), { recursive: true });
  await wb.xlsx.writeFile(ruta);
}

/** Identidad de la base (la crea abrirBase). @param {import('node:sqlite').DatabaseSync} db */
function idDeBase(db) {
  const f = /** @type {{ valor: string } | undefined} */ (db.prepare("select valor from config where clave = 'base.id'").get());
  return f?.valor ?? null;
}
/** ¿La base tiene datos del docente? (el código de identidad no cuenta). @param {import('node:sqlite').DatabaseSync} db */
function hayDatosDelDocente(db) {
  return CON_DATOS_DEL_DOCENTE.some((t) => Number(db.prepare(t === 'config' ? "select count(*) n from config where clave <> 'base.id'" : `select count(*) n from ${t}`).get()?.n) > 0);
}
/**
 * Si el Excel viene de OTRA base y esta ya tiene datos, no se importa: se emparejan los registros por número
 * interno y se pisarían personas o materias distintas. (Un Excel sin código es de una versión anterior: se acepta.)
 * @param {import('node:sqlite').DatabaseSync} db @param {ExcelJS.Workbook} wb
 */
function exigirMismaBase(db, wb) {
  const v = wb.getWorksheet('_version');
  const delExcel = v ? String(v.getCell('B3').value ?? '') : '';
  if (v?.getCell('A3').value === 'base_id' && delExcel && delExcel !== idDeBase(db) && hayDatosDelDocente(db)) {
    throw new ErrorImportacion('OTRA_BASE', 'Este Excel es el respaldo de OTRA base de datos, no de la que está abierta. Para no mezclar ni pisar estudiantes distintos, no se importó nada. Para usarlo, abra el programa en una carpeta de datos nueva (vacía) e impórtelo allí.');
  }
}

/** @param {string} ruta */
async function leerLibro(ruta) {
  const wb = new ExcelJS.Workbook();
  try { await wb.xlsx.readFile(ruta); }
  catch (e) { throw new ErrorImportacion('ARCHIVO', `No se pudo leer el archivo como Excel: ${/** @type {Error} */ (e).message}`); }
  const v = wb.getWorksheet('_version');
  if (!v || v.getCell('A1').value !== 'esquema') {
    throw new ErrorImportacion('VERSION', `Este archivo no es un respaldo de este programa (falta la hoja _version). Solo se entiende el esquema ${VERSION_ESQUEMA}.`);
  }
  const version = Number(v.getCell('B1').value);
  if (version !== VERSION_ESQUEMA) {
    throw new ErrorImportacion('VERSION', `Este respaldo es del esquema ${version}; este programa solo entiende el esquema ${VERSION_ESQUEMA}.`);
  }
  return wb;
}

/** @param {any} v @returns {{ valor: any } | { error: string }} */
function normalizar(v) {
  if (v === undefined || v === null) return { valor: null };
  if (v instanceof Date) return { error: 'Las fechas deben escribirse como texto (AAAA-MM-DD)' };
  if (typeof v === 'object') {
    if ('result' in v) return normalizar(v.result);
    if (Array.isArray(v.richText)) return normalizar(v.richText.map((/** @type {any} */ x) => x.text).join(''));
    if ('text' in v) return normalizar(v.text);
    return { error: 'Contenido no admitido en la celda' };
  }
  if (typeof v === 'string') return { valor: v.trim() === '' ? null : v };
  return { valor: v };
}

/** @param {string} msg */
function traducirErrorBase(msg) {
  if (/CHECK constraint/i.test(msg)) return 'El valor no cumple una regla (por ejemplo, un rango permitido)';
  if (/FOREIGN KEY/i.test(msg)) return 'Hace referencia a un registro que no existe';
  if (/UNIQUE|PRIMARY KEY/i.test(msg)) return 'Valor repetido: ya existe en otra fila';
  return msg;
}

const FIN_SIMULACION = Symbol('fin-simulacion');

/**
 * Recorre el libro. Con `aplicar` falso, todo se revierte al final. Siempre devuelve errores y resumen.
 * @param {import('node:sqlite').DatabaseSync} db @param {ExcelJS.Workbook} wb @param {boolean} aplicar
 * @returns {{ errores: ErrorCelda[], resumen: Resumen }}
 */
function procesar(db, wb, aplicar) {
  /** @type {ErrorCelda[]} */ const errores = [];
  /** @type {Resumen} */ const resumen = {};
  const hojasConocidas = new Set(['_version', ...TABLAS]);
  for (const ws of wb.worksheets) {
    if (!hojasConocidas.has(ws.name)) errores.push({ hoja: ws.name, fila: 0, columna: null, mensaje: 'Hoja desconocida: no pertenece a este respaldo' });
  }
  try {
    conTransaccion(db, () => {
      for (const t of TABLAS) {
        resumen[t] = { nuevos: 0, cambiados: 0, iguales: 0 };
        const ws = wb.getWorksheet(t);
        if (!ws) { errores.push({ hoja: t, fila: 0, columna: null, mensaje: 'Falta la hoja' }); continue; }
        const cols = columnasDe(db, t);
        const encabezado = /** @type {any[]} */ (ws.getRow(1).values).slice(1).map((x) => (x == null ? '' : String(x)));
        const esperado = cols.map((c) => c.name);
        if (encabezado.length !== esperado.length || esperado.some((n, i) => encabezado[i] !== n)) {
          errores.push({ hoja: t, fila: 1, columna: null, mensaje: `Las columnas no coinciden. Se esperaba: ${esperado.join(', ')}` });
          continue;
        }
        const pk = cols.find((c) => c.pk === 1)?.name ?? cols[0].name;
        const buscar = db.prepare(`select * from ${t} where ${pk} = ?`);
        const sinPk = cols.filter((c) => c.name !== pk);
        const upsert = db.prepare(
          `insert into ${t}(${cols.map((c) => c.name).join(',')}) values (${cols.map(() => '?').join(',')}) ` +
          `on conflict(${pk}) do update set ${sinPk.map((c) => `${c.name}=excluded.${c.name}`).join(',')}`);
        // Los planes de aula apuntan a un plan de área: se cargan después de los de área, sin importar el orden de las filas.
        const filasOrden = Array.from({ length: Math.max(0, ws.rowCount - 1) }, (_, i) => i + 2);
        if (t === 'plan') { const ip = esperado.indexOf('plan_area_id') + 1; filasOrden.sort((x, y) => Number(ws.getRow(x).getCell(ip).value != null) - Number(ws.getRow(y).getCell(ip).value != null)); }
        for (const r of filasOrden) {
          const fila = ws.getRow(r);
          /** @type {Record<string, any>} */ const reg = {};
          let vacia = true; let malo = false;
          cols.forEach((c, i) => {
            const n = normalizar(fila.getCell(i + 1).value);
            if ('error' in n) { errores.push({ hoja: t, fila: r, columna: c.name, mensaje: n.error }); malo = true; return; }
            let v = n.valor;
            if (v !== null) vacia = false;
            if (v === null) {
              if (c.pk > 0) { errores.push({ hoja: t, fila: r, columna: c.name, mensaje: 'Es obligatorio' }); malo = true; return; }
              if (c.notnull) {
                if (c.dflt_value === null) { errores.push({ hoja: t, fila: r, columna: c.name, mensaje: 'Es obligatorio' }); malo = true; return; }
                v = c.dflt_value === "''" ? '' : Number(c.dflt_value);
              }
            } else {
              const tipo = c.type.toUpperCase();
              if (tipo === 'INTEGER' && !(typeof v === 'number' && Number.isInteger(v))) { errores.push({ hoja: t, fila: r, columna: c.name, mensaje: 'Debe ser un número entero' }); malo = true; return; }
              if (tipo === 'REAL' && typeof v !== 'number') { errores.push({ hoja: t, fila: r, columna: c.name, mensaje: 'Debe ser un número' }); malo = true; return; }
              if (tipo === 'TEXT') { if (typeof v === 'number') v = String(v); else if (typeof v !== 'string') { errores.push({ hoja: t, fila: r, columna: c.name, mensaje: 'Debe ser texto' }); malo = true; return; } }
              if (COLUMNAS_NOTA[t]?.includes(c.name)) {
                const val = validarNota(v);
                if (!val.ok) { errores.push({ hoja: t, fila: r, columna: c.name, mensaje: val.error }); malo = true; return; }
              }
            }
            reg[c.name] = v;
          });
          if (vacia) continue;
          if (malo) continue;
          const previo = /** @type {Record<string, any> | undefined} */ (buscar.get(reg[pk]));
          const estado = !previo ? 'nuevos' : cols.every((c) => previo[c.name] === reg[c.name]) ? 'iguales' : 'cambiados';
          try {
            upsert.run(...cols.map((c) => reg[c.name]));
            resumen[t][estado]++;
          } catch (e) {
            errores.push({ hoja: t, fila: r, columna: null, mensaje: traducirErrorBase(/** @type {Error} */ (e).message) });
          }
        }
      }
      if (errores.length || !aplicar) throw FIN_SIMULACION;
    });
  } catch (e) {
    if (e !== FIN_SIMULACION) throw e;
  }
  return { errores, resumen };
}

/**
 * Simula la importación sin modificar la base: devuelve errores con hoja, fila y columna, y el resumen.
 * @param {import('node:sqlite').DatabaseSync} db @param {string} ruta
 */
export async function analizarExcel(db, ruta) {
  const wb = await leerLibro(ruta);
  exigirMismaBase(db, wb);
  return procesar(db, wb, false);
}

/**
 * Reconstruye o actualiza la base desde un respaldo Excel. Todo o nada.
 * Si la base ya tiene datos, exige `confirmar: true` (el docente ve antes el resumen).
 * @param {import('node:sqlite').DatabaseSync} db @param {string} ruta @param {{ confirmar?: boolean }} [opciones]
 */
export async function importarExcel(db, ruta, opciones = {}) {
  const wb = await leerLibro(ruta);
  exigirMismaBase(db, wb);
  const simulacion = procesar(db, wb, false);
  if (simulacion.errores.length) {
    throw new ErrorImportacion('INVALIDO', `El Excel tiene ${simulacion.errores.length} problema(s); no se cambió nada.`, simulacion);
  }
  const hayDatos = hayDatosDelDocente(db);
  if (hayDatos && !opciones.confirmar) {
    throw new ErrorImportacion('CONFIRMACION', 'La base ya tiene datos. Revise el resumen y confirme para aplicar.', { resumen: simulacion.resumen });
  }
  procesar(db, wb, true);
  return simulacion;
}
