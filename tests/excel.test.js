// @ts-check
// Excel como seguro de vida (spec HU-008, CA-008-01 a CA-008-04).
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import ExcelJS from 'exceljs';
import { abrirBase, VERSION_ESQUEMA } from '../src/datos/base.js';
import { exportarExcel, analizarExcel, importarExcel, ErrorImportacion, TABLAS } from '../src/excel/excel.js';

const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'xlsx-'));

/** @param {import('node:sqlite').DatabaseSync} db */
function sembrar(db) {
  db.exec(`
    insert into anio_lectivo(anio) values (2026);
    insert into materia(nombre) values ('Matemáticas'),('Lenguaje');
    insert into estudiante(nombre, documento) values ('Ñandú Muñoz Peña','1001'),('José Ángel Gómez',null);
    insert into matricula(estudiante_id, anio_id, grado_id) values (1,1,0),(2,1,5);
    insert into nota(matricula_id, materia_id, periodo, n1, n2, n3) values (1,1,1,4.0,3.5,4.5),(2,2,1,2.0,2.5,null);
    insert into nivelacion(matricula_id, materia_id, actividades, fecha, nota) values (2,2,'Taller de lectura','2026-11-10',3.4);
    insert into config(clave, valor) values ('umbral','3.0');`);
}
/** Contenido completo para comparar bases. @param {import('node:sqlite').DatabaseSync} db */
const volcado = (db) => JSON.stringify(TABLAS.map((t) => db.prepare(`select * from ${t} order by 1`).all()));

/** Modifica una celda del Excel y guarda en otro archivo. */
/** @param {string} origen @param {string} destino @param {(wb: ExcelJS.Workbook) => void} fn */
async function editar(origen, destino, fn) {
  const wb = new ExcelJS.Workbook(); await wb.xlsx.readFile(origen); fn(wb); await wb.xlsx.writeFile(destino);
}

describe('exportarExcel (CA-008-01)', () => {
  test('una hoja por tabla más la hoja _version con el esquema', async () => {
    const db = abrirBase(':memory:'); sembrar(db); const f = path.join(tmp(), 'r.xlsx');
    await exportarExcel(db, f);
    const wb = new ExcelJS.Workbook(); await wb.xlsx.readFile(f);
    assert.deepEqual(wb.worksheets.map((w) => w.name), ['_version', ...TABLAS]);
    assert.equal(wb.getWorksheet('_version')?.getCell('B1').value, VERSION_ESQUEMA);
  });
  test('una tabla vacía igual lleva su fila de encabezados', async () => {
    const db = abrirBase(':memory:'); const f = path.join(tmp(), 'r.xlsx');
    await exportarExcel(db, f);
    const wb = new ExcelJS.Workbook(); await wb.xlsx.readFile(f);
    assert.equal(wb.getWorksheet('estudiante')?.getCell('A1').value, 'id');
  });
});

describe('ida y vuelta (CA-008-02)', () => {
  test('exportar y reconstruir en una base vacía deja todo idéntico', async () => {
    const a = abrirBase(':memory:'); sembrar(a); const f = path.join(tmp(), 'r.xlsx');
    await exportarExcel(a, f);
    const b = abrirBase(':memory:');
    const r = await importarExcel(b, f);
    assert.equal(volcado(b), volcado(a));
    assert.ok(r.resumen.nota.nuevos === 2);
  });
  test('conserva tildes, eñes, vacíos (null) y decimales', async () => {
    const a = abrirBase(':memory:'); sembrar(a); const f = path.join(tmp(), 'r.xlsx');
    await exportarExcel(a, f); const b = abrirBase(':memory:'); await importarExcel(b, f);
    assert.equal(b.prepare('select nombre from estudiante where id=1').get()?.nombre, 'Ñandú Muñoz Peña');
    assert.equal(b.prepare('select documento from estudiante where id=2').get()?.documento, null);
    assert.equal(b.prepare('select n3 from nota where id=2').get()?.n3, null);
    assert.equal(b.prepare('select n2 from nota where id=1').get()?.n2, 3.5);
  });
});

