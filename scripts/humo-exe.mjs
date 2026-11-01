// Prueba de humo del ejecutable: lo arranca sin ventana, crea datos y descarga cada tipo de documento.
// Uso: node scripts/humo-exe.mjs <ruta-al-exe>
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import assert from 'node:assert/strict';

const origen = path.resolve(process.argv[2] ?? 'dist/notas.exe');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'humo-'));
const exe = path.join(dir, path.basename(origen)); fs.copyFileSync(origen, exe); // los datos quedan junto al .exe
const proc = spawn(exe, ['--sin-ventana'], { stdio: 'inherit' });
try {
  const lock = path.join(dir, 'datos', 'notas.lock'); let url = '';
  for (let i = 0; i < 100 && !url; i++) { await new Promise((r) => setTimeout(r, 300)); try { url = JSON.parse(fs.readFileSync(lock, 'utf8')).url; } catch { /* aún no */ } }
  assert.ok(url, 'el programa no arrancó');
  const pagina = await (await fetch(url + '/')).text();
  const token = /name="token" content="([^"]+)"/.exec(pagina)?.[1]; assert.ok(token, 'la interfaz no trae el token');
  assert.ok((await fetch(url + '/app.js')).ok);
  const j = async (m, r, b) => (await fetch(url + r, { method: m, headers: { 'x-token': token, 'content-type': 'application/json' }, body: JSON.stringify(b) })).json();
  const anio = await j('POST', '/api/anios', { anio: 2026 }); const mat = await j('POST', '/api/materias', { nombre: 'Matemáticas' });
  const est = await j('POST', '/api/estudiantes', { nombre: 'Ñoño Gómez', documento: null, grado: 1, anio_id: anio.id });
  await j('PUT', '/api/notas', { matricula_id: est.matricula_id, materia_id: mat.id, periodo: 1, n1: 4, n2: 4, n3: 4 });
  const cab = { 'x-token': token };
  const q = `anio_id=${anio.id}`;
  for (const [ruta, magia] of [
    [`/api/reportes/planilla?${q}&grado=1&materia_id=${mat.id}&formato=pdf`, '%PDF-'], [`/api/reportes/planilla?${q}&grado=1&materia_id=${mat.id}&formato=xlsx`, 'PK'],
    [`/api/reportes/boletin?${q}&matricula_id=${est.matricula_id}&formato=pdf`, '%PDF-'], [`/api/reportes/boletin?${q}&matricula_id=${est.matricula_id}&formato=docx`, 'PK'],
    [`/api/reportes/certificado?${q}&matricula_id=${est.matricula_id}&formato=pdf`, '%PDF-'], ['/api/excel', 'PK'],
  ]) {
    const r = await fetch(url + ruta, { headers: cab }); assert.equal(r.status, 200, ruta);
    assert.ok(Buffer.from(await r.arrayBuffer()).subarray(0, magia.length).toString() === magia, ruta);
  }
  assert.equal((await fetch(url + '/api/respaldo', { method: 'POST', headers: cab })).status, 200);
  console.log('HUMO OK:', origen);
} finally { proc.kill(); }
process.exit(0);
