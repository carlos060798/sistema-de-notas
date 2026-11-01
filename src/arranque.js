// @ts-check
// Arranque del programa: abre la base (o entra en modo de recuperación), hace las copias de
// seguridad al abrir y al cerrar, garantiza una sola instancia y se apaga al cerrarse la ventana.
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { abrirBase } from './datos/base.js';
import { crearCopia, aplicarRetencion, diagnosticar } from './respaldo/respaldo.js';
import { crearServidor } from './servidor/servidor.js';

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
  const retencion = o.retencion ?? 10;
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
  }

  const diag = diagnosticar(rutaBase, carpetaCopias);
  /** @type {import('node:sqlite').DatabaseSync | null} */ let db = null;
  if (diag.estado !== 'danada') {
    db = abrirBase(rutaBase);
    if (diag.estado === 'ok') { crearCopia(db, carpetaCopias, 'abrir'); aplicarRetencion(carpetaCopias, retencion); }
  }
  const servidor = crearServidor({
    db, rutaBase, carpetaCopias,
    modo: diag.estado === 'danada' ? 'recuperacion' : 'ok',
    motivoDano: diag.estado === 'danada' ? diag.motivo : null,
    leerRecurso: o.leerRecurso,
  });
  const { url } = await servidor.escuchar();
  fs.writeFileSync(rutaLock, JSON.stringify({ url, pid: process.pid }));
  if (ventana) abrirVentana(url);

  let cerrado = false;
  /** Copia al cerrar, libera la base y el archivo de instancia. */
  const cerrar = async () => {
    if (cerrado) return; cerrado = true;
    clearInterval(vigilante);
    try {
      if (servidor.ctx.db && servidor.ctx.modo === 'ok') {
        crearCopia(servidor.ctx.db, carpetaCopias, 'cerrar'); aplicarRetencion(carpetaCopias, retencion);
        servidor.ctx.db.close();
      }
    } finally {
      fs.rmSync(rutaLock, { force: true });
      await servidor.cerrar();
    }
  };
  // Sin ventana no hay quien use el programa: si dejan de llegar latidos, se apaga solo.
  const latidoMaxMs = o.latidoMaxMs ?? 30_000;
  const vigilante = setInterval(() => {
    const l = servidor.ctx.ultimoLatido;
    if (l && Date.now() - l > latidoMaxMs) { cerrar().then(() => process.emit('notas:cerrado' /** @type {any} */)); }
  }, o.revisarCadaMs ?? 5000);
  vigilante.unref();
  return { url, token: servidor.token, yaEstabaAbierta: false, modo: servidor.ctx.modo, cerrar };
}
