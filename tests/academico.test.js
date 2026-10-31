// @ts-check
// Lógica académica (spec HU-001, HU-002, HU-003).
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { abrirBase } from '../src/datos/base.js';
import {
  ErrorValidacion, crearAnio, cerrarAnio, listarAnios, crearMateria, listarMaterias,
  crearEstudiante, editarEstudiante, archivarEstudiante, listarEstudiantes,
  guardarNotas, listarNotas, desaprobadas, guardarNivelacion, pendientesNivelacion,
} from '../src/servicios/academico.js';

/** Base con un año, dos materias y dos estudiantes (grado 3 y grado 0). */
function escenario() {
  const db = abrirBase(':memory:');
  const anio = crearAnio(db, 2026);
  const mat = crearMateria(db, 'Matemáticas'); const len = crearMateria(db, 'Lenguaje');
  const ana = crearEstudiante(db, { nombre: 'Ana Ñañez', documento: '1', grado: 3, anio_id: anio.id });
  const beto = crearEstudiante(db, { nombre: 'Beto Pérez', documento: null, grado: 0, anio_id: anio.id });
  return { db, anio, mat, len, ana, beto };
}
/** Llena los cuatro periodos con las mismas tres notas. @param {any} e @param {number} matricula @param {number} materia @param {number[]} n */
function llenarAnio(e, matricula, materia, n) {
  for (let p = 1; p <= 4; p++) guardarNotas(e.db, { matricula_id: matricula, materia_id: materia, periodo: p, n1: n[0], n2: n[1], n3: n[2] });
}
const msg = (/** @type {() => any} */ fn) => { try { fn(); } catch (e) { return e instanceof ErrorValidacion ? e.message : 'OTRO:' + e; } return 'NO LANZÓ'; };

describe('años, materias y estudiantes (HU-001)', () => {
  test('crear año, materia y estudiante; duplicados y vacíos se rechazan con mensaje claro', () => {
    const e = escenario();
    assert.equal(msg(() => crearAnio(e.db, 2026)), 'Ese año lectivo ya existe');
    assert.equal(msg(() => crearAnio(e.db, 1900)), 'El año debe estar entre 2000 y 2100');
    assert.equal(msg(() => crearMateria(e.db, '  ')), 'Escriba el nombre de la materia');
    assert.equal(msg(() => crearMateria(e.db, 'Matemáticas')), 'Esa materia ya existe');
    assert.equal(msg(() => crearEstudiante(e.db, { nombre: '', documento: null, grado: 1, anio_id: e.anio.id })), 'Escriba el nombre del estudiante');
    assert.equal(msg(() => crearEstudiante(e.db, { nombre: 'X', documento: null, grado: 6, anio_id: e.anio.id })), 'El grado debe ser de 0 a 5');
    assert.deepEqual(listarMaterias(e.db).map((m) => m.nombre), ['Lenguaje', 'Matemáticas']);
    assert.equal(listarAnios(e.db).length, 1);
  });
  test('multigrado: se listan todos los grados juntos o filtrados por grado (CA-001-04)', () => {
    const e = escenario();
    assert.equal(listarEstudiantes(e.db, { anio_id: e.anio.id }).length, 2);
    assert.deepEqual(listarEstudiantes(e.db, { anio_id: e.anio.id, grado: 0 }).map((x) => x.nombre), ['Beto Pérez']);
  });
  test('editar y archivar: archivar no borra el historial y lo saca de las listas activas (CA-001-01)', () => {
    const e = escenario();
    llenarAnio(e, e.ana.matricula_id, e.mat.id, [4, 4, 4]);
    editarEstudiante(e.db, e.ana.estudiante_id, { nombre: 'Ana María Ñañez', documento: '99' });
    archivarEstudiante(e.db, e.ana.estudiante_id, true);
    assert.deepEqual(listarEstudiantes(e.db, { anio_id: e.anio.id }).map((x) => x.nombre), ['Beto Pérez']);
    const todos = listarEstudiantes(e.db, { anio_id: e.anio.id, incluirArchivados: true });
    assert.equal(todos.find((x) => x.estudiante_id === e.ana.estudiante_id)?.nombre, 'Ana María Ñañez');
    assert.equal(Number(e.db.prepare('select count(*) n from nota').get()?.n), 4); // notas intactas
    archivarEstudiante(e.db, e.ana.estudiante_id, false);
    assert.equal(listarEstudiantes(e.db, { anio_id: e.anio.id }).length, 2);
  });
  test('un año cerrado es de solo lectura (CA-001-03)', () => {
    const e = escenario();
    cerrarAnio(e.db, e.anio.id);
    assert.match(msg(() => crearEstudiante(e.db, { nombre: 'Tarde', documento: null, grado: 1, anio_id: e.anio.id })), /cerrado/);
    assert.match(msg(() => guardarNotas(e.db, { matricula_id: e.ana.matricula_id, materia_id: e.mat.id, periodo: 1, n1: 4, n2: null, n3: null })), /cerrado/);
  });
});

