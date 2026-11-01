// @ts-check
// Servidor HTTP local (RF-003, Principio I): escucha SOLO en 127.0.0.1, con un token por arranque,
// comprobación del Host (contra DNS rebinding) y del Origin (contra otras páginas web).
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { abrirBase, VERSION_ESQUEMA } from '../datos/base.js';
import {
  ErrorValidacion, crearAnio, cerrarAnio, listarAnios, crearMateria, listarMaterias,
  crearEstudiante, editarEstudiante, archivarEstudiante, listarEstudiantes,
  guardarNotas, listarNotas, desaprobadas, guardarNivelacion, pendientesNivelacion,
} from '../servicios/academico.js';
import { resumen, registrarExcelDescargado } from '../servicios/resumen.js';
import * as PL from '../servicios/planeacion.js';
import { crearCopia, listarCopias, verificarCopia, restaurar } from '../respaldo/respaldo.js';
import { datosPlanilla, datosBoletin, datosTexto, guardarInstitucion, encabezado } from '../reportes/datos.js';
import * as FM from '../reportes/formatos.js';
import { exportarExcel, analizarExcel, importarExcel, ErrorImportacion } from '../excel/excel.js';

const LIMITE_JSON = 1_000_000;
const LIMITE_EXCEL = 50_000_000;
const TIPOS = /** @type {Record<string, string>} */ ({
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
});
const DIR_UI = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'ui');
const ESTATICOS = new Set(['app.js', 'estilos.css']);
const CABECERAS_SEGURAS = {
  'content-security-policy': "default-src 'self'; img-src 'self' data:; frame-ancestors 'none'; base-uri 'none'; form-action 'self'",
  'x-content-type-options': 'nosniff',
  'cache-control': 'no-store',
  'referrer-policy': 'no-referrer',
};

class ErrorHttp extends Error {
  constructor(/** @type {number} */ status, /** @type {string} */ mensaje, /** @type {any} */ extra = {}) { super(mensaje); this.status = status; this.extra = extra; }
}

