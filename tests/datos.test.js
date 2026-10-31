// @ts-check
// Capa de datos (spec RF-002, RF-004): migraciones, restricciones y transacciones.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { abrirBase, conTransaccion, VERSION_ESQUEMA } from '../src/datos/base.js';

const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'notas-'));

/** @param {import('node:sqlite').DatabaseSync} db */
function sembrar(db) {
  db.exec(`insert into anio_lectivo(anio) values (2026);
           insert into estudiante(nombre) values ('Ñandú Muñoz');
           insert into materia(nombre) values ('Matemáticas');
           insert into matricula(estudiante_id, anio_id, grado_id) values (1, 1, 3);`);
}

describe('migraciones', () => {
  test('una base nueva queda en la versión actual con los grados 0 a 5', () => {
    const db = abrirBase(':memory:');
    assert.equal(db.prepare('pragma user_version').get()?.user_version, VERSION_ESQUEMA);
    const grados = db.prepare('select id from grado order by id').all().map((r) => r.id);
    assert.deepEqual(grados, [0, 1, 2, 3, 4, 5]);
  });
  test('abrir dos veces el mismo archivo no repite migraciones ni duplica datos', () => {
    const f = path.join(tmp(), 'datos.db');
    abrirBase(f).close();
    const db = abrirBase(f);
    assert.equal(db.prepare('select count(*) n from grado').get()?.n, 6);
    db.close();
  });
  test('una base de una versión futura se rechaza sin tocarla', () => {
    const f = path.join(tmp(), 'futuro.db');
    const db = abrirBase(f);
    db.exec(`pragma user_version = ${VERSION_ESQUEMA + 1}`);
    db.close();
    assert.throws(() => abrirBase(f), /versión más nueva/);
  });
});

describe('restricciones', () => {
  test('una nota fuera de 1,0 a 5,0 se rechaza en la base', () => {
    const db = abrirBase(':memory:'); sembrar(db);
    assert.throws(() => db.exec('insert into nota(matricula_id, materia_id, periodo, n1) values (1,1,1,6.5)'));
    assert.throws(() => db.exec('insert into nota(matricula_id, materia_id, periodo, n1) values (1,1,1,0.5)'));
    db.exec('insert into nota(matricula_id, materia_id, periodo, n1, n2, n3) values (1,1,1,1.0,5.0,null)');
  });
  test('el periodo solo puede ser 1 a 4 y no se repite por matrícula y materia', () => {
    const db = abrirBase(':memory:'); sembrar(db);
    assert.throws(() => db.exec('insert into nota(matricula_id, materia_id, periodo) values (1,1,5)'));
    db.exec('insert into nota(matricula_id, materia_id, periodo) values (1,1,2)');
    assert.throws(() => db.exec('insert into nota(matricula_id, materia_id, periodo) values (1,1,2)'));
  });
  test('las claves foráneas están activas', () => {
    const db = abrirBase(':memory:');
    assert.throws(() => db.exec('insert into matricula(estudiante_id, anio_id, grado_id) values (99,99,3)'));
  });
  test('el grado debe ser de 0 a 5', () => {
    const db = abrirBase(':memory:'); sembrar(db);
    assert.throws(() => db.exec('insert into matricula(estudiante_id, anio_id, grado_id) values (1,1,6)'));
  });
});

describe('conTransaccion (RF-004)', () => {
  test('si algo falla a la mitad no queda ningún cambio', () => {
    const db = abrirBase(':memory:'); sembrar(db);
    assert.throws(() => conTransaccion(db, () => {
      db.exec('insert into materia(nombre) values (\'Lenguaje\')');
      db.exec('insert into materia(nombre) values (\'Matemáticas\')'); // duplicada: falla
    }));
    assert.equal(db.prepare('select count(*) n from materia').get()?.n, 1);
  });
  test('si todo sale bien se confirma y devuelve el resultado', () => {
    const db = abrirBase(':memory:');
    const r = conTransaccion(db, () => { db.exec('insert into materia(nombre) values (\'Ciencias\')'); return 42; });
    assert.equal(r, 42);
    assert.equal(db.prepare('select count(*) n from materia').get()?.n, 1);
  });
  test('las transacciones anidadas reutilizan la exterior', () => {
    const db = abrirBase(':memory:');
    assert.throws(() => conTransaccion(db, () => {
      conTransaccion(db, () => db.exec('insert into materia(nombre) values (\'A\')'));
      throw new Error('falla externa');
    }));
    assert.equal(db.prepare('select count(*) n from materia').get()?.n, 0);
  });
});
