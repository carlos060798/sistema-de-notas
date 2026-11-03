# Diseño de interacción y UI: reporte por grado y gestión administrativa

Fecha: 2026-11-02 · Agente: `desarrollador-frontend` (diseño de interacción) · Estado: propuesta, sin código de producción.

## 0. Fuentes y advertencias previas

- **`C:\Users\usuario\Downloads\sistema-de-notas\` no existía** (ni `DESIGN.md` ni `src\ui\`). Esta carpeta `reportes\` se creó solo para dejar este documento.
- La UI real se leyó del ejecutable más reciente, `Downloads\sistema-de-notas-windows (2)\notas.exe` (2 nov 2026, 20:18), que trae incrustados `app.js`, `estilos.css` e `index.html`. Todo lo que aquí se dice como "ya existe" sale de esa versión.
- Sin `DESIGN.md`, la **fuente visual son los tokens de `estilos.css`** (`--fondo`, `--papel`, `--texto`, `--suave`, `--marca*`, `--bien`, `--mal`/`--mal-fondo`, `--alerta`/`--alerta-fondo`, tema oscuro y letra de 18 px con system-ui). **No se proponen colores nuevos.** Solo se usan combinaciones de color y fondo que la app ya tiene (por ejemplo, `--mal` sobre `--mal-fondo` en `#aviso.error` y `--alerta` sobre `--alerta-fondo` en `.dato.alerta`). No pude verificar el contraste contra `DESIGN.md`. Si ese archivo aparece, hay que cotejar esta propuesta con él.

### Patrones existentes que se reutilizan (no se inventan otros)

| Patrón | Dónde está hoy | Uso en las pantallas nuevas |
|---|---|---|
| `section.contexto` fija arriba con `selector()` de Año/Grado/Periodo | Notas, Planeación, No aprueban | Barra de filtros de todas las pantallas nuevas |
| `.pestanas` con `aria-current="true"` | Planeación | Las secciones de «Secretaría» |
| `section.tarjeta`, `.fila`, `.fila-acciones`, `label.ancha`, `input.corto` | En todas | Formularios y bloques |
| `#aviso` (alerta fija arriba; se oculta a los 3,5 s; si es error, queda visible) | `aviso()` | Confirmaciones y errores breves |
| `ventana()` / `confirmar()` / `preguntar()` (`dialog.modal`; el foco empieza en «Cancelar») | Global | Salir sin guardar, quitar acudiente, recuperar borrador |
| `details.menu-doc` «Documentos» | Fila de Estudiantes | Descargas por estudiante |
| `.etiqueta.bien` / `.etiqueta.mal` (con texto, no solo color) | Notas, Estudiantes | Estado de la ficha y de las notas |
| `.dato` en `.rejilla` (cifra + nombre) | Hoy | Resumen del reporte por grado |
| `descargarDocumento(ruta)` + aviso «Descargado: …» | Planillas, boletines | Todos los PDF y Word nuevos |
| `ul.sin-vinetas`, `pre.texto`, `label.casilla` | Varias | Listas, vista previa y casillas |

### Decisión de navegación

Hoy el menú tiene 8 botones. En un monitor de 1366×768 dentro de la ventana de Edge (unos 720 px útiles) caben unos 11 sin desplazar el menú lateral. Si se agregaran cinco entradas (reporte, matrícula, certificados, directorio, circulares) quedarían 13: «Respaldo» y «Año y materias» se saldrían de la pantalla, y Respaldo es lo más crítico. Por eso:

- **Gestión académica:** una entrada nueva, **«Reporte por grado»**, después de «No aprueban».
- **Gestión administrativa:** una sola entrada nueva, **«Secretaría»** (la palabra que se usa en las escuelas para matrícula, certificados y circulares), con pestañas como en Planeación: **Matrícula · Certificados · Directorio · Circulares**.
- Menú final (10): Hoy, Notas, Estudiantes, No aprueban, **Reporte por grado**, Nivelación, Planeación, **Secretaría**, Respaldo, Año y materias.
- La pestaña elegida se guarda en el hash (`#secretaria/circulares`) para que «volver» y el arranque abran el mismo sitio.

---

## 1. Reglas transversales

### 1.1 Teclado y foco

- Se mantiene el orden natural del documento. **Nunca `tabindex` mayor que 0.** El orden de tabulación de cada pantalla es su estructura de arriba abajo.
- Al cambiar de pantalla o de pestaña, el foco pasa al `h2` del contenido (`tabindex="-1"`). Así quien usa teclado no recorre otra vez los 10 botones del menú.
- Se agrega el enlace **«Saltar al contenido»**, primer elemento enfocable de la página. Solo se ve cuando recibe el foco.
- Atajos (pocos y explicados en pantalla, porque el usuario tiene poca práctica):

| Tecla | Dónde | Qué hace |
|---|---|---|
| `Ctrl+S` | Ficha de matrícula y editor de circular | Guarda. Se bloquea el «Guardar página» de Edge. Si no hay cambios, avisa «No hay cambios por guardar». |
| `Esc` | Ventanas y menús «Documentos» | Cierra. **`details` no se cierra solo con Esc: hay que programarlo** y devolver el foco al `summary`. |
| `Ctrl+P` | Directorio y reporte por grado | Imprime solo la hoja, gracias a las reglas de impresión nuevas (sección 5). |
| `Enter` | Campos de una línea en la ficha y la circular | **No envía el formulario** (se evita el envío implícito). Para guardar se usa el botón o `Ctrl+S`. |
| Flechas ↑ ↓ | Lista de casillas de estudiantes | Mueven el foco entre casillas, como las flechas en Notas. |

