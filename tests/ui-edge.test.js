// @ts-check
// Prueba de la interfaz en un Edge/Chrome real (sin ventana), controlado por su protocolo de depuración.
// Se omite sola si no hay navegador. Cubre la pantalla de notas como la usaría el docente.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { iniciar } from '../src/arranque.js';

const pf = process.env['ProgramFiles'] ?? 'C:\\Program Files'; const pf86 = process.env['ProgramFiles(x86)'] ?? 'C:\\Program Files (x86)';
const navegador = [`${pf86}\\Microsoft\\Edge\\Application\\msedge.exe`, `${pf}\\Microsoft\\Edge\\Application\\msedge.exe`, `${pf}\\Google\\Chrome\\Application\\chrome.exe`].find((r) => fs.existsSync(r));
const omitir = !navegador ? 'no hay Edge ni Chrome en este equipo' : process.env['NOTAS_SIN_UI'] ? 'NOTAS_SIN_UI' : false;

/** @type {Array<() => any>} */ const limpiar = [];
after(async () => { for (const l of limpiar.reverse()) { try { await l(); } catch { /* ya cerrado */ } } });

const dormir = (/** @type {number} */ ms) => new Promise((r) => setTimeout(r, ms));

test('pantalla de notas en un navegador real: escribir con coma, rechazar inválidas, marcar no aprobado', { skip: omitir, timeout: 90_000 }, async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ui-'));
  const app = await iniciar({ carpetaDatos: dir, abrirVentana: false, latidoMaxMs: 600_000 });
  limpiar.push(() => app.cerrar());
  const H = { 'x-token': app.token, 'content-type': 'application/json' };
  const post = async (/** @type {string} */ r, /** @type {any} */ b, m = 'POST') => (await fetch(app.url + r, { method: m, headers: H, body: JSON.stringify(b) })).json();
  const anio = await post('/api/anios', { anio: 2026 }); const mat = await post('/api/materias', { nombre: 'Matemáticas' });
  await post('/api/estudiantes', { nombre: 'Ana Ñañez', documento: null, grado: 0, anio_id: anio.id });
  await post('/api/estudiantes', { nombre: 'Beto Pérez', documento: null, grado: 0, anio_id: anio.id });

  const perfil = path.join(dir, 'perfil');
  const proc = spawn(/** @type {string} */ (navegador), ['--headless=new', '--disable-gpu', '--no-first-run', '--remote-debugging-port=0', `--user-data-dir=${perfil}`, 'about:blank'], { stdio: 'ignore' });
  limpiar.push(() => proc.kill());
  let puerto = 0;
  for (let i = 0; i < 60 && !puerto; i++) { await dormir(500); try { puerto = Number(fs.readFileSync(path.join(perfil, 'DevToolsActivePort'), 'utf8').split('\n')[0]); } catch { /* aún no */ } }
  assert.ok(puerto, 'el navegador no abrió el puerto de depuración');
  const pagina = (await (await fetch(`http://127.0.0.1:${puerto}/json/list`)).json()).find((/** @type {any} */ p) => p.type === 'page');
  const ws = new WebSocket(pagina.webSocketDebuggerUrl); limpiar.push(() => ws.close());
  await new Promise((r) => { ws.onopen = r; });

  let id = 0; /** @type {Map<number, (v: any) => void>} */ const esperando = new Map();
  /** @type {string[]} */
  const errores = [];
  ws.onmessage = (m) => {
    const d = JSON.parse(String(m.data));
    if (d.id && esperando.has(d.id)) { /** @type {any} */ (esperando.get(d.id))(d.result ?? d.error); esperando.delete(d.id); }
    if (d.method === 'Runtime.exceptionThrown') errores.push(d.params.exceptionDetails.exception?.description ?? d.params.exceptionDetails.text);
  };
  const cmd = (/** @type {string} */ method, /** @type {any} */ params = {}) => new Promise((r) => { const i = ++id; esperando.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
  const ev = async (/** @type {string} */ expr) => (await cmd('Runtime.evaluate', { expression: expr, returnByValue: true })).result?.value;
  const escribir = (/** @type {number} */ fila, /** @type {number} */ col, /** @type {string} */ texto) => ev(`(() => { const i = document.querySelectorAll('tbody tr')[${fila}].querySelectorAll('input.nota')[${col}]; i.value = ${JSON.stringify(texto)}; i.dispatchEvent(new Event('change')); })()`);
  /** Reintenta hasta que la expresión valga lo esperado (o falla con el último valor). */
  const hasta = async (/** @type {string} */ expr, /** @type {any} */ esperado, ms = 10_000) => {
    const limite = Date.now() + ms; let v;
    while (Date.now() < limite) { v = await ev(expr); if (v === esperado) return; await dormir(100); }
    assert.equal(v, esperado, `tras esperar ${ms} ms: ${expr}`);
  };
  await cmd('Runtime.enable');

  await cmd('Page.navigate', { url: `${app.url}/#notas` });
  await hasta(`document.querySelectorAll('tbody tr').length`, 2);
  assert.equal(await ev(`document.querySelector('tbody tr td').textContent`), 'Ana Ñañez');

  for (const [c, v] of [[0, '4,0'], [1, '3,5'], [2, '4,5']]) await escribir(0, /** @type {number} */ (c), /** @type {string} */ (v)); // con coma, como en Colombia
  await hasta(`document.querySelectorAll('tbody tr')[0].children[4].textContent`, '4,0');
  assert.equal(await ev(`document.querySelectorAll('tbody tr')[0].children[5].textContent`), 'Aprobado');

  await escribir(1, 0, '6,5');
  await hasta(`document.getElementById('aviso').textContent`, 'La nota debe estar entre 1,0 y 5,0');
  await escribir(1, 0, 'abc');
  await hasta(`document.getElementById('aviso').textContent`, 'Escriba solo números, por ejemplo 4,5');

  for (const [c, v] of [[0, '2'], [1, '2,5'], [2, '2,9']]) await escribir(1, /** @type {number} */ (c), /** @type {string} */ (v));
  await hasta(`document.querySelectorAll('tbody tr')[1].className`, 'reprobado');
  assert.equal(await ev(`document.querySelectorAll('tbody tr')[1].children[5].textContent`), 'No aprobado');
  assert.equal(await ev(`document.querySelectorAll('tbody tr')[1].querySelectorAll('input.nota')[0].value`), '2,0'); // se reformatea
  assert.deepEqual(errores, []);
  // El dato quedó guardado en la base, no solo en pantalla
  const filas = await (await fetch(`${app.url}/api/notas?anio_id=${anio.id}&grado=0&materia_id=${mat.id}&periodo=1`, { headers: { 'x-token': app.token } })).json();
  assert.deepEqual(filas.map((/** @type {any} */ f) => f.definitiva.valor), [4.0, 2.5]);

  // Planeación: agregar un tema, marcarlo como visto y ver el avance
  await ev(`[...document.querySelectorAll('#menu button')].find((b) => b.textContent === 'Planeación').click()`);
  await hasta(`document.querySelectorAll('h3').length > 0 && document.querySelector('h3').textContent`, 'Avance: 0 de 0 temas vistos (0 %)');
  await ev(`(() => { const i = document.querySelector('input[type=text]'); i.value = 'Las sumas'; document.querySelector('button.principal').click(); })()`);
  await hasta(`document.querySelectorAll('tbody tr').length`, 1);
  await ev(`(() => { const s = document.querySelector('tbody select'); s.value = 'visto'; s.dispatchEvent(new Event('change')); })()`);
  await hasta(`document.querySelector('h3').textContent`, 'Avance: 1 de 1 temas vistos (100 %)');

  // Estudiantes: lista con acciones de boletín
  const menu = (/** @type {string} */ t) => ev(`[...document.querySelectorAll('#menu button')].find((b) => b.textContent === ${JSON.stringify(t)}).click()`);
  await menu('Estudiantes');
  await hasta(`[...document.querySelectorAll('tbody tr')].map((t) => t.children[0].textContent).join('|')`, 'Transición (0) — 2 estudiantes|Ana Ñañez|Beto Pérez'); // una fila de grupo por grado
  assert.equal(await ev(`[...document.querySelectorAll('tbody button')].filter((b) => b.textContent === 'Boletín PDF').length`), 2);
  // Copias: crear una copia ahora
  await menu('Copias y Excel');
  await hasta(`!![...document.querySelectorAll('button')].find((b) => b.textContent === 'Crear copia ahora')`, true);
  await ev(`[...document.querySelectorAll('button')].find((b) => b.textContent === 'Crear copia ahora').click()`);
  await hasta(`document.getElementById('aviso').textContent`, 'Copia creada');
  // Año y materias: guardar los datos de la institución
  await menu('Año y materias');
  await hasta(`document.querySelectorAll('input[type=text]').length > 2`, true);
  await ev(`(() => { document.querySelectorAll('input[type=text]')[0].value = 'Escuela El Roble'; [...document.querySelectorAll('button')].find((b) => b.textContent === 'Guardar datos').click(); })()`);
  await hasta(`document.getElementById('aviso').textContent`, 'Datos guardados');
  assert.equal((await (await fetch(`${app.url}/api/institucion`, { headers: { 'x-token': app.token } })).json()).institucion, 'Escuela El Roble');
  assert.deepEqual(errores, []);
});
