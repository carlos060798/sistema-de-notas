# Rediseño completo de la interfaz del Sistema de notas

- **Fecha:** 2026-11-02
- **Roles:** explorador de código y diseño, luego agente `product-designer` de FORGE (con la lista anti-AI-slop de `craft/anti-ai-slop.md`)
- **Estado:** propuesta. No se cambió ningún archivo de `src/` ni de `tests/`.
- **Fuentes leídas:** `src/ui/index.html`, `src/ui/app.js` (774 líneas), `src/ui/estilos.css`, las rutas de `src/servidor/servidor.js`, los mensajes de error de `src/servicios/*.js` y `src/datos/base.js`, `DESIGN.md`, `reportes/2026-10-31-revision-diseno.md` y los dos diseños del 2 de noviembre (producto e interacción administrativa).
- **Referencia externa:** se miró la página pública de webcolegios.com solo para entender cómo organiza la navegación. Agrupa por grandes módulos (académico, administrativo y otros) y deja las tareas del docente dentro del módulo académico. De eso se toma solo la idea de **agrupar por áreas de trabajo**. No se copia ningún color, texto, logo, icono, imagen ni código. El patrón de abajo es propio: está organizado por **tareas del docente** y no por módulos de la institución.

### Decisiones pendientes del colegio (no se inventan; se marcan donde afectan)

| Código | Decisión pendiente | Dónde aparece en este diseño |
|---|---|---|
| **D1** | Si los datos nuevos (fichas, acudientes, circulares) entran en el Excel de respaldo y en la copia completa | Respaldo, Ficha del estudiante, Circulares |
| **D2** | Datos de la institución: código DANE, resolución, quién firma | Ajustes > Institución, Certificados, Circulares |
| **D3** | Nombre en uno o en dos campos | Ficha del estudiante, Certificados |
| **D4** | Texto de la autorización de datos personales | Ficha del estudiante |
| **D5** | Transición con informes descriptivos o con notas | Notas, Reporte del grado, Boletines |
| **D6** | Paso de año en bloque | Ajustes > Año y materias |

---

## Parte 1. Exploración: cómo está hoy

### 1.1 Pantallas actuales (8 en el menú y 1 especial)

| # | Menú | Qué tiene | Acciones |
|---|---|---|---|
| 1 | **Hoy** | Selector de año; aviso «Haga hoy su copia en Excel» si toca; 5 o 6 tarjetas con cifras (estudiantes, no aprueban, nivelaciones, % de temas, última copia, último Excel); «Qué quiere hacer» con 3 botones | Descargar Excel ahora, Ver quiénes, Ver nivelaciones, Poner notas, Agregar un estudiante, Planear una clase |
| 2 | **Notas** | Barra fija con Año, Grado, Materia y Periodo (4 listas); tabla Estudiante · Nota 1 · Nota 2 · Nota 3 · Periodo · Estado · Año; línea de resumen; planilla | Escribir la nota (se guarda al salir del campo), flechas ↑↓, Excel, PDF |
| 3 | **Estudiantes** | Año; formulario Nombre, Documento, Grado; tabla por grado con Nombre, Documento, Estado y botones | Agregar estudiante, Editar (solo nombre y documento), Observaciones (ventana), Documentos (Boletín PDF/Word, Certificado PDF/Word), Archivar/Reactivar |
| 4 | **No aprueban** | Año, Definitiva (del año o de un periodo), Periodo, Grado, Materia; tablas por grado y materia | Solo consulta |
| 5 | **Nivelación** | Año; una tarjeta por estudiante y materia por debajo de la nota mínima | Actividades, fecha, nota de nivelación, Guardar |
| 6 | **Planeación** | Año, Grado, Materia; pestañas Temas y avance · Clases · Planes de área y aula · Guías · Asistencia | Agregar tema, cambiar estado, Quitar; planear clase, marcar hecha; crear y editar planes, Word/PDF, copiar a otro año; buscar, crear y editar guías, adjuntar archivos; asistencia con lista por estudiante y «Marcar a todos presentes» |
| 7 | **Respaldo** | Cinco tarjetas: Excel «su seguro de vida» (con copia completa y recuperar desde Excel), carpeta USB, cuántas copias guardar, traer copia .db, lista de copias | Descargar todo en Excel, Descargar copia completa, Revisar archivo, Aplicar, Guardar carpeta, Guardar, Agregar a mis copias, Crear copia ahora, Restaurar |
| 8 | **Año y materias** | Datos de la institución (nombre, sede, docente), nota mínima, años lectivos, materias | Guardar datos, Guardar nota mínima, Crear año, Cerrar/Reabrir año, Agregar materia, Grados (casillas), Cambiar nombre |
| — | **Recuperación** (aparece sola si la base está dañada) | Lista de copias sanas; el menú desaparece | Restaurar |
| — | Botón del menú lateral | «Apariencia: automática / clara / oscura» (cambia al tocarlo) | — |

### 1.2 Textos de la interfaz (inventario resumido)

- **Títulos:** Hoy, Notas, Estudiantes, Estudiantes que no aprueban, Plan de nivelación, Planeación, Excel: su seguro de vida, Copia también en una memoria USB, Cuántas copias automáticas guardar, Traer una copia completa guardada, Copias de seguridad, Datos de la institución, Nota mínima para aprobar, Año lectivo, Materias, La base de datos está dañada, Empecemos, Este grado no tiene materias.
- **Avisos de éxito:** Guardado, Estudiante agregado, Observación guardada, Archivado: sus notas se conservan, Restaurado, Plan guardado; falta la nota, Nivelación registrada, Descargado: …, Copia creada, Copia restaurada, Datos recuperados desde el Excel, Grados guardados, Materia creada, Materia renombrada, Año creado, Año reabierto, Nota mínima guardada, Clase guardada, Guía guardada, Archivo adjuntado, Todos marcados como presentes, Copiados: X. Ya existían: Y.
- **Errores escritos en la interfaz:** Escriba solo números, por ejemplo 4,5 · La nota debe estar entre 1,0 y 5,0 · Elija primero un archivo de Excel (.xlsx) · Elija primero un archivo .db · El archivo es demasiado grande (máximo 15 MB) · No se pudo hablar con el programa…
- **Errores que vienen del servidor y se muestran tal cual:** «Falta el token de acceso o no es válido», «El envío no es un JSON válido», «Host no permitido», «Origen no permitido», «Método no permitido», «No encontrado», «El envío es demasiado grande», «Escriba una fecha válida con el formato AAAA-MM-DD», «El tipo de plan debe ser «area» o «aula»» (sin tilde), «La base viene de una versión más nueva del programa (esquema …)», y, si no hay mensaje, «Error 500» (`app.js`, línea 87).
- **Confirmaciones:** todas usan los botones «Aceptar / Cancelar», aunque la acción sea delicada (cerrar el año, restaurar una copia, quitar una guía).

### 1.3 Problemas de usabilidad encontrados en el código

**A. Demasiados clics para tareas comunes**

| Tarea | Clics hoy | Por qué |
|---|---|---|
| Cambiar de grado y materia para seguir poniendo notas (multigrado) | 4 (abrir la lista de grado, elegir, abrir la lista de materia, elegir); 6 si también cambia el periodo | Todo son listas desplegables de dos clics |
| Sacar los boletines de todo un grado de 25 niños | **75** (menú Documentos y opción, por cada niño, más buscarlo en la lista) | No hay descarga por grado |
| Tomar la asistencia del día | 3 para llegar (Planeación, que además exige una materia aunque la asistencia es del grado; luego la pestaña) más 2 por cada niño ausente | Está escondida dentro de Planeación y usa listas |
| Escribir la observación del boletín | 3, en una ventana pequeña sin ver las notas del niño | — |
| Encontrar a un estudiante | Hay que recorrer la lista con la vista: no hay buscador | — |
| Cambiar a un estudiante de grado | **No se puede**: «Editar» solo cambia nombre y documento | — |

