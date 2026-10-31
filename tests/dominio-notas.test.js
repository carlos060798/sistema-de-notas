// @ts-check
// Reglas de notas (spec 2026-10-31-nucleo-notas-y-respaldo, CA-002-01 a CA-002-06).
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  validarNota, definitivaPeriodo, definitivaAnio, aprobado, UMBRAL_APROBACION,
} from '../src/dominio/notas.js';

describe('validarNota (CA-002-01)', () => {
  test('acepta los extremos 1,0 y 5,0 y valores intermedios', () => {
    for (const n of [1, 1.0, 2.5, 3, 4.99, 5]) assert.equal(validarNota(n).ok, true, String(n));
  });
  test('rechaza fuera de rango con el mensaje del docente', () => {
    for (const n of [0.9, 0, -1, 5.01, 6.5]) {
      const r = validarNota(n);
      assert.equal(r.ok, false, String(n));
      assert.equal(/** @type {any} */ (r).error, 'La nota debe estar entre 1,0 y 5,0');
    }
  });
  test('rechaza lo que no es un número finito', () => {
    for (const n of [NaN, Infinity, '4', null, undefined, {}]) {
      assert.equal(validarNota(/** @type {any} */ (n)).ok, false, String(n));
    }
  });
  test('rechaza más de dos decimales', () => {
    assert.equal(validarNota(3.456).ok, false);
    assert.equal(validarNota(3.45).ok, true);
  });
});

describe('definitivaPeriodo (CA-002-03)', () => {
  test('promedio simple de las tres notas', () => {
    assert.deepEqual(definitivaPeriodo(4.0, 3.5, 4.5), { estado: 'completa', valor: 4.0 });
  });
  test('un decimal, la mitad hacia arriba', () => {
    assert.equal(definitivaPeriodo(4, 4, 4.5).valor, 4.2); // 4,1666 -> 4,2
    assert.equal(definitivaPeriodo(3.5, 4, 4).valor, 3.8); // 3,8333 -> 3,8
    assert.equal(definitivaPeriodo(4.2, 4.2, 4.35).valor, 4.3); // 4,2500 -> 4,3 (mitad hacia arriba)
  });
  test('sin errores de coma flotante en los casos de la mitad', () => {
    assert.equal(definitivaPeriodo(3.1, 3.1, 3.1).valor, 3.1);
    assert.equal(definitivaPeriodo(2.9, 3.0, 3.1).valor, 3.0);
    assert.equal(definitivaPeriodo(1.0, 1.0, 1.15).valor, 1.1); // 1,0500 -> 1,1
  });
  test('si falta una nota queda incompleta y no se calcula', () => {
    assert.deepEqual(definitivaPeriodo(4, null, 3), { estado: 'incompleta', valor: null });
    assert.deepEqual(definitivaPeriodo(undefined, undefined, undefined), { estado: 'incompleta', valor: null });
  });
  test('una nota inválida lanza error, no se promedia en silencio', () => {
    assert.throws(() => definitivaPeriodo(6, 3, 3), /entre 1,0 y 5,0/);
  });
});

describe('definitivaAnio (CA-002-06)', () => {
  /** @param {number} v @returns {import('../src/dominio/notas.js').Definitiva} */
  const p = (v) => ({ estado: 'completa', valor: v });
  test('promedio simple de los cuatro periodos', () => {
    assert.deepEqual(definitivaAnio([p(4), p(3), p(5), p(4)]), { estado: 'completa', valor: 4.0 });
  });
  test('mitad hacia arriba a un decimal', () => {
    assert.equal(definitivaAnio([p(3.0), p(3.0), p(3.0), p(3.1)]).valor, 3.0); // 3,025 -> 3,0
    assert.equal(definitivaAnio([p(3.0), p(3.0), p(3.1), p(3.1)]).valor, 3.1); // 3,05 -> 3,1
  });
  test('incompleta si algún periodo falta o está incompleto', () => {
    /** @type {import('../src/dominio/notas.js').Definitiva} */
    const inc = { estado: 'incompleta', valor: null };
    assert.equal(definitivaAnio([p(4), inc, p(4), p(4)]).estado, 'incompleta');
    assert.equal(definitivaAnio([p(4), p(4), p(4)]).estado, 'incompleta');
  });
});

describe('aprobado (CA-002-02)', () => {
  test('el umbral por defecto es 3,0', () => assert.equal(UMBRAL_APROBACION, 3.0));
  test('3,0 aprueba; menos de 3,0 no', () => {
    assert.equal(aprobado(3.0), true);
    assert.equal(aprobado(5), true);
    assert.equal(aprobado(2.9), false);
    assert.equal(aprobado(1), false);
  });
  test('el umbral es configurable', () => {
    assert.equal(aprobado(3.0, 3.5), false);
    assert.equal(aprobado(3.5, 3.5), true);
  });
  test('una definitiva incompleta no es ni aprobada ni desaprobada', () => {
    assert.equal(aprobado(null), null);
  });
  test('2,96 se redondea a 3,0 en la definitiva y por tanto aprueba', () => {
    const d = definitivaPeriodo(2.9, 3.0, 3.0); // 2,9666 -> 3,0
    assert.equal(d.valor, 3.0);
    assert.equal(aprobado(d.valor), true);
  });
});
