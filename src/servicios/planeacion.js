// @ts-check
// Planeación del docente: planes de área y de aula, guías, temas con avance y clases planeadas.
import { conTransaccion } from '../datos/base.js';
import { ErrorValidacion, exigirAnioAbierto, validarGrado, textoObligatorio } from './academico.js';

/** @typedef {import('node:sqlite').DatabaseSync} Db */
/** @param {Db} db @param {string} sql @param {...any} args @returns {any[]} */
const todos = (db, sql, ...args) => /** @type {any[]} */ (db.prepare(sql).all(...args));
/** @param {Db} db @param {string} sql @param {...any} args @returns {any} */
const uno = (db, sql, ...args) => db.prepare(sql).get(...args);

/** @param {Db} db @param {unknown} id */
function exigirMateria(db, id) {
  if (!uno(db, 'select 1 x from materia where id = ?', id)) throw new ErrorValidacion('La materia no existe');
}
/** @param {unknown} v @param {string} msg @param {number} max */
function texto(v, msg, max) {
  const t = textoObligatorio(v, msg);
  if (t.length > max) throw new ErrorValidacion(`${msg.replace(/^Escriba /, 'Es demasiado largo: ')} (máximo ${max} letras)`);
  return t;
}
/** Texto libre opcional (contenido largo). @param {unknown} v @param {string} nombre */
function libre(v, nombre) {
  const t = typeof v === 'string' ? v : '';
  if (t.length > 100_000) throw new ErrorValidacion(`${nombre} es demasiado largo`);
  return t;
}
/** @param {unknown} periodo */
function validarPeriodo(periodo) {
  if (!Number.isInteger(periodo) || /** @type {number} */ (periodo) < 1 || /** @type {number} */ (periodo) > 4) throw new ErrorValidacion('El periodo debe ser 1, 2, 3 o 4');
}
/** Fecha AAAA-MM-DD real. @param {unknown} v */
function validarFecha(v) {
  const m = typeof v === 'string' ? /^(\d{4})-(\d{2})-(\d{2})$/.exec(v) : null;
  const d = m ? new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])) : null;
  if (!m || !d || d.getUTCMonth() !== +m[2] - 1 || d.getUTCDate() !== +m[3]) throw new ErrorValidacion('Escriba una fecha válida con el formato AAAA-MM-DD');
  return /** @type {string} */ (v);
}
const id = (/** @type {any} */ r) => Number(r.lastInsertRowid);

// --- Planes -------------------------------------------------------------------------------------

