# Comparativa con una plataforma comercial y plan de implementación

- **Fecha:** 2026-11-02
- **Rol:** análisis de producto (sin cambios de código)
- **Alcance:** comparar el sistema actual con una plataforma comercial de gestión escolar a nivel de funciones, reunir buenas prácticas, proponer un plan por fases y listar las 10 mejoras de usabilidad más urgentes.
- **No se tocó:** `src/`, `tests/` ni ninguna carpeta. Solo se escribió este archivo.

---

## 0. Regla de derechos (obligatoria para quien use este informe)

La plataforma de referencia (webcolegios.com) es un producto comercial de terceros. **Se consultó solo para saber qué funciones ofrece y cómo ordena las tareas.** Por eso:

1. **No se copian** textos, logos, iconos, imágenes, colores, nombres de productos o de módulos propios, capturas ni código.
2. Todo lo que aquí se dice de la referencia está **descrito con palabras propias** y como **patrón genérico de uso** (por ejemplo, «el trabajo se ordena en cuatro pasos: configurar, registrar, consolidar y entregar» o «buscador arriba de la lista»).
3. Las soluciones de este plan **salen de nuestros diseños** (`2026-11-02-diseno-producto-administrativa.md` y `2026-11-02-diseno-interaccion-administrativa.md`) y de los tokens de `DESIGN.md` / `estilos.css`. No se agregan colores, nombres ni pantallas inspirados en la apariencia de la referencia.
4. Si alguien implementa algo a partir de este informe y duda si una idea es «copiada», la regla práctica es: **una función genérica (buscar, imprimir, matricular) se puede tener; la forma concreta en que otro la presenta (textos, iconos, distribución visual) no se reproduce.**

---

## 1. Fuentes que se usaron

| Fuente | Qué aportó |
|---|---|
| `src/ui/app.js`, `estilos.css`, `index.html` | Estado real de la interfaz (menú de 8 entradas, pantallas, mensajes) |
| `src/servidor/servidor.js` | Documentos que hoy se generan: planilla (Excel/PDF), boletín, certificado, plan y guía (PDF/Word) |
| `docs/AUDITORIA-INTERFAZ.md` | Hallazgos U1 a U9 (aplicados) y pendientes (G3 a G6, mejora 3) |
| `docs/TRAZABILIDAD-SPEC.md` | 33 criterios, 164 pruebas, una desviación (Excel sin adjuntos) |
| `docs/VALIDACION-DOCENTE.md` | Preguntas abiertas al docente sobre redondeo, nivelación, certificado y firma |
| `DESIGN.md` | Tokens de color y principios visuales |
| Los dos diseños del 2026-11-02 | Lo que queremos: Reporte por grado, Secretaría (matrícula, certificados, directorio, circulares) y las decisiones D1 a D6 |
| Páginas públicas de la referencia (inicio, gestión académica, administrativa y convivencia) | Solo funciones y flujos de alto nivel |
| Búsquedas web (WCAG 2.2, gradebooks, docentes rurales) | Criterios de buenas prácticas de la sección 3 |

**Aviso importante:** los dos diseños del 2026-11-02 dicen que la carpeta `sistema-de-notas` «no existía» cuando se escribieron, y se basaron en el ejecutable. Hoy la carpeta sí existe, con `DESIGN.md`. Lo revisado aquí coincide con lo que ellos describen (menú de 8 botones, tokens, `ventana()`, `#aviso`), así que sus propuestas siguen siendo válidas. Aun así, queda pendiente cotejarlos formalmente con `DESIGN.md`, como piden ellos mismos.

---

## 2. Matriz comparativa

Leyenda de brecha: **Ninguna** · **Pequeña** (ajuste de pantalla) · **Media** (pantalla nueva con datos que ya existen) · **Grande** (datos nuevos y pantallas nuevas).

