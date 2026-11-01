// @ts-check
// Criterios de la spec que faltaban tras cruzarla con lo construido: CA-002-02, 004-02/03, 005-02, 006-02/03/04, 009-02.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { abrirBase } from '../src/datos/base.js';
import * as A from '../src/servicios/academico.js';
import * as P from '../src/servicios/planeacion.js';
import { datosBoletin } from '../src/reportes/datos.js';
import { exportarExcel, importarExcel } from '../src/excel/excel.js';

function prep() {
  const db = abrirBase(':memory:'); const anio = A.crearAnio(db, 2026); const mat = A.crearMateria(db, 'Matemáticas');
  const est = A.crearEstudiante(db, { nombre: 'Ana', documento: null, grado: 1, anio_id: anio.id });
  return { db, anio, mat, est };
}
const notas4 = (/** @type {any} */ db, /** @type {number} */ mid, /** @type {number} */ mat, /** @type {number} */ v) => { for (let p = 1; p <= 4; p++) A.guardarNotas(db, { matricula_id: mid, materia_id: mat, periodo: p, n1: v, n2: v, n3: v }); };

describe('CA-002-02: nota mínima para aprobar configurable', () => {
  test('por defecto 3,0; al subirla a 3,5 una definitiva 3,2 pasa a no aprobada en notas, listas y boletín', () => {
    const { db, anio, mat, est } = prep(); notas4(db, est.matricula_id, mat.id, 3.2);
    assert.equal(A.leerUmbral(db), 3);
    assert.equal(A.listarNotas(db, { anio_id: anio.id, grado: 1, materia_id: mat.id, periodo: 1 })[0].aprobado, true);
    A.guardarUmbral(db, 3.5);
    assert.equal(A.listarNotas(db, { anio_id: anio.id, grado: 1, materia_id: mat.id, periodo: 1 })[0].aprobado, false);
    assert.equal(A.desaprobadas(db, { anio_id: anio.id, base: 'anio' }).length, 1);
    assert.equal(datosBoletin(db, { anio_id: anio.id, matricula_id: est.matricula_id }).umbral, 3.5);
    assert.equal(A.guardarNotas(db, { matricula_id: est.matricula_id, materia_id: mat.id, periodo: 1, n1: 3.2, n2: 3.2, n3: 3.2 }).aprobado, false);
  });
  test('rechaza valores fuera de 2,0 a 4,0 o con más de un decimal', () => {
    const { db } = prep();
    for (const v of [1.9, 4.1, 3.25, NaN]) assert.throws(() => A.guardarUmbral(db, v), A.ErrorValidacion);
    assert.equal(A.guardarUmbral(db, 3.3), 3.3);
  });
});