/** @param {Db} db @param {{ id?: number, tipo: string, anio_id: number, materia_id: number, grado: number, titulo: string, contenido?: string, periodo?: number | null, plan_area_id?: number | null }} d */
export function guardarPlan(db, d) { // d.periodo y d.plan_area_id solo aplican a los planes de aula
  if (d.tipo !== 'area' && d.tipo !== 'aula') throw new ErrorValidacion('El tipo de plan debe ser «area» o «aula»');
  exigirAnioAbierto(db, d.anio_id); exigirMateria(db, d.materia_id); validarGrado(d.grado);
  const titulo = texto(d.titulo, 'Escriba el título del plan', 150); const contenido = libre(d.contenido, 'El contenido');
  // El plan de aula se asocia a un plan de área (de la misma materia y grado) y a un periodo; el de área no.
  let periodo = null; let areaId = null;
  if (d.tipo === 'aula') {
    if (d.periodo != null) { validarPeriodo(d.periodo); periodo = d.periodo; }
    if (d.plan_area_id != null) {
      const ar = uno(db, 'select tipo, materia_id, grado_id from plan where id = ?', d.plan_area_id);
      if (!ar || ar.tipo !== 'area') throw new ErrorValidacion('El plan de área elegido no existe');
      if (Number(ar.materia_id) !== d.materia_id || Number(ar.grado_id) !== d.grado) throw new ErrorValidacion('El plan de aula debe ser de la misma materia y grado que su plan de área');
      areaId = d.plan_area_id;
    }
  }
  if (d.id) {
    if (!uno(db, 'select 1 x from plan where id = ?', d.id)) throw new ErrorValidacion('El plan no existe');
    if (areaId === d.id) throw new ErrorValidacion('Un plan no puede depender de sí mismo');
    db.prepare('update plan set tipo=?, anio_id=?, materia_id=?, grado_id=?, titulo=?, contenido=?, periodo=?, plan_area_id=? where id=?').run(d.tipo, d.anio_id, d.materia_id, d.grado, titulo, contenido, periodo, areaId, d.id);
    return { id: d.id };
  }
  return { id: id(db.prepare('insert into plan(tipo, anio_id, materia_id, grado_id, titulo, contenido, periodo, plan_area_id) values (?,?,?,?,?,?,?,?)').run(d.tipo, d.anio_id, d.materia_id, d.grado, titulo, contenido, periodo, areaId)) };
}
/** @param {Db} db @param {{ anio_id: number, tipo?: string, materia_id?: number, grado?: number }} q */
export const listarPlanes = (db, q) => todos(db,
  `select p.id, p.tipo, p.anio_id, p.materia_id, m.nombre materia, p.grado_id grado, p.titulo, p.contenido, p.periodo, p.plan_area_id from plan p join materia m on m.id = p.materia_id
   where p.anio_id = ? and (? is null or p.tipo = ?) and (? is null or p.materia_id = ?) and (? is null or p.grado_id = ?) order by p.grado_id, m.nombre, p.titulo`,
  q.anio_id, q.tipo ?? null, q.tipo ?? null, q.materia_id ?? null, q.materia_id ?? null, q.grado ?? null, q.grado ?? null);
/** @param {Db} db @param {number} planId */
export function borrarPlan(db, planId) {
  const p = uno(db, 'select anio_id from plan where id = ?', planId);
  if (!p) throw new ErrorValidacion('El plan no existe');
  exigirAnioAbierto(db, p.anio_id);
  db.prepare('delete from plan where id = ?').run(planId);
}

// --- Guías (no dependen del año: se reutilizan) -------------------------------------------------

/** @param {Db} db @param {{ id?: number, materia_id: number, grado: number, tema?: string, titulo: string, contenido?: string }} d */
export function guardarGuia(db, d) {
  exigirMateria(db, d.materia_id); validarGrado(d.grado);
  const titulo = texto(d.titulo, 'Escriba el título de la guía', 150); const tema = (d.tema ?? '').trim().slice(0, 150); const contenido = libre(d.contenido, 'El contenido');
  if (d.id) {
    if (!uno(db, 'select 1 x from guia where id = ?', d.id)) throw new ErrorValidacion('La guía no existe');
    db.prepare('update guia set materia_id=?, grado_id=?, tema=?, titulo=?, contenido=? where id=?').run(d.materia_id, d.grado, tema, titulo, contenido, d.id);
    return { id: d.id };
  }
  return { id: id(db.prepare('insert into guia(materia_id, grado_id, tema, titulo, contenido) values (?,?,?,?,?)').run(d.materia_id, d.grado, tema, titulo, contenido)) };
}
/** @param {Db} db @param {{ materia_id?: number, grado?: number, tema?: string, texto?: string }} q  `tema` busca en el tema; `texto`, en el tema, el título y el contenido */
export const listarGuias = (db, q) => {
  const escapar = (/** @type {string | undefined} */ t) => (t ? `%${t.replace(/[\\%_]/g, '\\$&')}%` : null);
  const patron = escapar(q.tema); const palabra = escapar(q.texto);
  const guias = todos(db,
    `select g.id, g.materia_id, m.nombre materia, g.grado_id grado, g.tema, g.titulo, g.contenido from guia g join materia m on m.id = g.materia_id
     where (? is null or g.materia_id = ?) and (? is null or g.grado_id = ?) and (? is null or g.tema like ? escape '\\') and (? is null or g.tema like ? escape '\\' or g.titulo like ? escape '\\' or g.contenido like ? escape '\\') order by g.grado_id, m.nombre, g.tema, g.titulo`,
    q.materia_id ?? null, q.materia_id ?? null, q.grado ?? null, q.grado ?? null, patron, patron, palabra, palabra, palabra, palabra);
  return guias.map((g) => ({ ...g, adjuntos: todos(db, 'select id, nombre, tamano from guia_adjunto where guia_id = ? order by id', g.id) }));
};
/** @param {Db} db @param {number} guiaId */
export function borrarGuia(db, guiaId) {
  if (!uno(db, 'select 1 x from guia where id = ?', guiaId)) throw new ErrorValidacion('La guía no existe');
  db.prepare('delete from guia_adjunto where guia_id = ?').run(guiaId);
  db.prepare('delete from guia where id = ?').run(guiaId);
}

