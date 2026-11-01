// @ts-check
// Arranque del programa: abre la base (o entra en modo de recuperación), hace las copias de
// seguridad al abrir y al cerrar, garantiza una sola instancia y se apaga al cerrarse la ventana.
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { abrirBase } from './datos/base.js';
import { crearCopia, aplicarRetencion, diagnosticar } from './respaldo/respaldo.js';
import { crearServidor } from './servidor/servidor.js';
import { copiarAExtra, leerRetencion } from './respaldo/extra.js';

/** Navegadores con modo «aplicación» (ventana sin barra), en orden de preferencia. */
function candidatosNavegador() {
  const pf = process.env['ProgramFiles'] ?? 'C:\\Program Files';
  const pf86 = process.env['ProgramFiles(x86)'] ?? 'C:\\Program Files (x86)';
  const local = process.env['LOCALAPPDATA'] ?? '';
  return [
    `${pf86}\\Microsoft\\Edge\\Application\\msedge.exe`, `${pf}\\Microsoft\\Edge\\Application\\msedge.exe`,
    `${pf}\\Google\\Chrome\\Application\\chrome.exe`, `${pf86}\\Google\\Chrome\\Application\\chrome.exe`,
    `${local}\\Google\\Chrome\\Application\\chrome.exe`,
  ];
}

/**
 * Abre la dirección en una ventana de aplicación (Edge o Chrome) o, si no hay, en el navegador
 * predeterminado. No lanza: si falla, el docente puede abrir la dirección a mano.
 * @param {string} url @returns {boolean} si se pudo lanzar algo
 */
export function abrirVentana(url) {
  try {
    if (process.platform === 'win32') {
      const exe = candidatosNavegador().find((r) => r && fs.existsSync(r));
      if (exe) { spawn(exe, [`--app=${url}`], { detached: true, stdio: 'ignore' }).unref(); return true; }
      spawn('cmd', ['/c', 'start', '""', url], { detached: true, stdio: 'ignore', windowsHide: true }).unref();
      return true;
    }
    spawn(process.platform === 'darwin' ? 'open' : 'xdg-open', [url], { detached: true, stdio: 'ignore' }).unref();
    return true;
  } catch { return false; }
}

/** ¿Hay ya un programa respondiendo en esa dirección? @param {string} url */
async function respondiendo(url) {
  try { return (await fetch(url, { signal: AbortSignal.timeout(1500) })).ok; } catch { return false; }
}

/**
 * @param {{ carpetaDatos: string, abrirVentana?: boolean, retencion?: number, leerRecurso?: (nombre: string) => Buffer, latidoMaxMs?: number, revisarCadaMs?: number }} o
 * @returns {Promise<{ url: string, token: string, yaEstabaAbierta: boolean, modo: 'ok' | 'recuperacion', cerrar: () => Promise<void> }>}
 */
export async function iniciar(o) {
  const carpetaDatos = path.resolve(o.carpetaDatos);
  const rutaBase = path.join(carpetaDatos, 'notas.db');
  const carpetaCopias = path.join(carpetaDatos, 'copias');
  const rutaLock = path.join(carpetaDatos, 'notas.lock');
  /** Copias automáticas que se guardan: la opción de prueba, o lo que el docente configuró (por defecto 30, unas 15 sesiones). @param {import('node:sqlite').DatabaseSync} d */
  const retener = (d) => o.retencion ?? leerRetencion(d);
  const ventana = o.abrirVentana ?? true;
  fs.mkdirSync(carpetaDatos, { recursive: true });

  // Una sola instancia: dos programas escribiendo el mismo archivo podrían dañarlo.
  if (fs.existsSync(rutaLock)) {
    let previo = null;
    try { previo = JSON.parse(fs.readFileSync(rutaLock, 'utf8')); } catch { /* lock ilegible: se reemplaza */ }
    if (previo?.url && await respondiendo(previo.url)) {
      if (ventana) abrirVentana(previo.url);
      return { url: previo.url, token: '', yaEstabaAbierta: true, modo: 'ok', cerrar: async () => {} };
    }
    fs.rmSync(rutaLock, { force: true }); // el archivo era de un programa que ya no responde
  }

  const diag = diagnosticar(rutaBase, carpetaCopias);
  /** @type {import('node:sqlite').DatabaseSync | null} */ let db = null;
  if (diag.estado !== 'danada') {
    db = abrirBase(rutaBase);
    if (diag.estado === 'ok') { crearCopia(db, carpetaCopias, 'abrir'); aplicarRetencion(carpetaCopias, retener(db)); }
  }
  const servidor = crearServidor({
    db, rutaBase, carpetaCopias,
    modo: diag.estado === 'danada' ? 'recuperacion' : 'ok',
    motivoDano: diag.estado === 'danada' ? diag.motivo : null,
    leerRecurso: o.leerRecurso,
  });
  const { url } = await servidor.escuchar();
  // El archivo de instancia se crea de forma atómica ('wx'): si otro arranque casi simultáneo ganó, este se retira.
  try { fs.writeFileSync(rutaLock, JSON.stringify({ url, pid: process.pid }), { flag: 'wx' }); }
  catch {
    let otro = null; try { otro = JSON.parse(fs.readFileSync(rutaLock, 'utf8')); } catch { /* ilegible */ }
    await servidor.cerrar(); db?.close();
    if (otro?.url) { if (ventana) abrirVentana(otro.url); return { url: otro.url, token: '', yaEstabaAbierta: true, modo: 'ok', cerrar: async () => {} }; }
    throw new Error('No se pudo reservar el programa: otro arranque está en curso. Intente de nuevo en unos segundos.');
  }
  if (ventana) abrirVentana(url);

  let cerrado = false;
  /** Copia al cerrar, libera la base y el archivo de instancia. */
  const cerrar = async () => {
    if (cerrado) return; cerrado = true;
    clearInterval(vigilante);
    try {
      if (servidor.ctx.db && servidor.ctx.modo === 'ok') {
        const n = retener(servidor.ctx.db); crearCopia(servidor.ctx.db, carpetaCopias, 'cerrar'); aplicarRetencion(carpetaCopias, n);
        const extra = copiarAExtra(servidor.ctx.db, 'cerrar', n); if (extra.estado === 'fallo') console.error(extra.mensaje);
        servidor.ctx.db.close();
      }
    } finally {
      fs.rmSync(rutaLock, { force: true });
      await servidor.cerrar();
    }
  };
  // Sin ventana no hay quien use el programa: si dejan de llegar latidos, se apaga solo.
  // El navegador frena los temporizadores de una ventana minimizada (a uno por minuto) y el equipo puede suspenderse:
  // por eso el margen es amplio y, si el propio vigilante se retrasó (suspensión), se da un nuevo plazo en vez de apagar.
  const latidoMaxMs = o.latidoMaxMs ?? 150_000;
  const cada = o.revisarCadaMs ?? 5000;
  let ultimaRevision = Date.now();
  const vigilante = setInterval(() => {
    const ahora = Date.now();
    if (ahora - ultimaRevision > cada * 3) { servidor.ctx.ultimoLatido = servidor.ctx.ultimoLatido ? ahora : servidor.ctx.ultimoLatido; ultimaRevision = ahora; return; }
    ultimaRevision = ahora;
    const l = servidor.ctx.ultimoLatido;
    if (l && Date.now() - l > latidoMaxMs) { cerrar().then(() => process.emit('notas:cerrado' /** @type {any} */)); }
  }, cada);
  vigilante.unref();
  return { url, token: servidor.token, yaEstabaAbierta: false, modo: servidor.ctx.modo, cerrar };
}