| Función | Qué tiene hoy el proyecto | Qué ofrece la referencia (funcional) | Qué queremos (diseños) | Brecha |
|---|---|---|---|---|
| **Notas** | Planilla por grado, materia y periodo con 3 notas, definitiva automática, estado Aprobado/No aprobado, resumen del grupo, flechas ↑↓, guardado solo. Planilla descargable en Excel y PDF. «No aprueban» por año o periodo. | Planillas por saber con porcentajes y actividades. Promedios automáticos. Guardado mientras se digita y control de errores. Descargar la planilla, llenarla en Excel y volver a cargarla. Consulta por estudiante, grupo y periodo. | Mantener la planilla. Agregar **Reporte por grado** (todas las materias de un grado en una tabla, «Falta» en vez de cero, ▼ para no aprueba) y la **Hoja individual** del estudiante. | **Media** (reporte por grado). Pequeña en la planilla: falta el error junto a la casilla (mejora 3 pendiente). |
| **Asistencia** | Existe (presente, ausente, excusa; «Marcar a todos presentes»; ausencias del año), pero está **escondida como 5.ª pestaña de Planeación** y exige que el grado tenga materias. | Listas de asistencia, retardos y ausencias con consolidados por estudiante. | Inasistencias con y sin excusa en la Hoja del grado y en la Hoja individual. | **Pequeña** en datos y **grande en encontrarla**: el docente no la va a buscar dentro de Planeación. |
| **Boletines** | Un boletín por estudiante (PDF o Word) desde el menú «Documentos». Trae notas, definitiva, nivelación y observaciones. | Boletines, actas, consolidados y estadísticas. Reportes para la comisión. | «Todos los grados en un PDF» (Reporte por grado). G4 (boletines de todo el grado) sigue pendiente en la auditoría. | **Media**: generar en lote por grado. |
| **Matrícula** | Solo el formulario rápido de Estudiantes: nombre, documento opcional y grado. Archivar o reactivar. | Inscripción, prematrícula y matrícula (en línea). | **Ficha de matrícula** completa (documento con tipo, nacimiento y edad, dónde vive, salud opcional, autorización de datos) y lista **Matriculados por grado** con la marca «Faltan datos». | **Grande** (modelo de datos nuevo, D1). |
| **Acudientes** | No existen. | No se menciona como función propia en las páginas públicas. Sí hay citaciones a acudientes en convivencia. | Uno o varios acudientes por estudiante, exactamente uno principal, **compartidos entre hermanos** de distintos grados. | **Grande** (D1). |
| **Certificados** | Un «Certificado» por estudiante (PDF o Word) con encabezado de nombre, sede y docente. Formato provisional (CA-009-03). | Certificados de calificaciones, constancias de estudio y libro final. | Dos certificados: **de matrícula** (nuevo) y **de estudio** (renombrar el actual). Vista previa, varios estudiantes en un archivo, avisos de datos faltantes, código DANE y firma o firmas. | **Media** (depende de D2 y de la matrícula para el de matrícula). |
| **Directorio** | No existe. | Directorio institucional. | **Directorio de acudientes** por grado, columnas elegibles, sin datos de salud, aviso de datos personales impreso. | **Media** (depende de acudientes). |
| **Convivencia** | No existe. | Observador, faltas, debido proceso, citaciones y compromisos, permisos, retardos, avisos a familias. | **Excluida por decisión del docente.** Lo más cercano que sí tenemos: la observación por estudiante del boletín. | **Fuera de alcance.** No se planifica. |
| **Reportes** | «Hoy» con tarjetas (estudiantes, no aprueban, nivelaciones, avance de temas, copias). «No aprueban». Planilla por materia. | Consolidados, indicadores por curso y área, seguimiento de bajo desempeño y estadísticas para directivos. | Reporte por grado (pantalla, PDF y Excel), Hojas de todos los grados, puesto opcional. | **Media**. |
| **Respaldo** | Fuerte: copia al abrir y cerrar, retención configurable, copia en USB, restaurar con copia previa, recuperación si la base se daña, copia completa .db. | Funciona en la nube, con una opción sin internet para sedes con poca conexión. | Todo lo nuevo (fichas, acudientes, circulares, datos del encabezado) debe viajar en las copias. **Requisito de V1.** | **Pequeña** por cada fase (cada fase nueva debe extender el respaldo). |
| **Excel** | Excel completo de ida y vuelta, con revisión previa, resumen y avisos. No guarda adjuntos (desviación conocida). | Planillas de notas que se descargan, se llenan en Excel y se vuelven a cargar. | Las tablas nuevas entran en el Excel y en la importación. «Descargar Excel» en el Reporte por grado y el Directorio. | **Pequeña** a **Media** (tablas nuevas y su validación). |
| *Circulares (extra, está en los diseños)* | No existen. | Envío de circulares y mensajes a familias (correo y SMS). | Redactar, numerar, copiar una anterior, desprendible, una copia por familia, PDF y Word. **Sin envío por internet.** | **Media**. |