**B. Se pierde lo escrito al guardar o al moverse**

1. **Nivelación:** cada tarjeta tiene su propio «Guardar», pero al guardar una, `mostrar()` vuelve a pintar todas y **se borra lo que estaba escrito en las demás tarjetas** (líneas 325 a 331).
2. **Año y materias:** si el docente escribe los datos de la institución sin guardarlos y luego toca «Guardar nota mínima», «Crear año» o «Agregar materia», la pantalla se vuelve a pintar y **pierde esos datos**.
3. **Planes, guías y clases:** son textos largos. Si el docente toca otra pestaña, otra entrada del menú o cambia de grado, **se pierde todo sin avisar**. No hay borrador ni pregunta antes de salir.
4. **Estudiantes:** si hay una fila en edición y se usa un botón de otra fila (Archivar, Observaciones), la pantalla se vuelve a pintar y la edición se pierde.
5. **Notas:** una nota no válida (por ejemplo 6,5) no se guarda, lo cual es correcto. Pero si el docente se va a otra pantalla, ese valor se pierde y el único rastro es un aviso arriba.
6. **Atrás del navegador:** la app cambia la dirección (`location.hash`) pero no escucha cuando cambia. Con «Atrás» la dirección cambia y la pantalla no.
7. **Marcar a todos presentes** manda una petición por niño, una tras otra, sin mostrar avance. Si falla a la mitad, el docente no sabe hasta dónde quedó.

**C. Estados sin mensaje o con mensajes que confunden**

- Al cambiar de pantalla no hay estado de «Cargando»: se queda la pantalla anterior hasta que llega la nueva.
- «Guardado» desaparece a los 3,5 segundos y se anuncia como **alerta** (`role="alert"`). Un lector de pantalla interrumpe al docente cada vez que guarda una nota.
- Si un año está cerrado, Notas no lo dice. El docente escribe una nota y recibe un error.
- La barra de avance de temas aparece gris y vacía cuando no hay temas, sin explicar por qué.
- Si una búsqueda de guías no encuentra nada, no hay un mensaje propio.

**D. Textos técnicos**

«token», «JSON», «Host», «Método», «esquema», «AAAA-MM-DD», «area/aula», «Error 500», «.db», «ruta completa», «Copias a conservar (5 a 200)», «Apariencia: automática».

**E. Contraste y tamaños (cálculo sobre `estilos.css`)**

- **Letra menor de 16 px.** El CSS usa `rem`, pero no fija el tamaño de la raíz: 1 rem son 16 px, no 18. Por eso los encabezados de tabla, las etiquetas «Aprobado / No aprobado» y el botón de apariencia (0,95 rem) quedan en **15,2 px**.
- **Pestañas sin seleccionar** (Planeación): el borde usa `--linea` `#d3dcd6` sobre blanco, que da **1,4:1**. Están por debajo del 3:1 que piden los controles.
- Hay sombras decorativas en tarjetas, menús desplegables y ventanas. Este pedido las excluye.

**F. Estructura y pantalla estrecha**

- Ocho entradas en el menú, que con los módulos nuevos pasarían a 10 o 13.
- En pantalla estrecha, el menú pasa a ser una fila con desplazamiento lateral: las entradas que no caben no se ven y nada indica que existen.
- La tabla de Notas (7 columnas con campos) no tiene un contenedor propio con desplazamiento: **toda la página se desplaza de lado**.
- La barra fija de filtros, con cuatro listas apiladas, ocupa casi media pantalla en un celular o una tableta.
- En Estudiantes hay cinco botones del mismo peso por fila, con «Archivar» entre ellos.
- En la pestaña Temas, el botón «Quitar» no tiene clase y sale con el estilo por defecto del navegador.

---

## Parte 2. Rediseño (rol `product-designer`)

### 2.1 Producto

- **Nombre:** Sistema de notas (se mantiene).
- **Frase:** Las notas, la clase y los papeles de su escuela, sin internet.
- **Para qué existe:** el docente lleva solo los seis grados. Lo que más hace es cambiar de grado. Necesita escribir cada dato una sola vez y sacar de ahí el boletín, el certificado, la planilla y la circular.

### 2.2 El patrón propio: «grado primero, tarea después»

Cinco reglas que se repiten en todas las pantallas. Así los módulos nuevos no parecen piezas pegadas:

1. **Barra de contexto única.** Arriba de cada pantalla hay una sola línea que dice dónde se está trabajando: «2026 · Segundo · Matemáticas · Periodo 4». El **grado** se elige con una fila de botones: **Transición · 1.° · 2.° · 3.° · 4.° · 5.°** (un clic, no dos). El periodo usa otra fila de botones: **1 · 2 · 3 · 4**. La materia se elige con botones si son 10 o menos, y con una lista si son más. La elección se recuerda entre pantallas. Cada pantalla muestra solo las partes del contexto que usa.
2. **Misma estructura en todas las pantallas**, de arriba abajo: título y una frase de para qué sirve → barra de contexto → acción principal, siempre arriba a la derecha (o debajo del título en pantalla estrecha) → contenido → acciones secundarias al final.
3. **Pestañas dentro de cada sección** (máximo 5), con el nombre de la tarea, no del dato. La pestaña elegida queda en la dirección (por ejemplo `#notas/reporte`), así «Atrás» funciona.
4. **Lista → ficha → Volver.** Todo lo que se edita largo (ficha del estudiante, plan, guía, circular) se abre en su propia vista, con «← Volver», una barra de guardado fija abajo y la pregunta «Tiene cambios sin guardar» antes de salir. Esto se toma del diseño de interacción del 2 de noviembre, sección 1.3.
5. **Documentos con un solo molde.** Todo lo que se imprime (boletín, certificado, planilla, directorio, circular, reporte) se pide igual: **para quién** (grado o estudiantes marcados) → **opciones** → **vista previa** → **Descargar PDF** (principal), **Descargar Word**, **Imprimir**.

### 2.3 Menú: 6 entradas (antes 8, y con lo nuevo habrían sido 10 a 13)

| # | Entrada | Pestañas que contiene | Qué absorbe de hoy y qué es nuevo |
|---|---|---|---|
| 1 | **Hoy** | — | Hoy, sin el mosaico de cifras |
| 2 | **Notas** | Escribir notas · Reporte del grado · No aprueban · Nivelación | Notas, No aprueban y Nivelación de hoy, más el **Reporte por grado** (nuevo) |
| 3 | **Planeación** | Asistencia · Temas y avance · Clases · Planes · Guías | Planeación de hoy. La asistencia pasa al primer lugar y ya no pide materia |
| 4 | **Estudiantes** | (lista y ficha) | Estudiantes de hoy más la **matrícula con acudientes** (nueva) y las observaciones |
| 5 | **Documentos** | Boletines · Certificados · Circulares · Directorio · Planillas | Lo que hoy está regado en menús «Documentos», más **certificados de matrícula, circulares y directorio** (nuevos) |
| 6 | **Respaldo y ajustes** | Respaldo · Año y materias · Institución · Pantalla | Respaldo, Año y materias y el botón de apariencia |

**Relación con los diseños anteriores (se respetan, se reacomodan):**

