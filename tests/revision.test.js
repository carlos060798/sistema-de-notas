// @ts-check
// Correcciones de la revisión independiente: reabrir año y copia manual con carpeta extra.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { abrirBase } from '../src/datos/base.js';
import { crearServidor } from '../src/servidor/servidor.js';
import { listarCopias } from '../src/respaldo/respaldo.js';

/** @type {Array<() => Promise<void>>} */ const aCerrar = [];
after(async () => { for (const c of aCerrar) await c(); });

test('un año cerrado se puede reabrir y entonces vuelve a admitir cambios', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rev-'));
  const s = crearServidor({ db: abrirBase(':memory:'), rutaBase: null, carpetaCopias: path.join(dir, 'copias') });
  const { url } = await s.escuchar(); aCerrar.push(() => s.cerrar());
  const llamar = (/** @type {string} */ m, /** @type {string} */ r, /** @type {any} */ b = undefined) =>
    fetch(url + r, { method: m, headers: { 'x-token': s.token, ...(b ? { 'content-type': 'application/json' } : {}) }, body: b ? JSON.stringify(b) : undefined });
  const j = async (/** @type {string} */ m, /** @type {string} */ r, /** @type {any} */ b = undefined) => (await llamar(m, r, b)).json();
  const anio = await j('POST', '/api/anios', { anio: 2026 }); const mat = await j('POST', '/api/materias', { nombre: 'Ciencias' });
  await llamar('POST', `/api/anios/${anio.id}/cerrar`);
  const cerrado = await llamar('PUT', '/api/temas', { anio_id: anio.id, materia_id: mat.id, grado: 1, periodo: 1, nombre: 'T' });
  assert.equal(cerrado.status, 400);
  assert.equal((await llamar('POST', `/api/anios/${anio.id}/reabrir`)).status, 200);
  assert.equal((await llamar('PUT', '/api/temas', { anio_id: anio.id, materia_id: mat.id, grado: 1, periodo: 1, nombre: 'T' })).status, 200);
  assert.equal((await llamar('POST', '/api/anios/999/reabrir')).status, 400);

  // copia manual: sin carpeta extra solo informa «sin-configurar»; con carpeta, copia también allí
  assert.equal((await j('POST', '/api/respaldo')).extra.estado, 'sin-configurar');
  const usb = path.join(dir, 'usb');
  assert.equal((await llamar('PUT', '/api/respaldo/extra', { carpeta: usb })).status, 200);
  assert.equal((await j('POST', '/api/respaldo')).extra.estado, 'ok');
  assert.ok(listarCopias(usb).some((c) => c.motivo === 'manual'));
  assert.equal((await llamar('PUT', '/api/respaldo/extra', { carpeta: 'relativa' })).status, 400);
});
