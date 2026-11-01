// Interfaz del sistema de notas. JavaScript simple, sin bibliotecas ni conexión a internet.
// Todo texto escrito por el docente se inserta con textContent (nunca con innerHTML).
'use strict';

const TOKEN = document.querySelector('meta[name="token"]').content;
const NOMBRE_GRADO = ['Transición (0)', 'Primero', 'Segundo', 'Tercero', 'Cuarto', 'Quinto'];
const nf1 = new Intl.NumberFormat('es-CO', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const nf2 = new Intl.NumberFormat('es-CO', { minimumFractionDigits: 1, maximumFractionDigits: 2 });
const fmt1 = (v) => (v === null || v === undefined ? '—' : nf1.format(v));
const fmt2 = (v) => (v === null || v === undefined ? '' : nf2.format(v));

let estado = { modo: 'ok', anios: [], materias: [], grados: [0, 1, 2, 3, 4, 5] };
const sel = { anio: null, grado: 0, materia: null, periodo: 1 };
let vista = 'inicio';
// El año, grado, materia y periodo elegidos se recuerdan entre pantallas y al volver a abrir el programa.
try { Object.assign(sel, JSON.parse(localStorage.getItem('notas.sel') ?? '{}')); } catch { /* sin almacenamiento: se usan los valores iniciales */ }
const guardarSel = () => { try { localStorage.setItem('notas.sel', JSON.stringify(sel)); } catch { /* no es grave */ } };


// --- Utilidades ---------------------------------------------------------------------------------

function h(etiqueta, atributos = {}, ...hijos) {
  const el = document.createElement(etiqueta);
  for (const [k, v] of Object.entries(atributos)) {
    if (k === 'class') el.className = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (v === true) el.setAttribute(k, '');
    else if (v !== false && v !== null && v !== undefined) el.setAttribute(k, String(v));
  }
  for (const hijo of hijos.flat()) if (hijo !== null && hijo !== undefined && hijo !== false) el.append(hijo);
  return el;
}

let temporizadorAviso;
function aviso(texto, esError = false) {
  const a = document.getElementById('aviso');
  a.textContent = texto; a.className = esError ? 'error' : ''; a.hidden = false;
  clearTimeout(temporizadorAviso);
  if (!esError) temporizadorAviso = setTimeout(() => { a.hidden = true; }, 3500);
}

async function api(metodo, ruta, cuerpo, crudo) {
  const opciones = { method: metodo, headers: { 'x-token': TOKEN } };
  if (crudo) opciones.body = crudo;
  else if (cuerpo !== undefined) { opciones.headers['content-type'] = 'application/json'; opciones.body = JSON.stringify(cuerpo); }
  let r;
  try { r = await fetch(ruta, opciones); }
  catch { throw new Error('No se pudo hablar con el programa. Si lo cerró, ábralo de nuevo.'); }
  if (!r.ok) {
    let datos = {}; try { datos = await r.json(); } catch { /* sin cuerpo */ }
    const e = new Error(datos.error || `Error ${r.status}`); e.status = r.status; e.datos = datos; throw e;
  }
  return r;
}
const json = async (metodo, ruta, cuerpo) => (await api(metodo, ruta, cuerpo)).json();

/** Ejecuta una acción y muestra el error en español si falla. */
async function intentar(fn) {
  try { return await fn(); } catch (e) { aviso(e.message, true); return undefined; }
}

/** «4,5» o «4.5» → 4.5; vacío → null; texto raro → NaN. */
function leerNota(texto) {
  const t = String(texto).trim().replace(',', '.');
  return t === '' ? null : Number(t);
}

function selector(etiqueta, opciones, valor, alCambiar) {
  const s = h('select', { onchange: (e) => alCambiar(e.target.value) },
    opciones.map(([v, t]) => h('option', { value: v, selected: String(v) === String(valor) }, t)));
  return h('label', {}, etiqueta, s);
}
const opcionesAnio = () => estado.anios.map((a) => [a.id, `${a.anio}${a.cerrado ? ' (cerrado)' : ''}`]);
const opcionesGrado = () => estado.grados.map((g) => [g, NOMBRE_GRADO[g]]);
const opcionesMateria = () => estado.materias.map((m) => [m.id, m.nombre]);

async function cargarEstado() {
  estado = await json('GET', '/api/estado');
  if (!estado.anios.find((a) => a.id === sel.anio)) sel.anio = estado.anios[0]?.id ?? null;
  if (!estado.materias.find((m) => m.id === sel.materia)) sel.materia = estado.materias[0]?.id ?? null;
}

// --- Navegación ---------------------------------------------------------------------------------

const VISTAS = [
  ['inicio', 'Hoy'], ['notas', 'Notas'], ['estudiantes', 'Estudiantes'], ['nivelacion', 'Nivelación'], ['planeacion', 'Planeación'],
  ['copias', 'Respaldo'], ['config', 'Año y materias'],
];

function pintarMenu() {
  const menu = document.getElementById('menu');
  menu.replaceChildren(...VISTAS.map(([id, texto]) => h('button', {
    'aria-current': id === vista ? 'page' : false,
    onclick: () => { vista = id; location.hash = id; mostrar(); },
  }, texto)));
}

async function mostrar() {
  guardarSel(); pintarMenu();
  const cont = document.getElementById('contenido');
  await intentar(async () => {
    await cargarEstado();
    if (estado.modo === 'recuperacion') return pantallaRecuperacion(cont);
    const sinBase = estado.anios.length === 0 || estado.materias.length === 0;
    if (sinBase && vista !== 'config' && vista !== 'copias') {
      cont.replaceChildren(h('section', { class: 'tarjeta' },
        h('h2', {}, 'Empecemos'),
        h('p', {}, 'Primero cree el año lectivo y las materias. Después agregue a los estudiantes.'),
        h('button', { class: 'principal', onclick: () => { vista = 'config'; mostrar(); } }, 'Ir a «Año y materias»')));
      return;
    }
    await ({ inicio: pantallaInicio, notas: pantallaNotas, estudiantes: pantallaEstudiantes, nivelacion: pantallaNivelacion, planeacion: pantallaPlaneacion, copias: pantallaCopias, config: pantallaConfig })[vista](cont);
  });
}

// --- Notas --------------------------------------------------------------------------------------

async function pantallaNotas(cont) {
  const filtros = h('section', { class: 'contexto' },
    h('h2', {}, 'Notas'),
    selector('Año', opcionesAnio(), sel.anio, (v) => { sel.anio = Number(v); mostrar(); }),
    selector('Grado', opcionesGrado(), sel.grado, (v) => { sel.grado = Number(v); mostrar(); }),
    selector('Materia', opcionesMateria(), sel.materia, (v) => { sel.materia = Number(v); mostrar(); }),
    selector('Periodo', [1, 2, 3, 4].map((p) => [p, `Periodo ${p}`]), sel.periodo, (v) => { sel.periodo = Number(v); mostrar(); }));
  const filas = await json('GET', `/api/notas?anio_id=${sel.anio}&grado=${sel.grado}&materia_id=${sel.materia}&periodo=${sel.periodo}`);
  const cuerpo = h('tbody');
  const resumen = h('p', { class: 'suave' });
  const actualizarResumen = () => {
    const ap = filas.filter((f) => f.aprobado === true).length; const rep = filas.filter((f) => f.aprobado === false).length;
    const faltan = filas.reduce((n, f) => n + [f.n1, f.n2, f.n3].filter((v) => v === null).length, 0);
    const vals = filas.map((f) => f.definitiva.valor).filter((v) => v !== null);
    const prom = vals.length ? fmt1(Math.round((vals.reduce((x, y) => x + y, 0) / vals.length) * 10) / 10) : '—';
    resumen.textContent = `${filas.length === 1 ? '1 estudiante' : filas.length + ' estudiantes'} · aprueban: ${ap} · no aprueban: ${rep} · sin definitiva: ${filas.length - ap - rep} · notas por escribir: ${faltan} · promedio del grupo: ${prom}`;
  };
  for (const f of filas) cuerpo.append(filaNotas(f, actualizarResumen));
  actualizarResumen();
  const tabla = filas.length
    ? h('table', {}, h('thead', {}, h('tr', {}, ['Estudiante', 'Nota 1', 'Nota 2', 'Nota 3', 'Periodo', 'Estado', 'Año'].map((t) => h('th', {}, t)))), cuerpo)
    : h('p', { class: 'vacio' }, 'No hay estudiantes en este grado. Agréguelos en «Estudiantes».');
  const planilla = `/api/reportes/planilla?anio_id=${sel.anio}&grado=${sel.grado}&materia_id=${sel.materia}`;
  cont.replaceChildren(filtros, h('section', { class: 'tarjeta' }, tabla, resumen,
    h('div', { class: 'fila-acciones' }, h('span', {}, 'Planilla de esta materia:'),
      h('button', { class: 'secundario', onclick: () => descargarDocumento(planilla + '&formato=xlsx') }, 'Excel'),
      h('button', { class: 'secundario', onclick: () => descargarDocumento(planilla + '&formato=pdf') }, 'PDF')),
    h('p', { class: 'suave' }, 'Escriba la nota y presione Tab o Enter. Se guarda sola. Puede usar coma o punto (4,5). La escala es de 1,0 a 5,0 y se aprueba con 3,0.')));
}

function filaNotas(f, alCambiarResumen) {
  const entradas = ['n1', 'n2', 'n3'].map((k) => h('input', { class: 'nota', type: 'text', inputmode: 'decimal', value: fmt2(f[k]), 'aria-label': `${k.replace('n', 'Nota ')} de ${f.nombre}` }));
  const marcarVacias = () => entradas.forEach((e) => e.classList.toggle('vacia', e.value.trim() === ''));
  const celdaDef = h('td'); const celdaEstado = h('td'); const celdaAnio = h('td', { class: 'sin-partir' });
  const tr = h('tr', {}, h('td', {}, f.nombre), entradas.map((e) => h('td', {}, e)), celdaDef, celdaEstado, celdaAnio);
  const pintar = () => {
    celdaDef.textContent = f.definitiva.estado === 'completa' ? fmt1(f.definitiva.valor) : 'Falta nota';
    celdaEstado.replaceChildren(f.aprobado === null ? h('span', { class: 'vacio' }, '—')
      : h('span', { class: `etiqueta ${f.aprobado ? 'bien' : 'mal'}` }, f.aprobado ? 'Aprobado' : 'No aprobado'));
    celdaAnio.textContent = f.anio.estado === 'completa' ? `${fmt1(f.anio.valor)} ${f.anio.aprobado ? '' : '(no aprobado)'}` : '—';
    tr.className = f.aprobado === false ? 'reprobado' : ''; marcarVacias();
  };
  pintar();
  // Los guardados de una fila van en cola: así el último valor escrito es siempre el que queda en la base.
  let cola = Promise.resolve();
  const guardar = () => { cola = cola.then(guardarAhora); return cola; };
  const guardarAhora = async () => {
    const textos = entradas.map((e) => e.value);
    const valores = textos.map((t) => leerNota(t));
    if (valores.some((v) => Number.isNaN(v))) { aviso('Escriba solo números, por ejemplo 4,5', true); return; }
    await intentar(async () => {
      const r = await json('PUT', '/api/notas', { matricula_id: f.matricula_id, materia_id: sel.materia, periodo: sel.periodo, n1: valores[0], n2: valores[1], n3: valores[2] });
      f.n1 = valores[0]; f.n2 = valores[1]; f.n3 = valores[2]; f.definitiva = r.definitiva; f.aprobado = r.aprobado;
      entradas.forEach((e, i) => { if (e.value === textos[i]) e.value = fmt2(valores[i]); }); // no pisar lo escrito mientras se guardaba
      const datos = await json('GET', `/api/notas?anio_id=${sel.anio}&grado=${sel.grado}&materia_id=${sel.materia}&periodo=${sel.periodo}`);
      f.anio = datos.find((d) => d.matricula_id === f.matricula_id).anio;
      pintar(); alCambiarResumen(); aviso('Guardado');
    });
  };
  entradas.forEach((e) => {
    e.addEventListener('change', guardar);
    e.addEventListener('input', marcarVacias);
    e.addEventListener('keydown', (ev) => {
      if (ev.key === 'Enter') { ev.preventDefault(); e.blur(); return; }
      if (ev.key !== 'ArrowDown' && ev.key !== 'ArrowUp') return;
      const otra = ev.key === 'ArrowDown' ? tr.nextElementSibling : tr.previousElementSibling; // misma columna, fila vecina
      const destino = otra?.querySelectorAll('input.nota')[entradas.indexOf(e)];
      if (destino) { ev.preventDefault(); destino.focus(); destino.select(); }
    });
  });
  return tr;
}

// --- Estudiantes --------------------------------------------------------------------------------

async function pantallaEstudiantes(cont) {
  const nombre = h('input', { type: 'text', required: true, maxlength: 120, autocomplete: 'off' });
  const documento = h('input', { type: 'text', maxlength: 40, autocomplete: 'off' });
  const grado = h('select', {}, opcionesGrado().map(([v, t]) => h('option', { value: v, selected: v === sel.grado }, t)));
  const form = h('form', {
    onsubmit: async (e) => {
      e.preventDefault();
      await intentar(async () => {
        await json('POST', '/api/estudiantes', { nombre: nombre.value, documento: documento.value, grado: Number(grado.value), anio_id: sel.anio });
        sel.grado = Number(grado.value); aviso('Estudiante agregado'); mostrar();
      });
    },
  }, h('label', {}, 'Nombre completo', nombre), h('label', {}, 'Documento (opcional)', documento), h('label', {}, 'Grado', grado),
    h('div', {}, h('button', { class: 'principal', type: 'submit' }, 'Agregar estudiante')));

  const filtros = h('section', { class: 'tarjeta' }, h('h2', {}, 'Estudiantes'),
    selector('Año', opcionesAnio(), sel.anio, (v) => { sel.anio = Number(v); mostrar(); }), form);
  const lista = await json('GET', `/api/estudiantes?anio_id=${sel.anio}&archivados=1`);
  const filas = h('tbody');
  for (const g of estado.grados) {
    const delGrado = lista.filter((x) => x.grado === g);
    if (!delGrado.length) continue;
    filas.append(h('tr', {}, h('th', { colspan: 4 }, `${NOMBRE_GRADO[g]} — ${delGrado.filter((x) => x.activo).length === 1 ? '1 estudiante' : delGrado.filter((x) => x.activo).length + ' estudiantes'}`)));
    for (const x of delGrado) filas.append(filaEstudiante(x));
  }
  cont.replaceChildren(filtros, h('section', { class: 'tarjeta' },
    lista.length ? h('table', {}, h('thead', {}, h('tr', {}, ['Nombre', 'Documento', 'Estado', ''].map((t) => h('th', {}, t)))), filas)
      : h('p', { class: 'vacio' }, 'Todavía no hay estudiantes en este año.')));
}

function filaEstudiante(x) {
  const tr = h('tr', {});
  const pintar = (editando) => {
    if (editando) {
      const n = h('input', { type: 'text', value: x.nombre, maxlength: 120 }); const d = h('input', { type: 'text', value: x.documento ?? '', maxlength: 40 });
      tr.replaceChildren(h('td', {}, n), h('td', {}, d), h('td'), h('td', {},
        h('button', { class: 'principal', onclick: () => intentar(async () => { await json('PUT', `/api/estudiantes/${x.estudiante_id}`, { nombre: n.value, documento: d.value }); mostrar(); }) }, 'Guardar'),
        ' ', h('button', { class: 'secundario', onclick: () => pintar(false) }, 'Cancelar')));
    } else {
      tr.replaceChildren(h('td', {}, x.nombre), h('td', {}, x.documento ?? '—'),
        h('td', {}, x.activo ? h('span', { class: 'etiqueta bien' }, 'Activo') : h('span', { class: 'etiqueta' }, 'Archivado')),
        h('td', {}, h('button', { class: 'secundario', onclick: () => pintar(true) }, 'Editar'), ' ',
          h('details', { class: 'menu-doc' }, h('summary', {}, 'Documentos'), h('div', { class: 'menu-lista' },
            ...[['Boletín PDF', 'boletin', 'pdf'], ['Boletín Word', 'boletin', 'docx'], ['Certificado PDF', 'certificado', 'pdf'], ['Certificado Word', 'certificado', 'docx']].map(([t, tipo, f]) =>
              h('button', { onclick: (ev) => { ev.target.closest('details').open = false; descargarDocumento(`/api/reportes/${tipo}?anio_id=${sel.anio}&matricula_id=${x.matricula_id}&formato=${f}`); } }, t)))), ' ',
          h('button', { class: 'secundario', onclick: () => { if (x.activo && !confirm(`¿Archivar a ${x.nombre}? Sus notas se conservan y puede reactivarlo cuando quiera.`)) return; intentar(async () => {
            await json('POST', `/api/estudiantes/${x.estudiante_id}/archivar`, { archivar: !!x.activo });
            aviso(x.activo ? 'Archivado: sus notas se conservan' : 'Restaurado'); mostrar();
          }); } }, x.activo ? 'Archivar' : 'Reactivar')));
    }
  };
  pintar(false);
  return tr;
}

// --- Nivelación ---------------------------------------------------------------------------------

async function pantallaNivelacion(cont) {
  const cab = h('section', { class: 'tarjeta' }, h('h2', {}, 'Plan de nivelación'),
    h('p', { class: 'suave' }, 'Aquí aparecen los estudiantes cuya definitiva del año, en una materia, es menor de 3,0. La nota de nivelación se guarda aparte: no reemplaza la original.'),
    selector('Año', opcionesAnio(), sel.anio, (v) => { sel.anio = Number(v); mostrar(); }));
  const pend = await json('GET', `/api/nivelaciones/pendientes?anio_id=${sel.anio}`);
  const tarjetas = pend.map((p) => {
    const act = h('textarea', { maxlength: 2000, 'aria-label': 'Actividades de nivelación' }); act.value = p.nivelacion?.actividades ?? '';
    const fecha = h('input', { type: 'date', value: p.nivelacion?.fecha ?? '' });
    const nota = h('input', { class: 'nota', type: 'text', inputmode: 'decimal', value: fmt2(p.nivelacion?.nota ?? null) });
    return h('section', { class: 'tarjeta' },
      h('h3', {}, `${p.nombre} — ${NOMBRE_GRADO[p.grado]} — ${p.materia}`),
      h('p', {}, 'Definitiva del año: ', h('strong', {}, fmt1(p.anio_valor)), ' ', h('span', { class: 'etiqueta mal' }, 'No aprobado')),
      h('label', { class: 'ancha' }, 'Actividades de nivelación', act),
      h('label', {}, 'Fecha', fecha), h('label', {}, 'Nota de nivelación', nota),
      h('div', {}, h('button', { class: 'principal', onclick: () => {
        const valor = leerNota(nota.value);
        if (Number.isNaN(valor)) return aviso('Escriba solo números, por ejemplo 3,4', true);
        intentar(async () => {
          await json('PUT', '/api/nivelaciones', { matricula_id: p.matricula_id, materia_id: p.materia_id, actividades: act.value, fecha: fecha.value || null, nota: valor });
          aviso(valor === null ? 'Plan guardado; falta la nota' : 'Nivelación registrada'); mostrar();
        });
      } }, 'Guardar')));
  });
  cont.replaceChildren(cab, ...(tarjetas.length ? tarjetas : [h('section', { class: 'tarjeta' }, h('p', { class: 'vacio' }, 'No hay nivelaciones pendientes en este año.'))]));
}

// --- Copias y Excel -----------------------------------------------------------------------------

/** Descarga un documento del programa (planilla, boletín, certificado). */
async function descargarDocumento(ruta) {
  await intentar(async () => {
    const r = await api('GET', ruta);
    const nombre = decodeURIComponent(/filename\*=UTF-8''(.+)$/.exec(r.headers.get('content-disposition') ?? '')?.[1] ?? 'documento');
    const url = URL.createObjectURL(await r.blob());
    const enlace = h('a', { href: url, download: nombre }); document.body.append(enlace); enlace.click(); enlace.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    aviso('Descargado: ' + nombre);
  });
}

async function descargarExcel() {
  await intentar(async () => {
    const r = await api('GET', '/api/excel');
    const nombre = /filename="([^"]+)"/.exec(r.headers.get('content-disposition') ?? '')?.[1] ?? 'respaldo-notas.xlsx';
    const url = URL.createObjectURL(await r.blob());
    const a = h('a', { href: url, download: nombre }); document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    aviso(`Descargado: ${nombre}. Guárdelo también en una memoria USB.`);
  });
}

