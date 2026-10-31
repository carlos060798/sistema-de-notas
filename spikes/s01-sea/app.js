const http = require('node:http');
const { DatabaseSync } = require('node:sqlite');
const db = new DatabaseSync(':memory:');
db.exec('create table n(id integer primary key, v real)');
db.prepare('insert into n(v) values (?)').run(4.5);
const srv = http.createServer((q, r) => {
  const v = db.prepare('select avg(v) a from n').get().a;
  r.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
  r.end(`<h1>Prueba: promedio ${v} (áéíóúñ)</h1>`);
});
srv.listen(0, '127.0.0.1', () => {
  const p = srv.address().port;
  console.log('SEA-OK puerto', p, 'sqlite', db.prepare('select sqlite_version() v').get().v);
  fetch(`http://127.0.0.1:${p}/`).then(x => x.text()).then(t => { console.log(t); srv.close(); });
});
