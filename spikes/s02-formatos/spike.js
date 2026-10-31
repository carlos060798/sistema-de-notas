const fs = require('node:fs'), path = require('node:path');
const { DatabaseSync } = require('node:sqlite');
const ExcelJS = require('exceljs'), PDFDocument = require('pdfkit'), docx = require('docx');
const out = path.join(__dirname, 'salida'); fs.rmSync(out, { recursive: true, force: true }); fs.mkdirSync(out);
const res = {};
const crear = (f) => { const d = new DatabaseSync(f);
  d.exec(`create table estudiante(id integer primary key, nombre text not null, grado integer not null);
          create table nota(id integer primary key, estudiante_id integer, materia text, periodo integer, n1 real, n2 real, n3 real);
          create table adjunto(id integer primary key, nombre text, datos blob);`); return d; };
const todo = (d) => ({ estudiante: d.prepare('select * from estudiante order by id').all(), nota: d.prepare('select * from nota order by id').all(), adjunto: d.prepare('select id,nombre,datos from adjunto order by id').all() });

(async () => {
  // Datos de prueba con tildes y eñes
  const a = crear(path.join(out, 'a.db'));
  a.prepare('insert into estudiante(nombre,grado) values (?,?)').run('Ñandú Muñoz Peña', 0);
  a.prepare('insert into estudiante(nombre,grado) values (?,?)').run('José Ángel Gómez', 5);
  a.prepare('insert into nota(estudiante_id,materia,periodo,n1,n2,n3) values (?,?,?,?,?,?)').run(1, 'Matemáticas', 1, 4.0, 3.5, 4.5);
  a.prepare('insert into nota(estudiante_id,materia,periodo,n1,n2,n3) values (?,?,?,?,?,?)').run(2, 'Lenguaje', 1, 2.0, 2.5, 3.1);
  a.prepare('insert into adjunto(nombre,datos) values (?,?)').run('guía.png', Buffer.from([137,80,78,71,0,1,2,255]));

  // S0.2 Excel ida y vuelta
  const t0 = Date.now(); const wb = new ExcelJS.Workbook(); const A = todo(a);
  const meta = wb.addWorksheet('_version'); meta.addRow(['esquema', 1]);
  for (const [t, filas] of Object.entries(A)) { const ws = wb.addWorksheet(t); if (!filas.length) continue;
    ws.addRow(Object.keys(filas[0])); for (const f of filas) ws.addRow(Object.values(f).map(v => Buffer.isBuffer(v) || v instanceof Uint8Array ? Buffer.from(v).toString('base64') : v)); }
  await wb.xlsx.writeFile(path.join(out, 'respaldo.xlsx'));
  const rd = new ExcelJS.Workbook(); await rd.xlsx.readFile(path.join(out, 'respaldo.xlsx'));
  const b = crear(path.join(out, 'b.db'));
  for (const ws of rd.worksheets.filter(w => w.name !== '_version')) { const hdr = ws.getRow(1).values.slice(1);
    ws.eachRow((row, i) => { if (i === 1) return; const vals = row.values.slice(1).map((v, k) => ws.name === 'adjunto' && hdr[k] === 'datos' ? Buffer.from(v, 'base64') : v);
      b.prepare(`insert into ${ws.name}(${hdr.join(',')}) values (${hdr.map(() => '?').join(',')})`).run(...vals); }); }
  const B = todo(b); const norm = (x) => JSON.stringify(x, (k, v) => v instanceof Uint8Array ? Buffer.from(v).toString('hex') : v);
  res.S02_excel_ida_y_vuelta_identico = norm(A) === norm(B); res.S02_ms = Date.now() - t0;

  // S0.3 PDF y DOCX con tildes y eñes
  await new Promise((ok) => { const p = new PDFDocument(); const s = fs.createWriteStream(path.join(out, 'boletin.pdf')); p.pipe(s);
    p.fontSize(16).text('Boletín de notas — Ñandú Muñoz Peña'); p.fontSize(12).text('Matemáticas: 4,0 · Aprobó. Año lectivo 2026. ¿Plan de nivelación? Sí, áéíóú ÁÉÍÓÚ ñ Ñ ü'); p.end(); s.on('finish', ok); });
  const d = new docx.Document({ sections: [{ children: [new docx.Paragraph({ children: [new docx.TextRun('Plan de aula — Matemáticas, grado tercero. Cuál es la niña, áéíóú ñ Ñ')] })] }] });
  fs.writeFileSync(path.join(out, 'plan.docx'), await docx.Packer.toBuffer(d));
  const pdf = fs.readFileSync(path.join(out, 'boletin.pdf')); res.S03_pdf_bytes = pdf.length; res.S03_pdf_valido = pdf.subarray(0, 5).toString() === '%PDF-';
  const zip = fs.readFileSync(path.join(out, 'plan.docx')); res.S03_docx_bytes = zip.length; res.S03_docx_es_zip = zip.subarray(0, 2).toString() === 'PK';

  // S0.4 Respaldo coherente con adjuntos y detección de daño
  a.exec(`VACUUM INTO '${path.join(out, 'copia.db').split(path.sep).join('/')}'`);
  const c = new DatabaseSync(path.join(out, 'copia.db')); res.S04_integridad_copia = c.prepare('pragma integrity_check').get().integrity_check;
  res.S04_adjunto_en_copia = c.prepare('select length(datos) n from adjunto').get().n; c.close();
  const buf = fs.readFileSync(path.join(out, 'copia.db')); for (let i = 100; i < 300; i++) buf[i] = 0xAB; fs.writeFileSync(path.join(out, 'danada.db'), buf);
  try { const x = new DatabaseSync(path.join(out, 'danada.db')); const r = x.prepare('pragma integrity_check').get().integrity_check; res.S04_dano_detectado = r !== 'ok' ? 'si: ' + r.slice(0, 40) : 'NO'; x.close(); } catch (e) { res.S04_dano_detectado = 'si (error al abrir): ' + String(e.message).slice(0, 50); }
  console.log(JSON.stringify(res, null, 1));
})();