async function pantallaCopias(cont) {
  const copias = await json('GET', '/api/respaldo');
  const lista = h('ul', { class: 'sin-vinetas' }, copias.slice(0, 15).map((c) => h('li', {},
    h('span', {}, etiquetaCopia(c)),
    h('button', { class: 'peligro', onclick: () => {
      if (!confirm('¿Restaurar esta copia? Los datos actuales se guardarán antes como copia, por si desea deshacer.')) return;
      intentar(async () => { await json('POST', '/api/respaldo/restaurar', { nombre: c.nombre }); aviso('Copia restaurada'); mostrar(); });
    } }, 'Restaurar')))
  );
  const resultado = h('div');
  const archivo = h('input', { type: 'file', accept: '.xlsx', 'aria-label': 'Archivo de Excel a importar' });
  const analizar = async () => {
    const f = archivo.files[0]; if (!f) return aviso('Elija primero un archivo de Excel (.xlsx)', true);
    await intentar(async () => {
      const datos = await (await api('POST', '/api/excel/analizar', undefined, await f.arrayBuffer())).json();
      resultado.replaceChildren(...informeImportacion(datos, f));
    });
  };
  cont.replaceChildren(
    h('section', { class: 'tarjeta' }, h('h2', {}, 'Excel: su seguro de vida'),
      h('p', { class: 'suave' }, 'Descargue todo en un Excel y guárdelo en una memoria USB. Si el programa se daña, con ese archivo recupera todo.'),
      h('div', { class: 'fila-acciones' }, h('button', { class: 'principal', onclick: descargarExcel }, 'Descargar todo en Excel')),
      h('h3', {}, 'Recuperar desde un Excel'),
      h('div', { class: 'fila-acciones' }, archivo, h('button', { class: 'secundario', onclick: analizar }, 'Revisar archivo')),
      resultado),
    h('section', { class: 'tarjeta' }, h('h2', {}, 'Copias de seguridad'),
      h('p', { class: 'suave' }, 'El programa hace una copia sola al abrirse y al cerrarse. Aquí puede hacer una copia ahora.'),
      h('div', { class: 'fila-acciones' }, h('button', { class: 'principal', onclick: () => intentar(async () => { await json('POST', '/api/respaldo'); aviso('Copia creada'); mostrar(); }) }, 'Crear copia ahora')),
      copias.length ? lista : h('p', { class: 'vacio' }, 'Aún no hay copias.')));
}

