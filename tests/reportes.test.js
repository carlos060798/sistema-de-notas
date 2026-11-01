// @ts-check
// Planilla, boletín y certificado: cifras correctas y archivos válidos en Excel, PDF y Word.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import ExcelJS from 'exceljs';
import JSZip from 'jszip';
import { abrirBase } from '../src/datos/base.js';
import { crearAnio, crearMateria, crearEstudiante, guardarNotas, guardarNivelacion, ErrorValidacion } from '../src/servicios/academico.js';
import { datosPlanilla, datosBoletin } from '../src/reportes/datos.js';
import { planillaExcel, planillaPdf, boletinPdf, boletinDocx, certificadoPdf, certificadoDocx } from '../src/reportes/formatos.js';

/** Ana: aprueba Matemáticas (4,0 en los 4 periodos). Beto: reprueba Matemáticas (2,0) y tiene nivelación. */
function escenario() {
  const db = abrirBase(':memory:');
  const anio = crearAnio(db, 2026); const mat = crearMateria(db, 'Matemáticas'); crearMateria(db, 'Artística'); // Artística sin notas
  const ana = crearEstudiante(db, { nombre: 'Ana Ñañez', documento: '123', grado: 2, anio_id: anio.id });
  const beto = crearEstudiante(db, { nombre: 'Beto Pérez', documento: null, grado: 2, anio_id: anio.id });
  const mid = (/** @type {any} */ e) => e.matricula_id;
  for (let p = 1; p <= 4; p++) {
    guardarNotas(db, { matricula_id: mid(ana), materia_id: mat.id, periodo: p, n1: 4, n2: 4, n3: 4 });
    guardarNotas(db, { matricula_id: mid(beto), materia_id: mat.id, periodo: p, n1: 2, n2: 2, n3: 2 });
  }
  guardarNivelacion(db, { matricula_id: mid(beto), materia_id: mat.id, actividades: 'Taller', fecha: '2026-12-01', nota: 3.5 });
  db.prepare("insert into config(clave, valor) values ('institucion.nombre', 'Escuela Rural El Roble')").run();
  return { db, anio, mat, ana: mid(ana), beto: mid(beto) };
}
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'rep-'));

describe('reportes', () => {
  test('boletín: cifras, nivelación aparte y materias sin notas omitidas', () => {
    const { db, anio, ana, beto } = escenario();
    const a = datosBoletin(db, { anio_id: anio.id, matricula_id: ana });
    assert.deepEqual(a.materias.map((m) => [m.materia, m.anio, m.aprobado]), [['Matemáticas', 4, true]]);
    assert.equal(a.situacion, 'Aprobó todas las materias'); assert.equal(a.institucion, 'Escuela Rural El Roble');
    const b = datosBoletin(db, { anio_id: anio.id, matricula_id: beto });
    assert.equal(b.materias[0].anio, 2); assert.equal(b.materias[0].aprobado, false); assert.equal(b.materias[0].nivelacion, 3.5); // la original sigue en 2,0
    assert.equal(b.situacion, 'Tiene materias por nivelar'); assert.deepEqual(b.reprobadas, ['Matemáticas']);
  });
  test('un año incompleto se dice «En curso», no se promueve', () => {
    const { db, anio, mat } = escenario();
    const c = crearEstudiante(db, { nombre: 'Cami', documento: null, grado: 1, anio_id: anio.id });
    guardarNotas(db, { matricula_id: c.matricula_id, materia_id: mat.id, periodo: 1, n1: 5, n2: 5, n3: 5 });
    assert.equal(datosBoletin(db, { anio_id: anio.id, matricula_id: c.matricula_id }).situacion, 'En curso');
  });
  test('entradas inexistentes dan error en español', () => {
    const { db, anio } = escenario();
    assert.throws(() => datosBoletin(db, { anio_id: anio.id, matricula_id: 999 }), ErrorValidacion);
    assert.throws(() => datosPlanilla(db, { anio_id: anio.id, grado: 2, materia_id: 999 }), /materia/);
  });
  test('planilla Excel: encabezado, filas y valores', async () => {
    const { db, anio, mat } = escenario(); const x = path.join(tmp(), 'p.xlsx');
    await planillaExcel(datosPlanilla(db, { anio_id: anio.id, grado: 2, materia_id: mat.id }), x);
    const wb = new ExcelJS.Workbook(); await wb.xlsx.readFile(x); const ws = /** @type {ExcelJS.Worksheet} */ (wb.getWorksheet('Planilla'));
    assert.equal(ws.getCell('A1').value, 'Escuela Rural El Roble');
    assert.equal(ws.getCell('A5').value, 'Ana Ñañez'); assert.equal(ws.getCell('F5').value, 4); assert.equal(ws.getCell('G5').value, 'Aprobado');
    assert.equal(ws.getCell('G6').value, 'No aprobado');
  });
  test('PDF y Word se generan y son archivos válidos', async () => {
    const { db, anio, mat, beto } = escenario(); const dir = tmp();
    const bol = datosBoletin(db, { anio_id: anio.id, matricula_id: beto });
    await planillaPdf(datosPlanilla(db, { anio_id: anio.id, grado: 2, materia_id: mat.id }), path.join(dir, 'p.pdf'));
    await boletinPdf(bol, path.join(dir, 'b.pdf')); await certificadoPdf(bol, path.join(dir, 'c.pdf'));
    for (const n of ['p.pdf', 'b.pdf', 'c.pdf']) {
      const t = fs.readFileSync(path.join(dir, n)); assert.equal(t.subarray(0, 5).toString(), '%PDF-', n); assert.ok(t.length > 1000, n);
      assert.match(t.subarray(-10).toString(), /%%EOF/, n);
    }
    await boletinDocx(bol, path.join(dir, 'b.docx')); await certificadoDocx(bol, path.join(dir, 'c.docx'));
    for (const n of ['b.docx', 'c.docx']) {
      const xml = await (await JSZip.loadAsync(fs.readFileSync(path.join(dir, n)))).file('word/document.xml')?.async('string');
      assert.ok(xml?.includes('Beto Pérez'), n); assert.ok(xml?.includes('Matemáticas'), n);
    }
  });
});
