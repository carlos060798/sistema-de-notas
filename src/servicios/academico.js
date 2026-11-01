// @ts-check
// Lógica académica sobre la base: años, materias, estudiantes, notas y nivelación.
// Valida con mensajes en español para el docente; las reglas de cálculo viven en dominio/notas.js.
import { conTransaccion } from '../datos/base.js';
import { validarNota, definitivaPeriodo, definitivaAnio, aprobado } from '../dominio/notas.js';

/** Error esperado por entrada incorrecta del usuario (la interfaz lo muestra tal cual). */
export class ErrorValidacion extends Error {
  constructor(/** @type {string} */ mensaje) { super(mensaje); this.name = 'ErrorValidacion'; }
}

/** @typedef {import('node:sqlite').DatabaseSync} Db */
const es = new Intl.Collator('es');
const num = (/** @type {unknown} */ v) => Number(v);
/** @param {any} fila @returns {any} */
const f = (fila) => fila;

/** @param {Db} db @param {string} sql @param {...any} args @returns {any[]} */
const todos = (db, sql, ...args) => /** @type {any[]} */ (db.prepare(sql).all(...args));
/** @param {Db} db @param {string} sql @param {...any} args @returns {any} */
const uno = (db, sql, ...args) => db.prepare(sql).get(...args);

/** @param {unknown} v @param {string} msg */
export function textoObligatorio(v, msg) {
  const t = typeof v === 'string' ? v.trim() : '';
  if (!t) throw new ErrorValidacion(msg);
  return t;
}

// --- Años ---------------------------------------------------------------------------------------

/** @param {Db} db @param {number} anio */
export function crearAnio(db, anio) {
  if (!Number.isInteger(anio) || anio < 2000 || anio > 2100) throw new ErrorValidacion('El año debe estar entre 2000 y 2100');
  if (uno(db, 'select 1 x from anio_lectivo where anio = ?', anio)) throw new ErrorValidacion('Ese año lectivo ya existe');
  const r = db.prepare('insert into anio_lectivo(anio) values (?)').run(anio);
  return { id: num(r.lastInsertRowid), anio };
}
/** @param {Db} db */
export const listarAnios = (db) => todos(db, 'select id, anio, cerrado from anio_lectivo order by anio desc');

/** @param {Db} db @param {number} id */
export function cerrarAnio(db, id) {
  if (!uno(db, 'select 1 x from anio_lectivo where id = ?', id)) throw new ErrorValidacion('El año lectivo no existe');
  db.prepare('update anio_lectivo set cerrado = 1 where id = ?').run(id);
}
/** Vuelve a abrir un año cerrado (por ejemplo, para registrar una nivelación que quedó pendiente). @param {Db} db @param {number} id */
export function reabrirAnio(db, id) {
  if (!uno(db, 'select 1 x from anio_lectivo where id = ?', id)) throw new ErrorValidacion('El año lectivo no existe');
  db.prepare('update anio_lectivo set cerrado = 0 where id = ?').run(id);
}
/** @param {Db} db @param {number} anioId */
export function exigirAnioAbierto(db, anioId) {
  const a = f(uno(db, 'select anio, cerrado from anio_lectivo where id = ?', anioId));
  if (!a) throw new ErrorValidacion('El año lectivo no existe');
  if (a.cerrado) throw new ErrorValidacion(`El año ${a.anio} está cerrado: solo se puede consultar`);
}

// --- Materias -----------------------------------------------------------------------------------