### 2.1 Qué hace mejor la referencia en usabilidad y cómo lo resolvemos sin copiarlo

| # | Patrón genérico que la referencia resuelve bien | Por qué importa al docente | Nuestra solución (propia) |
|---|---|---|---|
| R1 | **Ordena el trabajo en un ciclo claro:** configurar, registrar, consolidar y entregar. | Hoy el docente no ve en qué paso del periodo va. | En «Hoy», una tarjeta **«Cierre del periodo N»** con una lista de comprobación en texto: notas por escribir (dato que ya existe), nivelaciones pendientes, boletines descargados y Excel al día. Usa `.dato` y `.etiqueta`, que ya existen. |
| R2 | **Agrupa por área de trabajo** (académico, administrativo, etc.). | Con más módulos, un menú plano crece hasta salirse de la pantalla. | Lo que decide el diseño de interacción: solo 2 entradas nuevas («Reporte por grado» y «Secretaría» con pestañas) y un menú de 10 entradas. **Choca con el diseño de producto, que propone un grupo con 5 entradas. Hay que elegir (decisión N1, sección 4).** |
| R3 | **Consulta por estudiante, grupo y periodo** desde un mismo lugar. | Para atender a un acudiente, hoy hay que recorrer Notas materia por materia. | **Hoja individual del estudiante** (diseño de producto P1) y un **buscador** arriba de la lista de Estudiantes y de Matrícula. |
| R4 | **Planilla de ida y vuelta en Excel por materia.** | Algunos docentes prefieren digitar en Excel. | Ya existe el Excel de ida y vuelta, pero es de la base completa. **No se propone en V1** una planilla por materia de ida y vuelta: duplica una vía de importación y aumenta el riesgo. Queda como candidata y requiere una decisión del docente (pregunta 9 de la hoja de validación: qué usa más). |
| R5 | **Documentos en lote** (boletines, actas, consolidados). | En multigrado se cierra el periodo de 6 grados a la vez. | «Boletines del grado» y «Todos los grados en un PDF»: un archivo, con cada estudiante o grado en hoja nueva. |
| R6 | **Avisos a las familias integrados** (correo, SMS). | Rapidez para avisar. | **No aplica** (sin internet). Lo resolvemos con circulares impresas, una por familia, con desprendible de recibido, y con el directorio impreso para la cadena de llamadas. |
| R7 | **Acompañamiento** con instructivos y tutoriales. | El docente tiene poca práctica. | Ayudas cortas en pantalla (`.ayuda-campo`, textos `.suave`) y una **hoja impresa de 1 página por tarea** (matricular, cerrar periodo, sacar certificado) al estilo de `LEEME-DOCENTE.txt`. Sin videos, porque no hay internet. |

Donde **nosotros** ya somos mejores para este usuario: funciona 100 % sin internet en un solo computador, el respaldo es visible y verificable, los mensajes están en español llano y el modelo de datos es simple, con una sola fuente para cada dato.

---

## 3. Buenas prácticas: 5 criterios concretos

