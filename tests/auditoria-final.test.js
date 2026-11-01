// @ts-check
// Hallazgos de la segunda auditoría independiente: Excel sin identidad, Excel de versiones anteriores, nivelación tras
// cambiar la nota mínima, aviso de notas fuera de grado, copias a USB por base y copia completa descargable.
import { test, describe, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import ExcelJS from 'exceljs';
import { abrirBase } from '../src/datos/base.js';
import * as A from '../src/servicios/academico.js';
import * as P from '../src/servicios/planeacion.js';
import { exportarExcel, importarExcel, ErrorImportacion } from '../src/excel/excel.js';
import { subcarpetaExtra } from '../src/respaldo/extra.js';
import { crearServidor } from '../src/servidor/servidor.js';

const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'aud-'));
function prep(nombre = 'Ana') {
  const db = abrirBase(':memory:'); const anio = A.crearAnio(db, 2026); const mat = A.crearMateria(db, 'Matemáticas');
  const est = A.crearEstudiante(db, { nombre, documento: null, grado: 1, anio_id: anio.id });
  for (let p = 1; p <= 4; p++) A.guardarNotas(db, { matricula_id: est.matricula_id, materia_id: mat.id, periodo: p, n1: 2.5, n2: 2.5, n3: 2.5 });
  return { db, anio, mat, est };
}
/** Abre un Excel, lo edita y lo guarda con otro nombre. @param {string} origen @param {(wb: ExcelJS.Workbook) => void} cambiar */
async function editar(origen, cambiar) {
  const wb = new ExcelJS.Workbook(); await wb.xlsx.readFile(origen); cambiar(wb);
  const destino = path.join(tmp(), 'e.xlsx'); await wb.xlsx.writeFile(destino); return destino;
}
const codigo = (/** @type {any} */ e) => e instanceof ErrorImportacion && e.codigo;

describe('A1: sin la fila de identidad no se salta la comprobación de otra base', () => {
  test('un Excel de otra base con la fila base_id borrada tampoco se importa sobre una base con datos', async () => {
    const a = prep('Ana'); const b = prep('Pedro');
    const x = path.join(tmp(), 'a.xlsx'); await exportarExcel(a.db, x);
    const sinId = await editar(x, (wb) => { const v = /** @type {ExcelJS.Worksheet} */ (wb.getWorksheet('_version')); v.spliceRows(3, 1); });
    await assert.rejects(importarExcel(b.db, sinId, { confirmar: true }), (/** @type {any} */ e) => codigo(e) === 'OTRA_BASE' && /no indica de qué base/.test(e.message));
    assert.equal(b.db.prepare('select nombre from estudiante').get()?.nombre, 'Pedro');
  });
  test('en una base vacía sí se importa aunque no tenga la fila', async () => {
    const a = prep('Ana'); const x = path.join(tmp(), 'a.xlsx'); await exportarExcel(a.db, x);
    const sinId = await editar(x, (wb) => { /** @type {ExcelJS.Worksheet} */ (wb.getWorksheet('_version')).spliceRows(3, 1); });
    const vacia = abrirBase(':memory:'); await importarExcel(vacia, sinId);
    assert.equal(vacia.prepare('select nombre from estudiante').get()?.nombre, 'Ana');
  });
  test('la hoja config de un Excel no cambia la identidad de una base que ya tiene datos', async () => {
    const a = prep('Ana'); const x = path.join(tmp(), 'a.xlsx'); await exportarExcel(a.db, x);
    const antes = a.db.prepare("select valor from config where clave = 'base.id'").get()?.valor;
    const trucado = await editar(x, (wb) => { const c = /** @type {ExcelJS.Worksheet} */ (wb.getWorksheet('config')); c.eachRow((f) => { if (f.getCell(1).value === 'base.id') f.getCell(2).value = 'otra-identidad'; }); });
    await importarExcel(a.db, trucado, { confirmar: true });
    assert.equal(a.db.prepare("select valor from config where clave = 'base.id'").get()?.valor, antes);
  });
});