/** @param {Db} db @param {string} nombre */
export function crearMateria(db, nombre) {
  const n = textoObligatorio(nombre, 'Escriba el nombre de la materia');
  if (n.length > 80) throw new ErrorValidacion('El nombre de la materia es demasiado largo (máximo 80 letras)');
  if (uno(db, 'select 1 x from materia where nombre = ?', n)) throw new ErrorValidacion('Esa materia ya existe');
  const r = db.prepare('insert into materia(nombre) values (?)').run(n);
  return { id: num(r.lastInsertRowid), nombre: n };
}
/** @param {Db} db @param {number} id @param {string} nombre */
export function renombrarMateria(db, id, nombre) {
  const n = textoObligatorio(nombre, 'Escriba el nombre de la materia');
  if (n.length > 80) throw new ErrorValidacion('El nombre de la materia es demasiado largo (máximo 80 letras)');
  if (!uno(db, 'select 1 x from materia where id = ?', id)) throw new ErrorValidacion('La materia no existe');
  if (uno(db, 'select 1 x from materia where nombre = ? and id <> ?', n, id)) throw new ErrorValidacion('Ya existe otra materia con ese nombre');
  db.prepare('update materia set nombre = ? where id = ?').run(n, id);
  return { id, nombre: n };
}
/** @param {Db} db @returns {{ id: number, nombre: string }[]} */
export const listarMaterias = (db) => todos(db, 'select id, nombre from materia').sort((a, b) => es.compare(a.nombre, b.nombre));

// --- Estudiantes --------------------------------------------------------------------------------

/** @param {unknown} g */
export function validarGrado(g) {
  if (!Number.isInteger(g) || /** @type {number} */ (g) < 0 || /** @type {number} */ (g) > 5) throw new ErrorValidacion('El grado debe ser de 0 a 5');
}

/** @param {Db} db @param {{ nombre: string, documento: string | null, grado: number, anio_id: number }} d */
export function crearEstudiante(db, d) {
  const nombre = textoObligatorio(d.nombre, 'Escriba el nombre del estudiante');
  validarGrado(d.grado);
  exigirAnioAbierto(db, d.anio_id);
  const documento = typeof d.documento === 'string' && d.documento.trim() ? d.documento.trim() : null;
  return conTransaccion(db, () => {
    const e = db.prepare('insert into estudiante(nombre, documento) values (?, ?)').run(nombre, documento);
    const m = db.prepare('insert into matricula(estudiante_id, anio_id, grado_id) values (?, ?, ?)').run(e.lastInsertRowid, d.anio_id, d.grado);
    return { estudiante_id: num(e.lastInsertRowid), matricula_id: num(m.lastInsertRowid) };
  });
}

/** @param {Db} db @param {number} id @param {{ nombre: string, documento: string | null }} d */
export function editarEstudiante(db, id, d) {
  const nombre = textoObligatorio(d.nombre, 'Escriba el nombre del estudiante');
  if (!uno(db, 'select 1 x from estudiante where id = ?', id)) throw new ErrorValidacion('El estudiante no existe');
  const documento = typeof d.documento === 'string' && d.documento.trim() ? d.documento.trim() : null;
  db.prepare('update estudiante set nombre = ?, documento = ? where id = ?').run(nombre, documento, id);
}

/** Archivar no borra nada: el historial y las notas se conservan. @param {Db} db @param {number} id @param {boolean} archivar */
export function archivarEstudiante(db, id, archivar) {
  if (!uno(db, 'select 1 x from estudiante where id = ?', id)) throw new ErrorValidacion('El estudiante no existe');
  db.prepare('update estudiante set activo = ? where id = ?').run(archivar ? 0 : 1, id);
}

/**
 * @param {Db} db @param {{ anio_id: number, grado?: number, incluirArchivados?: boolean }} q
 * @returns {{ matricula_id: number, estudiante_id: number, nombre: string, documento: string | null, grado: number, activo: number }[]}
 */
export function listarEstudiantes(db, q) {
  const filas = todos(db,
    `select m.id matricula_id, e.id estudiante_id, e.nombre, e.documento, m.grado_id grado, e.activo
       from matricula m join estudiante e on e.id = m.estudiante_id
      where m.anio_id = ? and (? is null or m.grado_id = ?) and (? = 1 or e.activo = 1)`,
    q.anio_id, q.grado ?? null, q.grado ?? null, q.incluirArchivados ? 1 : 0);
  return filas.sort((a, b) => a.grado - b.grado || es.compare(a.nombre, b.nombre));
}

// --- Notas --------------------------------------------------------------------------------------