- La «Secretaría» con pestañas que propuso el diseño de interacción se reparte así: **Matrícula** pasa a Estudiantes, porque el estudiante es uno solo y no hay que buscarlo en dos lugares. **Certificados, Directorio y Circulares** pasan a Documentos.
- El «Reporte por grado» o «Hoja del grado» queda como pestaña de Notas.
- La «Hoja individual del estudiante» del diseño de producto queda como la sección «Notas del año» de la Ficha del estudiante.
- Se mantienen sin cambios el contenido de esas pantallas, sus mensajes exactos, las validaciones de formato colombiano, la protección contra perder lo escrito y la lista de clases CSS nuevas.
- Lo único que cambia es dónde vive cada pantalla. La razón es el límite de 6 entradas, que además deja Respaldo siempre visible.

### 2.4 Pantallas

Convenciones de cada ficha: **Objetivo** (lo que el docente quiere lograr), **Estructura** (de arriba abajo), **Acciones principales**, **Estados** y **Pantalla estrecha** (800 px o menos).

#### Marco común (todas las pantallas)

- **Estructura:** enlace «Saltar al contenido» (visible solo al recibir el foco) → menú lateral con el nombre de la sede debajo de «Sistema de notas» → barra de avisos → contenido.
- **Avisos:** los que confirman algo («Guardado a las 10:42») salen junto a lo que se guardó y se anuncian con calma (`aria-live="polite"`). Los errores salen en la barra de avisos y **no desaparecen solos**: tienen el botón «Entendido». En el campo con problema se repiten con la palabra «Error:».
- **Carga:** si una pantalla tarda más de medio segundo, el área de contenido dice «Cargando…». La barra de contexto se queda quieta.
- **Pantalla estrecha:** el menú lateral se convierte en una barra superior con «Sistema de notas», el nombre de la pantalla actual y un botón **«Menú»** que abre la lista de las 6 entradas a todo el ancho (48 px de alto cada una). En la barra de contexto, la fila de grados sigue visible y el resto se pliega en una línea con el botón **«Cambiar»**.

#### P0 · Hoy

- **Objetivo:** saber en 5 segundos qué falta hoy y llegar ahí con un clic.
- **Estructura:**
  1. Título «Hoy, lunes 2 de noviembre» y, en letra pequeña, «Año 2026».
  2. **Franja de respaldo**, una sola línea:
     - si está al día: «Último Excel de respaldo: hace 3 días.»;
     - si hace más de 14 días o nunca se hizo: franja en color de pendiente, «Hace 16 días que no guarda el Excel en la memoria USB» y el botón principal **«Descargar Excel ahora»**.
     - Así deja de repetirse el aviso de Excel en dos lugares, como pasa hoy.
  3. **«Lo que falta»**: una lista de renglones con texto y un botón cada uno, ordenada por urgencia. No son tarjetas de cifras.
     - «Asistencia de hoy sin tomar en 3 grados» [Tomar asistencia]
     - «12 notas por escribir: Segundo · Matemáticas · Periodo 4» [Escribir]
     - «3 nivelaciones sin nota» [Ver]
     - «4 fichas de matrícula incompletas» [Completar]
     - Todas las cifras salen de los datos reales.
  4. **«Ir a»**: cuatro botones secundarios: Tomar asistencia · Escribir notas · Matricular estudiante · Sacar un documento.
  5. **«Así va el año»**: una tabla corta, un renglón por grado, con Estudiantes, No aprueban alguna materia y Temas vistos.
- **Acción principal:** la primera de «Lo que falta» (o «Descargar Excel ahora» si el respaldo está atrasado).
- **Estados:**
  - **Sin año o sin materias:** «Empecemos» con los tres pasos reales y su estado: «1. Crear el año lectivo [Hecho / Crear] · 2. Agregar las materias · 3. Matricular a los estudiantes».
  - **Sin pendientes:** «No hay nada pendiente. Buen trabajo.» (con la franja de respaldo visible igual).
  - **Error:** «No se pudo cargar el resumen. [Intentar de nuevo]».
- **Estrecha:** todo en una columna. Cada renglón de «Lo que falta» pone el texto arriba y el botón debajo, a todo el ancho.

#### P0 · Notas › Escribir notas

- **Objetivo:** escribir las notas de una materia de un grado sin errores y sin dudar de si se guardaron.
- **Estructura:**
  1. Título «Notas» y pestañas.
  2. Contexto: grado (botones) · materia · periodo (botones 1 a 4).
  3. **Resumen**, una línea: «18 estudiantes · aprueban 15 · no aprueban 2 · faltan 4 notas · promedio 3,7».
  4. **Tabla:**
     - columnas: Estudiante (fija a la izquierda) · Nota 1 · Nota 2 · Nota 3 · Definitiva del periodo · Estado · Definitiva del año;
     - por debajo de la nota mínima: «▼ 2,8» en negrilla con el color de error;
     - si falta una nota: «Falta nota»;
     - campo vacío con fondo de pendiente.
  5. **Línea de estado** bajo la tabla:
     - «Guardado a las 10:42»;
     - si hay notas no válidas: «No se guardó: Ana Ruiz, Nota 2: escriba un número entre 1,0 y 5,0.» Esta línea **se queda** hasta que se corrija.
  6. Leyenda: «▼ = por debajo de 3,0 (nota mínima). Puede escribir con coma o punto. Enter o Tab para pasar.»
  7. Acciones secundarias: «Descargar planilla en Excel», «Descargar planilla en PDF» y «Ver el reporte del grado».
- **Acción principal:** escribir. Se guarda sola; no hay botón «Guardar».
- **Estados:**
  - **Sin estudiantes en el grado:** «No hay estudiantes en Segundo este año.» [Matricular estudiante]
  - **El grado no tiene materias:** «Ninguna materia está marcada para Segundo.» [Ir a Año y materias]
  - **Año cerrado:** franja «El año 2026 está cerrado: solo se puede consultar.» Los campos quedan de solo lectura (no se espera al error).
  - **Hay notas sin guardar y el docente se va:** ventana «Hay 1 nota que no se guardó (Ana Ruiz, Nota 2: 6,5). [Corregirla] [Salir sin guardarla]».
  - **Transición:** **D5 pendiente**. Hasta que el colegio decida, el grado funciona igual que los demás y lleva la nota «En Transición la forma de evaluar está por definir con el colegio».
- **Estrecha:** la tabla se convierte en **una tarjeta por estudiante**:
  - nombre en negrilla;
  - debajo, los tres campos en una fila (Nota 1 · Nota 2 · Nota 3);
  - debajo, «Periodo 3,8 · Aprueba».
  - Las flechas ↑↓ siguen pasando a la misma nota del estudiante siguiente. La página nunca se desplaza de lado.

#### P1 · Notas › Reporte del grado

- **Objetivo:** ver todo un grado en todas las materias y llevarlo impreso a la comisión o a la entrega de informes.
- **Estructura:** es la del diseño de interacción, sección 2, sin cambios:
  - contexto: grado y periodo (1 a 4 o «Año completo»);
  - resumen en una línea de texto (no en tarjetas);
  - tabla con la columna Estudiante fija, una columna por materia, Promedio y «Materias sin aprobar», y en el pie el promedio por materia y cuántos no aprueban;
  - leyenda «▼ = por debajo de 3,0 · Falta = hay notas sin escribir»;
  - acciones: «Descargar PDF» (principal), «Descargar Excel», «Imprimir» y «Todos los grados en un PDF».
