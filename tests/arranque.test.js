// @ts-check
// Arranque: copias al abrir y cerrar, instancia única, recuperación y apagado por latidos.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { iniciar } from '../src/arranque.js';
import { abrirBase } from '../src/datos/base.js';
import { guardarCarpetaExtra } from '../src/respaldo/extra.js';
import { listarCopias } from '../src/respaldo/respaldo.js';

const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'arr-'));
const opciones = (/** @type {string} */ dir, /** @type {any} */ extra = {}) => ({ carpetaDatos: dir, abrirVentana: false, ...extra });

describe('arranque', () => {
  test('primer arranque: crea la base y no hace copia de una base vacía recién creada; al cerrar hace la copia «cerrar»', async () => {
    const dir = tmp(); const app = await iniciar(opciones(dir));
    assert.equal(app.modo, 'ok'); assert.ok(fs.existsSync(path.join(dir, 'notas.db'))); assert.ok(fs.existsSync(path.join(dir, 'notas.lock')));
    await app.cerrar();
    assert.equal(fs.existsSync(path.join(dir, 'notas.lock')), false);
    assert.deepEqual(listarCopias(path.join(dir, 'copias')).map((c) => c.motivo), ['cerrar']);
  });
  test('arranques siguientes: copia «abrir» y «cerrar»; la retención limita las automáticas', async () => {
    const dir = tmp();
    for (let i = 0; i < 4; i++) { const a = await iniciar(opciones(dir, { retencion: 3 })); await a.cerrar(); }
    const copias = listarCopias(path.join(dir, 'copias'));
    assert.equal(copias.length, 3);
    assert.ok(copias.every((c) => ['abrir', 'cerrar'].includes(c.motivo)));
  });
  test('los datos se conservan entre arranques', async () => {
    const dir = tmp(); const a = await iniciar(opciones(dir));
    await fetch(a.url + '/api/materias', { method: 'POST', headers: { 'x-token': a.token, 'content-type': 'application/json' }, body: JSON.stringify({ nombre: 'Sociales' }) });
    await a.cerrar();
    const b = await iniciar(opciones(dir));
    const est = await (await fetch(b.url + '/api/estado', { headers: { 'x-token': b.token } })).json();
    assert.deepEqual(est.materias.map((/** @type {any} */ m) => m.nombre), ['Sociales']);
    await b.cerrar();
  });
  test('instancia única: un segundo arranque no abre otra base, devuelve la dirección de la primera', async () => {
    const dir = tmp(); const a = await iniciar(opciones(dir)); const b = await iniciar(opciones(dir));
    assert.equal(b.yaEstabaAbierta, true); assert.equal(b.url, a.url);
    await a.cerrar();
  });
  test('un archivo de instancia viejo (programa que no responde) se reemplaza', async () => {
    const dir = tmp(); fs.writeFileSync(path.join(dir, 'notas.lock'), JSON.stringify({ url: 'http://127.0.0.1:1', pid: 1 }));
    const a = await iniciar(opciones(dir)); assert.equal(a.yaEstabaAbierta, false); await a.cerrar();
    fs.writeFileSync(path.join(dir, 'notas.lock'), 'basura que no es json');
    const b = await iniciar(opciones(dir)); assert.equal(b.yaEstabaAbierta, false); await b.cerrar();
  });
  test('base dañada: entra en modo recuperación sin tocar el archivo y ofrece la última copia sana', async () => {
    const dir = tmp(); const a = await iniciar(opciones(dir)); await a.cerrar(); // deja una copia «cerrar»
    const ruta = path.join(dir, 'notas.db');
    const d = abrirBase(ruta); d.exec("insert into materia(nombre) values ('Salvada')"); d.close();
    const copiaDeBuena = fs.readFileSync(ruta);
    const b = fs.readFileSync(ruta); for (let i = 100; i < 3000; i++) b[i] = 0xab; fs.writeFileSync(ruta, b);
    const dañada = fs.readFileSync(ruta);
    const app = await iniciar(opciones(dir));
    assert.equal(app.modo, 'recuperacion');
    assert.deepEqual(fs.readFileSync(ruta), dañada); // no se modificó
    const rec = await (await fetch(app.url + '/api/recuperacion', { headers: { 'x-token': app.token } })).json();
    assert.ok(rec.copias.some((/** @type {any} */ c) => c.sana));
    assert.notDeepEqual(copiaDeBuena, dañada);
    await app.cerrar();
    assert.equal(listarCopias(path.join(dir, 'copias')).filter((c) => c.motivo === 'cerrar').length, 1); // no copia una base dañada
  });
  test('sin ventana, si dejan de llegar latidos el programa se apaga solo', async () => {
    const dir = tmp();
    const app = await iniciar(opciones(dir, { latidoMaxMs: 150, revisarCadaMs: 40 }));
    await fetch(app.url + '/api/latido', { method: 'POST', headers: { 'x-token': app.token } });
    for (let i = 0; i < 100 && fs.existsSync(path.join(dir, 'notas.lock')); i++) await new Promise((r) => setTimeout(r, 100)); // hasta 10 s
    assert.equal(fs.existsSync(path.join(dir, 'notas.lock')), false);
    assert.ok(listarCopias(path.join(dir, 'copias')).some((c) => c.motivo === 'cerrar'));
  });
  test('si el equipo se suspende (el vigilante se retrasa), el programa NO se apaga', async () => {
    const dir = tmp();
    const app = await iniciar(opciones(dir, { latidoMaxMs: 300, revisarCadaMs: 40 }));
    await fetch(app.url + '/api/latido', { method: 'POST', headers: { 'x-token': app.token } });
    const fin = Date.now() + 700; while (Date.now() < fin) { /* bloquea el programa como una suspensión */ }
    await new Promise((r) => setTimeout(r, 150));
    assert.equal(fs.existsSync(path.join(dir, 'notas.lock')), true);
    await app.cerrar();
  });
  test('copia a una carpeta extra (USB) al cerrar; si no está disponible, el programa cierra igual', async () => {
    const dir = tmp(); const usb = path.join(tmp(), 'USB', 'Respaldos');
    const a = await iniciar(opciones(dir));
    const H = { 'x-token': a.token, 'content-type': 'application/json' };
    const g = await fetch(a.url + '/api/respaldo/extra', { method: 'PUT', headers: H, body: JSON.stringify({ carpeta: usb }) });
    assert.equal(g.status, 200);
    await a.cerrar();
    assert.ok(listarCopias(usb).some((c) => c.motivo === 'cerrar'), 'no hay copia en la carpeta extra');
    // ahora la «memoria» desaparece: cerrar no debe fallar
    const b = await iniciar(opciones(dir));
    fs.rmSync(path.dirname(usb), { recursive: true, force: true }); fs.writeFileSync(path.dirname(usb), 'archivo en lugar de carpeta');
    await b.cerrar();
    assert.equal(fs.existsSync(path.join(dir, 'notas.lock')), false);
  });
  test('carpeta extra: valida la ruta y permite quitarla', () => {
    const db = abrirBase(':memory:');
    assert.throws(() => guardarCarpetaExtra(db, 'Respaldos'), /ruta completa/);
    const ok = path.join(tmp(), 'usb'); assert.equal(guardarCarpetaExtra(db, ok), ok);
    assert.equal(guardarCarpetaExtra(db, ''), '');
  });
  test('dos arranques casi simultáneos: solo uno queda como programa; el otro se une a él', async () => {
    const dir = tmp();
    const [x, y] = await Promise.all([iniciar(opciones(dir)), iniciar(opciones(dir))]);
    assert.equal([x, y].filter((a) => !a.yaEstabaAbierta).length, 1);
    assert.equal(x.url, y.url);
    await (x.yaEstabaAbierta ? y : x).cerrar();
  });
});