/** @param {unknown} p */
function validarPeriodo(p) {
  if (!Number.isInteger(p) || /** @type {number} */ (p) < 1 || /** @type {number} */ (p) > 4) throw new ErrorValidacion('El periodo debe ser 1, 2, 3 o 4');
}
/** @param {unknown} v @returns {number | null} */
function notaOpcional(v) {
  if (v === null || v === undefined) return null;
  const r = validarNota(v);
  if (!r.ok) throw new ErrorValidacion(r.error);
  return /** @type {number} */ (v);
}

/**
 * Guarda (reemplaza) las tres notas de un periodo. `null` borra una nota.
 * @param {Db} db @param {{ matricula_id: number, materia_id: number, periodo: number, n1?: number|null, n2?: number|null, n3?: number|null }} d
 */
export function guardarNotas(db, d) {
  validarPeriodo(d.periodo);
  const n1 = notaOpcional(d.n1); const n2 = notaOpcional(d.n2); const n3 = notaOpcional(d.n3);
  const mat = f(uno(db, 'select anio_id from matricula where id = ?', d.matricula_id));
  if (!mat) throw new ErrorValidacion('La matrícula no existe');
  if (!uno(db, 'select 1 x from materia where id = ?', d.materia_id)) throw new ErrorValidacion('La materia no existe');
  exigirAnioAbierto(db, mat.anio_id);
  db.prepare(
    `insert into nota(matricula_id, materia_id, periodo, n1, n2, n3) values (?, ?, ?, ?, ?, ?)
     on conflict(matricula_id, materia_id, periodo) do update set n1 = excluded.n1, n2 = excluded.n2, n3 = excluded.n3`,
  ).run(d.matricula_id, d.materia_id, d.periodo, n1, n2, n3);
  const definitiva = definitivaPeriodo(n1, n2, n3);
  return { definitiva, aprobado: aprobado(definitiva.valor) };
}

/** Definitivas de los cuatro periodos y del año para una matrícula y materia. @param {any[]} notas filas de `nota` */
function calcular(notas) {
  const periodos = [1, 2, 3, 4].map((p) => {
    const r = notas.find((x) => x.periodo === p);
    return r ? definitivaPeriodo(r.n1, r.n2, r.n3) : /** @type {import('../dominio/notas.js').Definitiva} */ ({ estado: 'incompleta', valor: null });
  });
  const a = definitivaAnio(periodos);
  return { periodos, anio: { estado: a.estado, valor: a.valor, aprobado: aprobado(a.valor) } };
}

/**
 * Hoja de notas de un grado, una materia y un periodo.
 * @param {Db} db @param {{ anio_id: number, grado: number, materia_id: number, periodo: number }} q
 */
export function listarNotas(db, q) {
  validarPeriodo(q.periodo);
  const alumnos = listarEstudiantes(db, { anio_id: q.anio_id, grado: q.grado });
  return alumnos.map((al) => {
    const notas = todos(db, 'select periodo, n1, n2, n3 from nota where matricula_id = ? and materia_id = ?', al.matricula_id, q.materia_id);
    const actual = notas.find((x) => x.periodo === q.periodo);
    const c = calcular(notas);
    const niv = f(uno(db, 'select actividades, fecha, nota from nivelacion where matricula_id = ? and materia_id = ?', al.matricula_id, q.materia_id));
    const definitiva = c.periodos[q.periodo - 1];
    return {
      matricula_id: al.matricula_id, estudiante_id: al.estudiante_id, nombre: al.nombre, grado: al.grado,
      n1: actual?.n1 ?? null, n2: actual?.n2 ?? null, n3: actual?.n3 ?? null,
      definitiva, aprobado: aprobado(definitiva.valor), periodos: c.periodos, anio: c.anio,
      nivelacion: niv ? { actividades: String(niv.actividades), fecha: niv.fecha ?? null, nota: niv.nota ?? null } : null,
    };
  });
}

/**
 * Desaprobados (definitiva menor de 3,0) por periodo o por año, filtrables por grado y materia.
 * @param {Db} db @param {{ anio_id: number, base: 'periodo' | 'anio', periodo?: number, grado?: number, materia_id?: number }} q
 */