- **Estados:** sin estudiantes, sin materias, sin notas («Todavía no hay notas en el periodo 2 para Segundo»), año cerrado (se puede consultar), error con «Intentar de nuevo». Transición: **D5**.
- **Estrecha:** solo la tabla se desplaza de lado, dentro de su caja, con la indicación «Deslice la tabla para ver todas las materias».

#### P1 · Notas › No aprueban

- **Objetivo:** saber quién va perdiendo y actuar.
- **Estructura:**
  - contexto: grado («Todos» o uno) y «Definitiva del año» o «de un periodo»;
  - lista agrupada por estudiante, no por materia: «Juan Pérez · Segundo · Matemáticas 2,6 · Ciencias 2,9» con el botón [Plan de nivelación].
- **Estados:** vacío: «Nadie está por debajo de la nota mínima con estos filtros.»
- **Estrecha:** una tarjeta por estudiante.

#### P1 · Notas › Nivelación

- **Objetivo:** registrar las actividades y la nota de nivelación sin perder lo escrito.
- **Estructura:**
  - contexto: grado («Todos» o uno);
  - una tarjeta por estudiante y materia con: definitiva del año, Actividades, Fecha, Nota de nivelación y [Guardar] con su propia línea de estado;
  - texto: «La nota de nivelación se guarda aparte: no reemplaza la original.»
- **Cambio clave:** guardar una tarjeta **solo actualiza esa tarjeta**. Ya no se vuelve a pintar toda la pantalla, así que lo escrito en las otras tarjetas no se pierde. Si hay tarjetas con cambios sin guardar y el docente se va, se le pregunta antes.
- **Estados:**
  - vacío: «No hay nivelaciones pendientes en 2026.»;
  - guardada sin nota: etiqueta «Falta la nota»;
  - con nota: etiqueta «Nivelada: 3,4».
- **Estrecha:** los campos van en una columna.

#### P0 · Planeación › Asistencia

- **Objetivo:** tomar la asistencia de un grado en menos de un minuto.
- **Estructura:**
  1. Contexto: grado (botones) y fecha (hoy por defecto, con la fecha escrita en palabras al lado: «lunes 2 de noviembre»). **No pide materia.**
  2. Botón principal **«Marcar a los demás como presentes»**: marca solo a quienes no tienen registro. Es **una sola petición** con avance; si falla, dice cuántos quedaron.
  3. Lista: nombre, y para cada niño tres botones **Presente · Ausente · Excusa** (un clic, no los dos de una lista), más «Ausencias en el año: 4».
  4. Estado: «Guardado a las 7:42 · 18 de 18 registrados».
- **Estados:**
  - sin estudiantes;
  - día sin registrar: «Todavía no ha tomado la asistencia de este día»;
  - año cerrado: solo lectura;
  - error en un niño: su fila queda marcada con «No se guardó. [Intentar de nuevo]».
- **Estrecha:** los tres botones quedan debajo del nombre, a todo el ancho y en partes iguales.

#### P1 · Planeación › Temas y avance · Clases · Planes · Guías

- **Objetivo:** llevar el cuaderno de planeación por grado y materia.
- **Estructura común:** contexto: grado y materia. **La lista va primero y el formulario después**: el botón principal («Agregar tema», «Planear una clase», «Escribir plan», «Escribir guía») abre el formulario.
- **Temas:**
  - avance en texto: «8 de 20 temas vistos (40 %)», y la barra solo si hay temas;
  - tabla Periodo · Tema · Estado (tres botones: Pendiente · En curso · Visto) · Fecha · Quitar.
- **Clases:**
  - lista por fecha con la casilla «Hecha»;
  - «Planear una clase» abre la vista de edición.
- **Planes y Guías:**
  - lista que se puede abrir y cerrar;
  - **Editar** abre una vista propia con «← Volver», barra de guardado fija y borrador guardado en el navegador cada 3 segundos (diseño de interacción, sección 1.3);
  - Word y PDF en la misma fila;
  - «Quitar» va al final, como enlace en color de error, y pide confirmar.
- **Estados:**
  - vacío por pestaña («Aún no hay temas para Segundo · Matemáticas.» y el botón principal);
  - búsqueda de guías sin resultados: «Ninguna guía tiene «fracciones». Revise cómo lo escribió o [Ver todas]»;
  - cambios sin guardar: pregunta antes de salir.
- **Estrecha:** listas en una columna y formularios a todo el ancho.

#### P0 · Estudiantes (lista)

- **Objetivo:** encontrar a cualquier niño en dos segundos y saber a quién le faltan datos.
- **Estructura:**
  1. Título y botón principal **«Matricular estudiante»**.
  2. Contexto: grado (botones con «Todos») y el campo **Buscar** («Nombre o documento»), que filtra mientras se escribe.
  3. Casillas «Solo fichas incompletas» y «Ver retirados».
  4. Tabla: Nombre · Grado · Acudiente principal · Celular · Ficha («Completa» o «Faltan 2 datos»). **Toda la fila abre la ficha.** No hay botones en la fila.
  5. Resumen: «23 estudiantes · 19 fichas completas · 4 incompletas».
- **Estados:**
  - vacío: «Todavía no hay estudiantes en 2026.» [Matricular estudiante];
  - búsqueda sin resultados: «Nadie coincide con «Pérz».»;
  - filtro de incompletas vacío: «Todas las fichas están completas.»
- **Estrecha:** una tarjeta por estudiante (nombre en negrilla; debajo, grado · acudiente · celular · estado).

#### P0 · Estudiantes › Ficha del estudiante (nueva; une la ficha de matrícula y la hoja individual)

- **Objetivo:** tener en un solo lugar todo lo de un niño: datos, familia, notas, observaciones y papeles.
- **Estructura:**
  1. «← Volver a la lista».
  2. Encabezado: nombre, grado, «Activo» o «Retirado» y el estado de la ficha.
  3. **Índice de secciones** (enlaces dentro de la misma página): Datos y matrícula · Acudientes · Salud · Notas del año · Observaciones · Documentos.
  4. **Datos y matrícula:** los campos y validaciones del diseño de interacción, sección 3.2.
     - **Nombre:** **D3 pendiente**. Hasta decidir, se usa un solo campo «Nombre completo, como aparece en el registro civil».
     - **Nuevo:** el campo **Grado** se puede cambiar (hoy no se puede).
  5. **Acudientes:** una caja por acudiente, con un solo «Contacto principal», [Agregar otro acudiente] y [Usar un acudiente ya registrado] para hermanos.
  6. **Salud y cuidados (opcional)**, plegada, con la nota «Estos datos son privados: no salen en el directorio ni en las circulares.»
  7. **Autorización:** casilla con el texto **[texto pendiente: D4]**. Mientras no exista el texto aprobado por el colegio, la casilla dice «El acudiente autorizó guardar estos datos (texto oficial pendiente)».
  8. **Notas del año** (solo lectura): materias por periodos 1 a 4 y definitiva, con ▼, nivelaciones y ausencias por periodo; enlace «Cambiar notas en Notas».
  9. **Observaciones del boletín:** un cuadro de texto aquí mismo (ya no en una ventana), con contador de letras.
  10. **Documentos de este estudiante:** Boletín, Certificado de matrícula, Certificado de estudio. Cada uno abre Documentos con el niño ya elegido.
  11. **Otras acciones**, al final: «Retirar estudiante» (antes «Archivar»). Va como enlace en color de error y su confirmación usa el verbo de la acción.
  12. **Barra fija de guardado:** [Guardar ficha] · «Cambios sin guardar» / «Guardado a las 10:42» · «También puede usar Ctrl+S».
