# Trazabilidad: criterios de la spec contra lo construido (2026-10-31)

Spec: `.sdd/especificaciones/2026-10-31-nucleo-notas-y-respaldo/spec.md`. Estado a la versión `v0.1.6` (corregido tras la auditoría final independiente: el «33 de 33» anterior estaba sobrestimado).
**Cumplido** = implementado y probado. **Con desviación** = se hace, pero distinto a como lo dice la spec (se explica). **Pendiente** = no hecho.

| Criterio | Estado | Evidencia / nota |
|---|---|---|
| CA-001-01 grados 0–5; materias por grado | Cumplido, con salvedad | Cada materia se marca con los grados donde se dicta; Notas y Planeación ofrecen solo las del grado y el servidor rechaza escrituras fuera de ellos. Salvedad: si luego se quita un grado a una materia que ya tiene notas, esas notas siguen contando en «No aprueban» y boletines pero ya no se ven en «Notas»; el programa avisa cuántos estudiantes quedan así. `spec-cruce2.test.js`, `auditoria-final.test.js` |
| CA-001-02 estudiantes: crear, editar, archivar | Cumplido | `academico.test.js`, Edge |
| CA-001-03 varios años; cerrado = solo lectura | Cumplido | Incluye reabrir año |
| CA-001-04 multigrado | Cumplido | Todas las vistas filtran por grado |
| CA-002-01 escala 1,0–5,0 con mensaje claro | Cumplido | Dominio, servidor y casilla marcada en pantalla |
| CA-002-02 umbral configurable (3,0 por defecto) | Cumplido (nuevo) | «Año y materias → Nota mínima»; `spec-cruce.test.js` |
| CA-002-03 definitiva = promedio, igual en pantalla, Excel y PDF | Cumplido | Cifras calculadas una vez (`reportes/datos.js`) |
| CA-002-04 desaprobadas resaltadas y listadas por grado y materia | Cumplido (nuevo) | Pantalla «No aprueban», por año o por periodo |
| CA-002-05 4 periodos × 3 notas | Cumplido | |
| CA-002-06 definitiva del año | Cumplido | Promedio simple de los 4 periodos (regla confirmada con el docente) |
| CA-003-01 plan de nivelación (actividades, fecha, resultado) | Cumplido | Prueba en Edge real |
| CA-003-02 nivelación aparte; boletín muestra ambas | Cumplido | |
| CA-003-03 listado de pendientes | Cumplido | |
| CA-004-01 plan de área con objetivos, estándares, competencias, contenidos por periodo, criterios | Cumplido (cerrado en v0.1.4) | Campos separados: objetivos, estándares, competencias, contenidos de cada uno de los 4 periodos y criterios de evaluación, más «otras notas». El Word y el PDF los traen con su título; se copian al año siguiente; viajan en el Excel. `spec-cruce2.test.js`, Edge |
| CA-004-02 plan de aula asociado a plan de área, grado y periodo | Cumplido (nuevo) | Misma materia y grado que su plan de área; `spec-cruce.test.js` |
| CA-004-03 copiar planes al año siguiente | Cumplido (nuevo) | No duplica; conserva el enlace aula→área |
| CA-004-04 planes a Word y PDF | Cumplido | |
| CA-005-01 guía con título, grado, materia, tema, contenido y adjuntos | Cumplido | Adjuntos dentro de la base (viajan en copias, no en el Excel) |
| CA-005-02 buscar por grado, materia, tema o palabra | Cumplido (nuevo) | Palabra en tema, título y contenido |
| CA-005-03 guía a PDF y Word | Cumplido | |
| CA-006-01 temas con estado y fecha | Cumplido | |
| CA-006-02 porcentaje de avance por grado, materia y periodo | Cumplido (nuevo) | Avance total y por cada periodo |
| CA-006-03 clase vinculada a tema y a guía | Cumplido (nuevo) | |
| CA-006-04 asistencia por fecha y grado | Cumplido (nuevo) | Pestaña «Asistencia»; presente, ausente o excusa; cuenta ausencias |
| CA-007-01 copia al abrir y cerrar; últimas N configurables | Cumplido, con salvedad | N se configura (5 a 200, por defecto 30) y aplica a las copias automáticas «abrir» y «cerrar»; las copias «antes de restaurar/importar» tienen un tope fijo de 5 por motivo. |
| CA-007-02 integridad antes de restaurar | Cumplido | `respaldo.test.js` |
| CA-007-03 base dañada: ofrece la última sana | Cumplido | `arranque.test.js` |
| CA-007-04 restaurar conserva la base actual | Cumplido | |
| CA-007-05 carpeta adicional (USB) | Cumplido | Revisión independiente |
| CA-008-01 exportar todos los datos a `.xlsx` | **Con desviación** | El Excel NO incluye los archivos adjuntos de las guías (una celda de Excel no puede guardar archivos). Se compensa con «Descargar copia completa» (archivo .db con todo, adjuntos incluidos) y se avisa en las pantallas y en el LEEME. Tampoco lleva la carpeta de la memoria USB (es de cada equipo). |
| CA-008-02 ida y vuelta idéntica | Cumplido | Incluye las tablas nuevas |
| CA-008-03 importar sobre datos pide confirmación con resumen | Cumplido, con salvedad | Pide confirmación con resumen y hace copia antes; rechaza un Excel de otra base o sin identidad. Salvedad: al ser una restauración, la importación también escribe en años cerrados y no valida los grados de las materias; desde v0.1.6 el resumen previo AVISA cuántas notas tocarían un año cerrado o una materia fuera de su grado. |
| CA-008-04 Excel inválido o de otra versión se rechaza con detalle | Cumplido | |
| CA-009-01 planilla xlsx y pdf | Cumplido | |
| CA-009-02 boletín con notas, definitiva, nivelación y observaciones | Cumplido (nuevo: observaciones) | Botón «Observaciones» por estudiante |
| CA-009-03 certificado con encabezado configurable | Cumplido | Formato provisional |
| CA-009-04 tildes y eñes | Cumplido | PDF revisado a ojo; Word sin revisión visual |

**Resumen:** 33 criterios; 29 cumplidos sin reservas, 3 cumplidos con salvedad (CA-001-01, CA-007-01, CA-008-03), 1 con desviación (CA-008-01), 0 pendientes. 164 pruebas.
**Lo que ningún criterio cubre pero sigue sin verificar:** ejecución en el ASUS con Windows 10, los Word y el certificado a la vista, tres hallazgos bajos de la revisión independiente.
