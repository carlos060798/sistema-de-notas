# Auditoría final independiente (segunda revisión), 2026-10-31

**Veredicto:** se puede entregar para un piloto **con condiciones**: (1) corregir el hallazgo A1 (un Excel de otra base sin la fila `base_id` se importa y pisa estudiantes y materias), (2) corregir o documentar A2 (los Excel exportados con una versión anterior ya no se pueden importar), y (3) decirle al docente por escrito que los adjuntos de las guías **no** viajan en el Excel (A3).

Cómo trabajé: leí el código señalado y ejecuté `node --test tests/*.test.js` (148 de 148 pasan, unos 10 s). Escribí un script propio fuera del proyecto (`scratchpad/mig.mjs`). Ese script crea una base con el esquema 1 y con datos, la abre con `abrirBase`, hace la ida y vuelta por Excel y prueba los casos de abajo. No toqué `src/` ni `tests/`.

## Hallazgos

### Alto

**A1. Se puede burlar la comprobación de «otra base» y el Excel pisa datos de otras personas.** `src/excel/excel.js:72-77` (`exigirMismaBase`). *Confirmado ejecutándolo.*
- **Qué falla:** solo se rechaza el Excel si en `_version` la celda A3 dice `base_id` y B3 no está vacía. Si falta esa fila, el Excel se acepta como «de una versión anterior».
- **Por qué la excepción no sirve:** `leerLibro` (líneas 92-95) ya rechaza cualquier Excel cuyo esquema no sea exactamente 5. Todo Excel válido lo produjo esta versión y trae `base_id`, así que la excepción no protege ningún caso legítimo y solo deja abierta la puerta.
- **Caso:** exporté una base B (estudiante Pedro, materia Ciencias), borré la fila 3 de `_version` e importé el archivo con `confirmar:true` en una base A (estudiante Ana, materia Matemáticas). Resultado: el estudiante 1 pasó a ser «Pedro», la materia 1 pasó a ser «Ciencias», y las notas de Ana quedaron colgando de Pedro. Además la hoja `config` reemplazó el `base.id` de A por el de B, así que la base cambió de identidad sin aviso.
- **Cómo pasa en la práctica:** basta con que alguien abra el Excel, ordene o limpie la hoja `_version` y lo guarde.
- **Arreglo:** exigir siempre `base_id` cuando la base tiene datos (si falta, tratarlo como de otra base). Comprobar también la fila `base.id` de la hoja `config`. Nunca sobrescribir `base.id` desde el Excel cuando la base ya tiene datos.

**A2. Los Excel de versiones anteriores ya no se pueden importar.** `src/excel/excel.js:92-95`. *Sospecha por lectura, coherente con el código.*
- **Qué falla:** el esquema subió de 1 o 2 a 5, y la importación exige que el esquema sea exactamente 5.
- **Consecuencia:** un docente que solo guardó el Excel de la versión 0.1.0 (el «seguro de vida» de la constitución) ya no puede reconstruir sus datos con el programa actual. La spec CA-008-04 pide rechazar el Excel de otra versión, pero el Principio IV dice que el Excel es el seguro de vida. Hoy se cumple el criterio a costa del principio.
- **Arreglo:** aceptar esquemas más viejos. Se carga el Excel en una base temporal creada con ese esquema, se aplican las migraciones y después se compara o importa. Como mínimo, el mensaje debe decir con qué versión del programa se abre ese archivo.

**A3. Los adjuntos de las guías no están en el Excel.** `src/excel/excel.js:13`: `guia_adjunto` no está en `TABLAS`. *Confirmado por lectura; la trazabilidad lo admite.*
- **Qué falla:** si el portátil se daña y solo queda el Excel, los archivos adjuntos se pierden, y la pantalla de exportar no lo advierte.
- **Cruce con los criterios:** CA-008-01 dice «se exportan todos los datos», así que marcarlo «Cumplido» está sobrestimado (ver punto 8).
- **Arreglo:** guardar los adjuntos en una carpeta junto al `.xlsx`, o en una hoja con base64 si caben. Si no, poner un aviso visible al exportar e incluir los adjuntos en la copia a USB, que ya los lleva porque es la `.db`.

### Medio

**M1. La copia manual a USB usa una retención fija de 30.** `src/servidor/servidor.js:185`: `copiarAExtra(bd(), 'manual', 30)` no llama a `leerRetencion`. *Sospecha por lectura.*
- **Caso:** si el docente configuró 100 copias, cada «Hacer copia ahora» recorta las copias automáticas de la USB a 30.
- **Arreglo:** usar `leerRetencion(bd())`.