- **Estados:** todos los mensajes del diseño de interacción, sección 3.2 (documento repetido, celular mal escrito, edad rara para el grado y los demás). Además:
  - **D1 pendiente:** mientras no se confirme que los datos nuevos van en el respaldo, la barra de guardado dice: «Atención: los datos de acudientes todavía no van en el Excel de respaldo.» Se quita cuando D1 se resuelva.
  - **Año cerrado:** la matrícula queda de solo lectura; los datos personales y los acudientes se pueden seguir editando.
- **Estrecha:** una columna; el índice de secciones queda en una lista plegable «Ir a…»; la barra de guardado va a todo el ancho y se deja espacio al final para que no tape el último campo.

#### P0 · Documentos (molde común)

- **Objetivo:** sacar cualquier papel de la escuela en 4 clics o menos, siempre de la misma forma.
- **Estructura de entrada:** pestañas **Boletines · Certificados · Circulares · Directorio · Planillas**. Cada pestaña (salvo Circulares, que tiene lista y editor) sigue el mismo molde:
  1. **Para quién:** grado (botones) y lista de estudiantes con casillas, «Marcar todos» y «Quitar marcas». Por defecto está todo el grado marcado.
  2. **Opciones** propias del documento.
  3. **Avisos antes de descargar**, en palabras: «A Juan Pérez le falta el documento: saldrá sin él» o «Faltan datos de la institución (D2)». Llevan enlace para corregirlos.
  4. **Vista previa** del primero marcado, con el selector «Ver de: …».
  5. **Descargar PDF** (principal) · Descargar Word · Imprimir. Con varios estudiantes sale **un solo archivo, una hoja por estudiante**.
- **Por pestaña:**
  - **Boletines:** periodo o «Año completo». Hoy, 25 boletines cuestan 75 clics; con esto son 4. Transición: **D5**.
  - **Certificados:** «De matrícula (dice que está matriculado)» o «De estudio (con las notas del año)». El «Certificado» de hoy pasa a llamarse **«Certificado de estudio»**. Además: fecha de expedición y «Para qué es» (opcional). Encabezado y firmas: **D2 pendiente**. Mientras falten, la vista previa muestra «[falta código DANE]», «[falta resolución]» y «[falta quién firma]» resaltados, con el enlace «Completar en Respaldo y ajustes › Institución».
  - **Circulares:**
    - lista: número · fecha · asunto · para quién · «Borrador» o «Descargada el 2 nov», con «Abrir», «Hacer una copia» y «Quitar»;
    - editor: diseño de interacción, sección 3.5 (guardado automático como borrador, «¿A quién va dirigida?», desprendible, una copia por familia por defecto);
    - firma: **D2**. Si las circulares van en el respaldo: **D1**.
  - **Directorio:** «Qué columnas incluir» (los datos de salud nunca se ofrecen) y aviso de faltantes con [Ver cuáles]. Pie fijo: «Uso interno de la escuela. Contiene datos personales: guárdelo en un lugar seguro y no lo publique.»
  - **Planillas:** grado, materia y periodo. Es la misma planilla que hoy se descarga desde Notas.
- **Estados:**
  - nadie marcado: el botón no se apaga; al tocarlo dice «Marque al menos un estudiante»;
  - sin estudiantes;
  - descargado: «Descargado: Boletines-Segundo-Periodo4-2026.pdf (18 hojas)»;
  - error del servidor, explicado en palabras.
- **Estrecha:** la lista de casillas va en una columna con altura máxima y desplazamiento propio; la vista previa va debajo de las opciones, nunca al lado.

#### P0 · Respaldo y ajustes › Respaldo

- **Objetivo:** que los datos sobrevivan si el computador se daña.
- **Estructura:** el orden sigue lo que más protege.
  1. **«Guardar todo en la memoria USB»:**
     - [Descargar todo en Excel] (principal) y «Último Excel: hace 3 días»;
     - debajo, [Descargar copia completa (con archivos adjuntos)].
     - **D1 pendiente:** se dice en palabras qué entra y qué no. Por ejemplo: «Las fichas de matrícula y las circulares todavía no van en el Excel.»
  2. **«Copia automática en la memoria USB»:** la carpeta de la memoria, con la ayuda «Por ejemplo E:\Respaldos (E: es la letra de su memoria)» y [Guardar carpeta].
  3. **«Copias en este computador»:**
     - lista de las 15 últimas con la fecha en palabras;
     - [Crear copia ahora] (secundario);
     - «Más opciones» plegado, con «Cuántas copias automáticas guardar».
  4. **«Recuperar datos»**, plegado y separado con borde de error:
     - «Desde un Excel» (revisar y luego aplicar);
     - «Desde una copia completa guardada en la memoria».
     - Se dice «copia completa» en vez de «.db».
- **Confirmaciones con verbo:** «¿Restaurar la copia del 2 de noviembre a las 10:42? Antes se guarda una copia de lo que tiene ahora. [Restaurar esta copia] [Cancelar]».
- **Estados:**
  - sin copias: «Aún no hay copias.»;
  - carpeta USB no encontrada: «No se encontró la carpeta E:\Respaldos. ¿Está conectada la memoria?»;
  - Excel con problemas: tabla de problemas y «No se cambió nada».
- **Estrecha:** una columna.

#### P1 · Respaldo y ajustes › Año y materias · Institución · Pantalla

- **Año y materias:**
  - nota mínima; años lectivos con «Cerrar año». La confirmación pide escribir el año y el botón dice «Cerrar el año 2026».
  - materias con «Grados» y «Cambiar nombre».
  - **D6 pendiente:** aparece el renglón «Pasar a los estudiantes al año siguiente: pendiente de definir con el colegio». Es solo texto, sin botón, para que no se invente el flujo.
  - Cada bloque guarda **solo lo suyo** y no borra lo escrito en los otros.
- **Institución:**
  - nombre, sede, docente, municipio y departamento;
  - **D2 pendiente:** los campos código DANE, resolución y quién firma (nombre y cargo; una o dos firmas) se muestran con la nota «Pendiente de confirmar con el colegio: qué datos exige el certificado».
- **Pantalla:**
  - «Clara (recomendada con luz de día)», «Oscura», «Como el computador». Son opciones que se eligen, no un botón que va cambiando solo. Por defecto: **Clara**.
  - «Tamaño de letra: Normal · Grande».

#### Especial · Recuperación

Se mantiene como está (pantalla sin menú y lista de copias sanas). Solo cambia la confirmación a «Restaurar esta copia» y se agrega la frase: «Si no hay copias sanas, busque el Excel de respaldo en su memoria USB.»

### 2.5 Clics: antes y después

| Tarea | Antes | Después |
|---|---|---|
| Cambiar de grado en Notas | 2 | 1 |
| Cambiar de grado y materia | 4 | 2 |
| Boletines de un grado de 25 niños | 75 | 4 (Documentos, Boletines, grado, Descargar) |
| Tomar asistencia con 2 ausentes | 3 para llegar + 4 | 2 para llegar (Hoy › Tomar asistencia) + 2 + 1 |
| Escribir una observación | 3, en una ventana sin contexto | Ficha › Observaciones, viendo las notas |
| Encontrar a un estudiante | Recorrer la lista | Escribir 3 letras |

### 2.6 Lenguaje: reemplazos de textos técnicos

