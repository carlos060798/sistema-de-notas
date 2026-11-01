# DESIGN.md — Sistema de diseño de «Sistema de notas»

> Generado por el agente `product-designer` de FORGE (revisión 2026-10-31).
> Fuente de verdad visual. Los valores salen de `src/ui/estilos.css` tal como está hoy; donde se propone un cambio se marca **[Propuesto]** (ver `reportes/2026-10-31-revision-diseno.md`).

---

## 1. Identidad visual

- **Nombre del producto:** Sistema de notas (nombre corto de ventana). Propuesta de subtítulo bajo el nombre: el nombre de la sede o del docente, tomado de «Datos de la institución».
- **Usuario:** un docente de primaria rural multigrado (grados 0 a 5), poca práctica con software, uso diario, a veces con sol sobre la pantalla.
- **Estilo general:** sobrio, de cuaderno escolar: verde institucional, papel blanco, letra grande, cero adornos. Funciona sin internet.
- **Inspiración:** planilla de notas en papel y cuaderno de planeación. No es un «dashboard».
- **Principios:** 1) la nota que se escribe debe verse y confirmarse; 2) el respaldo siempre visible; 3) una acción principal por tarjeta; 4) texto en español claro, usted, sin jerga.

---

## 2. Paleta de colores (valores reales de `estilos.css`)

### Modo claro

| Token | HEX | Uso |
|---|---|---|
| `--fondo` | `#f3f5f2` | Fondo de la página |
| `--papel` | `#ffffff` | Tarjetas, tablas, campos |
| `--texto` | `#1b2a24` | Texto principal |
| `--suave` | `#4f5f57` | Etiquetas de campo, ayudas, encabezados de tabla |
| `--linea` | `#d3dcd6` | Separadores de filas (solo decorativo) |
| `--marca` | `#1d6b4f` | Botón principal, pestaña activa, foco, ítem activo del menú |
| `--marca-fuerte` | `#14513b` | Hover del botón principal |
| `--marca-texto` | `#ffffff` | Texto sobre `--marca` |
| `--marca-suave` | `#e3f1ea` | Hover de botones secundarios, bloques de texto |
| `--bien` | `#17653a` | «Aprobado», cifras positivas |
| `--mal` | `#a3261b` | «No aprobado», errores, botón de peligro |
| `--mal-fondo` | `#fde8e6` | Fila de estudiante reprobado, aviso de error |
| `--alerta` | `#8a5a00` | Pendientes, nota vacía |
| `--alerta-fondo` | `#fff1cf` | Tarjeta de alerta, celda de nota vacía |
| `--aviso-fondo` | `#fff4d6` | Barra de aviso superior |
| `--lateral` | `#14372b` | Menú lateral |
| `--lateral-texto` | `#e8f3ed` | Texto del menú lateral |
| `--sombra` | `0 1px 2px rgba(20,40,30,.08)` | Tarjetas |
| `--borde-campo` **[Propuesto]** | `#7a8a82` | Borde de inputs/selects/botones secundarios (≥3:1 sobre papel) |
| `--lateral-activo` **[Propuesto]** | `#ffffff` fondo + `--marca-fuerte` texto, o barra izquierda blanca de 4px | Ítem activo del menú |

### Modo oscuro (`prefers-color-scheme: dark`)

| Token | HEX |
|---|---|
| `--fondo` | `#101714` |
| `--papel` | `#1a2420` |
| `--texto` | `#e6efe9` |
| `--suave` | `#a8b8af` |
| `--linea` | `#33423b` |
| `--marca` / `--marca-fuerte` / `--marca-texto` / `--marca-suave` | `#5cc596` / `#7ad8b0` / `#08140f` / `#1d3a2e` |
| `--bien` / `--mal` / `--mal-fondo` | `#62c58e` / `#ff8a7d` / `#3a1f1c` |
| `--alerta` / `--alerta-fondo` / `--aviso-fondo` | `#f2c260` / `#3b3217` / `#3b3217` |
| `--lateral` / `--lateral-texto` | `#0a120f` / `#d7e6dd` |
| `--borde-campo` **[Propuesto]** | `#6f8279` |