function etiquetaCopia(c) {
  const m = /^notas-(\d{4})(\d{2})(\d{2})-(\d{2})(\d{2})(\d{2})\d{3}-(.+)\.db$/.exec(c.nombre);
  const motivo = { abrir: 'al abrir', cerrar: 'al cerrar', manual: 'hecha por usted', 'antes-de-restaurar': 'antes de restaurar', 'antes-de-importar': 'antes de importar' }[c.motivo] ?? c.motivo;
  return m ? `${m[3]}/${m[2]}/${m[1]} ${m[4]}:${m[5]} — ${motivo}` : c.nombre;
}

function informeImportacion(datos, archivo) {
  const salida = [];
  if (datos.errores.length) {
    salida.push(h('p', { class: 'etiqueta mal' }, `El archivo tiene ${datos.errores.length} problema(s). No se cambió nada.`),
      h('table', {}, h('thead', {}, h('tr', {}, ['Hoja', 'Fila', 'Columna', 'Problema'].map((t) => h('th', {}, t)))),
        h('tbody', {}, datos.errores.slice(0, 50).map((e) => h('tr', {}, h('td', {}, e.hoja), h('td', {}, e.fila || '—'), h('td', {}, e.columna ?? '—'), h('td', {}, e.mensaje))))));
    return salida;
  }
  const nombres = { anio_lectivo: 'Años', grado: 'Grados', materia: 'Materias', estudiante: 'Estudiantes', matricula: 'Matrículas', nota: 'Notas', nivelacion: 'Nivelaciones', config: 'Configuración', plan: 'Planes', guia: 'Guías', tema: 'Temas', clase: 'Clases' };
  salida.push(h('p', { class: 'etiqueta bien' }, 'El archivo es válido. Esto es lo que pasaría:'),
    h('table', {}, h('thead', {}, h('tr', {}, ['Tabla', 'Nuevos', 'Cambiados', 'Iguales'].map((t) => h('th', {}, t)))),
      h('tbody', {}, Object.entries(datos.resumen).map(([t, r]) => h('tr', {}, h('td', {}, nombres[t] ?? t), h('td', {}, r.nuevos), h('td', {}, r.cambiados), h('td', {}, r.iguales))))),
    h('p', { class: 'suave' }, 'Se agregan y actualizan los datos del archivo. No se borra nada que solo esté en el programa. Antes de aplicar se guarda una copia.'),
    h('div', { class: 'fila-acciones' }, h('button', { class: 'principal', onclick: () => intentar(async () => {
      await api('POST', '/api/excel/importar?confirmar=1', undefined, await archivo.arrayBuffer());
      aviso('Datos recuperados desde el Excel'); mostrar();
    }) }, 'Aplicar')));
  return salida;
}