| Hoy | Propuesto |
|---|---|
| Falta el token de acceso o no es válido | El programa se abrió de una forma que no esperaba. Ciérrelo y ábralo otra vez desde su icono. |
| El envío no es un JSON válido / Método no permitido / Host u Origen no permitido | Algo no salió bien al hablar con el programa. Ciérrelo y ábralo otra vez. |
| No encontrado | No se encontró lo que buscaba. Puede que se haya quitado. |
| Error 500 (sin mensaje) | Ocurrió un problema inesperado. Lo que escribió sigue en pantalla. Intente de nuevo. |
| Escriba una fecha válida con el formato AAAA-MM-DD | Elija la fecha en el calendario. |
| El tipo de plan debe ser «area» o «aula» | Elija si es plan de área o plan de aula. |
| La base viene de una versión más nueva del programa (esquema …) | Esta copia se hizo con una versión más nueva del programa. Actualice el programa para poder abrirla. |
| .db / archivo .db | copia completa |
| Copias a conservar (5 a 200) | Cuántas copias automáticas guardar (entre 5 y 200) |
| Apariencia: automática | Pantalla: clara · oscura · como el computador |
| Archivar / Archivado | Retirar / Retirado (sus notas se conservan) |
| Aceptar (en confirmaciones) | El verbo de la acción: «Cerrar el año 2026», «Restaurar esta copia», «Quitar la guía» |
| Certificado (menú Documentos) | Certificado de estudio |
| Transición (0) | Transición |

---

## Parte 3. Sistema visual propio

### 3.1 Dirección

**«Cuaderno y tinta».** Fondo color papel hueso, superficies blancas y texto casi negro. Un solo color de acento, **azul petróleo**, y tres colores de estado. Sin degradados, sin sombras decorativas y sin iconos.

- **Por qué ayuda al docente:** se parece al cuaderno y a la planilla que ya conoce; con sol se lee mejor en claro; y al imprimir en blanco y negro no se pierde nada, porque el estado siempre va en palabras o en «▼».
- **Por qué no se sigue con el verde de hoy:** el pedido es una paleta nueva. Además, en la app actual el verde se usa a la vez para la marca y para «Aprobado», y eso los confunde. Con el petróleo como acento, el verde queda solo para decir «bien».

### 3.2 Paleta (contrastes calculados con la fórmula de luminancia relativa de WCAG 2.1)

AA pide 4,5:1 para texto y 3:1 para bordes y controles. Los cálculos se hicieron con un script sobre los valores exactos.

**Modo claro**

| Token | Valor | Uso | Contraste medido |
|---|---|---|---|
| `--fondo` | `#F6F4EF` | Fondo de la página | — |
| `--superficie` | `#FFFFFF` | Tarjetas, tablas, campos, menú | — |
| `--texto` | `#1F2328` | Texto principal | 15,80 sobre superficie · 14,37 sobre fondo |
| `--texto-suave` | `#4A4F57` | Ayudas, etiquetas de campo, encabezados de tabla | 8,24 sobre superficie · 7,50 sobre fondo |
| `--borde-control` | `#6B7079` | Borde de campos, botones secundarios, casillas | 4,98 sobre superficie · 4,53 sobre fondo |
| `--linea` | `#D9D5CC` | Solo separadores entre filas (nunca es el único borde de un control) | 1,46 (decorativa; no necesita 3:1) |
| `--acento` | `#0B5563` | Botón principal, pestaña y menú activos, enlaces, anillo de foco | Texto blanco encima: 8,42 · como texto sobre superficie: 8,42 · sobre fondo: 7,66 |
| `--acento-fuerte` | `#083F4A` | Botón principal al pasar el puntero | Texto blanco encima: 11,54 |
| `--acento-suave` | `#E3EEF0` | Fondo de la fila o la casilla elegida, barra de contexto | `--acento` encima: 7,12 · `--texto` encima: 13,36 |
| `--bien` / `--bien-fondo` | `#1E6B34` / `#E6F2E8` | «Aprueba», «Guardado», «Completa» | 6,55 sobre superficie · 5,68 sobre su fondo |
| `--error` / `--error-fondo` | `#A1231B` / `#FBE9E7` | «No aprueba», errores, acciones de peligro | 7,58 sobre superficie · 6,46 sobre su fondo · `--texto` sobre su fondo: 13,47 |
| `--pendiente` / `--pendiente-fondo` | `#7A4E00` / `#FFF2D6` | «Falta nota», «Faltan datos», «Borrador», respaldo atrasado | 7,20 sobre superficie · 6,49 sobre su fondo · `--texto` sobre su fondo: 14,24 |

**Modo oscuro**

| Token | Valor | Contraste medido |
|---|---|---|
| `--fondo` | `#14171A` | — |
| `--superficie` | `#1E2226` | — |
| `--texto` | `#E8E6E1` | 12,83 sobre superficie · 14,42 sobre fondo |
| `--texto-suave` | `#B4B0A8` | 7,41 · 8,32 |
| `--borde-control` | `#8A9099` | 4,98 · 5,59 |
| `--linea` | `#353B42` | decorativa |
| `--acento` / `--acento-fuerte` / texto sobre acento | `#6FC3CF` / `#93D4DD` / `#0B1F24` | Texto sobre acento: 8,40 · sobre acento fuerte: 10,28 · acento sobre superficie: 7,91 |
| `--acento-suave` | `#1C3A40` | Acento encima: 6,01 · texto encima: 9,74 |
| `--bien` / fondo | `#7BCB8E` / `#1D3324` | 8,21 · 6,95 |
| `--error` / fondo | `#FF9C90` / `#3D1F1C` | 7,93 · 7,38 · texto encima: 11,93 |
| `--pendiente` / fondo | `#F0C463` / `#3A2F14` | 9,74 · 8,01 · texto encima: 10,55 |

**Resultado:** todos los pares de texto pasan AA con margen (el mínimo es 5,68:1) y todos los bordes de controles pasan 3:1 (el mínimo es 4,53:1). Esto corrige los dos fallos de hoy: las pestañas, con 1,4:1, y el texto de 15,2 px.

**Reglas de color:**

- Un solo color de acción: `--acento`.
- El estado nunca va solo en color: siempre lleva palabra, «▼» o negrilla.
- No se usan índigo ni violeta, degradados, sombras, ni el patrón de tarjeta con borde izquierdo de color.
- **Por qué ayuda al docente:** sabe que lo azul petróleo «se toca», lo verde «está bien», lo rojo «hay un problema» y lo ámbar «falta algo». Son cuatro significados y nada más.

### 3.3 Tipografía

- **Familia:** `system-ui, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`. Es la del sistema: no se descarga nada (no hay internet), carga al instante y en Windows es Segoe UI, que el docente ya lee todos los días. Las cifras van con `font-variant-numeric: tabular-nums` para que las notas queden alineadas en columna.
- **Raíz:** `html { font-size: 112.5% }`, o sea 1 rem = 18 px. Así ningún tamaño en rem baja de 16 px por accidente, que es el error de hoy.

| Paso | Tamaño | Peso | Interlineado | Uso |
|---|---|---|---|---|
| Pequeño | 16 px (0,889 rem) | 400 / 600 | 1,5 | Ayudas, leyendas, encabezados de tabla, etiquetas de estado. **Es el mínimo absoluto.** |
| Base | 18 px (1 rem) | 400 | 1,5 | Texto, campos, celdas, botones |
| Subtítulo | 20 px | 600 | 1,3 | Títulos de bloque (h3) |
| Título | 24 px | 700 | 1,25 | Título de pantalla (h2) |
| Cifra | 32 px | 700 | 1,1 | Solo el número de «Así va el año» en pantalla ancha, si hace falta |

- Opción «Letra grande» (en Ajustes › Pantalla): sube la raíz a 125 % (20 px base, 17,8 px el paso pequeño).
- **Por qué ayuda al docente:** pocos tamaños y bien separados. El título se distingue del texto sin necesidad de color, y la letra se lee a la distancia de un escritorio con un portátil viejo.