export function desaprobadas(db, q) {
  if (q.base === 'periodo') validarPeriodo(q.periodo);
  const filas = todos(db,
    `select m.id matricula_id, e.id estudiante_id, e.nombre, m.grado_id grado, ma.id materia_id, ma.nombre materia,
            n.periodo, n.n1, n.n2, n.n3
       from nota n join matricula m on m.id = n.matricula_id join estudiante e on e.id = m.estudiante_id
       join materia ma on ma.id = n.materia_id
      where m.anio_id = ? and e.activo = 1 and (? is null or m.grado_id = ?) and (? is null or ma.id = ?)`,
    q.anio_id, q.grado ?? null, q.grado ?? null, q.materia_id ?? null, q.materia_id ?? null);
  /** @type {Map<string, any[]>} */ const grupos = new Map();
  for (const r of filas) { const k = `${r.matricula_id}:${r.materia_id}`; (grupos.get(k) ?? grupos.set(k, []).get(k))?.push(r); }
  const salida = [];
  for (const g of grupos.values()) {
    const c = calcular(g);
    const d = q.base === 'periodo' ? c.periodos[/** @type {number} */ (q.periodo) - 1] : c.anio;
    if (d.valor !== null && aprobado(d.valor) === false) {
      const r = g[0];
      salida.push({ matricula_id: r.matricula_id, estudiante_id: r.estudiante_id, nombre: r.nombre, grado: r.grado, materia_id: r.materia_id, materia: r.materia, valor: d.valor });
    }
  }
  return salida.sort((a, b) => a.grado - b.grado || es.compare(a.nombre, b.nombre) || es.compare(a.materia, b.materia));
}

// --- Nivelación ---------------------------------------------------------------------------------

/**
 * Abre o actualiza el plan de nivelación de una materia reprobada en el año.
 * La nota de nivelación se guarda aparte: nunca reemplaza la nota original.
 * @param {Db} db @param {{ matricula_id: number, materia_id: number, actividades: string, fecha: string | null, nota: number | null }} d
 */
export function guardarNivelacion(db, d) {
  const mat = f(uno(db, 'select anio_id from matricula where id = ?', d.matricula_id));
  if (!mat) throw new ErrorValidacion('La matrícula no existe');
  exigirAnioAbierto(db, mat.anio_id);
  const nota = notaOpcional(d.nota);
  let fecha = null;
  if (d.fecha) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d.fecha) || Number.isNaN(Date.parse(d.fecha))) throw new ErrorValidacion('La fecha debe escribirse como AAAA-MM-DD');
    fecha = d.fecha;
  }
  const c = calcular(todos(db, 'select periodo, n1, n2, n3 from nota where matricula_id = ? and materia_id = ?', d.matricula_id, d.materia_id));
  if (c.anio.estado !== 'completa' || c.anio.aprobado !== false) {
    throw new ErrorValidacion('La nivelación solo se abre cuando la definitiva del año de la materia es menor de 3,0');
  }
  db.prepare(
    `insert into nivelacion(matricula_id, materia_id, actividades, fecha, nota) values (?, ?, ?, ?, ?)
     on conflict(matricula_id, materia_id) do update set actividades = excluded.actividades, fecha = excluded.fecha, nota = excluded.nota`,
  ).run(d.matricula_id, d.materia_id, String(d.actividades ?? '').trim(), fecha, nota);
}

/**
 * Estudiantes con la definitiva del año menor de 3,0 y la nivelación sin nota.
 * @param {Db} db @param {{ anio_id: number, grado?: number }} q
 */
export function pendientesNivelacion(db, q) {
  const reprobadas = desaprobadas(db, { anio_id: q.anio_id, base: 'anio', grado: q.grado });
  return reprobadas
    .map((r) => {
      const niv = f(uno(db, 'select actividades, fecha, nota from nivelacion where matricula_id = ? and materia_id = ?', r.matricula_id, r.materia_id));
      return { ...r, anio_valor: r.valor, nivelacion: niv ? { actividades: String(niv.actividades), fecha: niv.fecha ?? null, nota: niv.nota ?? null } : null };
    })
    .filter((r) => r.nivelacion === null || r.nivelacion.nota === null);
}
