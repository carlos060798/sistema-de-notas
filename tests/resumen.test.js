// @ts-check
// Resumen de inicio: conteos, aviso de Excel y fecha de la última copia.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { abrirBase } from '../src/datos/base.js';
import { crearAnio, crearMateria, crearEstudiante, guardarNotas } from '../src/servicios/academico.js';
import { resumen, registrarExcelDescargado, fechaDeCopia } from '../src/servicios/resumen.js';

function escenario() {
  const db = abrirBase(':memory:'); const anio = crearAnio(db, 2026); const mat = crearMateria(db, 'Matemáticas');
  const ana = crearEstudiante(db, { nombre: 'Ana', documento: null, grado: 0, anio_id: anio.id });
  const beto = crearEstudiante(db, { nombre: 'Beto', documento: null, grado: 3, anio_id: anio.id });
  for (let p = 1; p <= 4; p++) {
    guardarNotas(db, { matricula_id: ana.matricula_id, materia_id: mat.id, periodo: p, n1: 4, n2: 4, n3: 4 });
    guardarNotas(db, { matricula_id: beto.matricula_id, materia_id: mat.id, periodo: p, n1: 2, n2: 2, n3: 2 });
  }
  return { db, anio };
}
const ahora = new Date(2026, 5, 20, 10, 0, 0);

describe('resumen de inicio', () => {
  test('cuenta estudiantes, no aprobados y nivelaciones pendientes', () => {
    const { db, anio } = escenario();
    const r = resumen(db, { anio_id: anio.id, copias: [], ahora });
    assert.equal(r.estudiantes, 2); assert.deepEqual(r.porGrado, [{ grado: 0, n: 1 }, { grado: 3, n: 1 }]);
    assert.equal(r.noAprobados, 1); assert.equal(r.materiasReprobadas, 1); assert.equal(r.nivelacionesPendientes, 1);
  });
  test('sin Excel descargado avisa; con Excel reciente no; a los 14 días vuelve a avisar', () => {
    const { db, anio } = escenario();
    assert.equal(resumen(db, { anio_id: anio.id, copias: [], ahora }).respaldo.avisarExcel, true);
    registrarExcelDescargado(db, new Date(2026, 5, 10, 10, 0, 0));
    const r = resumen(db, { anio_id: anio.id, copias: [], ahora });
    assert.equal(r.respaldo.diasSinExcel, 10); assert.equal(r.respaldo.avisarExcel, false);
    registrarExcelDescargado(db, new Date(2026, 5, 6, 10, 0, 0));
    assert.equal(resumen(db, { anio_id: anio.id, copias: [], ahora }).respaldo.avisarExcel, true); // 14 días exactos
  });
  test('la última copia sale del nombre del archivo, la lista viene de más nueva a más vieja', () => {
    const { db, anio } = escenario();
    const copias = [{ nombre: 'notas-20260620-093000123-cerrar.db' }, { nombre: 'notas-20260619-080000000-abrir.db' }];
    const r = resumen(db, { anio_id: anio.id, copias, ahora });
    assert.equal(r.respaldo.copias, 2); assert.equal(new Date(/** @type {string} */ (r.respaldo.ultimaCopia)).getHours(), 9);
    assert.equal(fechaDeCopia('otro-archivo.db'), null);
  });
});