describe('planes (CA-004-02 y 04-03)', () => {
  test('un plan de aula se asocia a un plan de área de la misma materia y grado, y a un periodo', () => {
    const { db, anio, mat } = prep(); const otra = A.crearMateria(db, 'Lenguaje');
    const area = P.guardarPlan(db, { tipo: 'area', anio_id: anio.id, materia_id: mat.id, grado: 1, titulo: 'Área', periodo: 3, plan_area_id: 99 });
    const aula = P.guardarPlan(db, { tipo: 'aula', anio_id: anio.id, materia_id: mat.id, grado: 1, titulo: 'Aula P2', periodo: 2, plan_area_id: area.id });
    const lista = P.listarPlanes(db, { anio_id: anio.id });
    const a = lista.find((p) => p.id === aula.id); const r = lista.find((p) => p.id === area.id);
    assert.deepEqual([a.periodo, a.plan_area_id], [2, area.id]);
    assert.deepEqual([r.periodo, r.plan_area_id], [null, null]); // el de área no lleva periodo ni plan de área
    assert.throws(() => P.guardarPlan(db, { tipo: 'aula', anio_id: anio.id, materia_id: otra.id, grado: 1, titulo: 'x', plan_area_id: area.id }), /misma materia y grado/);
    assert.throws(() => P.guardarPlan(db, { tipo: 'aula', anio_id: anio.id, materia_id: mat.id, grado: 1, titulo: 'x', plan_area_id: aula.id }), /plan de área elegido/);
    assert.throws(() => P.guardarPlan(db, { tipo: 'aula', anio_id: anio.id, materia_id: mat.id, grado: 1, titulo: 'x', periodo: 5 }), /periodo/);
  });
  test('copiar al año siguiente conserva el enlace aula→área, no duplica y exige año destino abierto', () => {
    const { db, anio, mat } = prep(); const sig = A.crearAnio(db, 2027);
    const area = P.guardarPlan(db, { tipo: 'area', anio_id: anio.id, materia_id: mat.id, grado: 1, titulo: 'Área', contenido: 'obj' });
    P.guardarPlan(db, { tipo: 'aula', anio_id: anio.id, materia_id: mat.id, grado: 1, titulo: 'Aula', periodo: 1, plan_area_id: area.id });
    assert.deepEqual(P.copiarPlanes(db, { desde_anio_id: anio.id, hasta_anio_id: sig.id }), { copiados: 2, omitidos: 0 });
    const nuevos = P.listarPlanes(db, { anio_id: sig.id });
    const nArea = nuevos.find((p) => p.tipo === 'area'); const nAula = nuevos.find((p) => p.tipo === 'aula');
    assert.equal(nAula.plan_area_id, nArea.id); assert.notEqual(nArea.id, area.id); assert.equal(nArea.contenido, 'obj');
    assert.deepEqual(P.copiarPlanes(db, { desde_anio_id: anio.id, hasta_anio_id: sig.id }), { copiados: 0, omitidos: 2 });
    assert.throws(() => P.copiarPlanes(db, { desde_anio_id: anio.id, hasta_anio_id: anio.id }), /distintos/);
    A.cerrarAnio(db, sig.id);
    assert.throws(() => P.copiarPlanes(db, { desde_anio_id: anio.id, hasta_anio_id: sig.id }), /cerrado/);
  });
});

describe('guías, avance y clases', () => {
  test('CA-005-02: se buscan guías por palabra en tema, título o contenido', () => {
    const { db, mat } = prep();
    P.guardarGuia(db, { materia_id: mat.id, grado: 1, tema: 'Sumas', titulo: 'Guía 1', contenido: 'Usar fichas de colores' });
    P.guardarGuia(db, { materia_id: mat.id, grado: 1, tema: 'Restas', titulo: 'Guía del río', contenido: 'x' });
    assert.deepEqual(P.listarGuias(db, { texto: 'fichas' }).map((g) => g.titulo), ['Guía 1']);
    assert.deepEqual(P.listarGuias(db, { texto: 'río' }).map((g) => g.titulo), ['Guía del río']);
    assert.deepEqual(P.listarGuias(db, { texto: 'REST' }).map((g) => g.titulo), ['Guía del río']);
    assert.equal(P.listarGuias(db, { texto: '100%' }).length, 0); // el % no es comodín
  });
  test('CA-006-02: el avance se calcula también por periodo', () => {
    const { db, anio, mat } = prep(); const b = { anio_id: anio.id, materia_id: mat.id, grado: 1 };
    const t1 = P.guardarTema(db, { ...b, periodo: 1, nombre: 'A' }); P.guardarTema(db, { ...b, periodo: 1, nombre: 'B' }); P.guardarTema(db, { ...b, periodo: 2, nombre: 'C' });
    P.cambiarEstadoTema(db, t1.id, 'visto', '2026-02-02');
    assert.equal(P.avanceTemas(db, { ...b, periodo: 1 }).porcentaje, 50);
    assert.equal(P.avanceTemas(db, { ...b, periodo: 2 }).porcentaje, 0);
    assert.equal(P.avanceTemas(db, b).porcentaje, 33);
  });
  test('CA-006-03: una clase se vincula a un tema y a una guía', () => {
    const { db, anio, mat } = prep(); const g = P.guardarGuia(db, { materia_id: mat.id, grado: 1, tema: 'T', titulo: 'G' });
    const c = P.guardarClase(db, { anio_id: anio.id, materia_id: mat.id, grado: 1, fecha: '2026-03-02', guia_id: g.id });
    assert.equal(P.listarClases(db, { anio_id: anio.id }).find((x) => x.id === c.id).guia_id, g.id);
    assert.throws(() => P.guardarClase(db, { anio_id: anio.id, materia_id: mat.id, grado: 1, fecha: '2026-03-03', guia_id: 999 }), /guía/);
  });
});