- **Hallazgo:** la app cambia `location.hash` pero no escucha `hashchange`. Con `Alt+←` (atrás en Edge) cambia la dirección y la pantalla sigue igual, y el aviso de cambios sin guardar no se activaría. Hay que escuchar `hashchange` y pasarlo por la misma protección de la sección 1.3.

### 1.2 Avisos accesibles (sin depender del color)

- Todo estado se escribe en palabras: «Completa», «Faltan 2 datos», «No aprueba», «Falta nota», «Borrador», «Cambios sin guardar». El color solo refuerza.
- En tablas, las celdas que no aprueban llevan un **símbolo de texto (▼)**, letra en negrilla y una leyenda visible («▼ = por debajo de 3,0»). Para el lector de pantalla se agrega el texto oculto «no aprueba».
- Error en un campo: borde de 2 px más el texto «Error:» debajo, unido con `aria-describedby`, y `aria-invalid="true"`.
- El estado del autoguardado usa `aria-live="polite"`. No se usa `#aviso` (que tiene `role="alert"`) para no interrumpir cada pocos segundos.

### 1.3 Cómo no perder lo escrito

Hay un **riesgo actual** que hay que evitar en las pantallas nuevas: cada `mostrar()` vuelve a construir toda la pantalla. Si un formulario largo guarda una parte y llama a `mostrar()`, se borra lo que no se había guardado en las otras partes.

Reglas:

1. **Un solo botón «Guardar ficha»** por ficha, no uno por sección. Después de guardar bien, se actualizan los datos en su sitio. La pantalla se repinta completa solo cuando ya no queda nada pendiente.
2. **Si el guardado falla, nunca se vacían los campos.**
3. **Señal de «cambios sin guardar».** Al escribir aparece junto al botón el texto «Cambios sin guardar» (en `--alerta`, con un punto «●» antes). Al guardar cambia a «Guardado a las 10:42».
4. **Protección al salir.** Si hay cambios sin guardar y la persona hace clic en el menú, en una pestaña, en un selector de Año o Grado, en «Volver a la lista» o usa `Alt+←`, se abre `ventana()` con:
   > **Tiene cambios sin guardar en la ficha de Juan Pérez.**
   > ¿Qué quiere hacer?
   > [Guardar y salir] [Salir sin guardar] [Seguir aquí] ← el foco empieza aquí

   Al cerrar la ventana del programa se usa también `beforeunload`, que muestra el aviso propio de Edge.
5. **Borrador de respaldo en el navegador.** Mientras haya cambios, cada 3 s sin escribir se copia el formulario en `localStorage` (clave `notas.borrador.<tipo>.<id|nuevo>`). Si al abrir la ficha o la circular hay un borrador más nuevo que lo guardado:
   > **Encontramos algo que usted escribió el 2 de noviembre a las 10:42 y no alcanzó a guardarse.**
   > [Recuperarlo] [Descartarlo]

   Si se descarta, se pide confirmar: «¿Seguro? Lo que no se guardó se perderá.» El borrador se borra al guardar bien. Si `localStorage` falla, se sigue sin él y sin avisar (igual que en la app actual).
6. **Las circulares además se guardan solas en la base** como «Borrador», 2 s después de dejar de escribir y al salir de cada campo. Así entran en las copias y en el Excel de respaldo, cosa que no pasa con `localStorage`.
7. Los textos largos llevan `maxlength` y un contador que aparece al pasar el 80 % («4.200 de 5.000 letras»). Así no hay cortes sorpresa.

### 1.4 Formularios de datos personales (formato colombiano)

Principio: **guardar aunque falten datos y bloquear solo lo que está mal.** En el campo, los datos llegan de a poco (la mamá trae el registro civil otro día).

