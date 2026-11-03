# Diseño de producto: hoja del grado y gestión administrativa

- **Id:** pd-sistema-de-notas-administrativa-001
- **Fecha:** 2026-11-02
- **Autor:** agente `product-designer` de FORGE
- **Alcance:** completar Gestión Académica (hoja del grado) y crear Gestión Administrativa (matrícula, acudientes, certificados, directorio, circulares)
- **Excluido por pedido del docente:** convivencia escolar, cartera, gestión de calidad

---

## 0. Antes de leer: qué fuentes se pudieron consultar

La carpeta `C:\Users\usuario\Downloads\sistema-de-notas` **no existía** al hacer este diseño. No se pudieron leer `src\ui\app.js`, `docs\AUDITORIA-INTERFAZ.md` ni `DESIGN.md`. La carpeta `reportes` de esta ruta se creó solo para guardar este documento.

Lo que sí se usó:

| Fuente | Qué aportó |
|---|---|
| `Downloads\sistema-de-notas-windows (2)\LEEME.txt` | Nombres actuales del menú («Año y materias», «Copias y Excel», «Respaldo»), el uso sin internet y la copia de respaldo en Excel |
| `Downloads\sistema-de-notas-windows (2)\datos\notas.db` (solo lectura, solo estructura) | Qué guarda hoy el sistema: estudiante (nombre, documento, activo), matrícula por año y grado, grados de Transición a Quinto, notas por periodo (1 a 4) en escala de 1,0 a 5,0, umbral de aprobación, nivelación, asistencia (presente, ausente, excusa), una observación por estudiante y año, y datos de la sede (institución, sede, docente) |
| `forge\FORGE\logs\bitacora-rendimiento.md` | Estado del proyecto: v0.1.6, piloto con condiciones |

Consecuencias para este documento:

1. **Colores y tipografía.** No se citan valores del DESIGN.md porque no se pudo leer. Donde una pantalla necesita color, se nombra el **papel** del color («color de acento», «color de alerta», «color de texto secundario»). Quien implemente debe usar el valor que el DESIGN.md ya asigna a ese papel. No hay que agregar colores nuevos.
2. **Navegación.** No se conoce el menú exacto de `app.js`. La propuesta de agrupación (sección 1) hay que contrastarla con la auditoría de interfaz antes de construir.
3. **Antes de pasar a especificación**, alguien con acceso a la carpeta real debe revisar las secciones 1 y 6 contra `AUDITORIA-INTERFAZ.md` y `DESIGN.md`.

---

## 1. Producto

- **Nombre:** Sistema de Notas (se mantiene)
- **Frase:** Las notas y los papeles de la escuela, sin internet.
- **Para qué existe (en palabras del docente):** hoy el docente lleva las notas en el programa, pero la matrícula, los teléfonos de los acudientes, los certificados y las circulares los hace a mano o en Word, copiando los mismos datos una y otra vez. Con esto escribe una sola vez los datos de cada niño y de su familia, y de ahí salen el certificado, el directorio y la hoja del grado.

### Usuario real

Un docente de primaria rural que atiende solo de Transición a Quinto (escuela multigrado). Un solo computador, sin internet y a veces sin luz estable. Imprime poco y casi siempre en blanco y negro. Muchas familias tienen celular y pocas tienen correo. Puede haber niños con documento extranjero (PPT o PEP), niños con extraedad y niños que se trasladan a mitad de año.

### Agrupación propuesta del menú

Las dos áreas que pidió el docente, con lo que ya existe y lo nuevo:

- **Gestión académica:** notas, nivelación, asistencia, planeación, documentos (ya existen) + **Hoja del grado** (nueva).
- **Gestión administrativa (nueva):** **Matriculados por grado**, **Ficha de matrícula**, **Certificados**, **Directorio de acudientes**, **Circulares**.
- «Año y materias», «Copias y Excel» y «Respaldo» siguen igual.

Los títulos de las secciones del menú usan la fuente de títulos del DESIGN.md. Las acciones principales («Guardar matrícula», «Imprimir», «Descargar en Word») van en el color de acento. Hay una sola acción principal por pantalla.

---

## 2. Pantallas: Gestión académica (completar)

Tres pantallas. Todas trabajan con datos que el sistema ya tiene. No piden al docente nada nuevo.

### P0. Hoja del grado