// --- Año y materias -----------------------------------------------------------------------------

async function pantallaConfig(cont) {
  const inst = await json('GET', '/api/institucion');
  const campoInst = (clave, etiqueta) => { const i = h('input', { type: 'text', maxlength: 120, value: inst[clave] ?? '' }); return [h('label', {}, etiqueta, i), i]; };
  const [lNom, iNom] = campoInst('institucion', 'Nombre de la institución'); const [lSede, iSede] = campoInst('sede', 'Sede'); const [lDoc, iDoc] = campoInst('docente', 'Docente');
  const anio = h('input', { type: 'number', min: 2000, max: 2100, value: new Date().getFullYear(), class: 'corto' });
  const mat = h('input', { type: 'text', maxlength: 80, autocomplete: 'off' });
  cont.replaceChildren(
    h('section', { class: 'tarjeta' }, h('h2', {}, 'Datos de la institución'),
      h('p', { class: 'suave' }, 'Salen en el encabezado de planillas, boletines y certificados. Son opcionales.'),
      h('form', { class: 'fila', onsubmit: (e) => { e.preventDefault(); intentar(async () => { await json('PUT', '/api/institucion', { nombre: iNom.value, sede: iSede.value, docente: iDoc.value }); aviso('Datos guardados'); }); } },
        lNom, lSede, lDoc, h('button', { class: 'principal', type: 'submit' }, 'Guardar datos'))),
    h('section', { class: 'tarjeta' }, h('h2', {}, 'Año lectivo'),
      h('form', { onsubmit: (e) => { e.preventDefault(); intentar(async () => { await json('POST', '/api/anios', { anio: Number(anio.value) }); aviso('Año creado'); mostrar(); }); } },
        h('label', {}, 'Año', anio), h('button', { class: 'principal', type: 'submit' }, 'Crear año')),
      h('ul', { class: 'sin-vinetas' }, estado.anios.map((a) => h('li', {}, h('span', {}, `${a.anio}${a.cerrado ? ' — cerrado (solo consulta)' : ''}`),
        a.cerrado ? null : h('button', { class: 'peligro', onclick: () => {
          if (confirm(`¿Cerrar el año ${a.anio}?\n\nDespués no podrá escribir ni cambiar notas, temas, clases ni planes de ese año: solo consultarlos. Descargue antes su Excel de respaldo.`)) intentar(async () => { await json('POST', `/api/anios/${a.id}/cerrar`); mostrar(); });
        } }, 'Cerrar año'))))),
    h('section', { class: 'tarjeta' }, h('h2', {}, 'Materias'),
      h('form', { onsubmit: (e) => { e.preventDefault(); intentar(async () => { await json('POST', '/api/materias', { nombre: mat.value }); aviso('Materia creada'); mostrar(); }); } },
        h('label', {}, 'Nombre de la materia', mat), h('button', { class: 'principal', type: 'submit' }, 'Agregar materia')),
      estado.materias.length ? h('ul', { class: 'sin-vinetas' }, estado.materias.map((m) => h('li', {}, m.nombre))) : h('p', { class: 'vacio' }, 'Aún no hay materias.')));
}