| Dato | Cómo se pide | Cómo se guarda y se muestra | Se bloquea si… | Solo se advierte si… |
|---|---|---|---|---|
| **Fecha** (nacimiento, matrícula, expedición, circular) | `input type="date"`, que en Edge con Windows en español se ve dd/mm/aaaa. Debajo se escribe la fecha en palabras para comprobarla: «3 de noviembre de 2026». En nacimiento se muestra la edad: «Tiene 8 años». | ISO `aaaa-mm-dd` en la base; en documentos, «3 de noviembre de 2026» o 03/11/2026 | Es una fecha imposible, o el nacimiento queda en el futuro o antes de 1990 | La edad es rara para el grado (más de 3 años de diferencia con la usual): «Juan tiene 14 años y está en Segundo. ¿La fecha está bien?» |
| **Tipo de documento** del estudiante | Lista: Registro civil (RC) · Tarjeta de identidad (TI) · Permiso por protección temporal (PPT) · Cédula de extranjería (CE) · Pasaporte · No tiene todavía | Código corto | — | Tiene 7 años o más y su documento es RC: «Desde los 7 años se usa tarjeta de identidad. ¿Ya la tiene?» |
| **Tipo de documento** del acudiente | Cédula de ciudadanía (CC) · Cédula de extranjería (CE) · PPT · Pasaporte · Otro | Código corto | — | — |
| **Número de documento** | Texto, no `type=number` (para no perder ceros y que no salgan flechas). `inputmode="numeric"` para RC, TI y CC. Se aceptan puntos y espacios. | Al salir del campo se quitan puntos y espacios en silencio. Se guarda solo el número. En documentos de CC se muestra con puntos de mil (1.234.567.890) y los demás tal cual. | Hay letras en RC, TI o CC; o **otro estudiante tiene el mismo documento** (en ese caso se ofrece [Abrir esa ficha]) | El largo es raro: RC, TI o CC fuera de 6 a 11 dígitos |
| **Celular** | Texto con `inputmode="tel"`. Ayuda: «10 números, por ejemplo 310 123 4567» | Se quitan espacios, guiones y un +57 o 57 inicial. Se guardan 10 dígitos y se muestran como `310 123 4567`. | Después de limpiar no son 10 dígitos, o no empieza por 3 | — |
| **Otro teléfono** (fijo o de un vecino) | Igual que el celular | Los fijos desde 2021 también tienen 10 dígitos (601…, 604…, 607…): `604 444 5566` | No son 10 dígitos | No empieza por 3 ni por 60 |
| **Nota del contacto** | Texto corto: «Ej.: es del vecino; llamar después de las 5» | Tal cual | — | — |
| **Dirección** | Tres campos: Vereda o barrio · Indicaciones para llegar (texto libre: «Finca El Roble, después de la escuela») · Municipio (se llena con el de la institución) | Tal cual | — | — |
| **Nombre completo** | Se mantiene el campo único que ya existe. Ayuda: «Como aparece en el registro civil». | Tal cual | Está vacío | — |
| **Grupo sanguíneo** | Lista: O+, O−, A+, A−, B+, B−, AB+, AB−, No sabe | — | — | — |

- Siempre hay una etiqueta visible. **No se usa el texto de ejemplo como etiqueta.** La ayuda va debajo, en `.suave`.
- Los obligatorios se marcan en palabras: «Nombre completo (obligatorio)». No se usa solo un asterisco.
- La validación ocurre **al salir del campo** y **al guardar**, nunca con cada tecla.
- Al guardar con errores, arriba aparece un **resumen de errores** y recibe el foco: «No se guardó. Revise 2 datos:» seguido de enlaces que llevan a cada campo.
- **Datos sensibles** (salud, discapacidad y similares, según la Ley 1581 de 2012; más aún si son de menores):
  - van en un bloque aparte y plegado, «Salud y cuidados (opcional)»;
  - nunca salen en el directorio ni en las circulares;
  - la ficha incluye la casilla «El acudiente autorizó guardar estos datos para uso de la escuela» y la fecha en que se marcó.

---

## 2. Pantalla «Reporte por grado» (gestión académica)

**Objetivo:** ver de un vistazo cómo va todo un grado en todas las materias, y descargar o imprimir ese resumen.

### Estructura (de arriba abajo)

1. **`section.contexto`** (existe). Contiene:
   - `h2` «Reporte por grado»;
   - selectores **Año**, **Grado** y **Periodo**. El de Periodo tiene las opciones «Periodo 1» a «Periodo 4» y además «Año completo» (nueva).
2. **`.rejilla` de `.dato`** (existe), con cinco tarjetas:
   - «estudiantes»;
   - «aprueban todas las materias» (`bien`);
   - «no aprueban alguna materia» (`mal` si es más de 0), con el botón «Ver quiénes» que lleva a No aprueban con el grado filtrado;
   - «notas por escribir» (`alerta` si es más de 0);
   - «promedio del grado».
3. **Tarjeta con la tabla** (contenedor nuevo `.tabla-ancha`):
   - **Filas:** una por estudiante activo, en orden alfabético.
   - **Columnas:**
     - Estudiante (fija a la izquierda);
     - una por cada materia del grado, con el nombre abreviado en la cabecera (`<abbr title="Ciencias naturales">C. Nat.</abbr>`);
     - «Promedio»;
     - «Materias sin aprobar», en texto: «2» o «Ninguna».
   - **Pie (`tfoot`):** «Promedio de la materia» y «No aprueban» (cuántos por materia).
   - **Celdas:**
     - si no aprueba: «▼ 2,8» en negrilla con la clase `no-aprueba`;
     - si falta nota: «Falta» con la clase `falta`;
     - si la materia no se dicta en ese grado, no aparece la columna.
   - El nombre de cada estudiante es un botón que abre su menú «Documentos» (boletín y certificados, ya existen).
4. **Leyenda** (nueva, `.leyenda`): «▼ = por debajo de 3,0 (nota mínima) · Falta = hay notas sin escribir en ese periodo». La nota mínima sale de `/api/umbral`.
5. **Casilla** «Mostrar el puesto de cada estudiante». Viene desmarcada. Si se marca, agrega la columna «Puesto» en pantalla y en el documento.
6. **`.fila-acciones`:** «Descargar PDF» (`principal`), «Descargar Excel», «Imprimir», y «Todos los grados en un PDF», para el docente multigrado.
7. Nota `.suave`: «Este reporte solo muestra datos. Para cambiar una nota, vaya a «Notas».»

### Estados