- **Qué hace el docente aquí:** ve en una sola hoja cómo va cada estudiante de un grado (notas, asistencia y seguimiento) y la imprime.
- **Por qué existe:** hoy, para saber cómo va un grado, tiene que revisar notas, asistencia y observaciones por separado. Esta hoja le sirve en la entrega de informes a padres, en la comisión de evaluación y cuando lo pide la rectoría.
- **Elementos:**
  1. **Selector de grado y periodo** (grupo de botones): Transición a Quinto, y periodo 1, 2, 3, 4 o «Año completo». Muestra al lado el nombre de la sede y el año.
  2. **Tabla del grado**: una fila por estudiante, en orden alfabético. Columnas: nombre, una columna por materia del grado con la nota del periodo (o la definitiva si es «Año completo»), promedio, inasistencias del periodo separadas en «sin excusa» y «con excusa», nivelaciones pendientes y la primera línea del seguimiento.
  3. **Marcas de alerta**: las notas por debajo del umbral configurado salen en el color de alerta **y además con un signo** (por ejemplo, subrayadas), para que se vean en una impresión en blanco y negro.
  4. **Resumen al pie de la tabla** (con datos reales del grado, sin cifras inventadas): cuántos estudiantes tienen alguna materia por debajo del umbral y cuántos acumulan inasistencias sin excusa.
  5. **Celda vacía con explicación**: si falta una nota, la celda dice «sin nota», no muestra un cero. Así el promedio no engaña.
  6. **Botón «Imprimir hoja del grado»** (acción principal): la hoja sale horizontal, con el encabezado de la sede, el grado, el periodo y la fecha, y una línea de firma del docente.
- **Flujo:** Gestión académica, luego Hoja del grado, luego elegir grado y periodo, revisar, tocar un nombre para ver la Hoja individual (P1) y, por último, Imprimir.

### P1. Hoja individual del estudiante

- **Qué hace el docente aquí:** ve todo el año de un niño en una página: notas de los cuatro periodos por materia, asistencia por periodo, nivelaciones y seguimiento completo.
- **Por qué existe:** es lo que el docente muestra al acudiente en una citación, o lo que lleva a la comisión cuando un caso es difícil.
- **Elementos:**
  1. **Encabezado del estudiante:** nombre, documento, grado, edad y acudiente principal con su teléfono (sale de la Ficha de matrícula; si no hay datos, dice «Sin acudiente registrado» con un enlace para completarlo).
  2. **Tabla de notas:** materias por periodos 1 a 4 y definitiva, con la misma marca de alerta de P0.
  3. **Asistencia por periodo:** presentes, ausencias sin excusa y ausencias con excusa.
  4. **Nivelaciones:** materia, actividades, fecha y nota.
  5. **Seguimiento:** el texto completo de la observación, que se puede editar aquí mismo.
  6. **Botón «Imprimir hoja del estudiante».**
- **Flujo:** Hoja del grado, luego tocar un nombre, luego revisar o editar el seguimiento, luego imprimir o volver al grado.

### P2. Hojas de todos los grados

- **Qué hace el docente aquí:** imprime de una vez las hojas de los seis grados para un periodo.
- **Por qué existe:** en multigrado, el cierre de periodo es para todos los grados a la vez. Elegir grado por grado seis veces es fricción.
- **Elementos:**
  1. **Selector de periodo.**
  2. **Lista de grados con casillas** (todas marcadas al entrar) y, al lado de cada grado, cuántos estudiantes tiene y cuántos aún tienen notas sin registrar.
  3. **Aviso** si algún grado tiene notas sin registrar en el periodo, con el nombre del grado. El aviso no impide imprimir.
  4. **Botón «Imprimir grados marcados»:** cada grado empieza en hoja nueva.
- **Flujo:** Hoja del grado, luego «Imprimir todos los grados», luego elegir periodo, revisar avisos e imprimir.

---

## 3. Pantallas: Gestión administrativa (nueva)

Cinco pantallas, el máximo permitido. Los datos se escriben en un solo lugar (la Ficha de matrícula). Las otras cuatro pantallas solo leen esos datos o los imprimen.

### P0. Ficha de matrícula