### 3.4 Espaciado y forma

- **Escala única (px):** 4 · 8 · 12 · 16 · 24 · 32 · 48.
  - 4: entre etiqueta y campo;
  - 8: entre botones;
  - 12: entre campos;
  - 16: relleno de tarjeta en pantalla estrecha y espacio entre tarjetas;
  - 24: relleno de tarjeta y de la página;
  - 32: entre secciones;
  - 48: alto mínimo de las entradas del menú en pantalla estrecha.
- **Radios:** 6 px para controles y 8 px para tarjetas y ventanas. Se acaban las píldoras y los 14 px: la forma se ve más de papel y menos de aplicación de moda.
- **Bordes:** tarjetas con 1 px de `--linea` sobre `--fondo`; controles con 1 px de `--borde-control`; ventanas con 2 px de `--borde-control` y fondo de atrás oscurecido. **Sin sombras.**
- **Objetivos de clic:** mínimo 44 × 44 px, y 48 px de alto en pantalla estrecha.
- **Foco:** anillo de 3 px `--acento` separado 2 px, en todos los elementos que se pueden tocar.
- **Movimiento:** ninguno, salvo un cambio de color de 150 ms al pasar el puntero.
- **Ancho de lectura:** contenido de 1100 px como máximo; los formularios, 720 px.
- **Por qué ayuda al docente:** con menos variaciones, todo se ve ordenado y es más fácil saber qué va con qué. Los botones grandes evitan tocar el de al lado.

### 3.5 Componentes

| Componente | Cómo se ve | Reglas |
|---|---|---|
| **Botón principal** | Fondo `--acento`, texto blanco, 600, alto de 44 px, relleno 12 × 20, radio 6. Al pasar el puntero: `--acento-fuerte` | **Uno por pantalla o tarjeta.** El texto es un verbo con objeto: «Descargar PDF», «Guardar ficha», no «Aceptar». Nunca se deshabilita: si falta algo, lo explica. |
| **Botón secundario** | Fondo `--superficie`, borde de 1 px `--borde-control`, texto `--texto`. Al pasar el puntero: fondo `--acento-suave` | Para acciones de apoyo. Como máximo 3 juntos. |
| **Acción de peligro** | Texto `--error` subrayado (aspecto de enlace), al final del bloque, separada | Siempre con confirmación que usa el verbo. Nunca va entre otros botones. |
| **Botón-enlace** | Texto `--acento` subrayado | «← Volver», «Ver cuáles», enlaces de avisos. |
| **Selector segmentado** (grado, periodo, asistencia, estado del tema) | Fila de botones unidos con borde `--borde-control`; el elegido con fondo `--acento`, texto blanco y negrilla | Es el componente propio de esta app: reemplaza las listas de dos clics. Funciona como grupo de opciones (`role="radiogroup"`, flechas para moverse). |
| **Pestañas** | Texto `--texto-suave`; la activa en `--texto`, negrilla, con una línea inferior de 3 px `--acento`; todo el grupo con línea inferior `--borde-control` | Máximo 5. Su nombre queda en la dirección. |
| **Tabla** | Fondo `--superficie`, filas separadas por `--linea`, encabezado en 16 px y 600 `--texto-suave`, cifras tabulares, primera columna fija cuando hay desplazamiento lateral | Celdas en estado: «▼ 2,8» en negrilla `--error`, o «Falta nota» en `--pendiente`. Nunca hay celdas en blanco: dicen «Sin registrar». En pantalla estrecha pasa a tarjetas por fila o se desplaza solo dentro de su caja. |
| **Tarjeta** | Fondo `--superficie`, borde de 1 px `--linea`, radio 8, relleno 24 | Para agrupar un tema. Sin borde lateral de color y sin cifras gigantes. |
| **Aviso en línea** | Caja con el fondo del estado (`--bien-fondo`, `--error-fondo`, `--pendiente-fondo`), borde de 1 px del color del estado y texto `--texto`, que empieza con la palabra del estado: «Error:», «Falta:», «Listo:» | Cerca de lo que avisa. Los errores no se van solos. |
| **Barra de avisos** | Arriba del contenido, con la misma forma del aviso en línea | Solo para errores generales y descargas. Los errores tienen el botón «Entendido». |
| **Formulario** | Etiqueta arriba (16 px, 600, `--texto`), campo de 44 px de alto con borde `--borde-control`, ayuda debajo en `--texto-suave`, error debajo en `--error` con «Error:» | Los campos obligatorios dicen «(obligatorio)». El ejemplo del campo nunca reemplaza la etiqueta. Se valida al salir del campo y al guardar. Al guardar con errores, arriba aparece un resumen con enlaces. |
| **Etiqueta de estado** | Texto 16 px, 600, del color del estado, con borde de 1 px del mismo color, radio 6, sin salto de línea | «Aprueba», «No aprueba ▼», «Falta nota», «Completa», «Faltan 2 datos», «Borrador». |
| **Barra de guardado** | Fija abajo, fondo `--superficie`, borde superior `--borde-control` | Botón principal, estado del guardado («Cambios sin guardar» en `--pendiente` / «Guardado a las 10:42» en `--bien`) y la ayuda Ctrl+S. |
| **Ventana de confirmación** | Fondo `--superficie`, borde de 2 px `--borde-control`, radio 8 | Título en forma de pregunta, consecuencia en una frase y botones «[Verbo]» y «Cancelar». El foco empieza en Cancelar. |
| **Estado vacío** | Texto base en `--texto-suave` y debajo el botón que lo resuelve | Siempre dice qué falta y ofrece el siguiente paso. |
| **Impresión** | Blanco y negro, letra de 11 pt, sin menú ni botones, encabezados de tabla repetidos en cada hoja | «▼» y las palabras se leen igual sin color. |

### 3.6 Revisión anti-AI-slop

| Regla | Resultado |
|---|---|
| 1. Índigo de Tailwind | No se usa. El acento es `#0B5563` (petróleo). |
| 2. Degradado de dos colores | No hay degradados. |
| 3. Emojis como iconos | No hay iconos. «▼» es un signo de texto con significado, explicado en la leyenda. |
| 4. Fuente | La del sistema, `system-ui`. |
| 5. Tarjeta con borde lateral de color y cifra | Se elimina. «Hoy» usa renglones de texto con botón, no un mosaico. |
| 6. Métricas inventadas | Ninguna. Los ejemplos («18 estudiantes», «hace 3 días») son textos de muestra; en la app salen de los datos. Los contrastes son cálculos reales. |
| 7. Texto de relleno | Ninguno. Los textos que no se conocen van entre corchetes con el código de la decisión (D2, D4). |
| Nombres genéricos de pantalla | Hoy, Notas, Planeación, Estudiantes, Documentos, Respaldo y ajustes: son las palabras del docente. «Hoy» dice qué se encuentra ahí (lo pendiente de hoy). |
| P1-D (pasos numerados de relleno) | «Empecemos» usa los tres pasos reales y muestra si cada uno ya está hecho. |

---

## Parte 4. Cambios de archivos necesarios (no aplicados)