| # | Criterio | De dónde sale | Cómo se aplica aquí (medible) |
|---|---|---|---|
| C1 | **Objetivos táctiles y de clic de al menos 24 × 24 px** (WCAG 2.2, 2.5.8). | WCAG 2.2 AA | Todos los botones, casillas y radios miden ≥ 24 px de alto. Hoy las casillas de `label.casilla` miden 1,2 em (≈ 21,6 px a 18 px) y no cumplen. Los botones «Quitar» de Temas y Clases no tienen clase ni estilo. |
| C2 | **El foco nunca queda tapado** (WCAG 2.2, 2.4.11) y el orden de tabulación sigue el orden visual. | WCAG 2.2 AA | Hay elementos fijos: `section.contexto`, `#aviso` y la futura `.barra-guardar`. Al tabular hacia un campo debajo de ellos, el campo debe quedar visible (`scroll-padding-top` / `scroll-padding-bottom`). Prueba: recorrer la ficha completa con Tab sin perder de vista el foco. |
| C3 | **No pedir el mismo dato dos veces** (WCAG 2.2, 3.3.7 Redundant Entry, nivel A, incluido en AA). | WCAG 2.2 | El acudiente compartido entre hermanos se escribe una sola vez, y el certificado y el directorio leen la ficha. Medición: matricular a dos hermanos sin volver a escribir los datos de la madre. |
| C4 | **La tabla de notas se comporta como una hoja de cálculo, con validación en la casilla.** | Proyectos de mejora de gradebooks (Sakai, Moodle): disposición familiar tipo Excel, acciones visibles y validación de la entrada | Estudiantes en filas y evaluaciones en columnas (ya es así). Flechas en las cuatro direcciones. El error se muestra **junto a la casilla** y no solo en el aviso global. Medición: digitar 3 notas a 12 estudiantes sin usar el ratón. |
| C5 | **Estado en palabras y no solo en color, con contraste ≥ 4,5:1 en texto y ≥ 3:1 en bordes de campo; todo se puede imprimir en blanco y negro.** | WCAG 1.4.1, 1.4.3 y 1.4.11; contexto rural (impresión en B/N, sol sobre la pantalla) | Ya se hace en las etiquetas «Aprobado» y «No aprobado». Se extiende con ▼ y «Falta» en el reporte. Prueba: imprimir en B/N el reporte de un grado y distinguir quién no aprueba. |

Nota sobre el contexto rural: la búsqueda no encontró estudios de usabilidad específicos para docentes de Escuela Nueva. Sí confirma que en Colombia se usan herramientas sin internet en sedes rurales. Por eso, lo que realmente valida el diseño es **probar con el docente** usando la hoja `VALIDACION-DOCENTE.md`, y no la literatura.

---

## 4. Decisiones que bloquean (no se inventan)

Las de los diseños, con la numeración del diseño de interacción, más las que este análisis encontró (N1 a N4).

| Id | Decisión | Quién decide | Estado |
|---|---|---|---|
| **D1** | Modelo de datos: ficha (persona) contra matrícula (año), acudientes de muchos a muchos con un principal, y circulares. | Arquitecto (técnica). El docente solo valida los campos. | **Abierta** |
| **D2** | Datos de la institución para certificados: municipio, departamento, código DANE, resolución, quién firma y su cargo, una o dos firmas. ¿La rectoría acepta certificados hechos en la sede? | Docente con la rectoría | **Abierta** (pregunta 6 de la hoja de validación) |
| **D3** | Nombre: un solo campo (diseño de interacción) o nombres y apellidos por separado (diseño de producto). | Docente, según lo que exijan el certificado y el SIMAT | **Abierta. Los dos diseños se contradicen.** |
| **D4** | Texto de la autorización de datos (Ley 1581) y si hace falta un formato firmado en papel. | Docente con la institución | **Abierta** |
| **D5** | Transición: ¿informe descriptivo sin notas, o notas de 1 a 5 como hoy? | Docente (según el SIEE) | **Abierta** |
| **D6** | Pasar a todos al año siguiente (renovar la matrícula en bloque). | Docente (cómo cierra el año) | **Abierta. No está diseñada.** |
| N1 | Navegación: «Secretaría» con 4 pestañas (interacción) o grupo «Gestión administrativa» con 5 entradas (producto). | Equipo, validando con el docente | **Abierta.** Se recomienda la opción de pestañas porque el menú cabe en 1366×768, pero la decisión es del docente. |
| N2 | Orden: ¿Hoja o Reporte por grado antes que Matrícula? (el diseño de producto pide preguntarlo). | Docente | **Abierta** |
| N3 | Rangos de desempeño (Superior, Alto, Básico, Bajo) para el certificado de estudio. | Docente (SIEE) | **Abierta.** Hoy el sistema no los tiene. |
| N4 | Redondeo, decimales y nivelación por año o por periodo (preguntas 1 a 4 de la hoja de validación). | Docente | **Abierta.** Afecta al reporte y a los certificados. |

