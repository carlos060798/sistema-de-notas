// @ts-check
// Base de datos: un solo archivo SQLite (`node:sqlite`), migraciones numeradas y transacciones.
// Sin modo WAL a propósito: deja un solo archivo, fácil de copiar a un USB (ADR-01).
import { DatabaseSync } from 'node:sqlite';

/** Cada migración se aplica una vez, en orden, dentro de una transacción. */
const MIGRACIONES = [
  `
  create table anio_lectivo (
    id integer primary key,
    anio integer not null unique,
    cerrado integer not null default 0 check (cerrado in (0,1))
  );
  create table grado (
    id integer primary key check (id between 0 and 5),
    nombre text not null
  );
  insert into grado(id, nombre) values (0,'Transición'),(1,'Primero'),(2,'Segundo'),(3,'Tercero'),(4,'Cuarto'),(5,'Quinto');
  create table materia (
    id integer primary key,
    nombre text not null unique
  );
  create table estudiante (
    id integer primary key,
    nombre text not null,
    documento text,
    activo integer not null default 1 check (activo in (0,1))
  );
  create table matricula (
    id integer primary key,
    estudiante_id integer not null references estudiante(id),
    anio_id integer not null references anio_lectivo(id),
    grado_id integer not null references grado(id),
    unique (estudiante_id, anio_id)
  );
  create table nota (
    id integer primary key,
    matricula_id integer not null references matricula(id),
    materia_id integer not null references materia(id),
    periodo integer not null check (periodo between 1 and 4),
    n1 real check (n1 is null or n1 between 1.0 and 5.0),
    n2 real check (n2 is null or n2 between 1.0 and 5.0),
    n3 real check (n3 is null or n3 between 1.0 and 5.0),
    unique (matricula_id, materia_id, periodo)
  );
  create table nivelacion (
    id integer primary key,
    matricula_id integer not null references matricula(id),
    materia_id integer not null references materia(id),
    actividades text not null default '',
    fecha text,
    nota real check (nota is null or nota between 1.0 and 5.0),
    unique (matricula_id, materia_id)
  );
  create table config (
    clave text primary key,
    valor text not null
  );
  `,
  `
  create table plan (
    id integer primary key,
    tipo text not null check (tipo in ('area','aula')),
    anio_id integer not null references anio_lectivo(id),
    materia_id integer not null references materia(id),
    grado_id integer not null references grado(id),
    titulo text not null,
    contenido text not null default ''
  );
  create table guia (
    id integer primary key,
    materia_id integer not null references materia(id),
    grado_id integer not null references grado(id),
    tema text not null default '',
    titulo text not null,
    contenido text not null default ''
  );
  create table tema (
    id integer primary key,
    anio_id integer not null references anio_lectivo(id),
    materia_id integer not null references materia(id),
    grado_id integer not null references grado(id),
    periodo integer not null check (periodo between 1 and 4),
    nombre text not null,
    estado text not null default 'pendiente' check (estado in ('pendiente','en_curso','visto')),
    fecha_visto text
  );
  create table clase (
    id integer primary key,
    anio_id integer not null references anio_lectivo(id),
    materia_id integer not null references materia(id),
    grado_id integer not null references grado(id),
    fecha text not null,
    tema_id integer references tema(id),
    objetivo text not null default '',
    actividades text not null default '',
    recursos text not null default '',
    realizada integer not null default 0 check (realizada in (0,1))
  );
  `,
  `
  create table guia_adjunto (
    id integer primary key,
    guia_id integer not null references guia(id),
    nombre text not null,
    tamano integer not null,
    datos blob not null
  );
  `,
];

export const VERSION_ESQUEMA = MIGRACIONES.length;

/**
 * Abre (o crea) la base y aplica las migraciones pendientes.
 * @param {string} ruta archivo o ':memory:'
 */
export function abrirBase(ruta) {
  const db = new DatabaseSync(ruta);
  db.exec('pragma foreign_keys = on');
  const actual = Number(db.prepare('pragma user_version').get()?.user_version ?? 0);
  if (actual > VERSION_ESQUEMA) {
    db.close();
    throw new Error(`La base viene de una versión más nueva del programa (esquema ${actual}; este entiende hasta ${VERSION_ESQUEMA}). No se modificó.`);
  }
  for (let v = actual; v < VERSION_ESQUEMA; v++) {
    conTransaccion(db, () => {
      db.exec(MIGRACIONES[v]);
      db.exec(`pragma user_version = ${v + 1}`);
    });
  }
  return db;
}

const profundidad = new WeakMap();

/**
 * Ejecuta `fn` en una transacción: confirma si termina bien, revierte todo si lanza.
 * Las llamadas anidadas reutilizan la transacción exterior.
 * @template T
 * @param {DatabaseSync} db @param {() => T} fn @returns {T}
 */
export function conTransaccion(db, fn) {
  const nivel = profundidad.get(db) ?? 0;
  if (nivel > 0) return fn();
  db.exec('begin immediate');
  profundidad.set(db, 1);
  try {
    const r = fn();
    db.exec('commit');
    return r;
  } catch (e) {
    db.exec('rollback');
    throw e;
  } finally {
    profundidad.set(db, 0);
  }
}
