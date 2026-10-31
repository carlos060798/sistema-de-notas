// @ts-check
// Respaldo y recuperación (spec HU-007, CA-007-01 a CA-007-05).
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { abrirBase } from '../src/datos/base.js';
import {
  crearCopia, listarCopias, aplicarRetencion, verificarCopia, restaurar, diagnosticar, copiarAVarios,
} from '../src/respaldo/respaldo.js';

const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'resp-'));

/** Crea una base en archivo con un estudiante. @param {string} dir @param {string} [nombre] */
function baseConDatos(dir, nombre = 'Ñandú Muñoz') {
  const ruta = path.join(dir, 'datos.db');
  const db = abrirBase(ruta);
  db.prepare('insert into estudiante(nombre) values (?)').run(nombre);
  return { ruta, db };
}
const nombres = (/** @type {string} */ ruta) => {
  const d = abrirBase(ruta);
  const r = d.prepare('select nombre from estudiante order by id').all().map((x) => x.nombre);
  d.close();
  return r;
};
/** Corrompe un archivo SQLite sobrescribiendo bytes del interior. @param {string} ruta */
function danar(ruta) {
  const b = fs.readFileSync(ruta);
  for (let i = 100; i < Math.min(b.length, 4000); i++) b[i] = 0xab;
  fs.writeFileSync(ruta, b);
}

describe('crearCopia (CA-007-01)', () => {
  test('genera una copia íntegra con los datos y un nombre con fecha y motivo', () => {
    const dir = tmp(); const { db } = baseConDatos(dir); const dest = path.join(dir, 'copias');
    const ruta = crearCopia(db, dest, 'abrir');
    assert.match(path.basename(ruta), /^notas-\d{8}-\d{9}-abrir\.db$/);
    assert.equal(verificarCopia(ruta).ok, true);
    assert.deepEqual(nombres(ruta), ['Ñandú Muñoz']);
    db.close();
  });
  test('rechaza motivos que no sean letras minúsculas y guiones', () => {
    const dir = tmp(); const { db } = baseConDatos(dir);
    assert.throws(() => crearCopia(db, path.join(dir, 'c'), '../mal'));
    db.close();
  });
  test('dos copias seguidas no se pisan y se listan de la más nueva a la más vieja', () => {
    const dir = tmp(); const { db } = baseConDatos(dir); const dest = path.join(dir, 'c');
    const a = crearCopia(db, dest, 'abrir'); const b = crearCopia(db, dest, 'cerrar');
    assert.notEqual(a, b);
    assert.deepEqual(listarCopias(dest).map((c) => c.ruta), [b, a]);
    db.close();
  });
});

describe('aplicarRetencion (CA-007-01)', () => {
  test('conserva las N automáticas más recientes y nunca borra las manuales', () => {
    const dir = tmp(); const { db } = baseConDatos(dir); const dest = path.join(dir, 'c');
    const auto = [1, 2, 3, 4, 5].map(() => crearCopia(db, dest, 'abrir'));
    const manual = crearCopia(db, dest, 'manual');
    aplicarRetencion(dest, 3);
    const quedan = listarCopias(dest).map((c) => c.ruta);
    assert.deepEqual(quedan.filter((r) => auto.includes(r)), [auto[4], auto[3], auto[2]]);
    assert.ok(quedan.includes(manual));
    db.close();
  });
  test('no toca archivos ajenos en la carpeta', () => {
    const dir = tmp(); const dest = path.join(dir, 'c'); fs.mkdirSync(dest);
    fs.writeFileSync(path.join(dest, 'foto.jpg'), 'x');
    aplicarRetencion(dest, 1);
    assert.ok(fs.existsSync(path.join(dest, 'foto.jpg')));
  });
});

describe('verificarCopia (CA-007-02)', () => {
  test('detecta una copia dañada', () => {
    const dir = tmp(); const { db } = baseConDatos(dir); const dest = path.join(dir, 'c');
    const ruta = crearCopia(db, dest, 'manual'); db.close(); danar(ruta);
    assert.equal(verificarCopia(ruta).ok, false);
  });
  test('detecta un archivo que no es una base y uno que no existe', () => {
    const dir = tmp(); const f = path.join(dir, 'basura.db'); fs.writeFileSync(f, 'esto no es sqlite, es texto de relleno'.repeat(50));
    assert.equal(verificarCopia(f).ok, false);
    assert.equal(verificarCopia(path.join(dir, 'no-existe.db')).ok, false);
  });
  test('detecta una copia de una versión futura del esquema', () => {
    const dir = tmp(); const f = path.join(dir, 'futuro.db'); const d = abrirBase(f);
    d.exec('pragma user_version = 99'); d.close();
    const r = verificarCopia(f); assert.equal(r.ok, false);
    assert.match(/** @type {any} */ (r).motivo, /más nueva/);
  });
});