**M2. La retención en la carpeta extra borra copias de cualquier base.** `src/respaldo/respaldo.js:56-64`, llamado desde `src/respaldo/extra.js:41`. *Sospecha por lectura.*
- **Qué falla:** los nombres de las copias no llevan el `base.id`. Si dos docentes, o dos equipos, usan la misma USB o carpeta, la retención de uno borra las copias del otro, porque `aplicarRetencion` toma todos los archivos `notas-*.db`. Lo mismo pasa si el docente elige como carpeta extra la propia carpeta `copias`.
- **Arreglo:** incluir un prefijo de `base.id` en el nombre de la copia en la carpeta extra y aplicar la retención solo a ese prefijo. Rechazar como carpeta extra la carpeta de datos y sus subcarpetas.

**M3. El Excel lleva la carpeta extra configurada en otro equipo.** El Excel exporta la hoja `config` completa, incluida `respaldo.carpeta_extra`. *Sospecha por lectura.*
- **Caso:** al reconstruir en otro equipo, el programa empieza a escribir copias al cerrar en `E:\Respaldos`, o en la ruta que fuera. En el equipo nuevo esa letra puede ser otro disco, y el usuario no lo pidió en ese equipo.
- **Arreglo:** no importar las claves de configuración propias del equipo (`respaldo.*`), o pedir que se confirmen.

**M4. Al cambiar la nota mínima, las nivelaciones ya registradas quedan fuera de toda vista.** Ver `src/servicios/academico.js:283-286`. *Confirmado ejecutándolo.*
- **Caso:** un estudiante tiene el año en 2,0 y una nivelación registrada. El docente baja la nota mínima a 2,0. El estudiante desaparece de «pendientes», `guardarNivelacion` ya no deja editar esa nivelación («solo se abre cuando… menor de 3,0») y el boletín sigue mostrando la nota de nivelación junto a «Aprobado».
- **Arreglo:** permitir editar o borrar una nivelación ya existente sin importar la nota mínima, y avisar al cambiarla si hay nivelaciones registradas.

**M5. Algunas rutas escriben datos de una materia fuera de sus grados sin validar.** *Parcialmente confirmado.*
- **Nivelación:** `guardarNivelacion` (`academico.js:274`) no llama a `materiaEnGrado`. *Confirmado: la guardó.*
- **Importación de Excel:** escribe notas de materias fuera de su grado y escribe en años **cerrados**, porque no usa `exigirAnioAbierto`.
- **`copiarPlanes`:** copia planes de grados ya quitados.
- **Al quitar un grado de una materia:** las notas ya escritas se siguen viendo en `listarNotas` y siguen contando en «No aprueban» y en el boletín, pero ya no se pueden corregir. Comprobé que `guardarNotas` las bloquea. Además la pantalla de Notas ya no ofrece esa materia para ese grado, así que quedan notas «fantasma» que el docente no puede ver ni arreglar desde Notas.
- **Arreglo:** al quitar un grado con notas, avisar y pedir confirmación, o bloquear. Validar los grados en la nivelación. Decidir y documentar si el Excel puede saltarse la regla de año cerrado.

### Bajo

- **B1. Textos con «3,0» fijo aunque la nota mínima cambie.** El texto de la pantalla de nivelación (`src/ui/app.js:284`) y los mensajes de `academico.js:285` y `:238/:294` dicen «menor de 3,0». La lógica sí usa la nota configurada; solo el texto queda fijo. *Confirmado: el mensaje salió así con nota mínima 2,0.*
- **B2. La interfaz usa `prompt()` y `confirm()`.**
  - Usa `prompt()` para observaciones y para renombrar materia (`app.js:264`, `app.js:448`) y `confirm()` en 11 lugares.
  - El `prompt` de observaciones es de una sola línea y no deja ver ni editar con comodidad hasta 1000 caracteres.
  - En una ventana `--app` de Edge funcionan, pero no se ven como el resto de la interfaz y un toque accidental en Enter confirma.
  - Más grave: si el navegador marca «no permitir más diálogos», `confirm` devuelve `false` sin avisar y botones como «Cerrar año» dejan de responder.
  - No hay `innerHTML`: todo pasa por `h()` con `textContent` y `append`.
