# Revisión independiente — sistema de notas (2026-10-31)

**Veredicto:** las reglas de cálculo son correctas y la seguridad local es sólida, pero hay dos riesgos altos: el Excel puede pisar datos de otra base sin que se note, y el programa puede apagarse solo con la ventana abierta. Además falta la copia a USB (CA-007-05). Apto para un piloto solo si antes se corrigen los hallazgos 1 a 3.

Pruebas existentes: `node --test` sin la de Edge da 119/119 en verde (5 s). Los scripts de casos límite están en el scratchpad de la sesión (`t.mjs`).

## Hallazgos

### 1. Alto: importar un Excel de otra base pisa registros distintos que tienen el mismo id (confirmado ejecutándolo)
`src/excel/excel.js:123-128,158-161`. El upsert usa la clave sustituta `id` y no la clave natural (año, nombre de materia, documento o nombre del estudiante). Caso: la base A tiene el año 2026, la materia «Mat» y el estudiante «Pedro»; la base B tiene el año 2025, la materia «Español» y la estudiante «Ana». Al importar el Excel de A en B con `confirmar:true`, «Ana» pasa a ser «Pedro», 2025 pasa a ser 2026 y «Español» pasa a ser «Mat». Las notas de B que apuntaban a esos id quedan colgadas de otra persona o materia. El resumen solo dice «Cambiados: 1», y el docente no puede saber que se trata de otra persona. Hay copia «antes-de-importar», así que el daño se puede revertir, pero no se nota: viola «nunca perder datos en silencio». El caso es realista: un computador nuevo donde ya se empezó a digitar y luego se importa el Excel viejo.
**Arreglo:** en la simulación, marcar como conflicto (error o advertencia aparte) las filas con el mismo id y distinta clave natural (`anio_lectivo.anio`, `materia.nombre`, `estudiante.documento/nombre`, `matricula(estudiante,anio)`). En la pantalla, mostrar «X registros de la base serán reemplazados por otros distintos» con ejemplos. Otra opción: ofrecer «reemplazar toda la base» en lugar de mezclar.

### 2. Alto: el programa se apaga solo con la ventana abierta tras una suspensión o con la ventana minimizada (sospecha por lectura)
`src/arranque.js:100-105` y `src/ui/app.js:592`. El servidor se cierra si pasan más de 30 s sin latido, y el latido es un `setInterval` de 5 s en la página. Hay dos casos:
- Si el portátil se suspende (tapa cerrada) más de 30 s, al despertar el vigilante del servidor puede dispararse antes que el latido del navegador y cerrar el programa.
- Si la ventana pasa más de 5 min minimizada u oculta, Chrome y Edge aplican la limitación intensiva de temporizadores encadenados (como máximo uno por minuto), y 60 s es más que 30 s.

En ambos casos el docente vuelve a la ventana, escribe notas y recibe «No se pudo hablar con el programa». Lo escrito en ese momento no se guarda. No se corrompe nada (hay copia «cerrar»), pero confunde y hace perder trabajo.
**Arreglo:** subir el umbral (por ejemplo a 10 min) o cerrar solo cuando la ventana avise que se cierra (`pagehide` con `sendBeacon` a `/api/cerrar`) y usar el latido como respaldo. Para comprobarlo: abrir el programa, minimizarlo 6 min y volver a escribir una nota.

### 3. Alto: CA-007-05 (carpeta adicional de copias, USB) no está implementado (confirmado por lectura y grep)
`src/respaldo/respaldo.js:129` (`copiarAVarios`) no se usa en `servidor.js`, `arranque.js` ni la UI. Todas las copias automáticas quedan en `datos/copias`, en el mismo disco que la base. Si el disco falla o el equipo se pierde, solo queda el Excel que el docente haya descargado a mano.
**Arreglo:** configurar una carpeta extra en `config` y llamar a `copiarAVarios` al cerrar y en la copia manual, avisando si el USB no está.

### 4. Medio: la retención por número borra copias útiles en pocos días (sospecha por lectura)
`src/respaldo/respaldo.js:56-63` y `arranque.js:73,92`. Cada sesión hace 2 copias automáticas y se conservan 10, es decir, unas 5 sesiones. Si el docente borra o sobrescribe notas por error y lo nota una semana después, ya no queda ninguna copia anterior al error.
**Arreglo:** retención escalonada: las N más recientes más una por día de los últimos 30 días y una por mes.