// --- Recuperación -------------------------------------------------------------------------------

async function pantallaRecuperacion(cont) {
  const rec = await json('GET', '/api/recuperacion');
  const sanas = rec.copias.filter((c) => c.sana);
  document.getElementById('menu').replaceChildren();
  cont.replaceChildren(h('section', { class: 'tarjeta recuperacion' },
    h('h2', {}, 'La base de datos está dañada'),
    h('p', {}, 'No se pierda: el programa guarda copias. Puede restaurar la última copia sana.'),
    h('p', { class: 'suave' }, rec.motivo ?? ''),
    sanas.length
      ? h('ul', { class: 'sin-vinetas' }, sanas.slice(0, 10).map((c, i) => h('li', {}, h('span', {}, etiquetaCopia(c) + (i === 0 ? ' (la más reciente)' : '')),
        h('button', { class: 'principal', onclick: () => {
          if (confirm('¿Restaurar esta copia?')) intentar(async () => { await json('POST', '/api/recuperacion/restaurar', { nombre: c.nombre }); location.reload(); });
        } }, 'Restaurar'))))
      : h('p', {}, 'No hay copias sanas. Si tiene un Excel de respaldo, abra el programa en una carpeta nueva e impórtelo desde «Copias y Excel».')));
}

// --- Planeación: temas y avance, clases, planes y guías -------------------------------------------