- **B3. La carpeta extra se crea sola si la ruta tiene un error.** `guardarCarpetaExtra` (`extra.js:25`) usa `mkdirSync(..., {recursive:true})`: con una ruta mal escrita, por ejemplo `C:\Respaldo\s`, crea carpetas nuevas en el disco del equipo sin preguntar. Acepta rutas UNC (`\\servidor\x`), que en el cierre pueden tardar decenas de segundos.
- **B4. Copias al cerrar pendientes tras una suspensión.** En `src/arranque.js:113-117`, después de una suspensión se da un nuevo plazo. Si al volver no hay ventana, el apagado tarda hasta 150 s más. Es correcto, solo lo anoto. El candado `wx` funciona. En la carrera «candado viejo + dos arranques», ambos llegan a abrir la base y a hacer una copia «abrir» antes de que uno se retire. Esto no daña nada, porque `begin immediate` y `vacuum into` van a archivos distintos, pero deja una copia de más.
- **B5. Adjuntos de texto y nombres de archivo.** Los `.txt` se sirven como `text/plain`, con `attachment` y `nosniff`: no hay riesgo de ejecución. El nombre del adjunto se limpia de carpetas y caracteres de control, pero se aceptan nombres como `x.pdf` con contenido arbitrario: no se comprueba el contenido, solo la extensión. Riesgo bajo por el `attachment`.

## Lo pedido, punto por punto

1. **Migraciones 3-5:** *confirmado ejecutándolo.*
   - Creé una base de esquema 1 con años, materias, estudiantes, matrículas, notas, nivelación y configuración. `abrirBase` la llevó a `user_version` 5.
   - Los conteos son idénticos, `foreign_key_check` vuelve vacío e `integrity_check` da `ok`.
   - Los `alter table` son válidos en SQLite: las columnas con `references` tienen valor por defecto NULL, las de texto `not null` tienen `default ''` y el `check` admite NULL.
   - Cada migración corre en su propia transacción.
2. **Excel:** la ida y vuelta de una base migrada da tablas idénticas, incluida la identidad `base.id`. El orden aula→área funciona: los planes con `plan_area_id` nulo se cargan primero y `copiarPlanes` hace lo mismo. Problemas encontrados: A1, A2, A3 y M3. La importación no borra filas que falten en el Excel; es un upsert, y lo considero aceptable porque no pierde datos.
3. **Materias por grado:** `guardarNotas` y la planeación (`exigirMateria`) validan bien. Lo que queda abierto está en M5.
4. **Nota mínima:** la planilla, el boletín, el certificado, «No aprueban», la nivelación, el resumen de Hoy (vía `desaprobadas`) y `guardarNotas` usan `leerUmbral`. No encontré ningún `aprobado(` sin la nota configurada en el código de servicios y reportes. Quedan B1 y M4. La validación de un solo decimal funciona: 2,05 se rechaza.
5. **USB, retención, latidos y candado:** M1, M2, M3, B3 y B4. Las rutas relativas se rechazan con `path.isAbsolute`. No hay escritura fuera de la carpeta de datos salvo la carpeta extra, más el caso M3.
6. **Adjuntos:**
   - El tamaño máximo es 15 MB y el cuerpo HTTP está limitado.
   - Hay una lista cerrada de extensiones, sin HTML, SVG ni JS.
   - Se descargan con `content-disposition: attachment`, `nosniff` y una CSP estricta.
   - Se leen por id desde la base: no hay ruta de archivo, así que no hay *path traversal*.
7. **Interfaz:** B2. Los estados vacíos de «año sin materias» («Aún no hay materias.») y de «materia sin grado» (= todos los grados) están cubiertos. Las notas fantasma del caso M5 son el flujo que se rompe.

## Punto 8: verificación de la trazabilidad (revisé 10 criterios)

| Criterio | Dice | Mi resultado |
|---|---|---|
| CA-001-01 materias por grado | Cumplido; el servidor rechaza fuera de grado | **Sobrestimado en parte.** Notas y planeación sí; la nivelación y el Excel no (M5). |
| CA-002-02 nota mínima configurable | Cumplido | **Confirmado** en la lógica; textos fijos (B1) e inconsistencia con nivelaciones (M4). |
| CA-002-04 desaprobadas | Cumplido | **Confirmado** (ejecutado). |
| CA-003-02 nivelación aparte | Cumplido | **Confirmado**: no reemplaza la nota original. |
| CA-004-03 copiar planes | Cumplido | **Confirmado** por lectura: conserva el enlace y no duplica. |
| CA-005-01 guía con adjuntos | Cumplido | **Confirmado**. |
| CA-007-01 N configurable | Cumplido | **Casi.** En la copia manual a USB la N está fija en 30 (M1). |
| CA-007-05 carpeta USB | Cumplido | **Confirmado**, con los riesgos M2 y M3. |
| CA-008-01 exportar todo | Cumplido | **Sobrestimado:** faltan los adjuntos (A3). Debería decir «Con desviación». |
| CA-008-02 ida y vuelta idéntica | Cumplido | **Confirmado ejecutándolo**, incluidas asistencia, observación y materia_grado (tablas vacías y llenas en mi prueba). |
| CA-008-03 confirma y rechaza otra base | Cumplido | **Sobrestimado:** el rechazo se burla (A1). |
| CA-008-04 rechaza otra versión | Cumplido | **Confirmado**, pero en contra del Principio IV (A2). |