- **Qué hace el docente aquí:** matricula a un estudiante nuevo, o completa los datos de uno que ya estaba en el sistema, y registra a sus acudientes.
- **Por qué existe:** es la fuente de todo lo administrativo. Sin ella no hay certificado ni directorio.
- **Elementos:**
  1. **Bloque «Estudiante»** (formulario):
     - nombres y apellidos por separado, porque el certificado los necesita así;
     - tipo de documento: Registro civil, Tarjeta de identidad, NUIP, PPT, PEP, Otro o «Aún sin documento»;
     - número de documento;
     - fecha de nacimiento, con la edad calculada al lado (solo informativa: la extraedad es normal en la escuela rural y no se marca como error);
     - sexo;
     - grado al que entra y fecha de matrícula (por defecto, hoy).
  2. **Bloque «Dónde vive»:** vereda o barrio, municipio y una casilla libre «Cómo llegar o indicaciones», porque en el campo la dirección rara vez tiene calle y número.
  3. **Bloque «Salud»:** EPS (texto con sugerencias de las EPS ya escritas antes, para no repetir) y régimen (contributivo, subsidiado, no sabe). La casilla «No tiene EPS» se puede marcar.
  4. **Bloque «Acudientes»** (lista de tarjetas, una o varias). Cada acudiente tiene: nombre completo, parentesco (madre, padre, abuela, abuelo, tía, tío, hermana o hermano mayor, madrina o padrino, otro), celular, segundo teléfono (opcional), correo (opcional) y una marca «Acudiente principal». Siempre hay exactamente un acudiente principal; si se marca otro, el anterior deja de serlo. Botón «Agregar otro acudiente».
  5. **Reutilizar un acudiente:** al escribir el nombre o el celular de un acudiente que ya existe (por ejemplo, la mamá de dos hermanos en grados distintos), el sistema lo ofrece: «Ya está registrada como acudiente de [nombre del hermano]. ¿Usar los mismos datos?». Así no se escribe dos veces, y si ella cambia de número se corrige en un solo lugar.
  6. **Avisos que no bloquean:** si el documento ya existe en otro estudiante, si falta el teléfono del acudiente principal o si no hay acudientes. Solo bloquean el guardado el nombre, el grado y al menos un acudiente con nombre.
  7. **Botones:** «Guardar matrícula» (acción principal), y después de guardar, «Imprimir certificado de matrícula».
- **Flujo:** ver la sección 4.

### P1. Matriculados por grado

- **Qué hace el docente aquí:** ve quién está matriculado en cada grado este año y a quién le faltan datos.
- **Por qué existe:** es la puerta de entrada a la Ficha de matrícula. También responde rápido a «¿cuántos niños tiene en tercero?».
- **Elementos:**
  1. **Pestañas de grado** (Transición a Quinto, y «Todos»), cada una con el número de matriculados.
  2. **Lista de estudiantes:** nombre, documento, edad, acudiente principal y celular.
  3. **Marca «Faltan datos»** en texto, junto al nombre, para los estudiantes que vienen del sistema actual (que hoy solo tiene nombre y documento) o a los que les falta fecha de nacimiento, EPS o acudiente. Un filtro «Solo los que tienen datos pendientes» ayuda a completarlos uno por uno.
  4. **Filtro «Ver retirados»:** los estudiantes retirados no aparecen por defecto, pero siguen disponibles para sacarles certificado de estudio.
  5. **Botón «Matricular estudiante»** (acción principal), que abre una Ficha de matrícula vacía con el grado de la pestaña ya elegido.
- **Flujo:** Gestión administrativa, luego Matriculados por grado, luego elegir grado y, desde ahí, tocar un nombre para abrir su Ficha, o tocar «Matricular estudiante».

### P1. Certificados

