// @ts-check
// Cierre de las dos desviaciones de la spec (CA-001-01 materias por grado, CA-004-01 plan de área con campos)
// y de los hallazgos bajos de la revisión independiente.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import JSZip from 'jszip';
import { abrirBase } from '../src/datos/base.js';
import * as A from '../src/servicios/academico.js';
import * as P from '../src/servicios/planeacion.js';
import { datosTexto } from '../src/reportes/datos.js';
import { textoDocx } from '../src/reportes/formatos.js';
import { exportarExcel, importarExcel } from '../src/excel/excel.js';
import { crearCopia, aplicarRetencion, listarCopias } from '../src/respaldo/respaldo.js';

function prep() {
  const db = abrirBase(':memory:'); const anio = A.crearAnio(db, 2026);
  const mat = A.crearMateria(db, 'Inglés'); const otra = A.crearMateria(db, 'Matemáticas');
  const chico = A.crearEstudiante(db, { nombre: 'Chico', documento: null, grado: 0, anio_id: anio.id });
  const grande = A.crearEstudiante(db, { nombre: 'Grande', documento: null, grado: 4, anio_id: anio.id });
  return { db, anio, mat, otra, chico, grande };
}

describe('CA-001-01: materias por grado', () => {
  test('sin grados marcados se ofrece en todos; al marcar, solo en esos grados', () => {
    const { db, anio, mat, otra, chico, grande } = prep();
    assert.equal(A.listarMaterias(db).find((m) => m.id === mat.id)?.grados, null);
    assert.equal(A.guardarNotas(db, { matricula_id: grande.matricula_id, materia_id: mat.id, periodo: 1, n1: 4, n2: 4, n3: 4 }).aprobado, true); // aún en todos
    assert.deepEqual(A.guardarGradosMateria(db, mat.id, [4, 5, 4]), [4, 5]); // sin repetidos, ordenado
    assert.deepEqual(A.listarMaterias(db).find((m) => m.id === mat.id)?.grados, [4, 5]);
    assert.throws(() => A.guardarNotas(db, { matricula_id: chico.matricula_id, materia_id: mat.id, periodo: 1, n1: 4, n2: 4, n3: 4 }), /no se ofrece en el grado/);
    assert.equal(A.guardarNotas(db, { matricula_id: grande.matricula_id, materia_id: mat.id, periodo: 2, n1: 3, n2: 3, n3: 3 }).aprobado, true);
    assert.equal(A.guardarNotas(db, { matricula_id: chico.matricula_id, materia_id: otra.id, periodo: 1, n1: 4, n2: 4, n3: 4 }).aprobado, true); // la otra sigue en todos
    assert.equal(A.listarNotas(db, { anio_id: anio.id, grado: 4, materia_id: mat.id, periodo: 1 })[0].n1, 4); // lo ya escrito no se borra
  });
  test('lista vacía vuelve a «todos los grados»; valida grados y materia', () => {
    const { db, mat } = prep();
    A.guardarGradosMateria(db, mat.id, [1]);
    assert.deepEqual(A.guardarGradosMateria(db, mat.id, []), []);
    assert.equal(A.listarMaterias(db).find((m) => m.id === mat.id)?.grados, null);
    assert.throws(() => A.guardarGradosMateria(db, mat.id, [6]), A.ErrorValidacion);
    assert.throws(() => A.guardarGradosMateria(db, 999, [1]), /no existe/);
    assert.throws(() => A.guardarGradosMateria(db, mat.id, /** @type {any} */ ('todos')), A.ErrorValidacion);
    assert.equal(A.listarMaterias(db).find((m) => m.id === mat.id)?.grados, null); // un intento inválido no cambia nada
  });
  test('planes, guías, temas y clases también respetan los grados de la materia', () => {
    const { db, anio, mat } = prep(); A.guardarGradosMateria(db, mat.id, [4]);
    const b = { anio_id: anio.id, materia_id: mat.id, grado: 0 };
    assert.throws(() => P.guardarPlan(db, { ...b, tipo: 'area', titulo: 'x' }), /no se ofrece en este grado/);
    assert.throws(() => P.guardarGuia(db, { materia_id: mat.id, grado: 0, titulo: 'x' }), /no se ofrece/);
    assert.throws(() => P.guardarTema(db, { ...b, periodo: 1, nombre: 'x' }), /no se ofrece/);
    assert.throws(() => P.guardarClase(db, { ...b, fecha: '2026-03-02' }), /no se ofrece/);
    assert.ok(P.guardarPlan(db, { ...b, grado: 4, tipo: 'area', titulo: 'ok' }).id);
  });
  test('la nivelación con una materia inexistente da un mensaje claro (hallazgo bajo 10)', () => {
    const { db, chico } = prep();
    assert.throws(() => A.guardarNivelacion(db, { matricula_id: chico.matricula_id, materia_id: 999, actividades: '', fecha: null, nota: null }), /La materia no existe/);
  });
  test('ida y vuelta por Excel conserva los grados de cada materia', async () => {
    const { db, mat } = prep(); A.guardarGradosMateria(db, mat.id, [1, 2]);
    const x = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'mg-')), 'r.xlsx'); await exportarExcel(db, x);
    const db2 = abrirBase(':memory:'); await importarExcel(db2, x);
    assert.deepEqual(A.listarMaterias(db2).find((m) => m.id === mat.id)?.grados, [1, 2]);
  });
});