La conclusión «33 de 33» no se sostiene. Lo honesto es: CA-008-01 y CA-008-03 con desviación, y CA-001-01 y CA-007-01 con matices.

## Revisado sin hallar problema

- Migraciones 3-5 sobre una base existente con datos.
- Ida y vuelta por Excel de todas las tablas de `TABLAS`.
- Orden de carga aula→área.
- `guardarNotas` y las validaciones de la planeación por grado.
- Uso de `leerUmbral` en todas las decisiones de aprobado.
- Validación de la nota mínima.
- Candado atómico `wx` y reemplazo de un candado viejo.
- Detección de suspensión en el vigilante de latidos.
- Rechazo de rutas relativas en la carpeta extra.
- Adjuntos: tipos, tamaño, cabeceras, CSP y `nosniff`.
- Ausencia de `innerHTML` en la interfaz.
- La suite de pruebas: 148 de 148 en verde.

---

## Respuesta del equipo de desarrollo (v0.1.5)

| Hallazgo | Acción | Evidencia |
|---|---|---|
| Alto A1 — Excel sin la fila base_id se importaba | Sin identidad, un Excel solo se importa en una base vacía; con datos se rechaza con un mensaje que lo explica. La hoja config ya no cambia la identidad de una base con datos. | `auditoria-final.test.js` (3 pruebas) |
| Alto A2 — Excel de versiones anteriores no se importaban | Se aceptan esquemas 1 a actual: las tablas y columnas añadidas después se completan con valores por defecto. Un esquema más nuevo o inválido se sigue rechazando. | `auditoria-final.test.js` (3 pruebas) |
| Alto A3 — adjuntos fuera del Excel | No se puede meter archivos en un Excel. Nuevo «Descargar copia completa» (.db con adjuntos) y «Traer una copia completa guardada»; avisos en pantalla y en el LEEME; CA-008-01 pasa a «con desviación». | `auditoria-final.test.js` |
| M1 — copia manual recortaba a 30 | Usa el número configurado. | Por inspección |
| M2 — dos bases en la misma USB se borran copias | Subcarpeta por base dentro de la carpeta extra. | `auditoria-final.test.js` |
| M3 — el Excel llevaba la ruta de la USB | No se exporta ni se importa esa clave. | `auditoria-final.test.js` |
| M4 — nivelación no editable tras cambiar la nota mínima | Una nivelación ya abierta sigue editable. | `auditoria-final.test.js` |
| M5 — notas fuera de grado | Se avisa cuántos estudiantes quedan así al quitar un grado. La importación de Excel no valida grados (es una restauración). | `auditoria-final.test.js` |
| Bajos | Corregidos: textos con «3,0» fijo, carpeta extra que se creaba sola con ruta errónea. Sin cambio: uso de `prompt()`/`confirm()`. | — |
| Trazabilidad «33 de 33» | Corregida: 29 sin reservas, 3 con salvedad, 1 con desviación. | `docs/TRAZABILIDAD-SPEC.md` |

159 pruebas, tipos en 0.

### Pendientes que quedaban, cerrados en v0.1.6
- `prompt()` y `confirm()` del navegador reemplazados por ventanas propias (el foco empieza en «Cancelar» en las preguntas de borrar o cerrar). Probado en Edge real.
- Importación de Excel: el resumen previo avisa cuántas notas tocarían un año cerrado o una materia fuera de su grado (`auditoria-final.test.js`).
- Restauración durante un Excel en curso: ahora tiene prueba automática (opción `retardoExcel` solo para pruebas).
- Certificado: fecha de expedición en palabras. Plan de área en PDF y Word: títulos de sección en negrita. PDF de boletín, certificado y plan revisados a la vista.
- Hoja para validar las decisiones de calificación con el docente: `docs/VALIDACION-DOCENTE.md`.
- Sin hacer: prueba en el ASUS con Windows 10; los Word no se pudieron ver (no hay Word ni LibreOffice en el equipo de desarrollo).
