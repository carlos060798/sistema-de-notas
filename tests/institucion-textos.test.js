// @ts-check
// Datos de la institución y exportación de planes y guías a PDF/Word por HTTP.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import JSZip from 'jszip';
import { abrirBase } from '../src/datos/base.js';
import { crearServidor } from '../src/servidor/servidor.js';

/** @type {Array<() => Promise<void>>} */ const aCerrar = [];
after(async () => { for (const c of aCerrar) await c(); });

test('institución y exportación de plan/guía', async () => {
  const s = crearServidor({ db: abrirBase(':memory:'), rutaBase: null, carpetaCopias: '' });
  const { url } = await s.escuchar(); aCerrar.push(() => s.cerrar());
  const llamar = (/** @type {string} */ m, /** @type {string} */ r, /** @type {any} */ b = undefined) =>
    fetch(url + r, { method: m, headers: { 'x-token': s.token, ...(b ? { 'content-type': 'application/json' } : {}) }, body: b ? JSON.stringify(b) : undefined });
  const j = async (/** @type {string} */ m, /** @type {string} */ r, /** @type {any} */ b = undefined) => (await llamar(m, r, b)).json();

  assert.deepEqual(await j('GET', '/api/institucion'), { institucion: '', sede: '', docente: '' });
  const g = await j('PUT', '/api/institucion', { nombre: 'Escuela El Roble', sede: ' Vereda Alta ', docente: 'Luz' });
  assert.deepEqual(g, { institucion: 'Escuela El Roble', sede: 'Vereda Alta', docente: 'Luz' });
  await j('PUT', '/api/institucion', { nombre: '', sede: 'Vereda Alta', docente: 'Luz' }); // vaciar un campo lo quita
  assert.equal((await j('GET', '/api/institucion')).institucion, '');
  assert.equal((await llamar('PUT', '/api/institucion', { nombre: 'x'.repeat(121) })).status, 400);

  const anio = await j('POST', '/api/anios', { anio: 2026 }); const mat = await j('POST', '/api/materias', { nombre: 'Sociales' });
  const plan = await j('PUT', '/api/planes', { tipo: 'aula', anio_id: anio.id, materia_id: mat.id, grado: 2, titulo: 'Plan Ñu', contenido: 'Línea uno\nLínea dos' });
  const guia = await j('PUT', '/api/guias', { materia_id: mat.id, grado: 2, tema: 'Mapas', titulo: 'Guía de mapas', contenido: 'Dibuje' });
  for (const [tipo, id] of [['plan', plan.id], ['guia', guia.id]]) {
    const pdf = await llamar('GET', `/api/reportes/${tipo}?id=${id}&formato=pdf`);
    assert.equal(pdf.status, 200); assert.equal(Buffer.from(await pdf.arrayBuffer()).subarray(0, 5).toString(), '%PDF-');
    const dx = await llamar('GET', `/api/reportes/${tipo}?id=${id}&formato=docx`);
    const xml = await (await JSZip.loadAsync(Buffer.from(await dx.arrayBuffer()))).file('word/document.xml')?.async('string');
    assert.ok(xml?.includes('Línea') || xml?.includes('Dibuje'), tipo);
    assert.match(xml ?? '', /Sociales/);
  }
  assert.equal((await llamar('GET', '/api/reportes/plan?id=999&formato=pdf')).status, 400);
  assert.equal((await llamar('GET', `/api/reportes/guia?id=${guia.id}&formato=xlsx`)).status, 400);
});