const SECCIONES_PLAN = [['temas', 'Temas y avance'], ['clases', 'Clases'], ['planes', 'Planes de área y aula'], ['guias', 'Guías']];
const ESTADOS_TEMA = [['pendiente', 'Pendiente'], ['en_curso', 'En curso'], ['visto', 'Visto']];
let seccionPlan = 'temas';
const hoyISO = () => new Date().toISOString().slice(0, 10);

async function pantallaPlaneacion(cont) {
  const barra = h('section', { class: 'contexto' }, h('h2', {}, 'Planeación'),
    h('div', { class: 'fila' },
      selector('Año', opcionesAnio(), sel.anio, (v) => { sel.anio = Number(v); mostrar(); }),
      selector('Grado', opcionesGrado(), sel.grado, (v) => { sel.grado = Number(v); mostrar(); }),
      selector('Materia', opcionesMateria(), sel.materia, (v) => { sel.materia = Number(v); mostrar(); })),
    h('div', { class: 'pestanas' }, SECCIONES_PLAN.map(([id, t]) => h('button', { 'aria-current': id === seccionPlan ? 'true' : false, onclick: () => { seccionPlan = id; mostrar(); } }, t))));
  const filtro = `anio_id=${sel.anio}&materia_id=${sel.materia}&grado=${sel.grado}`;
  const cuerpo = await ({ temas: seccionTemas, clases: seccionClases, planes: seccionPlanes, guias: seccionGuias })[seccionPlan](filtro);
  cont.replaceChildren(barra, cuerpo);
}

const baseCuerpo = () => ({ anio_id: sel.anio, materia_id: sel.materia, grado: sel.grado });
const campoTexto = (etiqueta, max = 150) => { const i = h('input', { type: 'text', maxlength: max }); return [h('label', {}, etiqueta, i), i]; };
const campoLargo = (etiqueta) => { const t = h('textarea', { maxlength: 20000 }); return [h('label', { class: 'ancha' }, etiqueta, t), t]; };

async function seccionTemas(filtro) {
  const r = await json('GET', `/api/temas?${filtro}`);
  const [lNombre, nombre] = campoTexto('Nuevo tema');
  const periodo = h('select', {}, [1, 2, 3, 4].map((p) => h('option', { value: p, selected: p === sel.periodo }, `Periodo ${p}`)));
  return h('section', { class: 'tarjeta' },
    h('h3', {}, `Avance: ${r.avance.vistos} de ${r.avance.total} temas vistos (${r.avance.porcentaje} %)`),
    h('progress', { max: 100, value: r.avance.porcentaje, 'aria-label': 'Avance de temas' }),
    h('div', { class: 'fila' }, lNombre, h('label', {}, 'Periodo', periodo),
      h('button', { class: 'principal', onclick: () => intentar(async () => {
        await json('PUT', '/api/temas', { ...baseCuerpo(), periodo: Number(periodo.value), nombre: nombre.value }); mostrar();
      }) }, 'Agregar tema')),
    r.temas.length ? h('table', {}, h('thead', {}, h('tr', {}, ['Periodo', 'Tema', 'Estado', 'Fecha', ''].map((t) => h('th', {}, t)))),
      h('tbody', {}, r.temas.map((t) => h('tr', {},
        h('td', {}, t.periodo), h('td', {}, t.nombre),
        h('td', {}, h('select', { 'aria-label': `Estado de ${t.nombre}`, onchange: (e) => intentar(async () => {
          await json('POST', `/api/temas/${t.id}/estado`, { estado: e.target.value, fecha: hoyISO() }); mostrar();
        }) }, ESTADOS_TEMA.map(([v, x]) => h('option', { value: v, selected: v === t.estado }, x)))),
        h('td', {}, t.fecha_visto ?? '—'),
        h('td', {}, h('button', { onclick: () => { if (confirm(`¿Quitar el tema «${t.nombre}»?`)) intentar(async () => { await json('DELETE', `/api/temas/${t.id}`); mostrar(); }); } }, 'Quitar'))))))
      : h('p', { class: 'vacio' }, 'Aún no hay temas para esta materia y grado.'));
}