| Estado | Qué se ve |
|---|---|
| Cargando | «Cargando el reporte…» dentro de la tarjeta, con la barra de filtros ya visible |
| Vacío: sin estudiantes | `.vacio`: «No hay estudiantes en Segundo este año.» + [Ir a «Estudiantes»] |
| Vacío: sin materias | Se reutiliza `sinMateriasEnElGrado()` (existe) |
| Vacío: sin notas | La tabla con «Falta» en todas las celdas, y arriba: «Todavía no hay notas en el periodo 2 para Segundo.» |
| Con datos | Lo descrito arriba |
| Año cerrado | Al lado del `h2`, `.etiqueta`: «Año cerrado: solo consulta». El reporte funciona igual. |
| Transición (0) | Aviso `.suave`: «En Transición el reporte muestra las notas tal como se escribieron.» (Ver la decisión pendiente D5.) |
| Error al cargar | `#aviso` en modo error con el mensaje del servidor. La tarjeta dice «No se pudo cargar el reporte. [Intentar de nuevo]». |
| Descarga lista | `#aviso`: «Descargado: Reporte-Segundo-Periodo2-2026.pdf» |

### Orden de tabulación

Menú → Año → Grado → Periodo → «Ver quiénes» (si aparece) → contenedor de la tabla (`tabindex="0"` con `aria-label="Tabla del reporte; use las flechas para desplazarse"`, para poder moverse de lado con el teclado) → nombre de cada estudiante (botones) → casilla Puesto → Descargar PDF → Excel → Imprimir → Todos los grados.

### Pantalla estrecha (≤ 800 px)

- Los filtros se apilan y la rejilla queda en una columna, como hoy.
- **Solo la tabla** se desplaza de lado dentro de su contenedor (la página nunca), con la columna Estudiante fija.
- Encima de la tabla aparece «Deslice la tabla de lado para ver todas las materias →».

---

## 3. «Secretaría» (gestión administrativa)

Cabecera común (`section.contexto`):

- `h2` «Secretaría»;
- selector **Año** y, en las pestañas que lo usan, **Grado**, con la opción «Todos los grados»;
- `.pestanas`: **Matrícula · Certificados · Directorio · Circulares**. Cambiar de pestaña pasa por la protección de la sección 1.3.

### 3.1 Pestaña «Matrícula»: lista de estudiantes

**Estructura**

1. Contexto (Año, Grado o «Todos»).
2. `.fila`:
   - campo **Buscar** («Nombre o documento»), que filtra mientras se escribe, sin tener que pulsar un botón;
   - casilla «Solo fichas incompletas»;
   - botón `principal` **«Matricular estudiante nuevo»**.
3. Tabla:
   - **Nombre**;
   - **Grado**;
   - **Acudiente principal** (nombre y parentesco);
   - **Celular**;
   - **Ficha**:
     - `.etiqueta.bien` «Completa», o
     - `.etiqueta.alerta` (nueva) «Faltan 2 datos». Su `title` y su texto oculto los nombran: «Faltan: celular del acudiente, fecha de nacimiento».
   - **Acciones:** «Abrir ficha» (`secundario`) y el menú «Documentos» (existe), ampliado con «Certificado de matrícula PDF/Word».
4. Resumen `.suave`: «23 estudiantes · 19 fichas completas · 4 incompletas».

**Relación con «Estudiantes».** No se duplica:

- El formulario rápido de «Estudiantes» (nombre, documento y grado) sigue igual.
- Cada fila de Estudiantes gana el botón «Ficha», que abre esta ficha.
- «Matricular estudiante nuevo» abre la misma ficha vacía.

**Estados**

| Estado | Mensaje |
|---|---|
| Vacío | «Todavía no hay estudiantes matriculados en 2026.» + [Matricular estudiante nuevo] |
| Búsqueda sin resultados | «Nadie coincide con «Pérz». Revise cómo lo escribió.» |
| Filtro de incompletas sin resultados | «Todas las fichas de este grado están completas.» (`.etiqueta.bien`) |
| Error | `#aviso` en modo error + «No se pudo cargar la lista. [Intentar de nuevo]» |

**Tabulación:** Año → Grado → Pestañas → Buscar → Solo incompletas → Matricular nuevo → por cada fila: Abrir ficha, Documentos.

**Estrecha:** la tabla pasa a **una tarjeta por estudiante**, con el nombre en negrilla y debajo: grado · acudiente · celular · estado. Los botones quedan abajo y ocupan el ancho.

### 3.2 Ficha de matrícula (subvista de «Matrícula»)

**Estructura (de arriba abajo)**

1. Botón con aspecto de enlace «← Volver a la lista» (pasa por la protección de la sección 1.3).
2. `h2`:
   - «Ficha de matrícula: Juan Pérez Gómez», o
   - «Matricular estudiante nuevo».
3. **Resumen de errores** (`.resumen-errores`, nuevo). Solo aparece al guardar con errores.
4. Si existe un borrador más nuevo, aviso para **recuperarlo** (sección 1.3, punto 5).
5. Tarjeta **«Datos del estudiante»** (`.rejilla-form`, nueva):
   - Nombre completo (obligatorio);
   - Tipo de documento · Número de documento;
   - Fecha de nacimiento, con la edad debajo · Lugar de nacimiento;
   - Sexo (Femenino / Masculino / Prefiere no decir);
   - Vereda o barrio · Municipio · Indicaciones para llegar (`label.ancha`).
6. Tarjeta **«Matrícula en 2026»**:
   - Grado (obligatorio);
   - Fecha de matrícula (por defecto, hoy);
   - Situación (radios): Nuevo en la sede · Viene del año pasado · Repite el grado;
   - **«Viene de (escuela anterior)»**, que solo aparece si se marca «Nuevo»;
   - Observaciones de matrícula (`textarea`, 1.000 letras).