// --- Temas y avance -----------------------------------------------------------------------------

const ESTADOS = ['pendiente', 'en_curso', 'visto'];

/** @param {Db} db @param {{ id?: number, anio_id: number, materia_id: number, grado: number, periodo: number, nombre: string }} d */
export function guardarTema(db, d) {
  exigirAnioAbierto(db, d.anio_id); exigirMateria(db, d.materia_id); validarGrado(d.grado); validarPeriodo(d.periodo);
  const nombre = texto(d.nombre, 'Escriba el nombre del tema', 150);
  if (d.id) {
    if (!uno(db, 'select 1 x from tema where id = ?', d.id)) throw new ErrorValidacion('El tema no existe');
    db.prepare('update tema set materia_id=?, grado_id=?, periodo=?, nombre=? where id=?').run(d.materia_id, d.grado, d.periodo, nombre, d.id);
    return { id: d.id };
  }
  return { id: id(db.prepare('insert into tema(anio_id, materia_id, grado_id, periodo, nombre) values (?,?,?,?,?)').run(d.anio_id, d.materia_id, d.grado, d.periodo, nombre)) };
}
/** @param {Db} db @param {number} temaId @param {string} estado @param {string} [fecha] */
export function cambiarEstadoTema(db, temaId, estado, fecha) {
  if (!ESTADOS.includes(estado)) throw new ErrorValidacion('El estado debe ser pendiente, en curso o visto');
  const t = uno(db, 'select anio_id from tema where id = ?', temaId);
  if (!t) throw new ErrorValidacion('El tema no existe');
  exigirAnioAbierto(db, t.anio_id);
  const visto = estado === 'visto' ? validarFecha(fecha ?? new Date().toISOString().slice(0, 10)) : null;
  db.prepare('update tema set estado = ?, fecha_visto = ? where id = ?').run(estado, visto, temaId);
}
/** @param {Db} db @param {{ anio_id: number, materia_id?: number, grado?: number, periodo?: number }} q */
export const listarTemas = (db, q) => todos(db,
  `select t.id, t.materia_id, m.nombre materia, t.grado_id grado, t.periodo, t.nombre, t.estado, t.fecha_visto from tema t join materia m on m.id = t.materia_id
   where t.anio_id = ? and (? is null or t.materia_id = ?) and (? is null or t.grado_id = ?) and (? is null or t.periodo = ?) order by t.grado_id, m.nombre, t.periodo, t.id`,
  q.anio_id, q.materia_id ?? null, q.materia_id ?? null, q.grado ?? null, q.grado ?? null, q.periodo ?? null, q.periodo ?? null);
/** @param {Db} db @param {{ anio_id: number, materia_id?: number, grado?: number, periodo?: number }} q */
export function avanceTemas(db, q) {
  const r = uno(db,
    `select count(*) total, coalesce(sum(estado = 'visto'), 0) vistos from tema where anio_id = ? and (? is null or materia_id = ?) and (? is null or grado_id = ?) and (? is null or periodo = ?)`,
    q.anio_id, q.materia_id ?? null, q.materia_id ?? null, q.grado ?? null, q.grado ?? null, q.periodo ?? null, q.periodo ?? null);
  const total = Number(r.total), vistos = Number(r.vistos);
  return { total, vistos, porcentaje: total ? Math.round((vistos * 100) / total) : 0 };
}
/** @param {Db} db @param {number} temaId */
export function borrarTema(db, temaId) {
  const t = uno(db, 'select anio_id from tema where id = ?', temaId);
  if (!t) throw new ErrorValidacion('El tema no existe');
  exigirAnioAbierto(db, t.anio_id);
  db.prepare('update clase set tema_id = null where tema_id = ?').run(temaId); // las clases se conservan
  db.prepare('delete from tema where id = ?').run(temaId);
}