---

## 5. Plan de implementación por fases

Orden propuesto según el calendario (cierre del 4.º periodo en noviembre y matrículas de noviembre a enero) y según lo que no depende de decisiones. Tamaño: **S** (≤ 2 días), **M** (3 a 7 días), **L** (más de 7 días).

### Fase A. Arreglos de usabilidad sin decisiones pendientes (S/M → **M**)

- **Alcance:** las mejoras 1 a 10 de la sección 6 que no necesitan datos nuevos. Asistencia como entrada propia o acceso desde «Hoy», buscador en Estudiantes, no perder lo escrito en Nivelación, error junto a la casilla de nota, avisos sin `role=alert` para «Guardado», `hashchange` y foco al `h2`, «Saltar al contenido», estilos de los botones «Quitar», fechas en formato colombiano, base de `@media print`, casillas de 24 px.
- **Criterios de aceptación medibles:**
  - registrar la asistencia de un grado desde «Hoy» en ≤ 2 clics para llegar a la lista;
  - encontrar a un estudiante por 3 letras del nombre en < 5 s con 60 estudiantes;
  - en Nivelación, escribir en 2 tarjetas, guardar una y que la otra conserve su texto;
  - con `Alt+←` la pantalla cambia;
  - con un lector de pantalla, «Guardado» no interrumpe;
  - todos los objetivos ≥ 24 × 24 px.
- **Pruebas:** ampliar `tests/ui-edge.test.js` (Edge real). Recorrido con teclado. `npm test` en verde (164 pruebas o más).
- **Riesgos:** mover Asistencia rompe la costumbre de quien ya la usa. Mitigación: dejar también la pestaña en Planeación durante un tiempo, con un aviso de la nueva ubicación.
- **Bloquea:** ninguna decisión.

### Fase B. Reporte por grado, Hoja individual y boletines en lote (**M**)

- **Alcance:** la pantalla «Reporte por grado» del diseño de interacción (§2), la Hoja individual (producto P1), «Todos los grados en un PDF», «Boletines del grado» (G4) y la tarjeta «Cierre del periodo» en Hoy (R1).
- **Criterios:**
  - la hoja de un grado con 8 materias y 15 estudiantes cabe en **1 página carta horizontal**;
  - quien no aprueba se distingue en impresión B/N (▼ y negrilla);
  - una nota faltante muestra «Falta» y nunca 0;
  - las cifras coinciden con Notas, la planilla y el boletín (misma fuente `reportes/datos.js`, como en CA-002-03);
  - el PDF de 6 grados empieza cada grado en hoja nueva.
- **Pruebas:** unitarias del cálculo del reporte frente al boletín, HTTP del PDF y el Excel, impresión real en B/N, Edge.
- **Riesgos:** las notas de una materia quitada de un grado (salvedad de CA-001-01) pueden aparecer o desaparecer del reporte. Hay que decidir cómo mostrarlas y alinearlo con «No aprueban».
- **Bloquea:** **D5** (Transición), solo en cómo se muestra el grado 0 (lo demás puede avanzar). **N4** (redondeo y nivelación) si el docente cambia las reglas. **N2** define si esta fase va antes o después de la C.

### Fase C. Matrícula y acudientes con su respaldo (**L**)

- **Alcance:** «Secretaría > Matrícula» (lista con buscador y «Solo fichas incompletas»), Ficha de matrícula con varios acudientes y uno principal, acudiente compartido, protección de cambios sin guardar, borrador local, botón «Ficha» en Estudiantes, y **las tablas nuevas en el Excel, la importación y la copia completa**.
- **Criterios:**
  - matricular a un niño con 2 acudientes, cerrar el programa, importar el Excel en una carpeta nueva y que todo siga ahí (criterio F7 del diseño de producto);
  - matricular a un hermano reutilizando a la madre **sin volver a escribir** sus datos (C3);
  - cambiar el celular de la madre y verlo cambiado en los dos hermanos;
  - ningún intento de salir con cambios sin guardar pierde datos (menú, pestaña, `Alt+←`, cierre de ventana);
  - un guardado fallido no vacía los campos;
  - validaciones colombianas: celular de 10 dígitos que empieza por 3 y documento duplicado.