**Reglas de color**
- Ningún color fuera de esta tabla. Prohibidos índigo/violeta de Tailwind y gradientes.
- El estado nunca se comunica solo con color: «No aprobado» siempre lleva texto y negrilla; la fila reprobada lleva además el fondo.
- `--linea` es solo para separar filas; nunca como único borde de un control interactivo.
- **[Propuesto]** El modo oscuro no debe activarse solo por el sistema: con sol, el docente necesita el claro. Ofrecer selector «Pantalla clara / oscura» en «Año y materias», por defecto claro.

---

## 3. Tipografía

- **Familia:** `system-ui, "Segoe UI", sans-serif` (Segoe UI en Windows 10; sin fuentes descargadas, el programa no tiene internet).
- **Cifras de notas:** usar `font-variant-numeric: tabular-nums` **[Propuesto]** para que las columnas de notas alineen.

| Uso | Tamaño | Peso |
|---|---|---|
| Base (cuerpo, campos, celdas) | 18px (1rem), interlineado 1,5 | 400 |
| Ayudas, etiquetas de campo, `.suave` | 16px (1rem del CSS con body 18px → en la práctica ~16–18px) — **mínimo 16px** | 400 |
| Encabezados de tabla | 0,95rem (~17px) | 600 |
| Etiqueta de estado | 0,95rem | 400 (700 en «No aprobado») |
| `h3` | 1,05rem | 700 |
| `h2` (título de tarjeta) | 1,25rem (~22px) | 700 |
| Nombre en el menú (`aside h1`) | 1,15rem | 700 |
| Cifra de tarjeta en Inicio | 2,2rem | 800 |
| Nota definitiva **[Propuesto]** | 1,1rem | 700 |

Regla: nada por debajo de 16px reales. Las frases de ayuda de las capturas se ven a ~15px: subirlas.

---

## 4. Espaciado

Escala usada (px): 4 · 6 · 8 · 10 · 12 · 14 · 16 · 18 · 22. **[Propuesto]** normalizar a 4 · 8 · 12 · 16 · 24 · 32.

| Token propuesto | Valor | Uso |
|---|---|---|
| `--space-1` | 4px | Entre etiqueta y campo |
| `--space-2` | 8px | Gap de botones en fila |
| `--space-3` | 12px | Gap de campos |
| `--space-4` | 16px | Entre tarjetas, padding de tarjeta pequeña |
| `--space-6` | 24px | Padding de tarjeta y de `main` |

- Ancho del menú lateral: 230px. Ancho máximo del contenido: 1100px.

---

## 5. Bordes y sombras

| Elemento | Radio |
|---|---|
| Tarjetas, `.dato` | 14px |
| Botones, ítems de menú | 10px |
| Campos | 8px |
| Pestañas | 999px (píldora) |
| Etiquetas de estado | 12px |

Sombra única: `--sombra` (claro), ninguna (oscuro). Menú desplegable: `0 6px 18px rgba(0,0,0,.18)`.
**[Propuesto]** Quitar el borde izquierdo de 6px de `section.contexto` (patrón «AI dashboard tile»); usar el fondo `--marca-suave` en la barra de filtros fija.

---

## 6. Componentes

### Botón principal (`button.principal`)
Fondo `--marca`, texto `--marca-texto`, negrilla, padding 11×20px, radio 10px, hover `--marca-fuerte`, foco anillo 3px `--marca`. Altura mínima 44px. Un solo botón principal por tarjeta.

### Botón secundario
Transparente, borde **[Propuesto]** `--borde-campo` (hoy `--linea`, casi invisible), padding 9×14px, hover `--marca-suave`. Altura mínima 44px.