describe('guardar y calcular notas (HU-002)', () => {
  test('guarda tres notas y devuelve la definitiva del periodo', () => {
    const e = escenario();
    const r = guardarNotas(e.db, { matricula_id: e.ana.matricula_id, materia_id: e.mat.id, periodo: 1, n1: 4.0, n2: 3.5, n3: 4.5 });
    assert.deepEqual(r.definitiva, { estado: 'completa', valor: 4.0 });
    assert.equal(r.aprobado, true);
  });
  test('guardar de nuevo reemplaza (no duplica) y permite borrar una nota con null', () => {
    const e = escenario();
    guardarNotas(e.db, { matricula_id: e.ana.matricula_id, materia_id: e.mat.id, periodo: 1, n1: 4, n2: 4, n3: 4 });
    const r = guardarNotas(e.db, { matricula_id: e.ana.matricula_id, materia_id: e.mat.id, periodo: 1, n1: 4, n2: null, n3: 4 });
    assert.equal(r.definitiva.estado, 'incompleta');
    assert.equal(Number(e.db.prepare('select count(*) n from nota').get()?.n), 1);
  });
  test('rechaza notas inválidas con el mensaje del docente y no guarda nada (CA-002-01)', () => {
    const e = escenario();
    assert.equal(msg(() => guardarNotas(e.db, { matricula_id: e.ana.matricula_id, materia_id: e.mat.id, periodo: 1, n1: 6.5, n2: 4, n3: 4 })), 'La nota debe estar entre 1,0 y 5,0');
    assert.equal(msg(() => guardarNotas(e.db, { matricula_id: e.ana.matricula_id, materia_id: e.mat.id, periodo: 5, n1: 4, n2: 4, n3: 4 })), 'El periodo debe ser 1, 2, 3 o 4');
    assert.equal(msg(() => guardarNotas(e.db, { matricula_id: 999, materia_id: e.mat.id, periodo: 1, n1: 4, n2: 4, n3: 4 })), 'La matrícula no existe');
    assert.equal(Number(e.db.prepare('select count(*) n from nota').get()?.n), 0);
  });
  test('listarNotas: por grado, materia y periodo con definitivas, aprobación y año (CA-002-02/03/06)', () => {
    const e = escenario();
    guardarNotas(e.db, { matricula_id: e.ana.matricula_id, materia_id: e.mat.id, periodo: 1, n1: 2.9, n2: 3.0, n3: 3.0 }); // 2,97 -> 3,0
    const filas = listarNotas(e.db, { anio_id: e.anio.id, grado: 3, materia_id: e.mat.id, periodo: 1 });
    assert.equal(filas.length, 1);
    assert.equal(filas[0].nombre, 'Ana Ñañez');
    assert.equal(filas[0].definitiva.valor, 3.0);
    assert.equal(filas[0].aprobado, true);
    assert.equal(filas[0].anio.estado, 'incompleta');
  });
  test('definitiva del año con los 4 periodos completos', () => {
    const e = escenario();
    llenarAnio(e, e.ana.matricula_id, e.mat.id, [4, 4, 4]);
    const f = listarNotas(e.db, { anio_id: e.anio.id, grado: 3, materia_id: e.mat.id, periodo: 1 })[0];
    assert.deepEqual(f.anio, { estado: 'completa', valor: 4.0, aprobado: true });
  });
  test('estudiantes archivados no aparecen en la hoja de notas', () => {
    const e = escenario(); archivarEstudiante(e.db, e.ana.estudiante_id, true);
    assert.equal(listarNotas(e.db, { anio_id: e.anio.id, grado: 3, materia_id: e.mat.id, periodo: 1 }).length, 0);
  });
});

