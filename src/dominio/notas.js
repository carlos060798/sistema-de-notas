// @ts-check
// Reglas puras de notas. Sin base de datos ni HTTP (constitución: restricciones arquitectónicas).
// Escala 1,0 a 5,0; aprueba con 3,0 o más; definitiva del periodo = promedio simple de tres notas;
// definitiva del año = promedio simple de cuatro periodos. Un decimal, mitad hacia arriba.
// Todo el cálculo es con enteros para evitar errores de coma flotante.

export const NOTA_MIN = 1.0;
export const NOTA_MAX = 5.0;
export const UMBRAL_APROBACION = 3.0;
const MENSAJE_RANGO = 'La nota debe estar entre 1,0 y 5,0';

/**
 * @typedef {{ ok: true } | { ok: false, error: string }} ResultadoNota
 * @typedef {{ estado: 'completa', valor: number } | { estado: 'incompleta', valor: null }} Definitiva
 */

/** @param {unknown} n @returns {ResultadoNota} */
export function validarNota(n) {
  if (typeof n !== 'number' || !Number.isFinite(n)) return { ok: false, error: 'La nota debe ser un número' };
  if (n < NOTA_MIN || n > NOTA_MAX) return { ok: false, error: MENSAJE_RANGO };
  if (Math.abs(n * 100 - Math.round(n * 100)) > 1e-9) return { ok: false, error: 'La nota admite como máximo dos decimales' };
  return { ok: true };
}

/** Nota en centésimas enteras. @param {number} n */
const centesimas = (n) => Math.round(n * 100);

/**
 * Definitiva del periodo: (n1 + n2 + n3) / 3 con un decimal, mitad hacia arriba.
 * Si falta alguna nota queda incompleta. Una nota presente e inválida lanza error.
 * @param {number|null|undefined} n1 @param {number|null|undefined} n2 @param {number|null|undefined} n3
 * @returns {Definitiva}
 */
export function definitivaPeriodo(n1, n2, n3) {
  const notas = [n1, n2, n3];
  if (notas.some((n) => n === null || n === undefined)) return { estado: 'incompleta', valor: null };
  let suma = 0;
  for (const n of notas) {
    const v = validarNota(n);
    if (!v.ok) throw new RangeError(v.error);
    suma += centesimas(/** @type {number} */ (n));
  }
  // promedio en centésimas = suma / 3; a décimas con mitad hacia arriba: floor((suma/3 + 5) / 10)
  return { estado: 'completa', valor: Math.floor((suma + 15) / 30) / 10 };
}

/**
 * Definitiva del año: promedio simple de los cuatro periodos, un decimal, mitad hacia arriba.
 * Incompleta si no hay cuatro periodos o alguno está incompleto.
 * @param {Definitiva[]} periodos @returns {Definitiva}
 */
export function definitivaAnio(periodos) {
  if (periodos.length !== 4 || periodos.some((p) => p.estado !== 'completa')) return { estado: 'incompleta', valor: null };
  const decimas = periodos.reduce((s, p) => s + Math.round(/** @type {number} */ (p.valor) * 10), 0);
  // promedio en décimas = decimas / 4; mitad hacia arriba: floor((decimas + 2) / 4)
  return { estado: 'completa', valor: Math.floor((decimas + 2) / 4) / 10 };
}

/**
 * @param {number|null} definitiva @param {number} [umbral]
 * @returns {boolean|null} null si la definitiva está incompleta
 */
export function aprobado(definitiva, umbral = UMBRAL_APROBACION) {
  if (definitiva === null || definitiva === undefined) return null;
  return Math.round(definitiva * 10) >= Math.round(umbral * 10);
}