describe('A2: los Excel de versiones anteriores se pueden importar', () => {
  test('esquema 1 (sin las tablas añadidas después) se importa en una base vacía y conserva los datos', async () => {
    const a = prep('Ana'); const x = path.join(tmp(), 'a.xlsx'); await exportarExcel(a.db, x);
    const antiguo = await editar(x, (wb) => {
      const v = /** @type {ExcelJS.Worksheet} */ (wb.getWorksheet('_version')); v.getCell('B1').value = 1; v.spliceRows(3, 1);
      for (const t of ['plan', 'guia', 'tema', 'clase', 'asistencia', 'observacion', 'materia_grado']) wb.removeWorksheet(/** @type {ExcelJS.Worksheet} */ (wb.getWorksheet(t)).id);
    });
    const vacia = abrirBase(':memory:'); await importarExcel(vacia, antiguo);
    assert.equal(vacia.prepare('select count(*) n from nota').get()?.n, 4);
    assert.equal(A.listarEstudiantes(vacia, { anio_id: a.anio.id })[0].nombre, 'Ana');
  });
  test('esquema 4 con la hoja plan sin sus columnas nuevas: se completan con valores por defecto', async () => {
    const a = prep('Ana');
    P.guardarPlan(a.db, { tipo: 'area', anio_id: a.anio.id, materia_id: a.mat.id, grado: 1, titulo: 'Plan', contenido: 'texto', objetivos: 'se pierde en la versión vieja' });
    const x = path.join(tmp(), 'a.xlsx'); await exportarExcel(a.db, x);
    const antiguo = await editar(x, (wb) => {
      const v = /** @type {ExcelJS.Worksheet} */ (wb.getWorksheet('_version')); v.getCell('B1').value = 4;
      const plan = /** @type {ExcelJS.Worksheet} */ (wb.getWorksheet('plan')); plan.spliceColumns(plan.columnCount - 7, 8); // quita las 8 columnas de la migración 5
      wb.removeWorksheet(/** @type {ExcelJS.Worksheet} */ (wb.getWorksheet('materia_grado')).id);
    });
    const vacia = abrirBase(':memory:'); await importarExcel(vacia, antiguo);
    const p = P.listarPlanes(vacia, { anio_id: a.anio.id })[0];
    assert.equal(p.contenido, 'texto'); assert.equal(p.objetivos, '');
  });
  test('un esquema más nuevo o inválido se sigue rechazando; un esquema anterior con columnas que no existen también', async () => {
    const a = prep(); const x = path.join(tmp(), 'a.xlsx'); await exportarExcel(a.db, x);
    for (const valor of [99, 0, 'abc']) {
      const malo = await editar(x, (wb) => { /** @type {ExcelJS.Worksheet} */ (wb.getWorksheet('_version')).getCell('B1').value = valor; });
      await assert.rejects(importarExcel(abrirBase(':memory:'), malo), (e) => codigo(e) === 'VERSION', String(valor));
    }
    const raro = await editar(x, (wb) => { const v = /** @type {ExcelJS.Worksheet} */ (wb.getWorksheet('_version')); v.getCell('B1').value = 2; /** @type {ExcelJS.Worksheet} */ (wb.getWorksheet('materia')).getRow(1).getCell(2).value = 'columna_rara'; });
    await assert.rejects(importarExcel(abrirBase(':memory:'), raro), (e) => codigo(e) === 'INVALIDO');
  });
  test('el Excel no lleva la carpeta de la memoria USB de este equipo', async () => {
    const a = prep(); db_extra(a.db, 'E:\\Respaldos');
    const x = path.join(tmp(), 'a.xlsx'); await exportarExcel(a.db, x);
    const wb = new ExcelJS.Workbook(); await wb.xlsx.readFile(x);
    let hay = false; /** @type {ExcelJS.Worksheet} */ (wb.getWorksheet('config')).eachRow((f) => { if (f.getCell(1).value === 'respaldo.carpeta_extra') hay = true; });
    assert.equal(hay, false);
  });
});
/** @param {any} db @param {string} carpeta */
function db_extra(db, carpeta) { db.prepare("insert into config(clave, valor) values ('respaldo.carpeta_extra', ?)").run(carpeta); }

