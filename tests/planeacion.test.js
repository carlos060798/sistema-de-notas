// @ts-check
// Planes de área/aula, guías, temas con avance y clases planeadas.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { abrirBase, VERSION_ESQUEMA } from '../src/datos/base.js';
import { crearAnio, crearMateria, ErrorValidacion } from '../src/servicios/academico.js';
import * as P from '../src/servicios/planeacion.js';
import { exportarExcel, importarExcel, TABLAS } from '../src/excel/excel.js';

function prep() {
  const db = abrirBase(':memory:');
  const anio = crearAnio(db, 2026); const mat = crearMateria(db, 'Matemáticas');
  return { db, anio, mat };
}

describe('planeación', () => {
  test('el esquema incluye las tablas nuevas y el Excel las respalda', () => {
    assert.ok(VERSION_ESQUEMA >= 2);
    for (const t of ['plan', 'guia', 'tema', 'clase']) assert.ok(TABLAS.includes(t), t);
  });
  test('planes: área (por materia y grado) y de aula; validan y listan', () => {
    const { db, anio, mat } = prep();
    const p = P.guardarPlan(db, { tipo: 'area', anio_id: anio.id, materia_id: mat.id, grado: 2, titulo: 'Plan de área', contenido: 'Competencias…' });
    P.guardarPlan(db, { tipo: 'aula', anio_id: anio.id, materia_id: mat.id, grado: 2, titulo: 'Plan de aula P1', contenido: 'x' });
    assert.equal(P.listarPlanes(db, { anio_id: anio.id, tipo: 'area' }).length, 1);
    P.guardarPlan(db, { id: p.id, tipo: 'area', anio_id: anio.id, materia_id: mat.id, grado: 2, titulo: 'Plan de área v2', contenido: 'y' });
    assert.equal(P.listarPlanes(db, { anio_id: anio.id, tipo: 'area' })[0].titulo, 'Plan de área v2');
    assert.throws(() => P.guardarPlan(db, { tipo: 'otro', anio_id: anio.id, materia_id: mat.id, grado: 2, titulo: 'a', contenido: '' }), ErrorValidacion);
    assert.throws(() => P.guardarPlan(db, { tipo: 'area', anio_id: anio.id, materia_id: mat.id, grado: 9, titulo: 'a', contenido: '' }), ErrorValidacion);
    assert.throws(() => P.guardarPlan(db, { tipo: 'area', anio_id: anio.id, materia_id: mat.id, grado: 2, titulo: '  ', contenido: '' }), /título/);
    P.borrarPlan(db, p.id);
    assert.equal(P.listarPlanes(db, { anio_id: anio.id, tipo: 'area' }).length, 0);
  });
  test('guías por materia, grado y tema; se filtran', () => {
    const { db, mat } = prep();
    P.guardarGuia(db, { materia_id: mat.id, grado: 1, tema: 'Sumas', titulo: 'Guía 1', contenido: 'a' });
    P.guardarGuia(db, { materia_id: mat.id, grado: 3, tema: 'Restas', titulo: 'Guía 2', contenido: 'b' });
    assert.equal(P.listarGuias(db, {}).length, 2);
    assert.deepEqual(P.listarGuias(db, { grado: 3 }).map((g) => g.titulo), ['Guía 2']);
    assert.deepEqual(P.listarGuias(db, { tema: 'sum' }).map((g) => g.titulo), ['Guía 1']);
    assert.throws(() => P.guardarGuia(db, { materia_id: 999, grado: 1, tema: 'x', titulo: 'y', contenido: '' }), ErrorValidacion);
  });
  test('temas: estado de avance y porcentaje por materia y grado', () => {
    const { db, anio, mat } = prep();
    const base = { anio_id: anio.id, materia_id: mat.id, grado: 4, periodo: 1 };
    const t1 = P.guardarTema(db, { ...base, nombre: 'Fracciones' });
    P.guardarTema(db, { ...base, nombre: 'Decimales' });
    P.guardarTema(db, { ...base, nombre: 'Geometría' });
    P.guardarTema(db, { ...base, nombre: 'Medidas' });
    P.cambiarEstadoTema(db, t1.id, 'visto', '2026-02-10');
    const av = P.avanceTemas(db, { anio_id: anio.id, materia_id: mat.id, grado: 4 });
    assert.deepEqual({ total: av.total, vistos: av.vistos, porcentaje: av.porcentaje }, { total: 4, vistos: 1, porcentaje: 25 });
    assert.throws(() => P.cambiarEstadoTema(db, t1.id, 'raro'), ErrorValidacion);
    assert.throws(() => P.guardarTema(db, { ...base, periodo: 5, nombre: 'x' }), ErrorValidacion);
    P.cambiarEstadoTema(db, t1.id, 'pendiente');
    assert.equal(P.avanceTemas(db, { anio_id: anio.id, materia_id: mat.id, grado: 4 }).vistos, 0);
  });
  test('clases planeadas: fecha válida, tema opcional, marcar realizada', () => {
    const { db, anio, mat } = prep();
    const t = P.guardarTema(db, { anio_id: anio.id, materia_id: mat.id, grado: 1, periodo: 1, nombre: 'Sumas' });
    const c = P.guardarClase(db, { anio_id: anio.id, materia_id: mat.id, grado: 1, fecha: '2026-03-02', tema_id: t.id, objetivo: 'Sumar', actividades: 'Juego', recursos: 'Fichas' });
    P.guardarClase(db, { anio_id: anio.id, materia_id: mat.id, grado: 1, fecha: '2026-03-01', objetivo: 'Repaso' });
    assert.deepEqual(P.listarClases(db, { anio_id: anio.id }).map((x) => x.fecha), ['2026-03-01', '2026-03-02']); // por fecha
    P.marcarClase(db, c.id, true);
    assert.equal(P.listarClases(db, { anio_id: anio.id }).find((x) => x.id === c.id).realizada, 1);
    assert.throws(() => P.guardarClase(db, { anio_id: anio.id, materia_id: mat.id, grado: 1, fecha: '2026-02-30', objetivo: 'x' }), /fecha/);
    assert.throws(() => P.guardarClase(db, { anio_id: anio.id, materia_id: mat.id, grado: 1, fecha: '02/03/2026', objetivo: 'x' }), /fecha/);
  });
  test('un año cerrado no admite cambios de planeación', () => {
    const { db, anio, mat } = prep();
    const t = P.guardarTema(db, { anio_id: anio.id, materia_id: mat.id, grado: 1, periodo: 1, nombre: 'T' });
    const c = P.guardarClase(db, { anio_id: anio.id, materia_id: mat.id, grado: 1, fecha: '2026-03-01' });
    db.prepare('update anio_lectivo set cerrado = 1 where id = ?').run(anio.id);
    assert.throws(() => P.guardarTema(db, { anio_id: anio.id, materia_id: mat.id, grado: 1, periodo: 1, nombre: 'N' }), /cerrado/);
    assert.throws(() => P.cambiarEstadoTema(db, t.id, 'visto'), /cerrado/);
    assert.throws(() => P.guardarClase(db, { anio_id: anio.id, materia_id: mat.id, grado: 1, fecha: '2026-03-02' }), /cerrado/);
    assert.throws(() => P.marcarClase(db, c.id, true), /cerrado/);
    assert.throws(() => P.borrarClase(db, c.id), /cerrado/);
    assert.throws(() => P.guardarPlan(db, { tipo: 'area', anio_id: anio.id, materia_id: mat.id, grado: 1, titulo: 'a', contenido: '' }), /cerrado/);
  });
  test('ida y vuelta por Excel conserva planes, guías, temas y clases', async () => {
    const { db, anio, mat } = prep();
    P.guardarPlan(db, { tipo: 'aula', anio_id: anio.id, materia_id: mat.id, grado: 0, titulo: 'Ñandú', contenido: 'línea 1\nlínea 2' });
    P.guardarGuia(db, { materia_id: mat.id, grado: 0, tema: 'Formas', titulo: 'Guía', contenido: 'texto' });
    const t = P.guardarTema(db, { anio_id: anio.id, materia_id: mat.id, grado: 0, periodo: 2, nombre: 'Formas' });
    P.cambiarEstadoTema(db, t.id, 'visto', '2026-05-05');
    P.guardarClase(db, { anio_id: anio.id, materia_id: mat.id, grado: 0, fecha: '2026-05-05', tema_id: t.id, objetivo: 'Formas' });
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pl-')); const x = path.join(dir, 'r.xlsx');
    await exportarExcel(db, x);
    const db2 = abrirBase(':memory:');
    await importarExcel(db2, x, { confirmar: true });
    assert.equal(P.listarPlanes(db2, { anio_id: anio.id, tipo: 'aula' })[0].contenido, 'línea 1\nlínea 2');
    assert.equal(P.listarGuias(db2, {}).length, 1);
    assert.equal(P.avanceTemas(db2, { anio_id: anio.id, materia_id: mat.id, grado: 0 }).vistos, 1);
    assert.equal(P.listarClases(db2, { anio_id: anio.id }).length, 1);
  });
});
