// @ts-check
// Servidor local (spec RF-003, T3.1, T3.2 y la interfaz de respaldo/Excel).
import { test, describe, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { abrirBase } from '../src/datos/base.js';
import { crearServidor } from '../src/servidor/servidor.js';

const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'srv-'));
/** @type {Array<() => Promise<void>>} */ const aCerrar = [];
after(async () => { for (const c of aCerrar) await c(); });

/** Levanta un servidor de pruebas y devuelve ayudas de llamada. @param {any} [opciones] */
async function levantar(opciones = {}) {
  const dir = tmp();
  const rutaBase = opciones.enMemoria ? null : path.join(dir, 'datos.db');
  const db = opciones.db === null ? null : abrirBase(rutaBase ?? ':memory:');
  const s = crearServidor({ db, rutaBase, carpetaCopias: path.join(dir, 'copias'), modo: opciones.modo, motivoDano: opciones.motivoDano });
  const { puerto, url } = await s.escuchar();
  aCerrar.push(() => s.cerrar());
  /** @param {string} metodo @param {string} ruta @param {any} [cuerpo] @param {Record<string,string>} [cab] */
  const api = async (metodo, ruta, cuerpo, cab = {}) => {
    const r = await fetch(url + ruta, {
      method: metodo,
      headers: { 'x-token': s.token, ...(cuerpo !== undefined ? { 'content-type': 'application/json' } : {}), ...cab },
      body: cuerpo !== undefined ? JSON.stringify(cuerpo) : undefined,
    });
    const texto = await r.text();
    let json = null; try { json = JSON.parse(texto); } catch { /* no es JSON */ }
    return { status: r.status, json, texto, headers: r.headers };
  };
  return { s, puerto, url, api, dir, rutaBase };
}

/** Petición HTTP cruda para poder poner cualquier cabecera Host. */
function cruda(/** @type {number} */ puerto, /** @type {string} */ ruta, /** @type {Record<string,string>} */ cabeceras) {
  return new Promise((ok, mal) => {
    const req = http.request({ host: '127.0.0.1', port: puerto, path: ruta, method: 'GET', headers: cabeceras }, (res) => {
      let d = ''; res.on('data', (c) => (d += c)); res.on('end', () => ok({ status: res.statusCode, cuerpo: d }));
    });
    req.on('error', mal); req.end();
  });
}