- **Qué hace el docente aquí:** genera e imprime el certificado de matrícula o el certificado de estudio de un estudiante.
- **Por qué existe:** las familias los piden para subsidios, traslados, EPS y trámites. Hoy el docente los redacta en Word cada vez.
- **Elementos:**
  1. **Buscador de estudiante** por nombre o documento. Incluye retirados y estudiantes de años anteriores que siguen en el sistema.
  2. **Elección del certificado** (dos opciones):
     - **Certificado de matrícula:** dice que el estudiante está matriculado en el grado tal, en el año en curso, en esta sede.
     - **Certificado de estudio:** dice que cursó el grado tal en el año tal, con la lista de materias, su valoración final y el desempeño (Superior, Alto, Básico o Bajo). Usa los rangos de desempeño que el sistema ya use en el boletín. Si no hay rangos definidos, el docente los fija una sola vez en «Datos del encabezado». Si el año no ha terminado, el certificado lo dice («cursa actualmente» y las notas parciales hasta el último periodo con notas), en vez de inventar una nota final.
  3. **Vista previa en hoja carta**, igual a como saldrá: encabezado de la institución y la sede, cuerpo, ciudad y fecha de expedición, «Se expide a solicitud de [acudiente principal]» (se puede cambiar) y líneas de firma.
  4. **Datos del encabezado** (se llenan una vez y se recuerdan): nombre de la institución y de la sede (ya existen), código DANE, municipio y departamento, nombre de la persona que firma y su cargo. Puede haber una o dos firmas (por ejemplo, rector o rectora, y docente), porque en muchas sedes rurales el certificado oficial lo firma la rectoría. El docente decide.
  5. **Campos faltantes señalados en la vista previa:** si falta, por ejemplo, el documento del estudiante, la vista previa muestra «[falta documento]» resaltado y un enlace a la Ficha. Se puede imprimir igual, pero el docente lo ve.
  6. **Botones:** «Imprimir» (acción principal), «Descargar PDF» y «Descargar Word» (para retocarlo si la rectoría pide otro formato).
- **Flujo:** Gestión administrativa, luego Certificados, luego buscar estudiante, elegir el tipo, revisar la vista previa e imprimir o descargar. También se llega desde la Ficha de matrícula con el estudiante ya elegido.

### P1. Directorio de acudientes

- **Qué hace el docente aquí:** imprime la lista de contactos de las familias de un grado o de toda la escuela.
- **Por qué existe:** para llamar rápido cuando un niño se enferma, para la cadena de avisos y para dejar una copia en el escritorio.
- **Elementos:**
  1. **Selector de grado** (uno, varios o todos).
  2. **Tabla:** estudiante, acudiente principal, parentesco, celular, y otros acudientes con su celular. El correo solo aparece si se marca «Incluir correos», porque pocas familias lo usan y así la hoja es más corta.
  3. **Aviso de cuidado de datos**, en texto secundario, sobre la tabla y en el pie de la hoja impresa: «Datos personales de menores y sus familias. Uso exclusivo de la sede. No publicar.» (por la ley colombiana de protección de datos personales).
  4. **Lista de faltantes:** estudiantes sin celular de acudiente, para completarlos.
  5. **Botón «Imprimir directorio»** (acción principal) y «Descargar Word».
- **Flujo:** Gestión administrativa, luego Directorio, luego elegir grados, revisar faltantes e imprimir.

### P2. Circulares a acudientes

- **Qué hace el docente aquí:** redacta una circular (reunión de padres, entrega de informes, vacunación, salida pedagógica), la guarda y la descarga en PDF o Word para imprimirla.
- **Por qué existe:** hoy la escribe en Word desde cero y copia el encabezado cada vez.
- **Elementos:**
  1. **Lista de circulares escritas**, la más reciente arriba: número, fecha, asunto y a quién va. Botón «Escribir circular».
  2. **Editor de la circular:**
     - número consecutivo automático en el año (se puede cambiar);
     - fecha;
     - «Para»: acudientes de toda la sede o de los grados que se marquen;
     - asunto;
     - cuerpo, con negrita, listas y párrafos, nada más;
     - firma (sale de los Datos del encabezado de Certificados).
  3. **«Partir de una circular anterior»:** copia una circular ya escrita para editarla. Es la forma simple de tener plantillas sin crear una pantalla de plantillas.
  4. **Desprendible opcional** al pie, con la casilla «Agregar desprendible de recibido» («Yo, ______, acudiente de ______, recibí la circular N.° __»), para que las familias devuelvan firmado.
  5. **Vista previa en hoja carta** con el mismo encabezado de los certificados.
  6. **Botones:** «Descargar PDF» (acción principal), «Descargar Word» e «Imprimir». Cuántas copias imprimir lo indica el sistema según los grados marcados («Para 3.° y 4.°: 14 familias»), porque hermanos en grados distintos cuentan una sola vez.
- **Flujo:** Gestión administrativa, luego Circulares, luego Escribir circular (o Partir de una anterior), luego redactar, revisar la vista previa y descargar o imprimir.

---