// --- Clases planeadas ---------------------------------------------------------------------------

/** @param {Db} db @param {{ id?: number, anio_id: number, materia_id: number, grado: number, fecha: string, tema_id?: number | null, guia_id?: number | null, objetivo?: string, actividades?: string, recursos?: string }} d */
export function guardarClase(db, d) {
  exigirAnioAbierto(db, d.anio_id); exigirMateria(db, d.materia_id); validarGrado(d.grado);
  const fecha = validarFecha(d.fecha);
  if (d.tema_id != null && !uno(db, 'select 1 x from tema where id = ? and anio_id = ?', d.tema_id, d.anio_id)) throw new ErrorValidacion('El tema no existe en este año');
  if (d.guia_id != null && !uno(db, 'select 1 x from guia where id = ?', d.guia_id)) throw new ErrorValidacion('La guía no existe');
  const campos = [libre(d.objetivo, 'El objetivo'), libre(d.actividades, 'Las actividades'), libre(d.recursos, 'Los recursos')];
  if (d.id) {
    if (!uno(db, 'select 1 x from clase where id = ?', d.id)) throw new ErrorValidacion('La clase no existe');
    db.prepare('update clase set materia_id=?, grado_id=?, fecha=?, tema_id=?, guia_id=?, objetivo=?, actividades=?, recursos=? where id=?').run(d.materia_id, d.grado, fecha, d.tema_id ?? null, d.guia_id ?? null, ...campos, d.id);
    return { id: d.id };
  }
  return { id: id(db.prepare('insert into clase(anio_id, materia_id, grado_id, fecha, tema_id, guia_id, objetivo, actividades, recursos) values (?,?,?,?,?,?,?,?,?)').run(d.anio_id, d.materia_id, d.grado, fecha, d.tema_id ?? null, d.guia_id ?? null, ...campos)) };
}
/** @param {Db} db @param {number} claseId @param {boolean} realizada */
export function marcarClase(db, claseId, realizada) {
  const c = uno(db, 'select anio_id from clase where id = ?', claseId);
  if (!c) throw new ErrorValidacion('La clase no existe');
  exigirAnioAbierto(db, c.anio_id);
  db.prepare('update clase set realizada = ? where id = ?').run(realizada ? 1 : 0, claseId);
}
/** @param {Db} db @param {{ anio_id: number, materia_id?: number, grado?: number, desde?: string, hasta?: string }} q */
export const listarClases = (db, q) => todos(db,
  `select c.id, c.materia_id, m.nombre materia, c.grado_id grado, c.fecha, c.tema_id, c.guia_id, c.objetivo, c.actividades, c.recursos, c.realizada from clase c join materia m on m.id = c.materia_id
   where c.anio_id = ? and (? is null or c.materia_id = ?) and (? is null or c.grado_id = ?) and (? is null or c.fecha >= ?) and (? is null or c.fecha <= ?) order by c.fecha, c.id`,
  q.anio_id, q.materia_id ?? null, q.materia_id ?? null, q.grado ?? null, q.grado ?? null, q.desde ?? null, q.desde ?? null, q.hasta ?? null, q.hasta ?? null);
/** @param {Db} db @param {number} claseId */
export function borrarClase(db, claseId) {
  const c = uno(db, 'select anio_id from clase where id = ?', claseId);
  if (!c) throw new ErrorValidacion('La clase no existe');
  exigirAnioAbierto(db, c.anio_id);
  db.prepare('delete from clase where id = ?').run(claseId);
}