describe('Excel de otra base (hallazgo de la revisión independiente)', () => {
  test('con datos propios, un Excel de OTRA base no se importa ni se analiza y no cambia nada', async () => {
    const a = abrirBase(':memory:'); sembrar(a); const f = path.join(tmp(), 'r.xlsx'); await exportarExcel(a, f);
    const b = abrirBase(':memory:'); b.exec("insert into materia(nombre) values ('Español')");
    const antes = volcado(b);
    await assert.rejects(importarExcel(b, f, { confirmar: true }), (e) => e instanceof ErrorImportacion && e.codigo === 'OTRA_BASE');
    await assert.rejects(analizarExcel(b, f), (e) => e instanceof ErrorImportacion && e.codigo === 'OTRA_BASE');
    assert.equal(volcado(b), antes);
  });
  test('en una base vacía sí se importa y la base adopta la identidad del respaldo', async () => {
    const a = abrirBase(':memory:'); sembrar(a); const f = path.join(tmp(), 'r.xlsx'); await exportarExcel(a, f);
    const b = abrirBase(':memory:');
    await importarExcel(b, f);
    assert.equal(b.prepare("select valor from config where clave = 'base.id'").get()?.valor, a.prepare("select valor from config where clave = 'base.id'").get()?.valor);
    assert.equal(b.prepare('select count(*) n from estudiante').get()?.n, a.prepare('select count(*) n from estudiante').get()?.n);
  });
});

describe('importar sobre datos existentes (CA-008-03)', () => {
  test('sin confirmar, no cambia nada y pide confirmación con el resumen', async () => {
    const a = abrirBase(':memory:'); sembrar(a); const f = path.join(tmp(), 'r.xlsx'); await exportarExcel(a, f);
    const b = abrirBase(':memory:'); b.exec("insert into materia(nombre) values ('Otra')");
    b.prepare("update config set valor = ? where clave = 'base.id'").run(String(a.prepare("select valor from config where clave = 'base.id'").get()?.valor)); // misma base
    const antes = volcado(b);
    await assert.rejects(importarExcel(b, f), (e) => e instanceof ErrorImportacion && e.codigo === 'CONFIRMACION' && !!e.resumen);
    assert.equal(volcado(b), antes);
  });
  test('analizar cuenta nuevos, cambiados e iguales y no modifica la base', async () => {
    const a = abrirBase(':memory:'); sembrar(a); const f = path.join(tmp(), 'r.xlsx'); await exportarExcel(a, f);
    a.exec("update estudiante set nombre = 'Cambiado' where id = 2; insert into materia(nombre) values ('Solo en la base')");
    const antes = volcado(a);
    const r = await analizarExcel(a, f);
    assert.equal(r.errores.length, 0);
    assert.deepEqual(r.resumen.estudiante, { nuevos: 0, cambiados: 1, iguales: 1 });
    assert.deepEqual(r.resumen.materia, { nuevos: 0, cambiados: 0, iguales: 2 });
    assert.equal(volcado(a), antes);
  });
  test('confirmado, aplica los cambios y no borra lo que solo está en la base', async () => {
    const a = abrirBase(':memory:'); sembrar(a); const f = path.join(tmp(), 'r.xlsx'); await exportarExcel(a, f);
    a.exec("update estudiante set nombre = 'Cambiado' where id = 2; insert into materia(id, nombre) values (50, 'Solo en la base')");
    await importarExcel(a, f, { confirmar: true });
    assert.equal(a.prepare('select nombre from estudiante where id=2').get()?.nombre, 'José Ángel Gómez');
    assert.equal(a.prepare('select nombre from materia where id=50').get()?.nombre, 'Solo en la base');
  });
});

