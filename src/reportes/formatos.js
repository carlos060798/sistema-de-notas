// @ts-check
// Dibuja los datos de datos.js en Excel, PDF y Word. Las cifras ya vienen calculadas: aquí no se calcula nada.
import fs from 'node:fs';
import path from 'node:path';
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import { Document, Packer, Paragraph, Table, TableRow, TableCell, TextRun, HeadingLevel, WidthType, AlignmentType } from 'docx';
import { texto } from './datos.js';

/** @typedef {ReturnType<typeof import('./datos.js').datosPlanilla>} Planilla */
/** @typedef {ReturnType<typeof import('./datos.js').datosBoletin>} Boletin */

const COLS_PERIODO = ['P1', 'P2', 'P3', 'P4'];
const estado = (/** @type {boolean | null} */ ap) => (ap === null ? '' : ap ? 'Aprobado' : 'No aprobado');
const titulo = (/** @type {{ institucion: string, sede: string }} */ d) => [d.institucion, d.sede].filter(Boolean).join(' — ');
/** @param {string} ruta */
const preparar = (ruta) => fs.mkdirSync(path.dirname(ruta), { recursive: true });

// --- Planilla ----------------------------------------------------------------------------------

/** @param {Planilla} d @param {string} ruta */
export async function planillaExcel(d, ruta) {
  const wb = new ExcelJS.Workbook(); const ws = wb.addWorksheet('Planilla');
  ws.addRow([titulo(d) || 'Planilla de notas']).font = { bold: true };
  ws.addRow([`${d.grado} — ${d.materia} — ${d.anio}`]);
  ws.addRow([]);
  ws.addRow(['Estudiante', ...COLS_PERIODO, 'Definitiva año', 'Resultado']).font = { bold: true };
  for (const f of d.filas) ws.addRow([f.nombre, ...f.periodos, f.anio, estado(f.aprobado)]);
  ws.getColumn(1).width = 34;
  for (let c = 2; c <= 6; c++) { ws.getColumn(c).width = 12; ws.getColumn(c).numFmt = '0.0'; }
  ws.getColumn(7).width = 14;
  preparar(ruta); await wb.xlsx.writeFile(ruta);
}

/** @param {string} ruta @param {(doc: PDFKit.PDFDocument) => void} dibujar */
function escribirPdf(ruta, dibujar) {
  preparar(ruta);
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'LETTER', margin: 50 });
    const salida = fs.createWriteStream(ruta);
    salida.on('finish', () => resolve(undefined)); salida.on('error', reject); doc.on('error', reject);
    doc.pipe(salida); dibujar(doc); doc.end();
  });
}

/** Tabla simple en PDF con saltos de página. @param {PDFKit.PDFDocument} doc @param {string[]} cab @param {string[][]} filas @param {number[]} anchos */
function tablaPdf(doc, cab, filas, anchos) {
  const fila = (/** @type {string[]} */ celdas, /** @type {boolean} */ negrita) => {
    if (doc.y > 700) doc.addPage();
    const y = doc.y; let x = doc.page.margins.left;
    doc.font(negrita ? 'Helvetica-Bold' : 'Helvetica').fontSize(10);
    celdas.forEach((c, i) => { doc.text(c, x, y, { width: anchos[i] - 4, lineBreak: false, ellipsis: true }); x += anchos[i]; });
    doc.y = y + 16; doc.x = doc.page.margins.left;
  };
  fila(cab, true); filas.forEach((f) => fila(f, false));
}

/** @param {Planilla} d @param {string} ruta */
export function planillaPdf(d, ruta) {
  return escribirPdf(ruta, (doc) => {
    doc.font('Helvetica-Bold').fontSize(14).text(titulo(d) || 'Planilla de notas');
    doc.font('Helvetica').fontSize(11).text(`${d.grado} — ${d.materia} — ${d.anio}`).moveDown();
    tablaPdf(doc, ['Estudiante', ...COLS_PERIODO, 'Año', 'Resultado'], d.filas.map((f) => [f.nombre, ...f.periodos.map(texto), texto(f.anio), estado(f.aprobado)]), [190, 40, 40, 40, 40, 50, 90]);
  });
}

// --- Boletín y certificado ----------------------------------------------------------------------

/** @param {Boletin} d */
const filasBoletin = (d) => d.materias.map((m) => [m.materia, ...m.periodos.map(texto), texto(m.anio), estado(m.aprobado), m.nivelacion === null ? '' : texto(m.nivelacion)]);
const CAB_BOLETIN = ['Materia', ...COLS_PERIODO, 'Año', 'Resultado', 'Nivelación'];

/** @param {Boletin} d @param {string} ruta */
export function boletinPdf(d, ruta) {
  return escribirPdf(ruta, (doc) => {
    doc.font('Helvetica-Bold').fontSize(14).text(titulo(d) || 'Boletín de notas');
    doc.font('Helvetica').fontSize(11).text(`Boletín ${d.anio}`).moveDown(0.5);
    doc.text(`Estudiante: ${d.estudiante}${d.documento ? ` — Documento: ${d.documento}` : ''}`).text(`Grado: ${d.grado}`).moveDown();
    tablaPdf(doc, CAB_BOLETIN, filasBoletin(d), [130, 32, 32, 32, 32, 40, 80, 60]);
    doc.moveDown().font('Helvetica-Bold').text(`Situación: ${d.situacion}`);
    doc.font('Helvetica').fontSize(9).text('Escala de 1,0 a 5,0. Se aprueba con 3,0 o más. La nivelación se muestra aparte y no reemplaza la nota original.');
  });
}