7. Tarjeta **«Acudientes»**:
   - Texto `.suave`: «Agregue a las personas que responden por el estudiante. Marque cuál es el contacto principal: ese sale en el directorio y en las circulares.»
   - Un **`fieldset.acudiente`** (nuevo) por acudiente:
     - leyenda «Acudiente 1: Madre» (se actualiza con el parentesco);
     - campos:
       - Nombre completo (obligatorio dentro del acudiente);
       - Parentesco (Madre, Padre, Abuela, Abuelo, Tía, Tío, Hermana o hermano mayor, Madrina o padrino, Otro, que abre «¿Cuál?»);
       - Tipo y número de documento;
       - Celular · Otro teléfono · Nota del contacto;
       - casilla «Vive con el estudiante»;
       - Ocupación (opcional);
     - radio **«Contacto principal»** (un solo radio para todo el grupo);
     - botón `peligro` «Quitar a este acudiente».
   - Botones al final:
     - **«Agregar otro acudiente»**: agrega un `fieldset` vacío y pone el foco en su primer campo;
     - **«Usar un acudiente ya registrado»**: abre una ventana para buscar por nombre o documento entre los acudientes de otros estudiantes, para los hermanos de una escuela multigrado.
   - Si un acudiente se comparte, su leyenda dice: «También es acudiente de: Ana Pérez (Cuarto), Luis Pérez (Primero). Si cambia sus datos, cambian para todos.»
   - El primer acudiente queda como principal automáticamente.
8. **`details` «Salud y cuidados (opcional)»**, cerrado por defecto:
   - EPS · Régimen (Subsidiado / Contributivo / No sabe) · Grupo sanguíneo;
   - Alergias o cuidados de salud · Apoyos que necesita (`textarea`);
   - nota `.suave`: «Estos datos son privados: no salen en el directorio ni en las circulares.»
9. Tarjeta **«Autorización»**: casilla «El acudiente autorizó guardar y usar estos datos para fines escolares». Al marcarla aparece «Registrada el 2 de noviembre de 2026».
10. **Barra fija de guardado** (`.barra-guardar`, nueva, abajo):
    - [Guardar ficha] (`principal`);
    - texto de estado: «Cambios sin guardar» / «Guardado a las 10:42» / «No se guardó: revise los datos marcados»;
    - menú «Documentos» de este estudiante (existe);
    - ayuda: «También puede guardar con Ctrl+S».

**Mensajes exactos**

| Situación | Texto |
|---|---|
| Guardado bien (ficha nueva) | `#aviso`: «Estudiante matriculado» y la vista pasa a la ficha guardada |
| Guardado bien (ficha existente) | `#aviso`: «Ficha guardada» |
| Guardado con datos faltantes | `#aviso`: «Ficha guardada. Aún faltan: fecha de nacimiento, celular del acudiente.» |
| Resumen de errores | «No se guardó. Revise 2 datos:» seguido de enlaces del tipo «Celular de la madre: deben ser 10 números» |
| Nombre vacío | «Error: escriba el nombre completo del estudiante.» |
| Celular mal | «Error: el celular debe tener 10 números y empezar por 3. Ejemplo: 310 123 4567.» |
| Teléfono fijo mal | «Error: el teléfono debe tener 10 números. Los fijos empiezan por 60, por ejemplo 604 444 5566.» |
| Fecha futura | «Error: la fecha de nacimiento no puede ser después de hoy.» |
| Documento repetido | «Error: ya hay un estudiante con ese documento: María López (Tercero).» + [Abrir esa ficha] |
| Documento con letras | «Error: la tarjeta de identidad solo lleva números.» |
| Advertencia de edad | «¿La fecha está bien? Juan tendría 14 años y está en Segundo.» (no bloquea) |
| Advertencia de RC | «Juan ya tiene 8 años: normalmente usa tarjeta de identidad. ¿Quiere cambiar el tipo de documento?» (no bloquea) |
| Quitar acudiente | Confirmación: «¿Quitar a Rosa Gómez como acudiente de Juan? Se quita cuando guarde la ficha. Si es acudiente de otros estudiantes, allá sigue igual.» |
| Quitar al principal | Además: «Rosa era el contacto principal. Ahora lo será Pedro Pérez.» (o «Marque otro contacto principal», si no queda nadie) |
| Sin acudientes | No bloquea. La lista mostrará «Faltan: acudiente». |
| Sin autorización | No bloquea. La ficha queda incompleta y la tarjeta dice «Falta registrar la autorización del acudiente». |
| Año cerrado | La tarjeta «Matrícula en 2026» se vuelve de solo lectura y dice «Año cerrado: solo consulta». Los datos personales y los acudientes sí se pueden editar, porque son de la persona y no del año. |
| Error de conexión | El de siempre: «No se pudo hablar con el programa. Si lo cerró, ábralo de nuevo.» Los campos **no** se borran y el borrador local queda. |

**Tabulación:** «Volver» → campos en el orden visual (en la rejilla, por filas: de izquierda a derecha y de arriba abajo) → en cada acudiente sus campos, luego Contacto principal y luego Quitar → Agregar otro → Usar uno ya registrado → `summary` de Salud (y sus campos, si está abierto) → Autorización → Guardar ficha → Documentos.