async function seccionClases(filtro) {
  const [clases, temas] = await Promise.all([json('GET', `/api/clases?${filtro}`), json('GET', `/api/temas?${filtro}`)]);
  const fecha = h('input', { type: 'date', value: hoyISO() });
  const tema = h('select', {}, h('option', { value: '' }, '(sin tema)'), temas.temas.map((t) => h('option', { value: t.id }, t.nombre)));
  const [lObj, obj] = campoLargo('Objetivo'); const [lAct, act] = campoLargo('Actividades'); const [lRec, rec] = campoLargo('Recursos');
  return h('section', { class: 'tarjeta' }, h('h3', {}, 'Planear una clase'),
    h('div', { class: 'fila' }, h('label', {}, 'Fecha', fecha), h('label', {}, 'Tema', tema)), lObj, lAct, lRec,
    h('button', { class: 'principal', onclick: () => intentar(async () => {
      await json('PUT', '/api/clases', { ...baseCuerpo(), fecha: fecha.value, tema_id: tema.value ? Number(tema.value) : null, objetivo: obj.value, actividades: act.value, recursos: rec.value });
      aviso('Clase guardada'); mostrar();
    }) }, 'Guardar clase'),
    clases.length ? h('table', {}, h('thead', {}, h('tr', {}, ['Fecha', 'Objetivo', 'Hecha', ''].map((t) => h('th', {}, t)))),
      h('tbody', {}, clases.map((c) => h('tr', {}, h('td', {}, c.fecha), h('td', {}, c.objetivo || '—'),
        h('td', {}, h('input', { type: 'checkbox', checked: !!c.realizada, 'aria-label': `Clase del ${c.fecha} realizada`, onchange: (e) => intentar(async () => { await json('POST', `/api/clases/${c.id}/realizada`, { realizada: e.target.checked }); }) })),
        h('td', {}, h('button', { onclick: () => { if (confirm('¿Quitar esta clase?')) intentar(async () => { await json('DELETE', `/api/clases/${c.id}`); mostrar(); }); } }, 'Quitar'))))))
      : h('p', { class: 'vacio' }, 'No hay clases planeadas.'));
}

let edicionPlan = null; let edicionGuia = null; // elemento que se está editando, o null si se crea uno nuevo

async function seccionPlanes(filtro) {
  const planes = await json('GET', `/api/planes?${filtro}`);
  const e = edicionPlan && planes.find((p) => p.id === edicionPlan);
  const tipo = h('select', {}, h('option', { value: 'area', selected: e?.tipo === 'area' }, 'Plan de área'), h('option', { value: 'aula', selected: e?.tipo === 'aula' }, 'Plan de aula'));
  const [lTit, tit] = campoTexto('Título'); const [lCon, con] = campoLargo('Contenido');
  if (e) { tit.value = e.titulo; con.value = e.contenido; }
  return h('section', { class: 'tarjeta' }, h('h3', {}, e ? 'Editar plan' : 'Nuevo plan'),
    h('div', { class: 'fila' }, h('label', {}, 'Tipo', tipo), lTit), lCon,
    h('div', { class: 'fila-acciones' },
      h('button', { class: 'principal', onclick: () => intentar(async () => {
        await json('PUT', '/api/planes', { ...(e ? { id: e.id } : {}), ...baseCuerpo(), tipo: tipo.value, titulo: tit.value, contenido: con.value });
        edicionPlan = null; aviso('Plan guardado'); mostrar();
      }) }, e ? 'Guardar cambios' : 'Guardar plan'),
      e ? h('button', { class: 'secundario', onclick: () => { edicionPlan = null; mostrar(); } }, 'Cancelar') : null),
    ...planes.map((p) => h('details', {}, h('summary', {}, `${p.tipo === 'area' ? 'Área' : 'Aula'} — ${p.titulo}`),
      h('pre', { class: 'texto' }, p.contenido),
      h('div', { class: 'fila-acciones' },
        h('button', { class: 'secundario', onclick: () => { edicionPlan = p.id; mostrar(); } }, 'Editar'),
        h('button', { class: 'secundario', onclick: () => descargarDocumento(`/api/reportes/plan?id=${p.id}&formato=docx`) }, 'Word'),
        h('button', { class: 'secundario', onclick: () => descargarDocumento(`/api/reportes/plan?id=${p.id}&formato=pdf`) }, 'PDF'),
        h('button', { class: 'peligro', onclick: () => { if (confirm(`¿Quitar el plan «${p.titulo}»?`)) intentar(async () => { await json('DELETE', `/api/planes/${p.id}`); mostrar(); }); } }, 'Quitar')))));
}