## 4. Flujo: matricular a un estudiante con acudientes e imprimir su certificado

Caso: llega la abuela de Valentina, que viene de otra vereda a Segundo, y pide un certificado de matrícula para el subsidio.

1. El docente abre el programa y entra a **Gestión administrativa**, luego a **Matriculados por grado** y elige la pestaña **Segundo**. Ve la lista actual del grado.
2. Toca **«Matricular estudiante»**. Se abre una **Ficha de matrícula** vacía, con el grado Segundo y la fecha de hoy ya puestos.
3. Llena el bloque **Estudiante**: nombres, apellidos, tipo de documento (Tarjeta de identidad), número y fecha de nacimiento. Al lado aparece la edad («8 años»).
4. Llena **Dónde vive** (vereda, municipio e indicaciones) y **Salud** (empieza a escribir la EPS y la elige de las sugerencias; régimen subsidiado).
5. En **Acudientes**, escribe a la abuela: nombre, parentesco «Abuela», celular. Queda marcada como **acudiente principal** porque es la primera.
6. Toca **«Agregar otro acudiente»** y escribe a la mamá, que trabaja en otro municipio: nombre, parentesco «Madre», celular y correo.
   - Variante: si al escribir el celular de la mamá el sistema dice «Ya está registrada como acudiente de [hermano en Cuarto]», el docente toca **«Usar los mismos datos»** y no escribe nada más.
7. Toca **«Guardar matrícula»**.
   - Si el número de documento ya existe en otro estudiante, aparece un aviso con el nombre de ese estudiante y dos opciones: «Es otra persona, guardar igual» o «Abrir ese estudiante». Así no se duplica a un niño que estaba retirado.
   - Si todo está bien, aparece la confirmación «Valentina quedó matriculada en Segundo, 2026», y debajo el botón **«Imprimir certificado de matrícula»**.
8. Toca ese botón. Se abre **Certificados** con Valentina y «Certificado de matrícula» ya elegidos, y se ve la vista previa.
9. **Solo la primera vez:** si faltan los Datos del encabezado (código DANE, municipio o quién firma), la vista previa los muestra como «[falta código DANE]» y el panel de Datos del encabezado queda abierto al lado. El docente los llena una vez y no se le vuelven a pedir.
10. Revisa la vista previa. La línea «Se expide a solicitud de» ya dice el nombre de la abuela, porque es la acudiente principal.
11. Toca **«Imprimir»**. Si no tiene impresora a mano, toca **«Descargar PDF»** y lo lleva en la memoria USB.
12. Vuelve a **Matriculados por grado**: Valentina aparece en Segundo, con su acudiente principal y celular, y sin la marca «Faltan datos». Desde ese momento también aparece en el **Directorio de acudientes** y en la **Hoja del grado**.

---

## 5. Qué entra en V1 y qué queda fuera

### Entra en V1

- Ficha de matrícula completa: datos del estudiante, dónde vive, salud y uno o varios acudientes con exactamente uno principal.
- Reutilizar un acudiente entre hermanos.
- Completar los datos de los estudiantes que ya estaban en el sistema, con la marca «Faltan datos».
- Matriculados por grado, con el filtro de retirados.
- Certificado de matrícula y certificado de estudio, con vista previa e impresión, descarga en PDF y en Word, y Datos del encabezado con una o dos firmas.
- Directorio de acudientes imprimible por grado, con aviso de datos personales.
- Hoja del grado (P0) y Hoja individual del estudiante (P1).
- Circulares: redactar, numerar, partir de una anterior, vista previa y descarga en PDF y Word.
- **Respaldo:** todo lo nuevo (fichas, acudientes, circulares y datos del encabezado) debe viajar en el Excel de respaldo y en la copia completa, igual que hoy las notas. Si no está en el respaldo, el docente puede perderlo, y eso es peor que no tenerlo. Es requisito de V1, no un extra.

### Queda fuera de V1

