// @ts-check
// Adjuntos de guías y renombrar materias: validación, descarga, copias de seguridad.
import { test, describe, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { abrirBase } from '../src/datos/base.js';
import { crearMateria, renombrarMateria, ErrorValidacion } from '../src/servicios/academico.js';
import * as P from '../src/servicios/planeacion.js';
import { crearCopia, verificarCopia } from '../src/respaldo/respaldo.js';
import { crearServidor } from '../src/servidor/servidor.js';

const pdf = Buffer.from('%PDF-1.4\nprueba\n%%EOF');
function prep() {
  const db = abrirBase(':memory:'); const mat = crearMateria(db, 'Sociales');
  const g = P.guardarGuia(db, { materia_id: mat.id, grado: 1, tema: 'Mapas', titulo: 'Guía', contenido: 'x' });
  return { db, mat, g };
}

describe('adjuntos de guías', () => {
  test('se agregan, listan, leen idénticos y se borran con la guía', () => {
    const { db, g } = prep();
    const a = P.agregarAdjunto(db, { guia_id: g.id, nombre: 'Mapa.PDF', datos: pdf });
    const lista = P.listarGuias(db, {});
    assert.deepEqual(lista[0].adjuntos.map((/** @type {any} */ x) => [x.nombre, x.tamano]), [['Mapa.PDF', pdf.length]]);
    const leido = P.leerAdjunto(db, a.id);
    assert.deepEqual(leido.datos, pdf); assert.equal(leido.tipo, 'application/pdf');
    P.borrarGuia(db, g.id);
    assert.equal(db.prepare('select count(*) n from guia_adjunto').get()?.n, 0);
  });
  test('rechaza tipos no permitidos, vacíos, demasiado grandes y nombres vacíos', () => {
    const { db, g } = prep();
    assert.throws(() => P.agregarAdjunto(db, { guia_id: g.id, nombre: 'virus.exe', datos: pdf }), /Solo se aceptan/);
    assert.throws(() => P.agregarAdjunto(db, { guia_id: g.id, nombre: 'sin-extension', datos: pdf }), ErrorValidacion);
    assert.throws(() => P.agregarAdjunto(db, { guia_id: g.id, nombre: 'a.pdf', datos: Buffer.alloc(0) }), /vacío/);
    assert.throws(() => P.agregarAdjunto(db, { guia_id: g.id, nombre: 'a.pdf', datos: Buffer.alloc(P.TAMANO_MAXIMO_ADJUNTO + 1) }), /grande/);
    assert.throws(() => P.agregarAdjunto(db, { guia_id: 999, nombre: 'a.pdf', datos: pdf }), /guía/);
  });
  test('el nombre se limpia: sin carpetas', () => {
    const { db, g } = prep();
    const a = P.agregarAdjunto(db, { guia_id: g.id, nombre: '..\..\secreto\../mapa.png', datos: Buffer.from('x') });
    assert.equal(a.nombre, 'mapa.png');
  });
  test('los adjuntos viajan en las copias de seguridad', () => {
    const { db, g } = prep(); const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'adj-'));
    const a = P.agregarAdjunto(db, { guia_id: g.id, nombre: 'a.pdf', datos: pdf });
    const copia = crearCopia(db, dir, 'manual');
    const db2 = abrirBase(copia);
    assert.deepEqual(P.leerAdjunto(db2, a.id).datos, pdf);
    assert.equal(verificarCopia(copia).ok, true);
  });
});

describe('materias', () => {
  test('renombrar valida y no permite duplicados', () => {
    const { db, mat } = prep(); const otra = crearMateria(db, 'Artística');
    assert.equal(renombrarMateria(db, mat.id, '  Ciencias sociales ').nombre, 'Ciencias sociales');
    assert.throws(() => renombrarMateria(db, otra.id, 'Ciencias sociales'), /Ya existe/);
    assert.throws(() => renombrarMateria(db, otra.id, ' '), ErrorValidacion);
    assert.throws(() => renombrarMateria(db, 999, 'X'), /no existe/);
    assert.equal(renombrarMateria(db, otra.id, 'Artística').nombre, 'Artística'); // el mismo nombre es válido
  });
});

/** @type {Array<() => Promise<void>>} */ const aCerrar = [];
after(async () => { for (const c of aCerrar) await c(); });

test('adjuntos por HTTP: subir, descargar con su tipo, rechazar, borrar', async () => {
  const s = crearServidor({ db: abrirBase(':memory:'), rutaBase: null, carpetaCopias: '' });
  const { url } = await s.escuchar(); aCerrar.push(() => s.cerrar());
  const H = { 'x-token': s.token };
  const j = async (/** @type {string} */ m, /** @type {string} */ r, /** @type {any} */ b = undefined) =>
    (await fetch(url + r, { method: m, headers: { ...H, 'content-type': 'application/json' }, body: b ? JSON.stringify(b) : undefined })).json();
  const mat = await j('POST', '/api/materias', { nombre: 'Ciencias' });
  const g = await j('PUT', '/api/guias', { materia_id: mat.id, grado: 2, tema: 'Agua', titulo: 'Guía agua', contenido: '' });
  const sube = await fetch(`${url}/api/guias/${g.id}/adjuntos?nombre=${encodeURIComponent('Ciclo del agua.pdf')}`, { method: 'POST', headers: H, body: pdf });
  assert.equal(sube.status, 200); const adj = await sube.json();
  const baja = await fetch(`${url}/api/adjuntos/${adj.id}`, { headers: H });
  assert.equal(baja.headers.get('content-type'), 'application/pdf');
  assert.match(baja.headers.get('content-disposition') ?? '', /attachment; filename\*=UTF-8''Ciclo%20del%20agua\.pdf/);
  assert.deepEqual(Buffer.from(await baja.arrayBuffer()), pdf);
  const mal = await fetch(`${url}/api/guias/${g.id}/adjuntos?nombre=x.exe`, { method: 'POST', headers: H, body: pdf });
  assert.equal(mal.status, 400);
  assert.equal((await fetch(`${url}/api/adjuntos/${adj.id}`, { headers: { 'x-token': 'falso' } })).status, 401);
  assert.equal((await fetch(`${url}/api/adjuntos/${adj.id}`, { method: 'DELETE', headers: H })).status, 200);
  assert.equal((await fetch(`${url}/api/adjuntos/${adj.id}`, { headers: H })).status, 400);
  assert.equal((await fetch(`${url}/api/materias/${mat.id}`, { method: 'PUT', headers: { ...H, 'content-type': 'application/json' }, body: JSON.stringify({ nombre: 'Naturales' }) })).status, 200);
});