describe('seguridad (RF-003, Principio I)', () => {
  test('escucha solo en 127.0.0.1', async () => {
    const t = await levantar();
    const dir = /** @type {import('node:net').AddressInfo} */ (t.s.server.address());
    assert.equal(dir.address, '127.0.0.1');
  });
  test('la API exige el token del arranque', async () => {
    const t = await levantar();
    assert.equal((await fetch(t.url + '/api/estado')).status, 401);
    assert.equal((await fetch(t.url + '/api/estado', { headers: { 'x-token': 'x'.repeat(48) } })).status, 401);
    assert.equal((await t.api('GET', '/api/estado')).status, 200);
  });
  test('un Host ajeno (DNS rebinding) se rechaza aunque lleve el token', async () => {
    const t = await levantar();
    const r = /** @type {any} */ (await cruda(t.puerto, '/api/estado', { host: 'evil.example.com', 'x-token': t.s.token }));
    assert.equal(r.status, 403);
    const ok = /** @type {any} */ (await cruda(t.puerto, '/api/estado', { host: `localhost:${t.puerto}`, 'x-token': t.s.token }));
    assert.equal(ok.status, 200);
  });
  test('un Origin ajeno (otra página web) se rechaza aunque lleve el token', async () => {
    const t = await levantar();
    const r = await t.api('GET', '/api/estado', undefined, { origin: 'https://malo.example.com' });
    assert.equal(r.status, 403);
  });
  test('la página trae el token y cabeceras de protección; los archivos no salen de la carpeta de la interfaz', async () => {
    const t = await levantar();
    const r = await fetch(t.url + '/');
    const html = await r.text();
    assert.equal(r.status, 200);
    assert.ok(html.includes(t.s.token));
    assert.match(r.headers.get('content-security-policy') ?? '', /default-src 'self'/);
    assert.equal(r.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(r.headers.get('cache-control'), 'no-store');
    assert.equal((await fetch(t.url + '/app.js')).status, 200);
    assert.equal((await cruda(t.puerto, '/..%2f..%2fpackage.json', {}).then((x) => /** @type {any} */ (x).status)), 404);
    assert.equal((await cruda(t.puerto, '/../package.json', {}).then((x) => /** @type {any} */ (x).status)), 404);
  });
  test('un cuerpo demasiado grande se rechaza', async () => {
    const t = await levantar();
    const r = await fetch(t.url + '/api/materias', { method: 'POST', headers: { 'x-token': t.s.token, 'content-type': 'application/json' }, body: JSON.stringify({ nombre: 'x'.repeat(2_000_000) }) });
    assert.equal(r.status, 413);
  });
  test('rutas desconocidas dan 404 en JSON y errores internos no filtran detalles', async () => {
    const t = await levantar();
    const r = await t.api('GET', '/api/no-existe');
    assert.equal(r.status, 404); assert.ok(r.json?.error);
  });
});

describe('flujo completo (T3.2 a T3.4)', () => {
  test('año, materia, estudiante, notas, desaprobadas y nivelación por la API', async () => {
    const { api } = await levantar({ enMemoria: true });
    const anio = (await api('POST', '/api/anios', { anio: 2026 })).json;
    const mat = (await api('POST', '/api/materias', { nombre: 'Matemáticas' })).json;
    const est = (await api('POST', '/api/estudiantes', { nombre: 'Ñandú', documento: '5', grado: 2, anio_id: anio.id })).json;
    const n = await api('PUT', '/api/notas', { matricula_id: est.matricula_id, materia_id: mat.id, periodo: 1, n1: 4.0, n2: 3.5, n3: 4.5 });
    assert.equal(n.status, 200); assert.equal(n.json.definitiva.valor, 4.0);

    const hoja = (await api('GET', `/api/notas?anio_id=${anio.id}&grado=2&materia_id=${mat.id}&periodo=1`)).json;
    assert.equal(hoja[0].nombre, 'Ñandú'); assert.equal(hoja[0].definitiva.valor, 4.0);

    for (let p = 2; p <= 4; p++) await api('PUT', '/api/notas', { matricula_id: est.matricula_id, materia_id: mat.id, periodo: p, n1: 2, n2: 2, n3: 2 });
    const des = (await api('GET', `/api/desaprobadas?anio_id=${anio.id}&base=periodo&periodo=3`)).json;
    assert.equal(des.length, 1);

    const niv = await api('PUT', '/api/nivelaciones', { matricula_id: est.matricula_id, materia_id: mat.id, actividades: 'Taller', fecha: '2026-11-10', nota: null });
    // año = (4,0 + 2,0 + 2,0 + 2,0) / 4 = 2,5 -> reprobado
    assert.equal(niv.status, 200);
    const pend = (await api('GET', `/api/nivelaciones/pendientes?anio_id=${anio.id}`)).json;
    assert.equal(pend.length, 1);
  });
  test('un error del usuario vuelve como 400 con el mensaje en español', async () => {
    const { api } = await levantar({ enMemoria: true });
    const anio = (await api('POST', '/api/anios', { anio: 2026 })).json;
    const mat = (await api('POST', '/api/materias', { nombre: 'Lenguaje' })).json;
    const est = (await api('POST', '/api/estudiantes', { nombre: 'Ana', documento: null, grado: 1, anio_id: anio.id })).json;
    const r = await api('PUT', '/api/notas', { matricula_id: est.matricula_id, materia_id: mat.id, periodo: 1, n1: 6.5, n2: 4, n3: 4 });
    assert.equal(r.status, 400); assert.equal(r.json.error, 'La nota debe estar entre 1,0 y 5,0');
    assert.equal((await api('POST', '/api/anios', { anio: 2026 })).json.error, 'Ese año lectivo ya existe');
  });
  test('JSON mal formado da 400', async () => {
    const t = await levantar({ enMemoria: true });
    const r = await fetch(t.url + '/api/materias', { method: 'POST', headers: { 'x-token': t.s.token, 'content-type': 'application/json' }, body: '{no es json' });
    assert.equal(r.status, 400);
  });
});

describe('respaldo y Excel por la API', () => {
  test('crear copia, listarla y restaurarla (deshace un cambio)', async () => {
    const t = await levantar();
    await t.api('POST', '/api/materias', { nombre: 'Antes' });
    const c = await t.api('POST', '/api/respaldo');
    assert.equal(c.status, 200);
    await t.api('POST', '/api/materias', { nombre: 'Después' });
    const lista = (await t.api('GET', '/api/respaldo')).json;
    assert.ok(lista.length >= 1);
    const r = await t.api('POST', '/api/respaldo/restaurar', { nombre: lista[0].nombre });
    assert.equal(r.status, 200);
    const estado = (await t.api('GET', '/api/estado')).json;
    assert.deepEqual(estado.materias.map((/** @type {any} */ m) => m.nombre), ['Antes']);
  });
  test('restaurar no acepta nombres que no sean copias (sin recorrido de carpetas)', async () => {
    const t = await levantar();
    const r = await t.api('POST', '/api/respaldo/restaurar', { nombre: '../../datos.db' });
    assert.equal(r.status, 400);
  });
  test('exportar Excel entrega un .xlsx e importarlo en otra base la reconstruye', async () => {
    const a = await levantar();
    await a.api('POST', '/api/materias', { nombre: 'Sociales' });
    const x = await fetch(a.url + '/api/excel', { headers: { 'x-token': a.s.token } });
    assert.equal(x.status, 200);
    assert.match(x.headers.get('content-disposition') ?? '', /attachment; filename="respaldo-notas-\d{8}\.xlsx"/);
    const bytes = Buffer.from(await x.arrayBuffer());
    assert.equal(bytes.subarray(0, 2).toString(), 'PK');
    const b = await levantar();
    const imp = await fetch(b.url + '/api/excel/importar', { method: 'POST', headers: { 'x-token': b.s.token }, body: bytes });
    assert.equal(imp.status, 200);
    assert.deepEqual((await b.api('GET', '/api/estado')).json.materias.map((/** @type {any} */ m) => m.nombre), ['Sociales']);
  });
  test('importar sobre datos pide confirmación (409 con resumen) y un archivo malo da 422', async () => {
    const a = await levantar(); await a.api('POST', '/api/materias', { nombre: 'Sociales' });
    const bytes = Buffer.from(await (await fetch(a.url + '/api/excel', { headers: { 'x-token': a.s.token } })).arrayBuffer());
    const b = await levantar(); await b.api('POST', '/api/materias', { nombre: 'Otra' });
    const r = await fetch(b.url + '/api/excel/importar', { method: 'POST', headers: { 'x-token': b.s.token }, body: bytes });
    assert.equal(r.status, 409); assert.ok((await r.json()).resumen);
    const ok = await fetch(b.url + '/api/excel/importar?confirmar=1', { method: 'POST', headers: { 'x-token': b.s.token }, body: bytes });
    assert.equal(ok.status, 200);
    const malo = await fetch(b.url + '/api/excel/importar?confirmar=1', { method: 'POST', headers: { 'x-token': b.s.token }, body: Buffer.from('no soy un excel') });
    assert.equal(malo.status, 422);
  });
});

describe('modo recuperación (CA-007-03)', () => {
  test('con la base dañada la API de datos responde 503 y ofrece restaurar la última copia sana', async () => {
    const dir = tmp(); const rutaBase = path.join(dir, 'datos.db'); const copias = path.join(dir, 'copias');
    const { crearCopia } = await import('../src/respaldo/respaldo.js');
    const d0 = abrirBase(rutaBase); d0.exec("insert into materia(nombre) values ('Salvada')"); crearCopia(d0, copias, 'cerrar'); d0.close();
    const b = fs.readFileSync(rutaBase); for (let i = 100; i < 3000; i++) b[i] = 0xab; fs.writeFileSync(rutaBase, b);

    const s = crearServidor({ db: null, rutaBase, carpetaCopias: copias, modo: 'recuperacion', motivoDano: 'La base está dañada' });
    const { url } = await s.escuchar(); aCerrar.push(() => s.cerrar());
    const h = { 'x-token': s.token };
    const est = await fetch(url + '/api/estado', { headers: h });
    assert.equal((await est.json()).modo, 'recuperacion');
    assert.equal((await fetch(url + '/api/estudiantes?anio_id=1', { headers: h })).status, 503);
    const rec = await (await fetch(url + '/api/recuperacion', { headers: h })).json();
    assert.ok(rec.copias.length >= 1);
    const r = await fetch(url + '/api/recuperacion/restaurar', { method: 'POST', headers: { ...h, 'content-type': 'application/json' }, body: JSON.stringify({ nombre: rec.copias[0].nombre }) });
    assert.equal(r.status, 200);
    const estado = await (await fetch(url + '/api/estado', { headers: h })).json();
    assert.equal(estado.modo, 'ok');
    assert.deepEqual(estado.materias.map((/** @type {any} */ m) => m.nombre), ['Salvada']);
  });
});