/** @param {string | null} v @param {string} nombre */
function entero(v, nombre) {
  if (v === null || v === '') return undefined;
  const n = Number(v);
  if (!Number.isInteger(n)) throw new ErrorValidacion(`El valor de «${nombre}» no es válido`);
  return n;
}
/** @param {string | null} v @param {string} nombre */
function enteroObligatorio(v, nombre) {
  const n = entero(v, nombre);
  if (n === undefined) throw new ErrorValidacion(`Falta «${nombre}»`);
  return n;
}
const hoy = () => { const d = new Date(); return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`; };

/**
 * @typedef {object} Contexto
 * @property {import('node:sqlite').DatabaseSync | null} db
 * @property {string | null} rutaBase
 * @property {string | null} carpetaCopias
 * @property {'ok' | 'recuperacion'} modo
 * @property {string | null} motivoDano
 * @property {number} ultimoLatido
 */

/**
 * @param {{ db: import('node:sqlite').DatabaseSync | null, rutaBase?: string | null, carpetaCopias?: string | null,
 *           modo?: 'ok' | 'recuperacion', motivoDano?: string | null, leerRecurso?: (nombre: string) => Buffer }} opciones
 */
export function crearServidor(opciones) {
  /** @type {Contexto} */
  const ctx = {
    db: opciones.db, rutaBase: opciones.rutaBase ?? null, carpetaCopias: opciones.carpetaCopias ?? null,
    modo: opciones.modo ?? 'ok', motivoDano: opciones.motivoDano ?? null, ultimoLatido: 0,
  };
  const token = crypto.randomBytes(24).toString('hex');
  const leerRecurso = opciones.leerRecurso ?? ((/** @type {string} */ nombre) => fs.readFileSync(path.join(DIR_UI, nombre)));
  let puerto = 0;

  const bd = () => {
    if (ctx.modo !== 'ok' || !ctx.db) throw new ErrorHttp(503, 'La base de datos está dañada. Use la pantalla de recuperación.', { recuperacion: true });
    return ctx.db;
  };
  const carpeta = () => {
    if (!ctx.carpetaCopias) throw new ErrorValidacion('No hay carpeta de copias configurada');
    return ctx.carpetaCopias;
  };
  /** Solo se acepta el nombre de una copia que exista en la carpeta (sin recorrido de directorios). @param {unknown} nombre */
  const copiaPorNombre = (nombre) => {
    const c = listarCopias(carpeta()).find((x) => x.nombre === nombre);
    if (!c) throw new ErrorValidacion('Esa copia no existe');
    return c;
  };

  /** Cierra la base, restaura, reabre. */
  const restaurarCopia = (/** @type {string} */ rutaCopia) => {
    if (!ctx.rutaBase) throw new ErrorValidacion('Esta sesión no tiene archivo de base: no se puede restaurar');
    if (!verificarCopia(rutaCopia).ok) throw new ErrorValidacion('La copia no es válida; no se tocó nada');
    try { ctx.db?.close(); } catch { /* ya cerrada */ }
    ctx.db = null;
    try {
      restaurar(ctx.rutaBase, rutaCopia, carpeta());
    } finally {
      try { ctx.db = abrirBase(ctx.rutaBase); ctx.modo = 'ok'; ctx.motivoDano = null; } catch { ctx.modo = 'recuperacion'; }
    }
  };

  /** @typedef {{ status?: number, json?: any, raw?: Buffer, headers?: Record<string,string> }} Respuesta */
  /** @type {Array<{ metodo: string, patron: RegExp, cuerpo: 'json' | 'raw' | null, libre?: boolean, h: (a: { q: URLSearchParams, p: string[], b: any }) => Respuesta | Promise<Respuesta> }>} */
  const rutas = [
    { metodo: 'GET', patron: /^\/api\/estado$/, cuerpo: null, libre: true, h: () => ({
      json: {
        modo: ctx.modo, motivo: ctx.motivoDano, version: VERSION_ESQUEMA,
        grados: [0, 1, 2, 3, 4, 5],
        anios: ctx.db && ctx.modo === 'ok' ? listarAnios(ctx.db) : [],
        materias: ctx.db && ctx.modo === 'ok' ? listarMaterias(ctx.db) : [],
      } }) },
    { metodo: 'POST', patron: /^\/api\/latido$/, cuerpo: null, libre: true, h: () => { ctx.ultimoLatido = Date.now(); return { json: { ok: true } }; } },

    { metodo: 'POST', patron: /^\/api\/anios$/, cuerpo: 'json', h: ({ b }) => ({ json: crearAnio(bd(), b?.anio) }) },
    { metodo: 'POST', patron: /^\/api\/anios\/(\d+)\/cerrar$/, cuerpo: null, h: ({ p }) => { cerrarAnio(bd(), Number(p[0])); return { json: { ok: true } }; } },
    { metodo: 'GET', patron: /^\/api\/resumen$/, cuerpo: null, h: ({ q }) => ({ json: resumen(bd(), { anio_id: enteroObligatorio(q.get('anio_id'), 'anio_id'), copias: ctx.carpetaCopias ? listarCopias(ctx.carpetaCopias) : [] }) }) },
    { metodo: 'GET', patron: /^\/api\/institucion$/, cuerpo: null, h: () => ({ json: encabezado(bd()) }) },
    { metodo: 'PUT', patron: /^\/api\/institucion$/, cuerpo: 'json', h: ({ b }) => { guardarInstitucion(bd(), b ?? {}); return { json: encabezado(bd()) }; } },
    { metodo: 'POST', patron: /^\/api\/materias$/, cuerpo: 'json', h: ({ b }) => ({ json: crearMateria(bd(), b?.nombre) }) },

    { metodo: 'GET', patron: /^\/api\/estudiantes$/, cuerpo: null, h: ({ q }) => ({
      json: listarEstudiantes(bd(), { anio_id: enteroObligatorio(q.get('anio_id'), 'anio_id'), grado: entero(q.get('grado'), 'grado'), incluirArchivados: q.get('archivados') === '1' }) }) },
    { metodo: 'POST', patron: /^\/api\/estudiantes$/, cuerpo: 'json', h: ({ b }) => ({ json: crearEstudiante(bd(), b ?? {}) }) },
    { metodo: 'PUT', patron: /^\/api\/estudiantes\/(\d+)$/, cuerpo: 'json', h: ({ p, b }) => { editarEstudiante(bd(), Number(p[0]), b ?? {}); return { json: { ok: true } }; } },
    { metodo: 'POST', patron: /^\/api\/estudiantes\/(\d+)\/archivar$/, cuerpo: 'json', h: ({ p, b }) => { archivarEstudiante(bd(), Number(p[0]), b?.archivar !== false); return { json: { ok: true } }; } },

    { metodo: 'GET', patron: /^\/api\/notas$/, cuerpo: null, h: ({ q }) => ({
      json: listarNotas(bd(), {
        anio_id: enteroObligatorio(q.get('anio_id'), 'anio_id'), grado: enteroObligatorio(q.get('grado'), 'grado'),
        materia_id: enteroObligatorio(q.get('materia_id'), 'materia_id'), periodo: enteroObligatorio(q.get('periodo'), 'periodo') }) }) },
    { metodo: 'PUT', patron: /^\/api\/notas$/, cuerpo: 'json', h: ({ b }) => ({ json: guardarNotas(bd(), b ?? {}) }) },
    { metodo: 'GET', patron: /^\/api\/desaprobadas$/, cuerpo: null, h: ({ q }) => ({
      json: desaprobadas(bd(), {
        anio_id: enteroObligatorio(q.get('anio_id'), 'anio_id'), base: q.get('base') === 'anio' ? 'anio' : 'periodo',
        periodo: entero(q.get('periodo'), 'periodo'), grado: entero(q.get('grado'), 'grado'), materia_id: entero(q.get('materia_id'), 'materia_id') }) }) },

    { metodo: 'GET', patron: /^\/api\/nivelaciones\/pendientes$/, cuerpo: null, h: ({ q }) => ({
      json: pendientesNivelacion(bd(), { anio_id: enteroObligatorio(q.get('anio_id'), 'anio_id'), grado: entero(q.get('grado'), 'grado') }) }) },
    { metodo: 'PUT', patron: /^\/api\/nivelaciones$/, cuerpo: 'json', h: ({ b }) => { guardarNivelacion(bd(), b ?? {}); return { json: { ok: true } }; } },

    // Planeación: planes, guías, temas con avance y clases
    { metodo: 'GET', patron: /^\/api\/planes$/, cuerpo: null, h: ({ q }) => ({ json: PL.listarPlanes(bd(), { anio_id: enteroObligatorio(q.get('anio_id'), 'anio_id'), tipo: q.get('tipo') ?? undefined, materia_id: entero(q.get('materia_id'), 'materia_id'), grado: entero(q.get('grado'), 'grado') }) }) },
    { metodo: 'PUT', patron: /^\/api\/planes$/, cuerpo: 'json', h: ({ b }) => ({ json: PL.guardarPlan(bd(), b ?? {}) }) },
    { metodo: 'DELETE', patron: /^\/api\/planes\/(\d+)$/, cuerpo: null, h: ({ p }) => { PL.borrarPlan(bd(), Number(p[0])); return { json: { ok: true } }; } },
    { metodo: 'GET', patron: /^\/api\/guias$/, cuerpo: null, h: ({ q }) => ({ json: PL.listarGuias(bd(), { materia_id: entero(q.get('materia_id'), 'materia_id'), grado: entero(q.get('grado'), 'grado'), tema: q.get('tema') ?? undefined }) }) },
    { metodo: 'PUT', patron: /^\/api\/guias$/, cuerpo: 'json', h: ({ b }) => ({ json: PL.guardarGuia(bd(), b ?? {}) }) },
    { metodo: 'DELETE', patron: /^\/api\/guias\/(\d+)$/, cuerpo: null, h: ({ p }) => { PL.borrarGuia(bd(), Number(p[0])); return { json: { ok: true } }; } },
    { metodo: 'GET', patron: /^\/api\/temas$/, cuerpo: null, h: ({ q }) => {
      const f = { anio_id: enteroObligatorio(q.get('anio_id'), 'anio_id'), materia_id: entero(q.get('materia_id'), 'materia_id'), grado: entero(q.get('grado'), 'grado') };
      return { json: { temas: PL.listarTemas(bd(), { ...f, periodo: entero(q.get('periodo'), 'periodo') }), avance: PL.avanceTemas(bd(), f) } }; } },
    { metodo: 'PUT', patron: /^\/api\/temas$/, cuerpo: 'json', h: ({ b }) => ({ json: PL.guardarTema(bd(), b ?? {}) }) },
    { metodo: 'POST', patron: /^\/api\/temas\/(\d+)\/estado$/, cuerpo: 'json', h: ({ p, b }) => { PL.cambiarEstadoTema(bd(), Number(p[0]), b?.estado, b?.fecha); return { json: { ok: true } }; } },
    { metodo: 'DELETE', patron: /^\/api\/temas\/(\d+)$/, cuerpo: null, h: ({ p }) => { PL.borrarTema(bd(), Number(p[0])); return { json: { ok: true } }; } },
    { metodo: 'GET', patron: /^\/api\/clases$/, cuerpo: null, h: ({ q }) => ({ json: PL.listarClases(bd(), { anio_id: enteroObligatorio(q.get('anio_id'), 'anio_id'), materia_id: entero(q.get('materia_id'), 'materia_id'), grado: entero(q.get('grado'), 'grado'), desde: q.get('desde') ?? undefined, hasta: q.get('hasta') ?? undefined }) }) },
    { metodo: 'PUT', patron: /^\/api\/clases$/, cuerpo: 'json', h: ({ b }) => ({ json: PL.guardarClase(bd(), b ?? {}) }) },
    { metodo: 'POST', patron: /^\/api\/clases\/(\d+)\/realizada$/, cuerpo: 'json', h: ({ p, b }) => { PL.marcarClase(bd(), Number(p[0]), b?.realizada !== false); return { json: { ok: true } }; } },
    { metodo: 'DELETE', patron: /^\/api\/clases\/(\d+)$/, cuerpo: null, h: ({ p }) => { PL.borrarClase(bd(), Number(p[0])); return { json: { ok: true } }; } },

    { metodo: 'GET', patron: /^\/api\/respaldo$/, cuerpo: null, libre: true, h: () => ({
      json: ctx.carpetaCopias ? listarCopias(ctx.carpetaCopias).map((c) => ({ nombre: c.nombre, motivo: c.motivo })) : [] }) },
    { metodo: 'POST', patron: /^\/api\/respaldo$/, cuerpo: null, h: () => ({ json: { nombre: path.basename(crearCopia(bd(), carpeta(), 'manual')) } }) },
    { metodo: 'POST', patron: /^\/api\/respaldo\/restaurar$/, cuerpo: 'json', h: ({ b }) => { restaurarCopia(copiaPorNombre(b?.nombre).ruta); return { json: { ok: true } }; } },

    { metodo: 'GET', patron: /^\/api\/recuperacion$/, cuerpo: null, libre: true, h: () => {
      const copias = ctx.carpetaCopias ? listarCopias(ctx.carpetaCopias).map((c) => ({ nombre: c.nombre, motivo: c.motivo, sana: verificarCopia(c.ruta).ok })) : [];
      copias.sort((a, b) => Number(b.sana) - Number(a.sana));
      return { json: { modo: ctx.modo, motivo: ctx.motivoDano, copias } };
    } },
    { metodo: 'POST', patron: /^\/api\/recuperacion\/restaurar$/, cuerpo: 'json', libre: true, h: ({ b }) => { restaurarCopia(copiaPorNombre(b?.nombre).ruta); return { json: { ok: true } }; } },

    { metodo: 'GET', patron: /^\/api\/excel$/, cuerpo: null, h: async () => {
      const tmp = path.join(os.tmpdir(), `notas-xlsx-${crypto.randomUUID()}.xlsx`);
      try {
        await exportarExcel(bd(), tmp);
        registrarExcelDescargado(bd());
        return { raw: fs.readFileSync(tmp), headers: {
          'content-type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'content-disposition': `attachment; filename="respaldo-notas-${hoy()}.xlsx"` } };
      } finally { fs.rmSync(tmp, { force: true }); }
    } },
    // Documentos: planilla (xlsx|pdf), boletín y certificado (pdf|docx)
    { metodo: 'GET', patron: /^\/api\/reportes\/(planilla|boletin|certificado|plan|guia)$/, cuerpo: null, h: async ({ p, q }) => {
      const tipo = p[0]; const formato = q.get('formato') ?? '';
      const permitidos = { planilla: ['xlsx', 'pdf'], boletin: ['pdf', 'docx'], certificado: ['pdf', 'docx'], plan: ['pdf', 'docx'], guia: ['pdf', 'docx'] }[tipo] ?? [];
      if (!permitidos.includes(formato)) throw new ErrorValidacion(`El formato debe ser ${permitidos.join(' o ')}`);
      const texto = tipo === 'plan' || tipo === 'guia';
      const anio_id = texto ? 0 : enteroObligatorio(q.get('anio_id'), 'anio_id');
      const datos = texto ? datosTexto(bd(), tipo, enteroObligatorio(q.get('id'), 'id')) : tipo === 'planilla'
        ? datosPlanilla(bd(), { anio_id, grado: enteroObligatorio(q.get('grado'), 'grado'), materia_id: enteroObligatorio(q.get('materia_id'), 'materia_id') })
        : datosBoletin(bd(), { anio_id, matricula_id: enteroObligatorio(q.get('matricula_id'), 'matricula_id') });
      const dibujar = /** @type {Record<string, Function>} */ ({ 'planilla.xlsx': FM.planillaExcel, 'planilla.pdf': FM.planillaPdf, 'boletin.pdf': FM.boletinPdf, 'boletin.docx': FM.boletinDocx, 'certificado.pdf': FM.certificadoPdf, 'certificado.docx': FM.certificadoDocx, 'plan.pdf': FM.textoPdf, 'plan.docx': FM.textoDocx, 'guia.pdf': FM.textoPdf, 'guia.docx': FM.textoDocx })[tipo + '.' + formato];
      const tmp = path.join(os.tmpdir(), `notas-doc-${crypto.randomUUID()}.${formato}`);
      const tipos = { xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', pdf: 'application/pdf', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' };
      try {
        await dibujar(datos, tmp);
        const nombre = encodeURIComponent(`${tipo}-${(/** @type {any} */ (datos).estudiante ?? /** @type {any} */ (datos).materia ?? /** @type {any} */ (datos).titulo).replace(/\s+/g, '-')}-${/** @type {any} */ (datos).anio}.${formato}`);
        return { raw: fs.readFileSync(tmp), headers: { 'content-type': /** @type {Record<string, string>} */ (tipos)[formato], 'content-disposition': `attachment; filename*=UTF-8''${nombre}` } };
      } finally { fs.rmSync(tmp, { force: true }); }
    } },

    { metodo: 'POST', patron: /^\/api\/excel\/analizar$/, cuerpo: 'raw', h: ({ b }) => conArchivo(b, async (f) => ({ json: await analizarExcel(bd(), f) })) },
    { metodo: 'POST', patron: /^\/api\/excel\/importar$/, cuerpo: 'raw', h: ({ q, b }) => conArchivo(b, async (f) => {
      const confirmar = q.get('confirmar') === '1';
      if (confirmar && ctx.carpetaCopias) crearCopia(bd(), ctx.carpetaCopias, 'antes-de-importar');
      return { json: await importarExcel(bd(), f, { confirmar }) };
    }) },
  ];

  /** @param {Buffer} datos @param {(ruta: string) => Promise<Respuesta>} fn */
  async function conArchivo(datos, fn) {
    const tmp = path.join(os.tmpdir(), `notas-in-${crypto.randomUUID()}.xlsx`);
    fs.writeFileSync(tmp, datos);
    try { return await fn(tmp); } finally { fs.rmSync(tmp, { force: true }); }
  }

  /** @param {http.IncomingMessage} req @param {number} limite @returns {Promise<Buffer>} */
  function leerCuerpo(req, limite) {
    return new Promise((ok, mal) => {
      /** @type {Buffer[]} */ const partes = []; let total = 0; let excedido = false;
      req.on('data', (c) => { total += c.length; if (total > limite * 4) { req.destroy(); return; } if (!excedido && total <= limite) partes.push(c); else excedido = true; });
      req.on('end', () => (excedido ? mal(new ErrorHttp(413, 'El envío es demasiado grande')) : ok(Buffer.concat(partes))));
      req.on('error', mal);
    });
  }

  /** @param {http.ServerResponse} res @param {number} status @param {any} json */
  function enviarJson(res, status, json) {
    const cuerpo = Buffer.from(JSON.stringify(json));
    res.writeHead(status, { ...CABECERAS_SEGURAS, 'content-type': 'application/json; charset=utf-8', 'content-length': cuerpo.length });
    res.end(cuerpo);
  }

  const tokenValido = (/** @type {unknown} */ t) => {
    if (typeof t !== 'string') return false;
    const a = Buffer.from(t); const b = Buffer.from(token);
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  };

  const server = http.createServer(async (req, res) => {
    try {
      const host = req.headers.host ?? '';
      if (host !== `127.0.0.1:${puerto}` && host !== `localhost:${puerto}`) throw new ErrorHttp(403, 'Host no permitido');
      const origen = req.headers.origin;
      if (origen !== undefined && origen !== `http://${host}`) throw new ErrorHttp(403, 'Origen no permitido');
      const url = new URL(req.url ?? '/', `http://${host}`);
      const ruta = url.pathname;

      if (ruta === '/favicon.ico') { res.writeHead(204, CABECERAS_SEGURAS); res.end(); return; }
      if (!ruta.startsWith('/api/')) {
        if (req.method !== 'GET') throw new ErrorHttp(405, 'Método no permitido');
        const nombre = ruta === '/' ? 'index.html' : ruta.slice(1);
        if (nombre !== 'index.html' && !ESTATICOS.has(nombre)) throw new ErrorHttp(404, 'No encontrado');
        let datos = leerRecurso(nombre);
        if (nombre === 'index.html') datos = Buffer.from(datos.toString('utf8').replaceAll('__TOKEN__', token));
        res.writeHead(200, { ...CABECERAS_SEGURAS, 'content-type': TIPOS[path.extname(nombre)] ?? 'application/octet-stream', 'content-length': datos.length });
        res.end(datos);
        return;
      }

      if (!tokenValido(req.headers['x-token'])) throw new ErrorHttp(401, 'Falta el token de acceso o no es válido');
      const r = rutas.find((x) => x.metodo === req.method && x.patron.test(ruta));
      if (!r) throw new ErrorHttp(404, 'No encontrado');
      if (ctx.modo === 'recuperacion' && !r.libre) throw new ErrorHttp(503, 'La base de datos está dañada. Use la pantalla de recuperación.', { recuperacion: true });

      let b = null;
      if (r.cuerpo === 'json') {
        const buf = await leerCuerpo(req, LIMITE_JSON);
        try { b = buf.length ? JSON.parse(buf.toString('utf8')) : {}; } catch { throw new ErrorHttp(400, 'El envío no es un JSON válido'); }
      } else if (r.cuerpo === 'raw') {
        b = await leerCuerpo(req, LIMITE_EXCEL);
      } else {
        req.resume();
      }
      const salida = await r.h({ q: url.searchParams, p: /** @type {RegExpExecArray} */ (r.patron.exec(ruta)).slice(1), b });
      if (salida.raw) {
        res.writeHead(salida.status ?? 200, { ...CABECERAS_SEGURAS, ...salida.headers, 'content-length': salida.raw.length });
        res.end(salida.raw);
      } else enviarJson(res, salida.status ?? 200, salida.json);
    } catch (e) {
      if (e instanceof ErrorHttp) return enviarJson(res, e.status, { error: e.message, ...e.extra });
      if (e instanceof ErrorValidacion) return enviarJson(res, 400, { error: e.message });
      if (e instanceof ErrorImportacion) {
        return enviarJson(res, e.codigo === 'CONFIRMACION' ? 409 : 422, { error: e.message, codigo: e.codigo, errores: e.errores, resumen: e.resumen });
      }
      console.error('Error interno:', e); // el detalle queda en la consola, no viaja al navegador
      return enviarJson(res, 500, { error: 'Ocurrió un error inesperado. Los datos no se modificaron a medias.' });
    }
  });

  return {
    server, token, ctx,
    /** @returns {Promise<{ puerto: number, url: string }>} */
    escuchar() {
      return new Promise((ok, mal) => {
        server.once('error', mal);
        server.listen(0, '127.0.0.1', () => {
          puerto = /** @type {import('node:net').AddressInfo} */ (server.address()).port;
          ok({ puerto, url: `http://127.0.0.1:${puerto}` });
        });
      });
    },
    cerrar() {
      return /** @type {Promise<void>} */ (new Promise((ok) => { server.close(() => ok(undefined)); server.closeAllConnections(); }));
    },
  };
}