Al agregar un acudiente, el foco va a su campo «Nombre completo». Al quitarlo, el foco va a la leyenda del acudiente anterior, o a «Agregar otro» si no queda ninguno.

**Estrecha:**

- `.rejilla-form` pasa a una columna y todos los campos ocupan el ancho;
- la barra de guardado ocupa el ancho y queda fija abajo;
- se deja espacio al final del contenido para que la barra no tape el último campo.

### 3.3 Pestaña «Certificados»

Se emiten dos documentos distintos:

- **Certificado de matrícula:** dice que el estudiante está matriculado en el año y grado, sin notas. **Es nuevo.**
- **Certificado de estudio:** dice que cursó el grado, con las notas por materia y el resultado. **Es el «Certificado» que ya existe en el menú Documentos.** Se propone cambiarle el nombre ahí a «Certificado de estudio» para que no se confunda.

**Estructura**

1. Contexto: Año y Grado (o «Todos»).
2. Radios **«¿Qué certificado?»**:
   - «De matrícula (dice que está matriculado)»;
   - «De estudio (con las notas del año)».
3. **Lista de estudiantes con casillas** (`.lista-casillas`, nueva). Arriba van «Marcar todos» y «Quitar marcas», y el contador «3 marcados».
4. `.fila`:
   - **Fecha de expedición** (por defecto, hoy, con la fecha en palabras debajo);
   - **«Para qué es» (opcional)**, con el ejemplo «Ej.: trámite de Familias en Acción»; sale en el texto como «Se expide a solicitud del interesado, para …».
5. **Avisos antes de descargar**, en lista y en palabras:
   - «A Juan Pérez le falta el número de documento: saldrá sin él.»;
   - «Ana Ruiz tiene 2 materias sin nota este año: en el certificado dirá «Sin nota».»;
   - «El año 2026 no está cerrado: el certificado de estudio mostrará las notas que hay hasta hoy.»
   - Si faltan datos de la institución: «Faltan datos de la institución (código DANE, quién firma). Complételos en «Año y materias».» + [Ir a «Año y materias»].
6. **Vista previa** (`.vista-previa`, nueva): el texto del certificado del **primer estudiante marcado**, con un selector «Ver vista previa de: …».
7. `.fila-acciones`: «Descargar PDF» (`principal`) y «Descargar Word». El texto de ayuda dice: «Con varios estudiantes sale un solo archivo, una hoja por estudiante.»

**Estados**

| Estado | Mensaje |
|---|---|
| Nadie marcado | Los botones quedan activos, pero al pulsarlos aparece el error «Marque al menos un estudiante.» y el foco va a la lista. **No se deshabilitan:** quien tiene poca práctica no entiende un botón gris. |
| Sin estudiantes | «No hay estudiantes matriculados en este grado.» |
| Descargado | «Descargado: Certificados-matricula-Segundo-2026.pdf (3 hojas)» |
| Error | `#aviso` en modo error con el mensaje del servidor |

**Tabulación:** Año → Grado → Pestañas → radios de tipo (las flechas cambian entre ellos) → Marcar todos → Quitar marcas → casillas (Tab entra a la primera y las flechas recorren las demás) → Fecha → Para qué es → enlaces de los avisos → selector de vista previa → PDF → Word.

**Estrecha:** la lista de casillas pasa a una columna con altura máxima de unas 12 filas y desplazamiento propio; la vista previa ocupa el ancho.

### 3.4 Pestaña «Directorio»

**Estructura**

1. Contexto: Año y Grado (o «Todos»: un bloque por grado en la hoja).
2. **`details` «Qué columnas incluir»**. Viene abierto la primera vez y después recuerda la elección por navegador. Casillas:
   - marcadas por defecto: Estudiante · Acudiente principal y parentesco · Celular · Vereda o barrio;
   - opcionales: Documento del estudiante · Fecha de nacimiento · Otros acudientes · Otro teléfono · Nota del contacto.
   - **Los datos de salud no se ofrecen.**
3. **Aviso de faltantes**, con texto y la etiqueta de alerta: «4 estudiantes no tienen celular del acudiente.» + [Ver cuáles], que lleva a Matrícula con «Solo fichas incompletas».
4. **Vista previa = la hoja que se imprime** (tabla dentro de `.imprimible`):
   - título «Directorio de acudientes: Segundo, 2026», más la institución y la sede;
   - pie «Uso interno de la escuela. Contiene datos personales: guárdelo en un lugar seguro y no lo publique.»;
   - las celdas vacías dicen «Sin registrar», nunca quedan en blanco.
5. `.fila-acciones`: «Imprimir» (`principal`), «Descargar PDF» y «Descargar Excel».

**Estados**

| Estado | Mensaje |
|---|---|
| Vacío | «No hay estudiantes matriculados en este grado.» |
| Sin ningún acudiente | La tabla sale igual y el aviso dice: «Ningún estudiante de este grado tiene acudiente registrado. Complete las fichas en «Matrícula».» |
| Error al imprimir | No hay forma de detectarlo de forma fiable. Debajo del botón se pone la ayuda: «Si no sale la ventana de imprimir, use «Descargar PDF».» |

**Tabulación:** Año → Grado → Pestañas → `summary` de columnas → casillas → «Ver cuáles» → Imprimir → PDF → Excel. La tabla no tiene elementos enfocables.

**Estrecha:** la vista previa se desplaza de lado dentro de su contenedor. Al imprimir siempre sale a lo ancho de la hoja carta (reglas `@media print`).