/** @param {Boletin} d @param {string} ruta */
export function certificadoPdf(d, ruta) {
  return escribirPdf(ruta, (doc) => {
    doc.font('Helvetica-Bold').fontSize(16).text(titulo(d) || 'Certificado de estudio', { align: 'center' }).moveDown();
    doc.fontSize(13).text('CERTIFICADO DE ESTUDIO', { align: 'center' }).moveDown();
    doc.font('Helvetica').fontSize(11).text(declaracion(d), { align: 'justify' }).moveDown();
    tablaPdf(doc, ['Materia', 'Definitiva año', 'Resultado'], d.materias.map((m) => [m.materia, texto(m.anio), estado(m.aprobado)]), [250, 100, 120]);
    doc.moveDown(3).text('_____________________________').text(d.docente || 'Docente');
  });
}

/** @param {Boletin} d */
const declaracion = (d) => `Se certifica que ${d.estudiante}${d.documento ? `, con documento ${d.documento},` : ''} cursó el grado ${d.grado} en el año ${d.anio}. Situación: ${d.situacion}.`;

/** @param {string[]} filas @param {boolean} [negrita] */
const filaDocx = (filas, negrita = false) => new TableRow({ children: filas.map((c) => new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: c, bold: negrita })] })] })) });
/** @param {string[]} cab @param {string[][]} filas */
const tablaDocx = (cab, filas) => new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [filaDocx(cab, true), ...filas.map((f) => filaDocx(f))] });

/** @param {Document} doc @param {string} ruta */
async function guardarDocx(doc, ruta) { preparar(ruta); fs.writeFileSync(ruta, await Packer.toBuffer(doc)); }

/** @param {Boletin} d @param {string} ruta */
export function boletinDocx(d, ruta) {
  return guardarDocx(new Document({ sections: [{ children: [
    new Paragraph({ text: titulo(d) || 'Boletín de notas', heading: HeadingLevel.HEADING_1 }),
    new Paragraph(`Boletín ${d.anio}`),
    new Paragraph(`Estudiante: ${d.estudiante}${d.documento ? ` — Documento: ${d.documento}` : ''}`),
    new Paragraph(`Grado: ${d.grado}`),
    tablaDocx(CAB_BOLETIN, filasBoletin(d)),
    new Paragraph({ children: [new TextRun({ text: `Situación: ${d.situacion}`, bold: true })] }),
    new Paragraph('Escala de 1,0 a 5,0. Se aprueba con 3,0 o más. La nivelación se muestra aparte y no reemplaza la nota original.'),
  ] }] }), ruta);
}

/** @param {Boletin} d @param {string} ruta */
export function certificadoDocx(d, ruta) {
  return guardarDocx(new Document({ sections: [{ children: [
    new Paragraph({ text: titulo(d) || 'Certificado de estudio', heading: HeadingLevel.HEADING_1, alignment: AlignmentType.CENTER }),
    new Paragraph({ text: 'CERTIFICADO DE ESTUDIO', alignment: AlignmentType.CENTER }),
    new Paragraph({ text: declaracion(d), alignment: AlignmentType.JUSTIFIED }),
    tablaDocx(['Materia', 'Definitiva año', 'Resultado'], d.materias.map((m) => [m.materia, texto(m.anio), estado(m.aprobado)])),
    new Paragraph(''), new Paragraph('_____________________________'), new Paragraph(d.docente || 'Docente'),
  ] }] }), ruta);
}

// --- Planes y guías (texto) ----------------------------------------------------------------------

/** @typedef {ReturnType<typeof import('./datos.js').datosTexto>} Texto */

/** @param {Texto} d @param {string} ruta */
export function textoPdf(d, ruta) {
  return escribirPdf(ruta, (doc) => {
    if (titulo(d)) doc.font('Helvetica').fontSize(10).text(titulo(d));
    doc.font('Helvetica-Bold').fontSize(15).text(d.titulo).moveDown(0.2);
    doc.font('Helvetica').fontSize(10).text(d.subtitulo).moveDown();
    doc.fontSize(11).text(d.contenido || '(sin contenido)', { align: 'left' });
  });
}
/** @param {Texto} d @param {string} ruta */
export function textoDocx(d, ruta) {
  return guardarDocx(new Document({ sections: [{ children: [
    ...(titulo(d) ? [new Paragraph(titulo(d))] : []),
    new Paragraph({ text: d.titulo, heading: HeadingLevel.HEADING_1 }),
    new Paragraph(d.subtitulo),
    ...(d.contenido || '(sin contenido)').split(/\r?\n/).map((l) => new Paragraph(l)),
  ] }] }), ruta);
}