async function seccionGuias() {
  const guias = await json('GET', `/api/guias?materia_id=${sel.materia}&grado=${sel.grado}`);
  const e = edicionGuia && guias.find((g) => g.id === edicionGuia);
  const [lTema, tema] = campoTexto('Tema'); const [lTit, tit] = campoTexto('Título'); const [lCon, con] = campoLargo('Contenido de la guía');
  if (e) { tema.value = e.tema; tit.value = e.titulo; con.value = e.contenido; }
  return h('section', { class: 'tarjeta' }, h('h3', {}, e ? 'Editar guía' : 'Nueva guía (sirve para todos los años)'),
    h('div', { class: 'fila' }, lTema, lTit), lCon,
    h('div', { class: 'fila-acciones' },
      h('button', { class: 'principal', onclick: () => intentar(async () => {
        await json('PUT', '/api/guias', { ...(e ? { id: e.id } : {}), materia_id: sel.materia, grado: sel.grado, tema: tema.value, titulo: tit.value, contenido: con.value });
        edicionGuia = null; aviso('Guía guardada'); mostrar();
      }) }, e ? 'Guardar cambios' : 'Guardar guía'),
      e ? h('button', { class: 'secundario', onclick: () => { edicionGuia = null; mostrar(); } }, 'Cancelar') : null),
    ...guias.map((g) => h('details', {}, h('summary', {}, `${g.tema ? g.tema + ' — ' : ''}${g.titulo}`),
      h('pre', { class: 'texto' }, g.contenido),
      h('div', { class: 'fila-acciones' },
        h('button', { class: 'secundario', onclick: () => { edicionGuia = g.id; mostrar(); } }, 'Editar'),
        h('button', { class: 'secundario', onclick: () => descargarDocumento(`/api/reportes/guia?id=${g.id}&formato=docx`) }, 'Word'),
        h('button', { class: 'secundario', onclick: () => descargarDocumento(`/api/reportes/guia?id=${g.id}&formato=pdf`) }, 'PDF'),
        h('button', { class: 'peligro', onclick: () => { if (confirm(`¿Quitar la guía «${g.titulo}»?`)) intentar(async () => { await json('DELETE', `/api/guias/${g.id}`); mostrar(); }); } }, 'Quitar')))));
}

// --- Inicio -------------------------------------------------------------------------------------

const fechaCorta = (iso) => new Date(iso).toLocaleString('es-CO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
const hace = (iso) => {
  const min = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (min < 1) return 'hace un momento'; if (min < 60) return `hace ${min} min`;
  if (min < 1440) return `hace ${Math.round(min / 60)} h`; return `hace ${Math.round(min / 1440)} días`;
};
function dato(clase, cifra, nombre, ...extra) {
  return h('div', { class: `dato ${clase}` }, h('span', { class: 'cifra' }, String(cifra)), h('span', { class: 'nombre' }, nombre), ...extra);
}

async function pantallaInicio(cont) {
  const r = await json('GET', `/api/resumen?anio_id=${sel.anio}`);
  const rp = r.respaldo;
  const botonExcel = h('button', { class: rp.avisarExcel ? 'principal' : 'secundario', onclick: async () => { await descargarExcel(); mostrar(); } }, 'Descargar Excel ahora');
  const excel = dato('bien', hace(rp.ultimoExcel ?? new Date().toISOString()), 'Último Excel de respaldo', botonExcel); // solo se muestra cuando está al día
  cont.replaceChildren(
    h('section', { class: 'contexto' }, h('h2', {}, 'Hoy'),
      h('div', { class: 'fila' }, selector('Año', opcionesAnio(), sel.anio, (v) => { sel.anio = Number(v); mostrar(); }))),
    rp.avisarExcel ? h('section', { class: 'tarjeta recuperacion' }, h('h2', {}, 'Haga hoy su copia en Excel'),
      h('p', {}, rp.ultimoExcel ? 'Hace más de dos semanas que no descarga el Excel de respaldo.' : 'Todavía no ha descargado el Excel de respaldo.'),
      h('p', { class: 'suave' }, 'Es su seguro de vida: guárdelo también en una memoria USB. Si el computador se daña, con ese archivo recupera todo.'),
      botonExcel) : null,
    h('div', { class: 'rejilla' },
      dato('', r.estudiantes, r.estudiantes === 1 ? 'estudiante' : 'estudiantes', h('span', { class: 'suave' }, r.porGrado.map((g) => `${NOMBRE_GRADO[g.grado]}: ${g.n}`).join(' · ') || 'Aún no hay estudiantes')),
      dato(r.noAprobados ? 'mal' : 'bien', r.noAprobados, r.noAprobados === 1 ? 'estudiante no aprueba' : 'estudiantes no aprueban', h('span', { class: 'suave' }, `${r.materiasReprobadas} materias con definitiva menor de 3,0`)),
      dato(r.nivelacionesPendientes ? 'alerta' : 'bien', r.nivelacionesPendientes, 'nivelaciones pendientes', r.nivelacionesPendientes ? h('button', { class: 'secundario', onclick: () => { vista = 'nivelacion'; mostrar(); } }, 'Ver nivelaciones') : null),
      dato('', `${r.temas.porcentaje} %`, 'de los temas vistos', h('progress', { max: 100, value: r.temas.porcentaje, 'aria-label': 'Avance de temas' }), h('span', { class: 'suave' }, `${r.temas.vistos} de ${r.temas.total} temas`)),
      dato(rp.ultimaCopia ? 'bien' : 'alerta', rp.ultimaCopia ? hace(rp.ultimaCopia) : 'Ninguna', 'Última copia automática', h('span', { class: 'suave' }, `${rp.copias} copias guardadas`)),
      ...(rp.avisarExcel ? [] : [excel])),
    h('section', { class: 'tarjeta' }, h('h2', {}, 'Qué quiere hacer'),
      h('div', { class: 'accesos' },
        h('button', { class: 'principal', onclick: () => { vista = 'notas'; mostrar(); } }, 'Poner notas'),
        h('button', { class: 'secundario', onclick: () => { vista = 'estudiantes'; mostrar(); } }, 'Agregar un estudiante'),
        h('button', { class: 'secundario', onclick: () => { vista = 'planeacion'; mostrar(); } }, 'Planear una clase'))));
}

// --- Arranque -----------------------------------------------------------------------------------

const hashInicial = location.hash.slice(1);
if (VISTAS.some(([id]) => id === hashInicial)) vista = hashInicial;

setInterval(() => { fetch('/api/latido', { method: 'POST', headers: { 'x-token': TOKEN } }).catch(() => {}); }, 5000);
mostrar();