- **Pruebas:** dominio (principal único, acudiente compartido), ida y vuelta del Excel con las tablas nuevas (como CA-008-02), importación de un Excel antiguo sin esas tablas (compatibilidad), Edge con el flujo completo del §4 del diseño de producto.
- **Riesgos:**
  - es la fase que **cambia el esquema de la base y el formato del Excel**: un Excel viejo debe seguir importando;
  - los datos de menores son sensibles (Ley 1581);
  - el formulario es largo para un computador lento.
- **Bloquea:** **D1** (sin modelo no se empieza), **D3** (un nombre o dos campos), **D4** (texto de la autorización; se puede construir la casilla y dejar el texto marcado como pendiente) y **N1** (navegación).

### Fase D. Certificados (2 tipos) y Directorio de acudientes (**M**)

- **Alcance:** pestañas Certificados y Directorio, datos de la institución ampliados en «Año y materias», cambio de nombre del certificado actual a «de estudio», vista previa, lote en un archivo y `@media print` del directorio.
- **Criterios:**
  - imprimir un certificado de cada tipo y el directorio de un grado y revisarlos en papel B/N (criterio F8);
  - un dato faltante sale como «[falta …]» visible y no en blanco;
  - el directorio **nunca** muestra datos de salud;
  - el aviso de datos personales aparece en pantalla y en papel;
  - el Word se abre con tildes y eñes correctas (hoy el Word está «sin revisión visual», CA-009-04).
- **Pruebas:** HTTP de los PDF y Word, revisión visual del Word (pendiente desde v0.1.6), Edge.
- **Riesgos:** un certificado con formato no aceptado por la rectoría es trabajo perdido. Mitigación: validar el texto antes de construirlo.
- **Bloquea:** **D2** (datos y firma), **N3** (rangos de desempeño del certificado de estudio) y la Fase C (el certificado de matrícula y el directorio necesitan acudientes y ficha). *El certificado de estudio podría adelantarse solo si D2 y N3 se resuelven antes que la Fase C.*

### Fase E. Circulares (**M**)

- **Alcance:** lista, editor de texto simple con autoguardado en la base, numeración, «Hacer una copia», a quién va dirigida, una copia por familia, desprendible y descarga en PDF y Word.
- **Criterios:**
  - escribir una circular, descargarla en Word, abrirla y que se vea igual que la vista previa (criterio F10);
  - cerrar el programa a mitad de la redacción y encontrar el borrador al volver;
  - la cuenta «por familia» trata a los hermanos como una sola familia;
  - las circulares viajan en el Excel.
- **Pruebas:** dominio (número consecutivo, conteo por familia), Excel ida y vuelta, Edge.
- **Riesgos:** el autoguardado frecuente en un computador lento. Hay que medir que guardar no congele la escritura.
- **Bloquea:** ninguna D directa. Depende de la Fase C para «una por familia» y «con el nombre del acudiente».

### Fase F. Renovación de matrícula al año siguiente (**M**, sin diseño)

- **Alcance:** **no definido.** Pasar a los estudiantes al grado siguiente y conservar fichas y acudientes.
- **Criterios, pruebas y riesgos:** **pendientes de diseño.**
- **Bloquea:** **D6**, y además cómo se cierra hoy el año en el código (hay que revisarlo antes de diseñar). Se marca para no olvidarla: llega justo después de la temporada de matrículas.

### Fuera del plan

- **Convivencia escolar, cartera y gestión de calidad:** excluidas por el docente.
- **Envío por correo, SMS o WhatsApp:** no hay internet.
- **Planilla por materia de ida y vuelta en Excel (R4):** candidata. Necesita una decisión del docente.

### Resumen del orden