- Convivencia escolar, cartera y gestión de calidad (excluidas por el docente).
- Enviar circulares o avisos por correo, SMS o WhatsApp: el sistema no usa internet. El docente descarga y comparte por su cuenta.
- Circulares personalizadas con el nombre de cada estudiante (una copia por niño). Queda como candidata a fase posterior.
- Renovación automática de matrícula al año siguiente (pasar a todos al grado siguiente). Los acudientes y los datos personales sí se conservan de un año a otro porque pertenecen al estudiante. Pero la promoción de grado depende de cómo cierra hoy el año lectivo, y eso hay que revisarlo en el código actual antes de diseñarla.
- Fecha y motivo de retiro y traslado. Hoy solo existe «activo o retirado».
- Campos del SIMAT que el docente no pidió: grupo étnico, discapacidad, SISBÉN, víctima del conflicto, desplazamiento. Exportar al SIMAT.
- Registro de certificados expedidos (cuántos, a quién, cuándo).
- Foto del estudiante y firmas escaneadas en los certificados.
- Hoja del grado con gráficas.

---

## 6. Alcance por fases

El orden sigue el calendario. Hoy es 2 de noviembre: se acerca el cierre del cuarto periodo y empieza la temporada de matrículas y traslados para el año siguiente.

| Fase | Qué incluye | Por qué en este orden | Listo cuando |
|---|---|---|---|
| **F7. Matrícula y acudientes** | Ficha de matrícula, Matriculados por grado, reutilizar acudiente, marca «Faltan datos», respaldo de lo nuevo en el Excel y la copia completa | Todo lo administrativo depende de estos datos, y noviembre a enero es temporada de matrícula | El docente matricula un niño con dos acudientes, cierra el programa, restaura el Excel en otra carpeta y los datos siguen ahí |
| **F8. Certificados y directorio** | Certificados (matrícula y estudio) con Datos del encabezado, Directorio de acudientes | Son lo que las familias piden en diciembre y enero (traslados, subsidios) y solo leen datos de F7 | El docente imprime un certificado de cada tipo y el directorio de un grado, y los revisa en papel, en blanco y negro |
| **F9. Hoja del grado** | Hoja del grado, Hoja individual del estudiante, Hojas de todos los grados | Usa solo datos que ya existen y sirve en el cierre del cuarto periodo | La hoja impresa de un grado cabe en una página horizontal y las alertas se distinguen sin color |
| **F10. Circulares** | Lista, editor, partir de una anterior, desprendible, PDF y Word | Es lo más independiente y lo único que tiene editor de texto | El docente escribe una circular, la descarga en Word, la abre en el computador y se ve igual que la vista previa |

Nota: si el docente prefiere tener primero la Hoja del grado para la comisión de fin de año, F9 puede ir antes de F7 sin problema, porque no depende de las otras fases. Hay que preguntárselo.

---

## 7. Decisiones de producto tomadas por falta de información (hay que validarlas con el docente)

1. **Quién firma los certificados:** se diseñó con una o dos firmas configurables. Hay que confirmar si la rectoría acepta certificados generados en la sede o solo una constancia del docente.
2. **Desempeño en el certificado de estudio:** se usan los rangos del boletín actual. Si el sistema no los tiene, hay que pedírselos al docente (salen del SIEE de su institución) y no inventarlos.
3. **Separar nombres y apellidos:** hoy el sistema guarda el nombre completo en un solo campo. Para los estudiantes existentes, la Ficha propone una separación que el docente confirma.
4. **El correo es opcional** en todo y no aparece por defecto en el directorio impreso.
5. **El directorio lleva aviso de datos personales:** es protección mínima, no consejo legal.

---

## 8. Revisión anti-AI-slop

| Pregunta | Resultado |
|---|---|
| ¿Usé colores que no están en el DESIGN.md? | No. Solo se nombran papeles de color (acento, alerta, texto secundario) para usar con los valores ya decididos. No se citan valores porque el DESIGN.md no se pudo leer (ver sección 0). |
| ¿Puse métricas inventadas? | No. Los números que aparecen en las pantallas salen de los datos reales del docente. El «14 familias» del ejemplo es ilustrativo y está marcado como ejemplo de cálculo. |
| ¿Propuse emojis como iconos? | No. Las alertas usan texto y subrayado. |
| ¿Hay copy de relleno? | No. Los textos de ejemplo son los mensajes reales que vería el docente. |
| ¿Hay nombres de pantalla genéricos? | No. Los nombres son Hoja del grado, Hoja individual del estudiante, Hojas de todos los grados, Ficha de matrícula, Matriculados por grado, Certificados, Directorio de acudientes y Circulares a acudientes. |
| P1-D (pasos de relleno) | No aplica. El flujo de la sección 4 es el flujo real de la tarea. |