describe('restaurar (CA-007-02, CA-007-04)', () => {
  test('reemplaza la base por la copia y deja antes la base actual como copia', () => {
    const dir = tmp(); const { ruta, db } = baseConDatos(dir, 'Original'); const dest = path.join(dir, 'c');
    const copia = crearCopia(db, dest, 'manual');
    db.prepare('insert into estudiante(nombre) values (?)').run('Agregado después'); db.close();
    const r = restaurar(ruta, copia, dest);
    assert.deepEqual(nombres(ruta), ['Original']);
    assert.match(path.basename(/** @type {string} */ (r.antes)), /antes-de-restaurar\.db$/);
    assert.deepEqual(nombres(/** @type {string} */ (r.antes)), ['Original', 'Agregado después']); // se puede deshacer
  });
  test('si la copia está dañada no toca la base actual', () => {
    const dir = tmp(); const { ruta, db } = baseConDatos(dir, 'Intacto'); const dest = path.join(dir, 'c');
    const copia = crearCopia(db, dest, 'manual'); db.close(); danar(copia);
    assert.throws(() => restaurar(ruta, copia, dest), /copia no es válida/i);
    assert.deepEqual(nombres(ruta), ['Intacto']);
    assert.equal(listarCopias(dest).filter((c) => c.motivo === 'antes-de-restaurar').length, 0);
  });
  test('elimina un diario antiguo para que no corrompa la base restaurada', () => {
    const dir = tmp(); const { ruta, db } = baseConDatos(dir); const dest = path.join(dir, 'c');
    const copia = crearCopia(db, dest, 'manual'); db.close();
    fs.writeFileSync(ruta + '-journal', 'diario viejo'); fs.writeFileSync(ruta + '-wal', 'x');
    restaurar(ruta, copia, dest);
    assert.equal(fs.existsSync(ruta + '-journal'), false);
    assert.equal(fs.existsSync(ruta + '-wal'), false);
  });
  test('funciona aunque la base actual no exista', () => {
    const dir = tmp(); const { ruta, db } = baseConDatos(dir); const dest = path.join(dir, 'c');
    const copia = crearCopia(db, dest, 'manual'); db.close(); fs.rmSync(ruta);
    const r = restaurar(ruta, copia, dest);
    assert.equal(r.antes, null);
    assert.deepEqual(nombres(ruta), ['Ñandú Muñoz']);
  });
});

describe('diagnosticar (CA-007-03)', () => {
  test('base sana: ok', () => {
    const dir = tmp(); const { ruta, db } = baseConDatos(dir); db.close();
    assert.equal(diagnosticar(ruta, path.join(dir, 'c')).estado, 'ok');
  });
  test('sin archivo: nueva', () => {
    const dir = tmp();
    assert.equal(diagnosticar(path.join(dir, 'datos.db'), path.join(dir, 'c')).estado, 'nueva');
  });
  test('base dañada: ofrece la última copia sana y se salta las dañadas', () => {
    const dir = tmp(); const { ruta, db } = baseConDatos(dir); const dest = path.join(dir, 'c');
    const sana = crearCopia(db, dest, 'abrir'); const rota = crearCopia(db, dest, 'cerrar'); db.close();
    danar(rota); danar(ruta);
    const d = /** @type {any} */ (diagnosticar(ruta, dest));
    assert.equal(d.estado, 'danada');
    assert.equal(d.copiaSana, sana);
  });
  test('base dañada y ninguna copia sana: lo dice, sin inventar', () => {
    const dir = tmp(); const { ruta, db } = baseConDatos(dir); db.close(); danar(ruta);
    const d = /** @type {any} */ (diagnosticar(ruta, path.join(dir, 'c')));
    assert.equal(d.estado, 'danada'); assert.equal(d.copiaSana, null);
  });
});

describe('copiarAVarios (CA-007-05)', () => {
  test('hace la copia en cada destino disponible y reporta los que fallan', () => {
    const dir = tmp(); const { db } = baseConDatos(dir);
    const ok1 = path.join(dir, 'usb'); const malo = path.join(dir, 'archivo-no-carpeta');
    fs.writeFileSync(malo, 'x'); // no se puede crear una carpeta dentro de un archivo
    const r = copiarAVarios(db, [ok1, path.join(malo, 'sub')], 'cerrar');
    assert.equal(r.hechas.length, 1);
    assert.equal(r.fallidas.length, 1);
    assert.equal(verificarCopia(r.hechas[0]).ok, true);
    db.close();
  });
});