### 5. Medio: un guardado en cola puede escribir las notas en otro periodo o materia (sospecha por lectura)
`src/ui/app.js:170-185`. `guardarAhora` lee `sel.materia` y `sel.periodo` cuando se ejecuta, no cuando se escribió la nota. Si quedó un guardado en cola en la fila (dos casillas editadas seguidas mientras el PUT y el GET siguen en curso) y el docente cambia de periodo o materia en el selector, el guardado en cola manda los valores de la fila vieja con el periodo nuevo y sobrescribe las notas del otro periodo. La ventana de tiempo es corta porque el servidor es local, pero la consecuencia es corrupción silenciosa.
**Arreglo:** capturar `materia_id` y `periodo` al crear la fila (`const ctxFila = { ...sel }`) y usarlos en el PUT.

### 6. Medio: la nivelación no se puede registrar después de cerrar el año (confirmado ejecutándolo)
`src/servicios/academico.js:225`. Con el año cerrado, `guardarNivelacion` lanza «El año 2026 está cerrado: solo se puede consultar». La nivelación suele hacerse al final del año o al inicio del siguiente. Si el docente cierra el año primero, no puede anotar la nota de nivelación, y la UI no ofrece cómo reabrir el año (`cerrarAnio` no tiene inverso).
**Arreglo:** permitir la nivelación en años cerrados, o avisar antes de cerrar que hay nivelaciones pendientes y permitir reabrir.

### 7. Medio: la UI promete que el Excel «recupera todo», pero los adjuntos de las guías no van en el Excel (confirmado por lectura)
`src/ui/app.js:332,562` y `src/excel/excel.js:13` (`guia_adjunto` no está en `TABLAS`). La exclusión está documentada en `tareas.md` T4.2 y `verificacion.md`, pero no en la pantalla. La importación no se rompe: la hoja no se exige, y en una base vacía las guías se recrean sin archivos (correcto). El riesgo es que el docente crea que el Excel lo guarda todo.
**Arreglo:** cambiar el texto a «recupera todo menos los archivos adjuntos de las guías; esos están en las copias de seguridad», y avisarlo también junto al botón «Adjuntar archivo».

### 8. Medio: dos arranques simultáneos pueden abrir la misma base (sospecha por lectura)
`src/arranque.js:60-67,82`. El lock no es atómico: se comprueba si existe y se escribe al final, después de `abrirBase` y de la copia. Un doble clic en el acceso directo lanza dos procesos que ven «no hay lock» y ambos abren la base y su servidor. Además, si el lock viejo apunta a un puerto que ahora usa otra aplicación con respuesta 200, el programa cree que ya está abierto y no arranca.
**Arreglo:** crear el lock con `fs.openSync(rutaLock, 'wx')` antes de abrir la base. Si falla, comprobar el pid y que `GET /api/estado` responda con el JSON del programa, no cualquier 200.

### 9. Bajo: una restauración o un cierre durante un Excel en curso termina en error 500 (sospecha por lectura)
`src/servidor/servidor.js:96-106,181-216`. Las rutas de Excel toman `bd()` y luego hacen `await`. Si en medio llega una restauración o el cierre por latido, el `procesar` corre sobre una conexión cerrada. El resultado es un 500 sin cambios a medias, porque la transacción no llegó a abrirse. No hay pérdida de datos, pero el mensaje es confuso.
**Arreglo:** un mutex simple de «operación larga en curso» que rechace la restauración con un mensaje claro.

### 10. Bajo: una nivelación con una materia inexistente da «error inesperado» (sospecha por lectura)
`src/servicios/academico.js:222-239`. No se valida `materia_id`. El error de FOREIGN KEY de SQLite llega como 500.
**Arreglo:** validar la materia con `ErrorValidacion`, como hace `guardarNotas`.

### 11. Bajo: el lote de copias «antes-de-*» es común a restaurar e importar
`src/respaldo/respaldo.js:60`. Varias importaciones confirmadas pueden sacar de la retención la única copia «antes-de-restaurar». Es poco probable.
**Arreglo:** un tope por cada motivo.

