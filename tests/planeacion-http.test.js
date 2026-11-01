// @ts-check
// Rutas HTTP de planeación: flujo completo, validación y token.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { abrirBase } from '../src/datos/base.js';
import { crearServidor } from '../src/servidor/servidor.js';

/** @type {Array<() => Promise<void>>} */ const aCerrar = [];
after(async () => { for (const c of aCerrar) await c(); });

test('planeación por HTTP: crear, avanzar un tema, planear una clase, validar y exigir token', async () => {
  const s = crearServidor({ db: abrirBase(':memory:'), rutaBase: null, carpetaCopias: '' });
  const { url } = await s.escuchar(); aCerrar.push(() => s.cerrar());
  const llamar = async (/** @type {string} */ m, /** @type {string} */ r, /** @type {any} */ b = undefined, token = s.token) =>
    fetch(url + r, { method: m, headers: { 'x-token': token, ...(b ? { 'content-type': 'application/json' } : {}) }, body: b ? JSON.stringify(b) : undefined });
  const j = async (/** @type {string} */ m, /** @type {string} */ r, /** @type {any} */ b = undefined) => (await llamar(m, r, b)).json();

  const anio = await j('POST', '/api/anios', { anio: 2026 }); const mat = await j('POST', '/api/materias', { nombre: 'Lenguaje' });
  const base = { anio_id: anio.id, materia_id: mat.id, grado: 3 };
  const tema = await j('PUT', '/api/temas', { ...base, periodo: 1, nombre: 'El cuento' });
  assert.equal((await llamar('POST', `/api/temas/${tema.id}/estado`, { estado: 'visto', fecha: '2026-03-03' })).status, 200);
  const av = await j('GET', `/api/temas?anio_id=${anio.id}&materia_id=${mat.id}&grado=3`);
  assert.equal(av.avance.porcentaje, 100); assert.equal(av.temas[0].fecha_visto, '2026-03-03');
  await j('PUT', '/api/clases', { ...base, fecha: '2026-03-04', tema_id: tema.id, objetivo: 'Leer' });
  assert.equal((await j('GET', `/api/clases?anio_id=${anio.id}`)).length, 1);
  const plan = await j('PUT', '/api/planes', { ...base, tipo: 'area', titulo: 'Plan', contenido: 'x' });
  assert.equal((await j('GET', `/api/planes?anio_id=${anio.id}&tipo=area`)).length, 1);
  assert.equal((await llamar('DELETE', `/api/planes/${plan.id}`)).status, 200);
  await j('PUT', '/api/guias', { materia_id: mat.id, grado: 3, tema: 'Cuento', titulo: 'G', contenido: 'c' });
  assert.equal((await j('GET', '/api/guias?tema=cuen')).length, 1);
  // entradas inválidas -> 400 con mensaje, nunca 500
  const mala = await llamar('PUT', '/api/clases', { ...base, fecha: '31/12/2026' });
  assert.equal(mala.status, 400); assert.match((await mala.json()).error, /fecha/);
  assert.equal((await llamar('GET', `/api/planes?anio_id=${anio.id}`, undefined, 'falso')).status, 401);
});
