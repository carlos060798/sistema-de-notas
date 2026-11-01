// @ts-check
// Datos de la pantalla de inicio: cuántos estudiantes hay, quién no aprueba, qué falta y cómo está el respaldo.
import { listarEstudiantes, desaprobadas, pendientesNivelacion } from './academico.js';
import { avanceTemas } from './planeacion.js';

/** @typedef {import('node:sqlite').DatabaseSync} Db */
const CLAVE_EXCEL = 'respaldo.excel_ultimo';
/** Días sin Excel a partir de los cuales se avisa. */
export const DIAS_AVISO_EXCEL = 14;

/** Anota que se acaba de descargar el Excel de respaldo. @param {Db} db @param {Date} [ahora] */
export function registrarExcelDescargado(db, ahora = new Date()) {
  db.prepare('insert into config(clave, valor) values (?, ?) on conflict(clave) do update set valor = excluded.valor').run(CLAVE_EXCEL, ahora.toISOString());
}

/** Fecha de la copia a partir del nombre `notas-AAAAMMDD-HHMMSSmmm-motivo.db` (hora local). @param {string} nombre */
export function fechaDeCopia(nombre) {
  const m = /^notas-(\d{4})(\d{2})(\d{2})-(\d{2})(\d{2})(\d{2})/.exec(nombre);
  return m ? new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]) : null;
}

/**
 * @param {Db} db @param {{ anio_id: number, copias: { nombre: string }[], ahora?: Date }} q
 */
export function resumen(db, q) {
  const ahora = q.ahora ?? new Date();
  const estudiantes = listarEstudiantes(db, { anio_id: q.anio_id });
  const reprobadas = desaprobadas(db, { anio_id: q.anio_id, base: 'anio' });
  const porNivelar = pendientesNivelacion(db, { anio_id: q.anio_id }).filter((p) => p.nivelacion?.nota == null);
  const fila = /** @type {{ valor: string } | undefined} */ (db.prepare('select valor from config where clave = ?').get(CLAVE_EXCEL));
  const excel = fila ? new Date(fila.valor) : null;
  const ultimaCopia = q.copias.map((c) => fechaDeCopia(c.nombre)).find((d) => d) ?? null; // la lista viene de la más nueva a la más vieja
  const dias = (/** @type {Date | null} */ d) => (d ? Math.floor((ahora.getTime() - d.getTime()) / 86_400_000) : null);
  const diasExcel = dias(excel);
  return {
    estudiantes: estudiantes.length,
    porGrado: [0, 1, 2, 3, 4, 5].map((g) => ({ grado: g, n: estudiantes.filter((e) => e.grado === g).length })).filter((x) => x.n > 0),
    noAprobados: new Set(reprobadas.map((r) => r.estudiante_id)).size,
    materiasReprobadas: reprobadas.length,
    nivelacionesPendientes: porNivelar.length,
    temas: avanceTemas(db, { anio_id: q.anio_id }),
    respaldo: {
      copias: q.copias.length,
      ultimaCopia: ultimaCopia?.toISOString() ?? null,
      ultimoExcel: excel?.toISOString() ?? null,
      diasSinExcel: diasExcel,
      avisarExcel: diasExcel === null || diasExcel >= DIAS_AVISO_EXCEL,
    },
  };
}