| Orden | Fase | Tamaño | Bloqueada por |
|---|---|---|---|
| 1 | A. Usabilidad base | M | — |
| 2 | B. Reporte por grado y lotes | M | D5 (parcial), N4, N2 (orden) |
| 3 | C. Matrícula y acudientes | L | D1, D3, D4, N1 |
| 4 | D. Certificados y directorio | M | D2, N3, Fase C |
| 5 | E. Circulares | M | Fase C |
| 6 | F. Renovación de matrícula | M (estimado) | D6, sin diseño |

B y C pueden intercambiarse según N2.

---

## 6. Las 10 mejoras de usabilidad más urgentes (con evidencia)

| # | Pantalla | Problema (evidencia) | Cambio |
|---|---|---|---|
| 1 | **Planeación > Asistencia** | La asistencia, que es una tarea diaria, es la 5.ª pestaña de Planeación (`app.js:515`). Además Planeación exige una materia en el grado: si no la hay, muestra «Este grado no tiene materias» y no deja tomar asistencia (`app.js:521`), aunque la asistencia no depende de la materia. | Entrada propia **«Asistencia»** en el menú o, como mínimo, un botón «Tomar asistencia» en «Hoy», sin requisito de materia. |
| 2 | **Nivelación** | Cada tarjeta guarda por separado y luego llama a `mostrar()`, que repinta toda la pantalla (`app.js:325-331`). **Lo escrito en las otras tarjetas sin guardar se pierde.** Es el riesgo que el diseño de interacción describe en §1.3. | Actualizar solo la tarjeta guardada sin repintar la pantalla, o avisar de cambios sin guardar antes de repintar. |
| 3 | **Estudiantes** | No hay buscador. Una sola tabla con todos los grados (`app.js:265-275`). Para encontrar a un niño hay que desplazarse por toda la lista. | Campo **Buscar (nombre o documento)** arriba de la lista, que filtre mientras se escribe, y un filtro por grado. |
| 4 | **Notas** | Una nota fuera de rango solo se avisa en la barra global, «La nota debe estar entre 1,0 y 5,0» (`app.js:221-222`). La casilla se marca, pero el mensaje no está junto a ella. Es la «mejora 3» pendiente de la auditoría. | Mensaje «Error: …» debajo de la casilla, unido con `aria-describedby`, como en el §1.2 del diseño de interacción. |
| 5 | **Todas (aviso «Guardado»)** | `#aviso` tiene `role="alert"` (`index.html:18`) y se lanza con cada nota guardada (`app.js:229`). Con un lector de pantalla interrumpe cada pocos segundos, y la barra fija tapa la parte superior del contenido. | Confirmación en línea por fila («Guardado» junto a la definitiva) con `aria-live="polite"`. Dejar `#aviso` solo para errores y acciones grandes. |
| 6 | **Navegación general** | El menú cambia `location.hash` (`app.js:143`), pero nadie escucha `hashchange`: con `Alt+←` cambia la dirección y la pantalla no. Al cambiar de pantalla el foco no se mueve al contenido, y no hay «Saltar al contenido». | Escuchar `hashchange`, llevar el foco al `h2` (`tabindex="-1"`) y agregar el enlace «Saltar al contenido». |
| 7 | **Estudiantes > Observaciones** | La observación se escribe en una ventana emergente de 1.000 letras (`app.js:291-293`), y en la lista no se ve quién ya la tiene. El docente no sabe a quién le falta antes del boletín. | Indicar en la fila «Con observación» o «Sin observación» y, en la Fase B, editarla dentro de la Hoja individual. |
| 8 | **Boletines (menú Documentos)** | Solo se descarga un boletín por estudiante (`app.js:295-297`). En multigrado, el cierre de periodo implica decenas de descargas. Es G4, pendiente en la auditoría. | «Boletines del grado» en un solo PDF (Fase B). |
| 9 | **Respaldo > Copia en USB** | Hay que escribir a mano la ruta completa de la carpeta (`app.js:365`, ejemplo «E:\\Respaldos»). Es difícil para alguien con poca práctica y fácil de escribir mal. | Detectar las unidades extraíbles conectadas y ofrecerlas en una lista («Memoria USB (E:)»), y probar la escritura al guardar. *Requiere un cambio en el servidor, porque el navegador no puede elegir carpetas (G3).* |
| 10 | **Planeación (Temas y Clases) y casillas** | Los botones «Quitar» no tienen clase y se ven con el estilo del sistema (`app.js:556`, `app.js:575`). Las fechas se muestran como `aaaa-mm-dd` (`app.js:555`, `573`). Las casillas miden 1,2 em, por debajo de 24 px (`estilos.css:111`). | Clase `peligro` en «Quitar», fechas como «3 nov 2026» con `es-CO` y casillas de al menos 24 px (C1). |