// --- Adjuntos de guías --------------------------------------------------------------------------

export const TAMANO_MAXIMO_ADJUNTO = 15_000_000;
/** Tipos permitidos (por extensión) y su tipo de contenido al descargarlos. */
export const TIPOS_ADJUNTO = /** @type {Record<string, string>} */ ({
  pdf: 'application/pdf', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', txt: 'text/plain; charset=utf-8',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
});

/** Solo el nombre del archivo, sin carpetas ni caracteres de control. @param {string} nombre */
function nombreSeguro(nombre) {
  return String(nombre ?? '').split(/[\\/]/).pop()?.replace(/[\u0000-\u001f]/g, '').trim().slice(0, 120) ?? '';
}

/** @param {Db} db @param {{ guia_id: number, nombre: string, datos: Buffer }} d */
export function agregarAdjunto(db, d) {
  if (!uno(db, 'select 1 x from guia where id = ?', d.guia_id)) throw new ErrorValidacion('La guía no existe');
  const nombre = nombreSeguro(d.nombre);
  if (!nombre) throw new ErrorValidacion('El archivo no tiene nombre');
  const ext = nombre.includes('.') ? /** @type {string} */ (nombre.split('.').pop()).toLowerCase() : '';
  if (!(ext in TIPOS_ADJUNTO)) throw new ErrorValidacion('Solo se aceptan archivos PDF, Word, Excel, PowerPoint, imágenes (png, jpg) y texto (txt)');
  if (d.datos.length === 0) throw new ErrorValidacion('El archivo está vacío');
  if (d.datos.length > TAMANO_MAXIMO_ADJUNTO) throw new ErrorValidacion('El archivo es demasiado grande (máximo 15 MB)');
  return { id: id(db.prepare('insert into guia_adjunto(guia_id, nombre, tamano, datos) values (?,?,?,?)').run(d.guia_id, nombre, d.datos.length, d.datos)), nombre };
}
/** @param {Db} db @param {number} adjuntoId */
export function leerAdjunto(db, adjuntoId) {
  const f = uno(db, 'select nombre, datos from guia_adjunto where id = ?', adjuntoId);
  if (!f) throw new ErrorValidacion('El archivo adjunto no existe');
  const ext = /** @type {string} */ (String(f.nombre).split('.').pop()).toLowerCase();
  return { nombre: String(f.nombre), tipo: TIPOS_ADJUNTO[ext] ?? 'application/octet-stream', datos: Buffer.from(f.datos) };
}
/** @param {Db} db @param {number} adjuntoId */
export function borrarAdjunto(db, adjuntoId) {
  if (!uno(db, 'select 1 x from guia_adjunto where id = ?', adjuntoId)) throw new ErrorValidacion('El archivo adjunto no existe');
  db.prepare('delete from guia_adjunto where id = ?').run(adjuntoId);
}

// --- Copiar planes al año siguiente (CA-004-03) -------------------------------------------------

/**
 * Copia los planes de un año a otro (los de aula quedan enlazados a la copia de su plan de área).
 * Si un plan igual ya existe en el año de destino, no se duplica.
 * @param {Db} db @param {{ desde_anio_id: number, hasta_anio_id: number }} d
 */
