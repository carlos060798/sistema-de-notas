// @ts-check
// Descarga de documentos por HTTP: tipos, formatos permitidos y errores.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { abrirBase } from '../src/datos/base.js';
import { crearServidor } from '../src/servidor/servidor.js';

/** @type {Array<() => Promise<void>>} */ const aCerrar = [];
after(async () => { for (const c of aCerrar) await c(); });

test('reportes por HTTP: descarga correcta, formato inválido y token', async () => {
  const s = crearServidor({ db: abrirBase(':memory:'), rutaBase: null, carpetaCopias: '' });
  const { url } = await s.escuchar(); aCerrar.push(() => s.cerrar());
  const j = async (/** @type {string} */ m, /** @type {string} */ r, /** @type {any} */ b) =>
    (await fetch(url + r, { method: m, headers: { 'x-token': s.token, 'content-type': 'application/json' }, body: JSON.stringify(b) })).json();
  const anio = await j('POST', '/api/anios', { anio: 2026 }); const mat = await j('POST', '/api/materias', { nombre: 'Ciencias' });
  const est = await j('POST', '/api/estudiantes', { nombre: 'Ñoño Gómez', documento: null, grado: 1, anio_id: anio.id });
  await j('PUT', '/api/notas', { matricula_id: est.matricula_id, materia_id: mat.id, periodo: 1, n1: 4, n2: 4, n3: 4 });
  const get = (/** @type {string} */ r, token = s.token) => fetch(url + r, { headers: { 'x-token': token } });

  const pdf = await get(`/api/reportes/boletin?anio_id=${anio.id}&matricula_id=${est.matricula_id}&formato=pdf`);
  assert.equal(pdf.status, 200); assert.equal(pdf.headers.get('content-type'), 'application/pdf');
  assert.equal(Buffer.from(await pdf.arrayBuffer()).subarray(0, 5).toString(), '%PDF-');
  assert.match(pdf.headers.get('content-disposition') ?? '', /filename\*=UTF-8''boletin-%C3%91o%C3%B1o/);
  assert.equal((await get(`/api/reportes/planilla?anio_id=${anio.id}&grado=1&materia_id=${mat.id}&formato=xlsx`)).status, 200);
  assert.equal((await get(`/api/reportes/certificado?anio_id=${anio.id}&matricula_id=${est.matricula_id}&formato=docx`)).status, 200);
  const mal = await get(`/api/reportes/boletin?anio_id=${anio.id}&matricula_id=${est.matricula_id}&formato=xlsx`);
  assert.equal(mal.status, 400); assert.match((await mal.json()).error, /pdf o docx/);
  assert.equal((await get(`/api/reportes/boletin?anio_id=${anio.id}&matricula_id=999&formato=pdf`)).status, 400);
  assert.equal((await get(`/api/reportes/boletin?anio_id=${anio.id}&matricula_id=1&formato=pdf`, 'falso')).status, 401);
});