describe('desaprobadas (CA-002-04)', () => {
  test('lista por periodo y por año, filtrable por grado y materia', () => {
    const e = escenario();
    guardarNotas(e.db, { matricula_id: e.ana.matricula_id, materia_id: e.mat.id, periodo: 2, n1: 2.0, n2: 2.5, n3: 2.0 });
    guardarNotas(e.db, { matricula_id: e.beto.matricula_id, materia_id: e.mat.id, periodo: 2, n1: 4, n2: 4, n3: 4 });
    const p2 = desaprobadas(e.db, { anio_id: e.anio.id, base: 'periodo', periodo: 2 });
    assert.deepEqual(p2.map((x) => [x.nombre, x.materia, x.grado, x.valor]), [['Ana Ñañez', 'Matemáticas', 3, 2.2]]);
    assert.equal(desaprobadas(e.db, { anio_id: e.anio.id, base: 'periodo', periodo: 2, grado: 0 }).length, 0);
    assert.equal(desaprobadas(e.db, { anio_id: e.anio.id, base: 'anio' }).length, 0); // año incompleto no cuenta
  });
});

describe('plan de nivelación (HU-003)', () => {
  test('solo se abre cuando la definitiva del año es menor de 3,0 (CA-003-01)', () => {
    const e = escenario();
    assert.match(msg(() => guardarNivelacion(e.db, { matricula_id: e.ana.matricula_id, materia_id: e.mat.id, actividades: 'x', fecha: null, nota: null })), /menor de 3,0/);
    llenarAnio(e, e.ana.matricula_id, e.mat.id, [4, 4, 4]);
    assert.match(msg(() => guardarNivelacion(e.db, { matricula_id: e.ana.matricula_id, materia_id: e.mat.id, actividades: 'x', fecha: null, nota: null })), /menor de 3,0/);
    llenarAnio(e, e.ana.matricula_id, e.len.id, [2.0, 2.0, 2.0]);
    guardarNivelacion(e.db, { matricula_id: e.ana.matricula_id, materia_id: e.len.id, actividades: 'Taller de lectura', fecha: '2026-11-10', nota: null });
  });
  test('la nota de nivelación se guarda aparte y no borra la original (CA-003-02)', () => {
    const e = escenario();
    llenarAnio(e, e.ana.matricula_id, e.len.id, [2.0, 2.0, 2.0]);
    guardarNivelacion(e.db, { matricula_id: e.ana.matricula_id, materia_id: e.len.id, actividades: 'Taller', fecha: '2026-11-10', nota: 3.4 });
    const f = listarNotas(e.db, { anio_id: e.anio.id, grado: 3, materia_id: e.len.id, periodo: 1 })[0];
    assert.equal(f.anio.valor, 2.0);
    assert.equal(f.nivelacion?.nota, 3.4);
  });
  test('valida la nota y la fecha de la nivelación', () => {
    const e = escenario(); llenarAnio(e, e.ana.matricula_id, e.len.id, [2.0, 2.0, 2.0]);
    const base = { matricula_id: e.ana.matricula_id, materia_id: e.len.id, actividades: 'x' };
    assert.equal(msg(() => guardarNivelacion(e.db, { ...base, fecha: null, nota: 7 })), 'La nota debe estar entre 1,0 y 5,0');
    assert.equal(msg(() => guardarNivelacion(e.db, { ...base, fecha: '10/11/2026', nota: null })), 'La fecha debe escribirse como AAAA-MM-DD');
  });
  test('pendientes: reprobados sin nivelación o sin nota; desaparecen al registrar la nota (CA-003-03)', () => {
    const e = escenario();
    llenarAnio(e, e.ana.matricula_id, e.len.id, [2.0, 2.0, 2.0]);
    llenarAnio(e, e.beto.matricula_id, e.len.id, [4, 4, 4]);
    assert.deepEqual(pendientesNivelacion(e.db, { anio_id: e.anio.id }).map((x) => [x.nombre, x.materia]), [['Ana Ñañez', 'Lenguaje']]);
    guardarNivelacion(e.db, { matricula_id: e.ana.matricula_id, materia_id: e.len.id, actividades: 'Taller', fecha: null, nota: null });
    assert.equal(pendientesNivelacion(e.db, { anio_id: e.anio.id }).length, 1);
    guardarNivelacion(e.db, { matricula_id: e.ana.matricula_id, materia_id: e.len.id, actividades: 'Taller', fecha: null, nota: 3.2 });
    assert.equal(pendientesNivelacion(e.db, { anio_id: e.anio.id }).length, 0);
  });
});