describe('medios de la auditoría', () => {
  test('M4: una nivelación ya abierta sigue editable si se baja la nota mínima', () => {
    const { db, mat, est } = prep();
    A.guardarNivelacion(db, { matricula_id: est.matricula_id, materia_id: mat.id, actividades: 'Taller', fecha: null, nota: null });
    A.guardarUmbral(db, 2.0);
    A.guardarNivelacion(db, { matricula_id: est.matricula_id, materia_id: mat.id, actividades: 'Taller corregido', fecha: null, nota: 3.1 });
    assert.equal(db.prepare('select nota from nivelacion').get()?.nota, 3.1);
    const otra = A.crearEstudiante(db, { nombre: 'Luz', documento: null, grado: 1, anio_id: 1 });
    for (let p = 1; p <= 4; p++) A.guardarNotas(db, { matricula_id: otra.matricula_id, materia_id: mat.id, periodo: p, n1: 2.5, n2: 2.5, n3: 2.5 });
    assert.throws(() => A.guardarNivelacion(db, { matricula_id: otra.matricula_id, materia_id: mat.id, actividades: '', fecha: null, nota: null }), /menor de 2,0/); // una nueva sí exige el umbral
  });
  test('M5: avisa cuántos estudiantes tienen notas en grados donde la materia ya no se dicta', () => {
    const { db, mat } = prep();
    assert.equal(A.estudiantesConNotasFueraDeGrado(db, mat.id), 0);
    A.guardarGradosMateria(db, mat.id, [3]);
    assert.equal(A.estudiantesConNotasFueraDeGrado(db, mat.id), 1);
    A.guardarGradosMateria(db, mat.id, [1]); assert.equal(A.estudiantesConNotasFueraDeGrado(db, mat.id), 0);
  });
  test('M2: dos bases que comparten una memoria USB usan subcarpetas distintas', () => {
    assert.notEqual(subcarpetaExtra(prep().db), subcarpetaExtra(prep().db));
  });
});

/** @type {Array<() => Promise<void>>} */ const aCerrar = [];
after(async () => { for (const c of aCerrar) await c(); });

test('copia completa: se descarga como archivo .db íntegro y se puede agregar a la lista de copias; un archivo cualquiera se rechaza', async () => {
  const dir = tmp();
  const { db } = prep('Ana');
  const s = crearServidor({ db, rutaBase: path.join(dir, 'notas.db'), carpetaCopias: path.join(dir, 'copias') });
  const { url } = await s.escuchar(); aCerrar.push(() => s.cerrar());
  const H = { 'x-token': s.token };
  const r = await fetch(url + '/api/respaldo/completa', { headers: H });
  assert.equal(r.status, 200); assert.match(r.headers.get('content-disposition') ?? '', /copia-completa-notas-\d{8}\.db/);
  const bytes = Buffer.from(await r.arrayBuffer());
  assert.equal(bytes.subarray(0, 15).toString(), 'SQLite format 3');
  const ok = await fetch(url + '/api/respaldo/agregar', { method: 'POST', headers: H, body: bytes });
  assert.equal(ok.status, 200); const { nombre } = await ok.json();
  assert.ok(fs.existsSync(path.join(dir, 'copias', nombre)));
  const mal = await fetch(url + '/api/respaldo/agregar', { method: 'POST', headers: H, body: Buffer.from('no soy una base') });
  assert.equal(mal.status, 400); assert.match((await mal.json()).error, /no sirve como copia/);
});