| Archivo | Qué cambia | Por qué |
|---|---|---|
| `src/ui/index.html` | `lang="es-CO"`; enlace «Saltar al contenido»; barra superior para pantalla estrecha con el botón «Menú» y el nombre de la pantalla; el menú lateral muestra el nombre de la sede; zona de estado con `aria-live="polite"` aparte de la barra de errores (`role="alert"`); se quita el botón «Apariencia» (pasa a Ajustes › Pantalla) | Navegación de 6 entradas y avisos accesibles |
| `src/ui/estilos.css` | Se reescriben los tokens con la paleta nueva (claro, oscuro y forzado); `html { font-size: 112.5% }`; escala tipográfica y de espaciado; se quitan todas las sombras (`--sombra`, menú desplegable, ventana); radios 6/8; componentes nuevos: `.segmentado`, `.pestanas` con línea inferior, `.aviso-linea`, `.barra-guardar`, `.estado-guardado`, `.tabla-caja` (desplazamiento propio y primera columna fija), `.tabla-tarjetas`, `.rejilla-form`, `fieldset.acudiente`, `.lista-casillas`, `.vista-previa`, `.resumen-errores`, `.boton-enlace`, `.saltar-contenido`, `td.no-aprueba`, `td.falta`, `.leyenda`; `@media print` (no existe hoy); bloque de pantalla estrecha con el menú plegable y las tablas como tarjetas. **Transición:** se pueden dejar los nombres viejos (`--marca`, `--mal`, `--alerta`) como alias de los nuevos durante el cambio, para no romper `app.js` de una vez | Sistema visual propio, contraste AA, 16 px como mínimo, sin desplazamiento lateral de la página |
| `src/ui/app.js` | `VISTAS` pasa a 6 con subrutas (`#notas/reporte`, `#documentos/certificados`, `#estudiantes/123`); escucha `hashchange`; protección de cambios sin guardar (ventana y `beforeunload`) y borradores en el navegador; barra de contexto común con selectores segmentados de grado y periodo; **guardados que actualizan solo su parte** (Nivelación, Año y materias, filas de Estudiantes) en vez de llamar a `mostrar()`; estado «Cargando…»; los errores quedan visibles hasta «Entendido» y «Guardado» va a la zona `aria-live`; confirmaciones con verbo; traducción de los errores técnicos en `api()` (incluido «Error 500»); pantallas nuevas: Hoy con «Lo que falta», Ficha del estudiante, Documentos con el molde común, Reporte del grado, Circulares; asistencia con botones y una sola petición; buscador de estudiantes; cambio de grado en la ficha | Arquitectura de información, menos clics, no perder datos |
| `src/servidor/servidor.js` | Rutas nuevas: ficha y acudientes del estudiante, cambio de grado, asistencia en lote, reporte por grado, boletines y certificados por lote (un archivo con varias hojas), certificado de matrícula, directorio, circulares (lista, guardado, copia, descarga), resumen de «Lo que falta»; los mensajes «token», «JSON», «Host», «Origen», «Método» y «No encontrado» se cambian por textos sencillos | Lo necesitan las pantallas nuevas y el lenguaje sencillo |
| `src/servicios/academico.js` | Cambiar de grado una matrícula; listar estudiantes con búsqueda y estado de la ficha | Ficha del estudiante y lista |
| `src/servicios/planeacion.js` | Asistencia en lote (todos los que no tienen registro, en una sola operación); mensajes: «AAAA-MM-DD» pasa a «Elija la fecha en el calendario» y «area/aula» pasa a «plan de área o de aula» | Asistencia en un clic y lenguaje sencillo |
| `src/servicios/resumen.js` | Datos para «Lo que falta»: notas por escribir por grado y materia, grados sin asistencia hoy, fichas incompletas, nivelaciones sin nota y días desde el último Excel | Pantalla Hoy |
| `src/servicios/` (archivos nuevos, por ejemplo `matricula.js` y `circulares.js`) | Reglas de la ficha (validación de documento, celular y fechas; un solo acudiente principal; acudientes compartidos entre hermanos) y de las circulares (numeración y borrador) | Módulos nuevos. Quedan sujetos a **D3** y **D4** |
| `src/datos/base.js` | Tablas nuevas: datos de la ficha, acudientes (con relación a varios estudiantes), autorización con fecha, circulares, datos ampliados de la institución; versión de esquema nueva con migración | Sujeto a **D1, D2, D3 y D4** |
| `src/reportes/datos.js` y `src/reportes/formatos.js` | Documentos por lote (una hoja por estudiante); certificado de matrícula; el «certificado» actual pasa a llamarse «certificado de estudio»; directorio con el pie de datos personales; circular con desprendible; reporte del grado horizontal; marca «▼» para imprimir en blanco y negro; encabezado con los datos de **D2**; Transición según **D5** | Molde común de Documentos |
| `src/excel/excel.js` y `src/respaldo/*.js` | Si se aprueba **D1**: hojas nuevas en el Excel (fichas, acudientes, circulares, institución) y su importación; si no se aprueba, nada, y la interfaz avisa qué no está respaldado | No perder datos |
| `DESIGN.md` | Reemplazar por el sistema de la Parte 3 (paleta, escala, componentes, regla del 16 px, sin sombras) | Fuente de verdad visual para quien implemente |
| `docs/LEEME-DOCENTE.txt` | Nombres nuevos del menú y dónde quedó cada cosa («Las observaciones ahora están en la ficha del estudiante») | Que el docente no se pierda con el cambio |
| `tests/` (no se tocan ahora) | Pruebas nuevas cuando se implemente: lotes de asistencia y documentos, cambio de grado, ficha, circulares, textos de error sin palabras técnicas. Revisar `ui-edge.test.js` y `institucion-textos.test.js`, que pueden depender de los textos actuales | Que el cambio no rompa lo que ya funciona |

**Orden sugerido:**

1. Estilos y marco común (tokens, menú de 6 entradas, barra de contexto, avisos, protección de cambios). No necesita cambios en el servidor y ya corrige el contraste, la letra de 15 px y la pérdida de datos.
2. Notas, Planeación (asistencia) y Hoy.
3. Estudiantes con la Ficha (cuando se resuelvan **D1, D3 y D4**).
4. Documentos (cuando se resuelvan **D2 y D5**).
5. Paso de año (**D6**).

---

## Resumen para el usuario (10 líneas)

1. Revisé las 8 pantallas actuales, sus acciones y sus textos. Encontré pérdida de datos real (Nivelación, Año y materias, planes y guías sin aviso al salir).
2. Hay tareas con demasiados clics: sacar los boletines de 25 niños cuesta 75 clics; la asistencia está escondida en Planeación y pide una materia.
3. Hay textos técnicos visibles («token», «JSON», «AAAA-MM-DD», «Error 500») y letra de 15,2 px por un error de medida en el CSS.
4. El menú nuevo tiene 6 entradas: Hoy, Notas, Planeación, Estudiantes, Documentos, Respaldo y ajustes.
5. El patrón propio es «grado primero, tarea después»: una barra de contexto con botones de grado (un clic), pestañas por tarea y la acción principal siempre en el mismo lugar.
6. Los módulos nuevos se integran sin parecer pegados: matrícula y acudientes van en la Ficha del estudiante; certificados, circulares, directorio y boletines van en Documentos con un solo molde; el reporte del grado es una pestaña de Notas.
7. La paleta nueva es «Cuaderno y tinta» con acento azul petróleo. Todos los contrastes están calculados y pasan AA (texto 5,68:1 como mínimo, controles 4,53:1). No hay degradados, sombras ni iconos.
8. La letra base es de 18 px y nunca baja de 16 px. Hay una escala de espacios y componentes definidos (botones, tabla, tarjeta, aviso, formulario, selector segmentado).
9. Las decisiones del colegio D1 a D6 quedan marcadas en cada pantalla, sin inventar textos ni flujos.
10. Incluye la tabla de cambios por archivo (nada aplicado) y un orden: primero estilos y marco común, que no necesitan cambios en el servidor.