### Botón de peligro (`button.peligro`)
Borde y texto `--mal`. Siempre con confirmación escrita («¿Cerrar el año 2026? No podrá cambiar notas»).

### Campo de nota (`input.nota`)
Ancho 5,5em, centrado, 18px. Vacío: fondo `--alerta-fondo` + borde `--alerta`. **[Propuesto]** Fuera de rango (menor de 1,0 o mayor de 5,0): borde 2px `--mal` + mensaje bajo la tabla; guardado: marca «Guardado» discreta. Nota menor de 3,0: el número en `--mal` y negrilla.

### Etiqueta de estado (`.etiqueta`)
«Aprobado»: borde y texto `--bien`. «No aprobado»: borde y texto `--mal`, negrilla, **sin partirse en dos líneas** **[Propuesto: `white-space: nowrap`]**.

### Tarjeta (`section.tarjeta`)
Fondo `--papel`, borde 1px `--linea`, radio 14px, padding 18px, sombra `--sombra`.

### Barra de filtros fija (`section.contexto`)
Año, grado, materia, periodo. Pegada arriba al desplazarse.

### Menú lateral
Fondo `--lateral`, ítems de 44px de alto, texto 18px. **[Propuesto]** Sin emojis: solo texto, o iconos SVG de trazo simple de un mismo juego, color `--lateral-texto`. Ítem activo con contraste ≥3:1 contra el lateral.

### Aviso superior (`#aviso`)
Fijo arriba, negrilla, fondo `--aviso-fondo`; error con `--mal-fondo` y texto `--mal`.

---

## 7. Pantallas

| Pantalla (nombre propuesto en el menú) | Nombre actual | Contenido principal |
|---|---|---|
| Hoy | Inicio | Estado del respaldo primero, pendientes (notas por escribir, nivelaciones), avance de temas |
| Notas | Notas | Filtros fijos + tabla de 3 notas por periodo, definitiva y estado; planilla en Excel/PDF |
| Estudiantes | Estudiantes | Agregar estudiante; lista por grado con Editar · Documentos · Archivar |
| Nivelación | Nivelación | Una tarjeta por estudiante y materia con definitiva < 3,0 |
| Cuaderno de clase | Planeación | Temas y avance · Clases · Planes de área y aula · Guías |
| Respaldo | Copias y Excel | Descargar Excel (principal), copias automáticas, recuperar desde Excel |
| Año y materias | Año y materias | Datos de institución, año lectivo, materias |

---

## 8. Accesibilidad (mínimos)

- Texto: contraste ≥4,5:1 (todos los pares de texto actuales lo cumplen; ver reporte).
- Controles: borde o fondo ≥3:1 contra lo que los rodea (hoy **no** se cumple en campos y botones secundarios, ni en el ítem activo del menú en claro).
- Objetivos de clic ≥44×44px.
- Foco visible siempre (anillo 3px).
- Estado nunca solo por color.
- Idioma `lang="es-CO"`; números con coma decimal.

---

## 9. Checklist de paridad visual (RV-01 a RV-12)

- [ ] RV-01: Paleta coincide con los tokens de este documento
- [ ] RV-02: Tipografía system-ui / Segoe UI, base 18px, mínimo 16px
- [ ] RV-03: Espaciados en la escala de la sección 4
- [ ] RV-04: Hover, foco y deshabilitado implementados
- [ ] RV-05: Contraste WCAG AA (texto 4,5:1, controles 3:1)
- [ ] RV-06: Sin emojis; iconos de un solo juego o ninguno
- [ ] RV-07: Layout con grid/flex
- [ ] RV-08: Radios y sombra según sección 5
- [ ] RV-09: Usable a 1280×800 (portátil) y a 800px de ancho
- [ ] RV-10: Animaciones ≤300ms o ninguna
- [ ] RV-11: Flujo «escribir notas → ver definitiva → descargar Excel» completo
- [ ] RV-12: Coherente con este DESIGN.md