export function copiarPlanes(db, d) {
  if (d.desde_anio_id === d.hasta_anio_id) throw new ErrorValidacion('Elija dos años distintos');
  if (!uno(db, 'select 1 x from anio_lectivo where id = ?', d.desde_anio_id)) throw new ErrorValidacion('El año de origen no existe');
  exigirAnioAbierto(db, d.hasta_anio_id);
  return conTransaccion(db, () => {
    const origen = todos(db, 'select * from plan where anio_id = ? order by (tipo = \'aula\'), id', d.desde_anio_id);
    /** @type {Map<number, number>} */ const nuevoId = new Map();
    let copiados = 0; let omitidos = 0;
    for (const p of origen) {
      const igual = uno(db, 'select id from plan where anio_id = ? and tipo = ? and materia_id = ? and grado_id = ? and titulo = ? and periodo is ?', d.hasta_anio_id, p.tipo, p.materia_id, p.grado_id, p.titulo, p.periodo ?? null);
      if (igual) { nuevoId.set(Number(p.id), Number(igual.id)); omitidos++; continue; }
      const area = p.plan_area_id != null ? nuevoId.get(Number(p.plan_area_id)) ?? null : null;
      const r = db.prepare('insert into plan(tipo, anio_id, materia_id, grado_id, titulo, contenido, periodo, plan_area_id) values (?,?,?,?,?,?,?,?)').run(p.tipo, d.hasta_anio_id, p.materia_id, p.grado_id, p.titulo, p.contenido, p.periodo ?? null, area);
      nuevoId.set(Number(p.id), Number(r.lastInsertRowid)); copiados++;
    }
    return { copiados, omitidos };
  });
}

// --- Asistencia (CA-006-04) ---------------------------------------------------------------------

const ESTADOS_ASISTENCIA = ['presente', 'ausente', 'excusa'];

/** Registra la asistencia de un estudiante en una fecha; `estado` vacío (null) la borra. @param {Db} db @param {{ matricula_id: number, fecha: string, estado: string | null }} d */
export function guardarAsistencia(db, d) {
  const m = uno(db, 'select anio_id from matricula where id = ?', d.matricula_id);
  if (!m) throw new ErrorValidacion('La matrícula no existe');
  exigirAnioAbierto(db, m.anio_id);
  const fecha = validarFecha(d.fecha);
  if (d.estado === null || d.estado === '') { db.prepare('delete from asistencia where matricula_id = ? and fecha = ?').run(d.matricula_id, fecha); return; }
  if (!ESTADOS_ASISTENCIA.includes(String(d.estado))) throw new ErrorValidacion('La asistencia debe ser presente, ausente o excusa');
  db.prepare('insert into asistencia(matricula_id, fecha, estado) values (?,?,?) on conflict(matricula_id, fecha) do update set estado = excluded.estado').run(d.matricula_id, fecha, d.estado);
}
/**
 * Lista del grado en una fecha, con la asistencia registrada y cuántas ausencias lleva cada estudiante en el año.
 * @param {Db} db @param {{ anio_id: number, grado: number, fecha: string }} q
 */
export function listarAsistencia(db, q) {
  validarGrado(q.grado); const fecha = validarFecha(q.fecha);
  return todos(db,
    `select m.id matricula_id, e.nombre, a.estado,
            (select count(*) from asistencia x where x.matricula_id = m.id and x.estado = 'ausente') ausencias
       from matricula m join estudiante e on e.id = m.estudiante_id left join asistencia a on a.matricula_id = m.id and a.fecha = ?
      where m.anio_id = ? and m.grado_id = ? and e.activo = 1 order by e.nombre`, fecha, q.anio_id, q.grado);
}

// --- Observaciones del boletín (CA-009-02) ------------------------------------------------------

/** @param {Db} db @param {{ matricula_id: number, texto: string }} d */
export function guardarObservacion(db, d) {
  const m = uno(db, 'select anio_id from matricula where id = ?', d.matricula_id);
  if (!m) throw new ErrorValidacion('La matrícula no existe');
  exigirAnioAbierto(db, m.anio_id);
  const t = libre(d.texto, 'La observación').trim();
  if (t.length > 1000) throw new ErrorValidacion('La observación es demasiado larga (máximo 1000 letras)');
  if (!t) db.prepare('delete from observacion where matricula_id = ?').run(d.matricula_id);
  else db.prepare('insert into observacion(matricula_id, texto) values (?,?) on conflict(matricula_id) do update set texto = excluded.texto').run(d.matricula_id, t);
}
/** @param {Db} db @param {number} matriculaId */
export function leerObservacion(db, matriculaId) {
  return String(uno(db, 'select texto from observacion where matricula_id = ?', matriculaId)?.texto ?? '');
}
