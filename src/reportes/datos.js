// @ts-check
// Datos de los documentos (planilla, boletín, certificado): se arman una vez y luego cada formato
// (Excel, PDF, Word) solo los dibuja, así los tres muestran siempre las mismas cifras.
import { listarMaterias, listarEstudiantes, listarNotas, ErrorValidacion } from '../servicios/academico.js';

/** @typedef {import('node:sqlite').DatabaseSync} Db */
export const NOMBRES_GRADO = ['Transición', 'Primero', 'Segundo', 'Tercero', 'Cuarto', 'Quinto'];
const num = (/** @type {number | null} */ v) => (v === null || v === undefined ? '' : v.toFixed(1).replace('.', ','));
export const texto = num;

/** @param {Db} db @param {number} anioId */
function anio(db, anioId) {
  const a = /** @type {any} */ (db.prepare('select anio from anio_lectivo where id = ?').get(anioId));
  if (!a) throw new ErrorValidacion('El año lectivo no existe');
  return Number(a.anio);
}

/** Cabecera opcional de la institución, guardada en `config`. @param {Db} db */
export function encabezado(db) {
  const filas = /** @type {{ clave: string, valor: string }[]} */ (db.prepare("select clave, valor from config where clave like 'institucion.%'").all());
  const g = (/** @type {string} */ k) => filas.find((f) => f.clave === `institucion.${k}`)?.valor ?? '';
  return { institucion: g('nombre'), sede: g('sede'), docente: g('docente') };
}

/**
 * Planilla de un grado y materia: una fila por estudiante con los cuatro periodos y el año.
 * @param {Db} db @param {{ anio_id: number, grado: number, materia_id: number }} q
 */
export function datosPlanilla(db, q) {
  const materia = listarMaterias(db).find((m) => m.id === q.materia_id);
  if (!materia) throw new ErrorValidacion('La materia no existe');
  const filas = listarNotas(db, { ...q, periodo: 1 }).map((f) => ({
    nombre: f.nombre,
    periodos: f.periodos.map((p) => p.valor),
    anio: f.anio.valor,
    aprobado: f.anio.aprobado,
  }));
  return { ...encabezado(db), anio: anio(db, q.anio_id), grado: NOMBRES_GRADO[q.grado], materia: materia.nombre, filas };
}

/**
 * Boletín de un estudiante: por materia, definitivas de cada periodo, del año y nivelación.
 * La nivelación se muestra aparte: la nota original no se reemplaza.
 * @param {Db} db @param {{ anio_id: number, matricula_id: number }} q
 */
export function datosBoletin(db, q) {
  const est = listarEstudiantes(db, { anio_id: q.anio_id, incluirArchivados: true }).find((e) => e.matricula_id === q.matricula_id);
  if (!est) throw new ErrorValidacion('El estudiante no está matriculado en ese año');
  const materias = [];
  for (const m of listarMaterias(db)) {
    const f = listarNotas(db, { anio_id: q.anio_id, grado: est.grado, materia_id: m.id, periodo: 1 }).find((x) => x.matricula_id === q.matricula_id);
    if (!f || (f.periodos.every((p) => p.valor === null) && !f.nivelacion)) continue; // materia sin notas: no aparece
    materias.push({
      materia: m.nombre, periodos: f.periodos.map((p) => p.valor), anio: f.anio.valor, aprobado: f.anio.aprobado,
      nivelacion: f.nivelacion?.nota ?? null,
    });
  }
  const completas = materias.length > 0 && materias.every((m) => m.anio !== null);
  const reprobadas = materias.filter((m) => m.aprobado === false);
  return {
    ...encabezado(db), anio: anio(db, q.anio_id), estudiante: est.nombre, documento: est.documento ?? '', grado: NOMBRES_GRADO[est.grado],
    materias, reprobadas: reprobadas.map((m) => m.materia),
    // «Promovido» solo se afirma con el año completo; si faltan notas se dice «en curso» y no se inventa.
    situacion: !completas ? 'En curso' : reprobadas.length === 0 ? 'Aprobó todas las materias' : 'Tiene materias por nivelar',
  };
}

/** Guarda los datos de la institución que salen en el encabezado de los documentos. @param {Db} db @param {{ nombre?: string, sede?: string, docente?: string }} d */
export function guardarInstitucion(db, d) {
  const campos = /** @type {const} */ (['nombre', 'sede', 'docente']);
  for (const c of campos) {
    const v = (d[c] ?? '').trim();
    if (v.length > 120) throw new ErrorValidacion(`El campo «${c}» es demasiado largo (máximo 120 letras)`);
    if (v) db.prepare('insert into config(clave, valor) values (?, ?) on conflict(clave) do update set valor = excluded.valor').run(`institucion.${c}`, v);
    else db.prepare('delete from config where clave = ?').run(`institucion.${c}`);
  }
}

/**
 * Plan o guía como documento de texto (título, subtítulo y contenido).
 * @param {Db} db @param {'plan' | 'guia'} tipo @param {number} id
 */
export function datosTexto(db, tipo, id) {
  const fila = /** @type {any} */ (tipo === 'plan'
    ? db.prepare('select p.titulo, p.contenido, p.tipo, p.grado_id grado, m.nombre materia, a.anio from plan p join materia m on m.id = p.materia_id join anio_lectivo a on a.id = p.anio_id where p.id = ?').get(id)
    : db.prepare('select g.titulo, g.contenido, g.tema, g.grado_id grado, m.nombre materia from guia g join materia m on m.id = g.materia_id where g.id = ?').get(id));
  if (!fila) throw new ErrorValidacion(tipo === 'plan' ? 'El plan no existe' : 'La guía no existe');
  const subtitulo = tipo === 'plan'
    ? `${fila.tipo === 'area' ? 'Plan de área' : 'Plan de aula'} — ${fila.materia} — ${NOMBRES_GRADO[fila.grado]} — ${fila.anio}`
    : `Guía — ${fila.materia} — ${NOMBRES_GRADO[fila.grado]}${fila.tema ? ' — ' + fila.tema : ''}`;
  return { ...encabezado(db), titulo: String(fila.titulo), subtitulo, contenido: String(fila.contenido), anio: Number(fila.anio ?? new Date().getFullYear()) };
}