### 3.5 Pestaña «Circulares»

Tiene dos vistas: la **lista** y el **editor**.

**Lista**

1. Botón `principal` **«Escribir circular nueva»**.
2. Tabla:
   - Número · Fecha · Asunto · Para quién («Todos», «Segundo y Tercero», «5 estudiantes»);
   - Estado: `.etiqueta` «Borrador» o `.etiqueta.bien` «Descargada el 2 nov»;
   - Acciones: «Abrir», «Hacer una copia» (para reutilizar la del mes pasado) y «Quitar» (`peligro`, con confirmación).
3. Vacío: «Todavía no ha escrito circulares.» + [Escribir circular nueva].

**Editor (de arriba abajo)**

1. «← Volver a las circulares» (con protección).
2. `h2` «Circular nueva» o «Circular 07 de 2026».
3. **Estado del autoguardado** (`aria-live="polite"`):
   - «Borrador guardado a las 10:42»;
   - mientras guarda: «Guardando…»;
   - si falla: «No se pudo guardar. Su texto sigue aquí. No cierre el programa.» (en `--mal`, con «Error:» delante).
4. `.fila`:
   - **Número** (se propone el siguiente: «07»; se puede cambiar);
   - **Fecha** (hoy, con la fecha en palabras);
   - **Asunto** (`label.ancha`, obligatorio para descargar, no para guardar el borrador).
5. **«¿A quién va dirigida?»** (radios):
   - «A los acudientes de toda la sede»;
   - «A los acudientes de algunos grados»: muestra casillas de grados;
   - «A los acudientes de algunos estudiantes»: muestra la `.lista-casillas` con el buscador.
   - Contador en palabras: «Llegará a 23 estudiantes (19 familias).»
6. **Saludo** (por defecto: «Señores padres de familia y acudientes:»).
7. **Texto de la circular** (`textarea.circular`, nuevo, 5.000 letras, contador al 80 %). Ayuda: «Escriba como en una carta. Deje una línea en blanco entre párrafos. Para una lista, empiece cada línea con un guion (-).» No hay editor de formato: es más liviano para el computador viejo y más fácil de usar, y quien necesite más formato descarga el Word.
8. **Despedida** (por defecto «Atentamente,») y **firma**: nombre y cargo, que salen de los datos de la institución y se pueden editar.
9. **`details` «Cómo imprimirla»**:
   - radios de copias:
     - «Una sola circular general»;
     - «Una por estudiante, con su nombre»;
     - «Una por familia: los hermanos comparten una» (por defecto, porque ahorra papel en multigrado);
   - casilla **«Agregar desprendible de recibido»**: la colilla para que el acudiente la firme y la devuelva;
   - contador: «Se imprimirán 19 hojas.»
10. **Vista previa** (`.vista-previa`) de la primera copia.
11. **Barra fija** (`.barra-guardar`):
    - [Descargar PDF] (`principal`) · [Descargar Word] · [Guardar borrador];
    - ayuda: «Se guarda solo mientras escribe. Ctrl+S también guarda.»

**Mensajes exactos**

| Situación | Texto |
|---|---|
| Descargar sin asunto | Resumen de errores: «Para descargar falta: el asunto.» + enlace al campo |
| Descargar sin texto | «Para descargar falta: el texto de la circular.» |
| Descargar sin destinatarios | «Para descargar falta: elegir a quién va dirigida.» |
| Grupo elegido sin estudiantes | «Los grados elegidos no tienen estudiantes matriculados.» |
| Destinatarios sin acudiente (copias con nombre) | Advertencia: «3 estudiantes no tienen acudiente registrado: su copia dirá «Señor acudiente de Juan Pérez».» (no bloquea) |
| Descargada | «Descargado: Circular-07-2026.pdf (19 hojas)». La lista la marca como «Descargada». |
| Quitar | «¿Quitar la circular «Reunión de padres»? No se puede deshacer.» |
| Hacer una copia | «Copia creada como borrador. Revise la fecha y el texto.» Se abre en el editor con la fecha de hoy y el número siguiente. |
| Número repetido | Advertencia: «Ya existe una circular 07 de 2026. ¿Quiere usar el número 08?» [Usar 08] [Dejar 07] |

**Tabulación:** Volver → Número → Fecha → Asunto → radios de destino (y sus casillas o buscador) → Saludo → Texto → Despedida → Firma → `summary` de impresión (y sus opciones) → selector de vista previa → Descargar PDF → Word → Guardar borrador.

**Estrecha:** todos los campos ocupan el ancho y la barra queda fija abajo. La vista previa va debajo del texto, nunca al lado.

---

## 4. Lo que el backend o el arquitecto tienen que decidir (fuera del alcance de la UI)

- **D1. Modelo de datos:**
  - campos nuevos de la ficha (persona) y de la matrícula (año);
  - tabla de acudientes con relación de muchos a muchos con estudiantes (hermanos), con un principal por estudiante;
  - tabla de circulares con su estado.
  - Todo debe entrar en el Excel de respaldo y en la importación.
- **D2. Datos de la institución:** hoy solo existen nombre, sede y docente. Los certificados colombianos además piden:
  - municipio y departamento;
  - código DANE;
  - resolución de reconocimiento o aprobación;
  - nombre y cargo de quien firma (director rural o rector).
  - Se agregarían en «Año y materias» > «Datos de la institución».