describe('CA-004-01: plan de área con campos separados', () => {
  const campos = { objetivos: 'Contar hasta 100', estandares: 'Pensamiento numérico', competencias: 'Razonar', contenidos_p1: 'Sumas', contenidos_p2: 'Restas', contenidos_p3: 'Figuras', contenidos_p4: 'Medidas', criterios: 'Participación y tareas' };
  test('se guardan, se listan, se editan y el plan de aula no los usa', () => {
    const { db, anio, mat } = prep(); const b = { anio_id: anio.id, materia_id: mat.id, grado: 0 };
    const area = P.guardarPlan(db, { ...b, tipo: 'area', titulo: 'Área', ...campos });
    const aula = P.guardarPlan(db, { ...b, tipo: 'aula', titulo: 'Aula', contenido: 'Clase 1', objetivos: 'no debe guardarse', plan_area_id: area.id });
    const lista = P.listarPlanes(db, { anio_id: anio.id });
    const a = lista.find((p) => p.id === area.id); const u = lista.find((p) => p.id === aula.id);
    for (const [k, v] of Object.entries(campos)) assert.equal(a[k], v, k);
    assert.equal(u.objetivos, ''); assert.equal(u.contenido, 'Clase 1');
    P.guardarPlan(db, { ...b, id: area.id, tipo: 'area', titulo: 'Área', ...campos, objetivos: 'Contar hasta 200' });
    assert.equal(P.listarPlanes(db, { anio_id: anio.id, tipo: 'area' })[0].objetivos, 'Contar hasta 200');
  });
  test('copiar al año siguiente conserva todos los campos', () => {
    const { db, anio, mat } = prep(); const sig = A.crearAnio(db, 2027);
    P.guardarPlan(db, { anio_id: anio.id, materia_id: mat.id, grado: 0, tipo: 'area', titulo: 'Área', ...campos });
    P.copiarPlanes(db, { desde_anio_id: anio.id, hasta_anio_id: sig.id });
    const c = P.listarPlanes(db, { anio_id: sig.id })[0];
    for (const [k, v] of Object.entries(campos)) assert.equal(c[k], v, k);
  });
  test('el documento Word del plan trae cada sección con su título', async () => {
    const { db, anio, mat } = prep();
    const p = P.guardarPlan(db, { anio_id: anio.id, materia_id: mat.id, grado: 0, tipo: 'area', titulo: 'Área', ...campos, contenido: 'Nota extra' });
    const d = datosTexto(db, 'plan', p.id);
    for (const t of ['Objetivos', 'Estándares', 'Competencias', 'Contenidos del periodo 1', 'Contenidos del periodo 4', 'Criterios de evaluación', 'Otras notas', 'Contar hasta 100']) assert.ok(d.contenido.includes(t), t);
    const ruta = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'pl-')), 'p.docx'); await textoDocx(d, ruta);
    const xml = await (await JSZip.loadAsync(fs.readFileSync(ruta))).file('word/document.xml')?.async('string');
    assert.ok(xml?.includes('Criterios de evaluación') && xml.includes('Participación y tareas'));
  });
  test('un plan vacío de campos no genera secciones vacías', () => {
    const { db, anio, mat } = prep();
    const p = P.guardarPlan(db, { anio_id: anio.id, materia_id: mat.id, grado: 0, tipo: 'area', titulo: 'Área', objetivos: 'Solo esto' });
    assert.equal(datosTexto(db, 'plan', p.id).contenido, 'Objetivos\nSolo esto');
  });
});

describe('hallazgo bajo 11: tope de copias «antes-de-…» por cada motivo', () => {
  test('varias importaciones seguidas no sacan la única copia «antes-de-restaurar»', () => {
    const { db } = prep(); const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ret-'));
    crearCopia(db, dir, 'antes-de-restaurar');
    for (let i = 0; i < 8; i++) crearCopia(db, dir, 'antes-de-importar');
    aplicarRetencion(dir, 10);
    const c = listarCopias(dir);
    assert.equal(c.filter((x) => x.motivo === 'antes-de-restaurar').length, 1);
    assert.equal(c.filter((x) => x.motivo === 'antes-de-importar').length, 5);
  });
});