Otras observaciones que no entran en el top 10: no existe `@media print` (`estilos.css` no lo tiene), lo que obliga a descargar un PDF para imprimir cualquier cosa (se resuelve en las Fases B y D). La pantalla Respaldo tiene 5 tarjetas; conviene ordenarlas en «Guardar» y «Recuperar».

---

## 7. Fuentes externas consultadas

- Referencia funcional: [webcolegios.com (inicio)](https://www.webcolegios.com/), [gestión académica](https://www.webcolegios.com/pagina_gestion_academica.php), [gestión administrativa](https://www.webcolegios.com/pagina_gestion_administrativa.php), [convivencia](https://www.webcolegios.com/pagina_gestion_convivencia_social.php). Solo se leyeron funciones; ver la regla de la sección 0.
- WCAG 2.2: [What's new in WCAG 2.2 AA (Univ. of Virginia)](https://digitalaccessibility.virginia.edu/whats-new-wcag-22-aa), [WCAG 2.2: novedades (jacar.es)](https://jacar.es/wcag-22-novedades/), [What's new in WCAG 2.2 (hidde.blog)](https://hidde.blog/new-in-wcag22/). *Antes de una auditoría formal, hay que confirmar los textos en la especificación oficial del W3C.*
- Gradebooks: [Moodle gradebook UXR (Boise State)](https://sites.google.com/u.boisestate.edu/kimberly-woodruff/projects/moodle-gradebook-uxr-design), [Sakai Gradebook Enhancements](https://sakaiproject.atlassian.net/wiki/spaces/GBKIMPRV/overview), [Packback gradebook UX case study](https://medium.com/swlh/upgrading-packbacks-gradebook-a-ux-case-study-41a4e196cdb5).
- Contexto rural offline en Colombia: [UNAD, repositorio 10596/76031](https://repository.unad.edu.co/jspui/handle/10596/76031?mode=full), [UPB, Escuela Nueva y TIC](https://repository.upb.edu.co/handle/20.500.11912/7117).

---

## 8. Resumen para el usuario (10 líneas)

1. El sistema ya es sólido en notas, nivelación, planeación y sobre todo en respaldo; le falta toda la parte administrativa.
2. Frente a la plataforma de referencia (solo funciones, sin copiar nada), las brechas grandes son matrícula y acudientes; las medias, reporte por grado, certificados, directorio y circulares.
3. Convivencia, cartera y calidad quedan fuera porque así lo pidió el docente.
4. Lo que la referencia hace mejor es ordenar el periodo como un ciclo y producir documentos en lote; lo resolvemos con una tarjeta propia de «Cierre del periodo» y boletines por grado.
5. Cinco criterios guían el trabajo: objetivos de 24 px, foco nunca tapado, no escribir dos veces lo mismo, tabla de notas tipo hoja de cálculo con error junto a la casilla, y estado en palabras que se lea impreso en blanco y negro.
6. La Fase A (arreglos sin decisiones pendientes, tamaño M) puede empezar ya.
7. Le siguen el Reporte por grado (M), Matrícula y acudientes (L), Certificados y directorio (M), Circulares (M) y Renovación de matrícula (sin diseño).
8. Lo más urgente: asistencia escondida en Planeación, Nivelación que puede borrar lo escrito, Estudiantes sin buscador y el error de nota que no aparece junto a la casilla.
9. Bloquean decisiones del docente: D2 (firma y DANE), D3 (un nombre o dos campos, porque los diseños se contradicen), D4 (autorización de datos), D5 (Transición) y D6 (renovación); D1 la decide el arquitecto.
10. También hay que elegir la navegación (pestañas «Secretaría» o grupo de 5 entradas) y si el reporte por grado va antes que la matrícula.