- **D3. Nombre:** se mantiene el campo único «Nombre completo». Si los certificados o el SIMAT exigen apellidos y nombres por separado, hace falta migrar los datos. No se propone en la UI para no forzar al usuario a reescribir.
- **D4. Ley 1581 de 2012 (habeas data):** hay que confirmar con la institución el texto de la autorización y si se necesita el formato firmado en papel. La casilla solo registra que existe.
- **D5. Transición (preescolar):** en Colombia se evalúa con informes descriptivos y no se reprueba. La app hoy le da notas de 1 a 5. Hay que decidir si el reporte por grado lo trata distinto.
- **D6.** «Pasar a todos al año siguiente» (renovar la matrícula en bloque) es una necesidad que viene justo después. No está diseñada aquí.

---

## 5. Cambios de CSS que harían falta (no aplicados)

Todos usan solo los tokens existentes, así que el tema oscuro funciona sin tocar nada más.

| Clase o selector | Propósito |
|---|---|
| `.saltar-contenido` | Enlace «Saltar al contenido», oculto hasta recibir el foco y visible arriba a la izquierda con `--marca` |
| `.tabla-ancha` | Contenedor con `overflow-x: auto` y `max-width: 100%`, para que solo la tabla se desplace y nunca la página; contorno de foco visible porque es enfocable |
| `.tabla-ancha .col-fija` (o `th:first-child, td:first-child`) | Primera columna fija (`position: sticky; left: 0`) con fondo `--papel` |
| `td.no-aprueba` | Fondo `--mal-fondo`, texto `--mal` y negrilla; acompaña al marcador ▼, que va en el texto |
| `td.falta` | Fondo `--alerta-fondo` y texto `--alerta`, para «Falta» |
| `tfoot tr` / `tr.totales` | Borde superior de 2 px `--linea`, negrilla; filas de promedio y conteo |
| `.leyenda` | Línea de leyenda bajo las tablas: `.suave`, tamaño 0,95 rem |
| `.etiqueta.alerta` | Variante que falta: texto y borde `--alerta`, para «Faltan 2 datos» y «Borrador» |
| `.rejilla-form` | Rejilla de campos (`repeat(auto-fit, minmax(240px, 1fr))`) cuyos `label` ocupan la celda; una columna en pantalla estrecha |
| `fieldset.acudiente` y su `legend` | Caja de cada acudiente: borde `--linea`, radio de 14 px, relleno y leyenda en negrilla |
| `.ayuda-campo` | Texto de ayuda bajo el campo (`.suave`, 0,95 rem) |
| `.error-campo` | Mensaje de error bajo el campo, en `--mal` y en negrilla, que empieza con «Error:» |
| `input[aria-invalid="true"], select[aria-invalid="true"], textarea[aria-invalid="true"]` | Borde de 2 px `--mal` con fondo `--mal-fondo`; generaliza lo que hoy hace `td input.nota.invalida` |
| `.resumen-errores` | Caja con borde izquierdo de 4 px `--mal`, fondo `--mal-fondo` y lista de enlaces a los campos; enfocable |
| `.boton-enlace` | Botón con aspecto de enlace (sin borde, subrayado y `--marca`), para «← Volver a la lista» y los enlaces del resumen de errores |
| `.barra-guardar` | Barra fija abajo (`position: sticky; bottom: 0`), fondo `--papel`, borde superior `--linea`, sombra `--sombra`; en estrecho ocupa el ancho |
| `.estado-guardado` | Texto de estado junto al botón: `.suave` en estado normal y modificadores `.sin-guardar` (`--alerta`, con «●» como texto) y `.fallo` (`--mal`) |
| `.contador` | Contador de letras alineado a la derecha bajo el `textarea`, en `.suave` |
| `.lista-casillas` | Lista de casillas de estudiantes en columnas (`columns: 2 260px`), altura máxima de unas 12 filas con desplazamiento propio y borde `--linea` |
| `.vista-previa` | Hoja de vista previa: fondo `--papel`, borde `--borde-campo`, relleno amplio, ancho máximo parecido a una hoja carta y `white-space: pre-wrap` |
| `textarea.circular` | Alto mínimo de unas 16 líneas para el texto de la circular |
| `.imprimible` y `.no-imprimir` | Marcan qué sale y qué no sale en papel |
| `@media print { … }` | **No existe hoy.** Oculta `aside`, `#aviso`, `section.contexto`, `.pestanas`, `.barra-guardar`, `.no-imprimir` y botones; deja fondo blanco y texto negro, letra de 11 pt, `thead { display: table-header-group }` para repetir los encabezados, `.pagina { break-after: page }`, sin sombras ni bordes redondeados, y orientación horizontal para el reporte por grado (`@page`) |
| `@media (max-width: 800px)` (ampliar el bloque existente) | `.rejilla-form` en una columna; `.barra-guardar` a todo el ancho; tabla de Matrícula convertida en tarjetas (`.tabla-tarjetas`: `display: block` por fila, con etiquetas de columna mediante `data-titulo`); `.lista-casillas` en una columna |
| `.tabla-tarjetas` | Variante de tabla que en pantalla estrecha se ve como tarjetas por fila; se usa en la lista de Matrícula y en la de Circulares |
| `main h2[tabindex="-1"]:focus` | Mantiene un contorno de foco discreto cuando el foco llega al título por programa al cambiar de pantalla |