describe('importación de Excel: avisos antes de confirmar', () => {
  /** Cambia la primera nota del libro. @param {ExcelJS.Workbook} wb */
  const tocarNota = (wb) => { const n = /** @type {ExcelJS.Worksheet} */ (wb.getWorksheet('nota')); n.getRow(2).getCell(5).value = 4.4; }; // columna n1
  test('avisa cuando una importación cambiaría notas de un año cerrado', async () => {
    const a = prep(); const x = path.join(tmp(), 'a.xlsx'); await exportarExcel(a.db, x);
    A.cerrarAnio(a.db, a.anio.id);
    const r = await (await import('../src/excel/excel.js')).analizarExcel(a.db, await editar(x, tocarNota));
    assert.equal(r.errores.length, 0); assert.equal(r.avisos.aniosCerrados, 1); assert.equal(r.avisos.fueraDeGrado, 0);
  });
  test('avisa cuando cambiaría notas de una materia en un grado donde hoy no se dicta', async () => {
    const a = prep(); const x = path.join(tmp(), 'a.xlsx'); await exportarExcel(a.db, x);
    A.guardarGradosMateria(a.db, a.mat.id, [3]);
    const r = await (await import('../src/excel/excel.js')).analizarExcel(a.db, await editar(x, tocarNota));
    assert.equal(r.avisos.fueraDeGrado, 1); assert.equal(r.avisos.aniosCerrados, 0);
  });
  test('sin cambios no hay avisos', async () => {
    const a = prep(); const x = path.join(tmp(), 'a.xlsx'); await exportarExcel(a.db, x);
    A.cerrarAnio(a.db, a.anio.id);
    const r = await (await import('../src/excel/excel.js')).analizarExcel(a.db, x);
    assert.deepEqual(r.avisos, { aniosCerrados: 0, fueraDeGrado: 0 });
  });
});

test('no se puede restaurar una copia mientras se procesa un Excel (hallazgo bajo 9)', async () => {
  const { crearCopia } = await import('../src/respaldo/respaldo.js');
  const dir = tmp(); const db = abrirBase(path.join(dir, 'notas.db')); A.crearAnio(db, 2026);
  const copias = path.join(dir, 'copias'); const copia = path.basename(crearCopia(db, copias, 'manual'));
  const s = crearServidor({ db, rutaBase: path.join(dir, 'notas.db'), carpetaCopias: copias, retardoExcel: 600 });
  const { url } = await s.escuchar(); aCerrar.push(() => s.cerrar());
  const H = { 'x-token': s.token };
  const x = path.join(tmp(), 'a.xlsx'); await exportarExcel(db, x);
  const excel = fetch(url + '/api/excel/analizar', { method: 'POST', headers: H, body: fs.readFileSync(x) }); // queda «en curso» 600 ms
  await new Promise((r) => setTimeout(r, 200));
  const durante = await fetch(url + '/api/respaldo/restaurar', { method: 'POST', headers: { ...H, 'content-type': 'application/json' }, body: JSON.stringify({ nombre: copia }) });
  assert.equal(durante.status, 400); assert.match((await durante.json()).error, /Excel procesándose/);
  assert.equal((await excel).status, 200);
  const despues = await fetch(url + '/api/respaldo/restaurar', { method: 'POST', headers: { ...H, 'content-type': 'application/json' }, body: JSON.stringify({ nombre: copia }) });
  assert.equal(despues.status, 200); // ya terminó el Excel: ahora sí
});

test('certificado: fecha de expedición en palabras; plan de área: secciones con título para dibujarlas en negrita', async () => {
  const { expedido } = await import('../src/reportes/formatos.js');
  const { datosTexto } = await import('../src/reportes/datos.js');
  assert.equal(expedido(new Date(2026, 9, 31)), 'Expedido el 31 de octubre de 2026.');
  const { db, anio, mat } = prep();
  const p = P.guardarPlan(db, { tipo: 'area', anio_id: anio.id, materia_id: mat.id, grado: 1, titulo: 'Área', objetivos: 'Uno', criterios: 'Dos' });
  assert.deepEqual(datosTexto(db, 'plan', p.id).secciones, [['Objetivos', 'Uno'], ['Criterios de evaluación', 'Dos']]);
  const g = P.guardarGuia(db, { materia_id: mat.id, grado: 1, titulo: 'G', contenido: 'x' });
  assert.equal(datosTexto(db, 'guia', g.id).secciones, null);
});