describe('asistencia y observaciones', () => {
  test('CA-006-04: asistencia por fecha y grado, se corrige, se borra y cuenta ausencias', () => {
    const { db, anio, est } = prep();
    P.guardarAsistencia(db, { matricula_id: est.matricula_id, fecha: '2026-03-02', estado: 'ausente' });
    P.guardarAsistencia(db, { matricula_id: est.matricula_id, fecha: '2026-03-03', estado: 'ausente' });
    P.guardarAsistencia(db, { matricula_id: est.matricula_id, fecha: '2026-03-03', estado: 'excusa' }); // corrección
    const l = P.listarAsistencia(db, { anio_id: anio.id, grado: 1, fecha: '2026-03-02' });
    assert.deepEqual([l[0].estado, l[0].ausencias], ['ausente', 1]);
    P.guardarAsistencia(db, { matricula_id: est.matricula_id, fecha: '2026-03-02', estado: null });
    assert.equal(P.listarAsistencia(db, { anio_id: anio.id, grado: 1, fecha: '2026-03-02' })[0].estado, null);
    assert.throws(() => P.guardarAsistencia(db, { matricula_id: est.matricula_id, fecha: '2026-03-02', estado: 'tarde' }), /presente, ausente o excusa/);
    assert.throws(() => P.guardarAsistencia(db, { matricula_id: est.matricula_id, fecha: '31-12-2026', estado: 'presente' }), /fecha/);
    A.cerrarAnio(db, anio.id);
    assert.throws(() => P.guardarAsistencia(db, { matricula_id: est.matricula_id, fecha: '2026-03-02', estado: 'presente' }), /cerrado/);
  });
  test('CA-009-02: la observación sale en el boletín y se puede quitar', () => {
    const { db, anio, mat, est } = prep(); notas4(db, est.matricula_id, mat.id, 4);
    P.guardarObservacion(db, { matricula_id: est.matricula_id, texto: '  Muy buen trabajo en clase  ' });
    assert.equal(datosBoletin(db, { anio_id: anio.id, matricula_id: est.matricula_id }).observacion, 'Muy buen trabajo en clase');
    P.guardarObservacion(db, { matricula_id: est.matricula_id, texto: ' ' });
    assert.equal(datosBoletin(db, { anio_id: anio.id, matricula_id: est.matricula_id }).observacion, '');
    assert.throws(() => P.guardarObservacion(db, { matricula_id: est.matricula_id, texto: 'x'.repeat(1001) }), /demasiado larga/);
  });
});

test('Excel de ida y vuelta con los datos nuevos, incluso si el plan de aula tiene un número menor que su plan de área', async () => {
  const { db, anio, mat, est } = prep();
  const aula = P.guardarPlan(db, { tipo: 'aula', anio_id: anio.id, materia_id: mat.id, grado: 1, titulo: 'Aula', periodo: 1 });
  const area = P.guardarPlan(db, { tipo: 'area', anio_id: anio.id, materia_id: mat.id, grado: 1, titulo: 'Área' });
  P.guardarPlan(db, { id: aula.id, tipo: 'aula', anio_id: anio.id, materia_id: mat.id, grado: 1, titulo: 'Aula', periodo: 1, plan_area_id: area.id }); // aula(1) → área(2)
  P.guardarAsistencia(db, { matricula_id: est.matricula_id, fecha: '2026-03-02', estado: 'ausente' });
  P.guardarObservacion(db, { matricula_id: est.matricula_id, texto: 'Obs' });
  A.guardarUmbral(db, 3.4);
  const x = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'sc-')), 'r.xlsx'); await exportarExcel(db, x);
  const db2 = abrirBase(':memory:'); await importarExcel(db2, x);
  assert.equal(P.listarPlanes(db2, { anio_id: anio.id, tipo: 'aula' })[0].plan_area_id, area.id);
  assert.equal(P.listarAsistencia(db2, { anio_id: anio.id, grado: 1, fecha: '2026-03-02' })[0].estado, 'ausente');
  assert.equal(P.leerObservacion(db2, est.matricula_id), 'Obs');
  assert.equal(A.leerUmbral(db2), 3.4);
});