describe('Excel inválido (CA-008-04)', () => {
  test('una nota fuera de rango se rechaza con hoja, fila y columna, y la base no cambia', async () => {
    const a = abrirBase(':memory:'); sembrar(a); const f = path.join(tmp(), 'r.xlsx'); await exportarExcel(a, f);
    const g = path.join(tmp(), 'malo.xlsx');
    await editar(f, g, (wb) => { const ws = /** @type {ExcelJS.Worksheet} */ (wb.getWorksheet('nota')); ws.getCell('E3').value = 6.5; });
    const b = abrirBase(':memory:'); const antes = volcado(b);
    await assert.rejects(importarExcel(b, g), (e) => {
      assert.ok(e instanceof ErrorImportacion && e.codigo === 'INVALIDO');
      const x = e.errores.find((y) => y.hoja === 'nota');
      assert.ok(x); assert.equal(x.fila, 3); assert.equal(x.columna, 'n1');
      assert.match(x.mensaje, /entre 1,0 y 5,0/);
      return true;
    });
    assert.equal(volcado(b), antes);
  });
  test('todo o nada: un error en una fila no deja aplicadas las anteriores', async () => {
    const a = abrirBase(':memory:'); sembrar(a); const f = path.join(tmp(), 'r.xlsx'); await exportarExcel(a, f);
    const g = path.join(tmp(), 'malo.xlsx');
    await editar(f, g, (wb) => { const ws = /** @type {ExcelJS.Worksheet} */ (wb.getWorksheet('nota')); ws.getCell('E3').value = 0; });
    const b = abrirBase(':memory:');
    await assert.rejects(importarExcel(b, g));
    assert.equal(b.prepare('select count(*) n from estudiante').get()?.n, 0);
    assert.equal(b.prepare('select count(*) n from materia').get()?.n, 0);
  });
  test('una referencia a un estudiante inexistente se reporta con su fila', async () => {
    const a = abrirBase(':memory:'); sembrar(a); const f = path.join(tmp(), 'r.xlsx'); await exportarExcel(a, f);
    const g = path.join(tmp(), 'malo.xlsx');
    await editar(f, g, (wb) => { const ws = /** @type {ExcelJS.Worksheet} */ (wb.getWorksheet('matricula')); ws.getCell('B2').value = 99; });
    const b = abrirBase(':memory:');
    await assert.rejects(importarExcel(b, g), (e) => e instanceof ErrorImportacion && e.errores.some((y) => y.hoja === 'matricula' && y.fila === 2));
  });
  test('un campo obligatorio vacío se reporta', async () => {
    const a = abrirBase(':memory:'); sembrar(a); const f = path.join(tmp(), 'r.xlsx'); await exportarExcel(a, f);
    const g = path.join(tmp(), 'malo.xlsx');
    await editar(f, g, (wb) => { const ws = /** @type {ExcelJS.Worksheet} */ (wb.getWorksheet('estudiante')); ws.getCell('B2').value = null; });
    const r = await analizarExcel(abrirBase(':memory:'), g);
    assert.ok(r.errores.some((y) => y.hoja === 'estudiante' && y.columna === 'nombre' && /obligatori/.test(y.mensaje)));
  });
  test('un esquema de otra versión se rechaza diciendo qué versión se entiende', async () => {
    const a = abrirBase(':memory:'); sembrar(a); const f = path.join(tmp(), 'r.xlsx'); await exportarExcel(a, f);
    const g = path.join(tmp(), 'otra.xlsx');
    await editar(f, g, (wb) => { /** @type {ExcelJS.Worksheet} */ (wb.getWorksheet('_version')).getCell('B1').value = 99; });
    await assert.rejects(importarExcel(abrirBase(':memory:'), g), (e) => e instanceof ErrorImportacion && e.codigo === 'VERSION' && new RegExp(`esquema ${VERSION_ESQUEMA}`).test(e.message));
  });
  test('un archivo que no es un respaldo de este programa se rechaza', async () => {
    const wb = new ExcelJS.Workbook(); wb.addWorksheet('Hoja1').addRow(['a']); const g = path.join(tmp(), 'otro.xlsx'); await wb.xlsx.writeFile(g);
    await assert.rejects(importarExcel(abrirBase(':memory:'), g), (e) => e instanceof ErrorImportacion && e.codigo === 'VERSION');
  });
  test('una hoja con columnas distintas se rechaza', async () => {
    const a = abrirBase(':memory:'); sembrar(a); const f = path.join(tmp(), 'r.xlsx'); await exportarExcel(a, f);
    const g = path.join(tmp(), 'cols.xlsx');
    await editar(f, g, (wb) => { /** @type {ExcelJS.Worksheet} */ (wb.getWorksheet('materia')).getCell('B1').value = 'titulo'; });
    const r = await analizarExcel(abrirBase(':memory:'), g);
    assert.ok(r.errores.some((y) => y.hoja === 'materia' && y.fila === 1));
  });
});
