// Toma capturas de cada pantalla con datos de ejemplo, en un Edge/Chrome sin ventana (protocolo de depuración).
// Uso: node scripts/captura.mjs <carpeta-salida> [ancho] [alto]
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn, execFileSync } from 'node:child_process';
import { iniciar } from '../src/arranque.js';

const salida = path.resolve(process.argv[2] ?? 'capturas'); fs.mkdirSync(salida, { recursive: true });
const ancho = Number(process.argv[3] ?? 1280), alto = Number(process.argv[4] ?? 800);
const pf = process.env['ProgramFiles'] ?? 'C:\\Program Files'; const pf86 = process.env['ProgramFiles(x86)'] ?? 'C:\\Program Files (x86)';
const navegador = [`${pf86}\\Microsoft\\Edge\\Application\\msedge.exe`, `${pf}\\Microsoft\\Edge\\Application\\msedge.exe`, `${pf}\\Google\\Chrome\\Application\\chrome.exe`].find((r) => fs.existsSync(r));
if (!navegador) throw new Error('No hay Edge ni Chrome');
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cap-'));
const app = await iniciar({ carpetaDatos: dir, abrirVentana: false, latidoMaxMs: 600_000 });
const H = { 'x-token': app.token, 'content-type': 'application/json' };
const j = async (m, r, b) => (await fetch(app.url + r, { method: m, headers: H, body: b ? JSON.stringify(b) : undefined })).json();
const anio = await j('POST', '/api/anios', { anio: 2026 });
const mats = {}; for (const n of ['Matemáticas', 'Lenguaje', 'Ciencias naturales', 'Sociales']) mats[n] = (await j('POST', '/api/materias', { nombre: n })).id;
const nombres = ['Ana María Ñañez', 'Beto Pérez', 'Camila Rojas', 'Diego Torres', 'Elena Gómez', 'Fabián Quintero'];
const valores = [[4.5, 4, 4.2], [2, 2.5, 2.9], [3.5, 3, 3], [5, 4.8, 4.9], [null, null, null], [3, 2.8, 3.1]];
for (const [i, nombre] of nombres.entries()) {
  const e = await j('POST', '/api/estudiantes', { nombre, documento: String(1000 + i), grado: i < 4 ? 0 : 2, anio_id: anio.id });
  const [n1, n2, n3] = valores[i];
  if (n1 !== null) for (const m of Object.values(mats)) for (let p = 1; p <= 4; p++) await j('PUT', '/api/notas', { matricula_id: e.matricula_id, materia_id: m, periodo: p, n1, n2, n3 });
}
const t = await j('PUT', '/api/temas', { anio_id: anio.id, materia_id: mats['Matemáticas'], grado: 0, periodo: 1, nombre: 'Las sumas' });
await j('PUT', '/api/temas', { anio_id: anio.id, materia_id: mats['Matemáticas'], grado: 0, periodo: 1, nombre: 'Las restas' });
await j('POST', `/api/temas/${t.id}/estado`, { estado: 'visto', fecha: '2026-03-03' });

const perfil = path.join(dir, 'perfil');
const proc = spawn(navegador, ['--headless=new', '--disable-gpu', '--no-first-run', '--remote-debugging-port=0', `--user-data-dir=${perfil}`, `--window-size=${ancho},${alto}`, 'about:blank'], { stdio: 'ignore' });
let puerto = 0;
for (let i = 0; i < 60 && !puerto; i++) { await dormir(500); try { puerto = Number(fs.readFileSync(path.join(perfil, 'DevToolsActivePort'), 'utf8').split('\n')[0]); } catch { /* aún no */ } }
const pagina = (await (await fetch(`http://127.0.0.1:${puerto}/json/list`)).json()).find((p) => p.type === 'page');
const ws = new WebSocket(pagina.webSocketDebuggerUrl); await new Promise((r) => { ws.onopen = r; });
let id = 0; const esperando = new Map();
ws.onmessage = (m) => { const d = JSON.parse(String(m.data)); if (d.id && esperando.has(d.id)) { esperando.get(d.id)(d.result ?? d.error); esperando.delete(d.id); } };
const cmd = (method, params = {}) => new Promise((r) => { const i = ++id; esperando.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async (expr) => (await cmd('Runtime.evaluate', { expression: expr, returnByValue: true })).result?.value;
await cmd('Emulation.setDeviceMetricsOverride', { width: ancho, height: alto, deviceScaleFactor: 1, mobile: false });
await cmd('Page.navigate', { url: app.url + '/' }); await dormir(1500);

const vistas = (await ev(`[...document.querySelectorAll('#menu button')].map((b) => b.textContent)`)) ?? [];
for (const [i, v] of vistas.entries()) {
  await ev(`[...document.querySelectorAll('#menu button')][${i}].click()`); await dormir(900);
  const r = await cmd('Page.captureScreenshot', { format: 'png' });
  const nombre = `${String(i + 1).padStart(2, '0')}-${v.normalize('NFD').replace(/[^\w]+/g, '-').toLowerCase()}.png`;
  fs.writeFileSync(path.join(salida, nombre), Buffer.from(r.data, 'base64')); console.log('captura', nombre);
}
ws.close(); try { execFileSync('taskkill', ['/PID', String(proc.pid), '/T', '/F'], { stdio: 'ignore' }); } catch { proc.kill(); } await app.cerrar(); process.exit(0);