## Revisado sin encontrar problema
- **Redondeo** (`dominio/notas.js`): aritmética entera correcta para el periodo, `floor((suma+15)/30)`, y para el año, `floor((décimas+2)/4)`. Confirmado: 2,95/2,95/2,95 da 3,0; 2,96/2,96/2,93 da 3,0; 1,15×3 da 1,2; 3,0/3,0/2,9/3,0 da 3,0 y aprueba. No hay errores de coma flotante.
- **Notas incompletas y periodos faltantes:** el periodo queda «incompleta» y el año también si falta cualquier periodo. `aprobado(null)` devuelve null y `desaprobadas` lo excluye.
- **Nivelación:** solo se abre con el año completo y menor de 3,0. Se guarda aparte y no toca `nota`.
- **Escala:** la validación de rango y de dos decimales está en el dominio, en el servicio, en los CHECK de la base y en la importación de Excel.
- **Transacciones** (`conTransaccion`): rollback ante error. Las migraciones son atómicas por versión. Se rechaza una base de un esquema más nuevo sin modificarla.
- **Importación de Excel:** es todo o nada (simula, revierte, aplica). Detecta hoja desconocida o faltante, columnas, tipos, obligatorios y fechas como Date. Rechaza otra versión del esquema. Pide confirmación con datos existentes y hace copia antes de aplicar.
- **Respaldo:** `VACUUM INTO` es coherente. La restauración verifica integridad y versión antes de tocar nada, guarda la base actual, copia a `.restaurando` y luego la renombra. Las rutas de copia salen del listado de la carpeta, lo que impide el recorrido de directorios. El modo recuperación no abre una base dañada y ofrece la última copia sana.
- **Servidor:** escucha solo en 127.0.0.1. El token se compara en tiempo constante. Se comprueban Host (contra DNS rebinding) y Origin. Tiene límites de cuerpo (1 MB JSON, 50 MB raw) y corta en 4×. Los archivos estáticos van por lista blanca. Los nombres de archivo en cabeceras usan `filename*=UTF-8''` con `encodeURIComponent`, sin inyección de cabeceras. El SQL es siempre con parámetros. El `like` de guías usa `escape`. Las regex de rutas están ancladas y sin cuantificadores anidados (sin ReDoS). Los errores internos no filtran detalles.
- **UI:** se usa `h()` con `textContent`/`append` y no hay `innerHTML` en `app.js`. La CSP es `default-src 'self'` sin `unsafe-inline`.

---

## Respuesta del equipo de desarrollo (mismo día)

| Hallazgo | Acción | Evidencia |
|---|---|---|
| Alto 1 — Excel de otra base pisa registros | La base lleva un código de identidad (`base.id`) que viaja en el Excel. Con datos propios, un Excel de OTRA base se rechaza (`OTRA_BASE`) al analizar y al importar. En una base vacía se importa y adopta la identidad. Un Excel anterior al cambio (sin código) se acepta. | `excel.test.js` (2 pruebas nuevas), `servidor.test.js` |
| Alto 2 — apagado con la ventana abierta | Margen de 150 s (antes 30 s) y, si el propio vigilante se retrasó (suspensión), se da un plazo nuevo en vez de apagar. | `arranque.test.js` (suspensión simulada); mutación detectada |
| Alto 3 — sin copia a USB (CA-007-05) | Carpeta extra configurable en «Respaldo»; se copia al cerrar y en la copia manual; si la memoria no está, avisa y el programa sigue. | `arranque.test.js`, `revision.test.js` |
| Medio — retención 10 | Sube a 30 copias automáticas (unas 15 sesiones). Sigue siendo valor a validar con el docente. | — |
| Medio — guardado en cola en otro periodo | Cada fila guarda con el contexto con el que se dibujó. | Sin prueba automática propia: corrección por inspección |
| Medio — nivelación bloqueada en año cerrado | Nuevo «Reabrir año» (con confirmación). | `revision.test.js` |
| Medio — texto «recupera todo» | Las pantallas ahora dicen que los adjuntos de guías no van en el Excel. | — |
| Medio — bloqueo de instancia no atómico | Archivo creado con `wx`; el arranque perdedor se retira y se une al ganador. | `arranque.test.js` (arranque simultáneo); mutación detectada (la prueba se cuelga sin el bloqueo atómico) |
| Bajos (3) | No atendidos todavía. | — |

127 pruebas, tipos en 0, .exe reconstruido y con humo OK.
