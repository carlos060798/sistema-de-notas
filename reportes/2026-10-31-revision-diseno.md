# Revisión de diseño — Sistema de notas (2026-10-31)

Agente: `product-designer` (FORGE). Material revisado: 6 capturas «antes», 7 capturas «después» (1280×800, modo claro), `src/ui/estilos.css`, `docs/AUDITORIA-INTERFAZ.md`. No se tocó código. Las capturas en modo oscuro no se vieron; su contraste se calculó desde las variables.

---

## 1. Veredicto

**El rediseño es una mejora real y va en la dirección correcta, pero no está terminado.** Resolvió lo estructural (navegación, respaldo visible, filtros fijos, tamaño de letra) y dejó pendientes de detalle que sí afectan al docente: campos casi sin borde, la etiqueta «No aprobado» partida en dos líneas, una pantalla de Inicio que repite el aviso de Excel dos veces, y emojis en el menú.

### Qué mejoró de verdad
- **Respaldo visible:** Inicio avisa «Haga hoy su copia en Excel» y tiene el botón «Descargar Excel ahora». Antes no existía.
- **Menú lateral** con ítem activo resaltado: más fácil saber dónde se está que con las pestañas superiores.
- **Letra más grande** (base 18px) y celdas de nota de buen tamaño; mejor lectura a distancia.
- **Barra de filtros fija** (año/grado/materia/periodo) al desplazarse: evita anotar en la materia equivocada.
- **Resumen de la tabla más completo:** «notas por escribir: 0 · promedio del grupo: 3,7».
- **Nivelación** explica en una frase que la nota no reemplaza la original. Buen texto.
- **Paleta propia** verde institucional, sin índigo ni gradientes. Contraste de texto correcto.

### Qué sigue mal o es regresión
- **Regresión — «No aprobado» se parte en dos líneas** en Notas y «2,5 (no aprobado)» también. Antes cabía en una. Es la información más importante de la fila.
- **Regresión — encabezados de tabla partidos** («Definitiva del / periodo»), por el menú lateral que quita 230px.
- **Campos y botones secundarios casi invisibles:** borde `#d3dcd6` sobre blanco = 1,4:1. Con sol en la pantalla, los cuadros de nota vacíos y botones como «Excel», «PDF», «Editar» desaparecen.
- **Inicio duplica el aviso de Excel** (tarjeta de texto arriba + tarjeta «Nunca» abajo) y la tarjeta del año («Inicio / Año 2026») ocupa la primera fila sin aportar. Lo urgente queda partido en dos lugares.
- **«Ninguna» en verde grande** para «Última copia automática»: el verde dice «todo bien» cuando en realidad no hay copias. Mensaje equivocado.
- **Estudiantes:** tres botones del mismo peso por fila («Editar · Archivar · Documentos») con «Archivar», acción delicada, en el medio. Los botones tienen espacio para errores de clic.
- **Copias y Excel:** «Crear copia ahora» va primero y en verde, y «Descargar todo en Excel» (la que de verdad protege, porque sale del portátil) queda segundo. Nombre del selector de archivo cortado: «No se eligió ...gún archivo».
- **Planeación:** barra de progreso vacía y gris sin explicación cuando hay 0 temas.
- **Año y materias:** «Cerrar año» (irreversible) está al lado del año sin texto de advertencia; las materias no tienen acciones visibles (¿cómo se renombra o borra?).

### Checklist anti-AI-slop

| Regla | Resultado | Decisión |
|---|---|---|
| 1. Índigo Tailwind | No se usa | OK |
| 2. Gradiente «trust» | No hay | OK |
| 3. **Emojis como iconos** | **Sí**: 🏠 ✏️ 👥 🔄 📅 💾 ⚙️ en el menú (vía `data-icono`). Además se ven con colores distintos (naranja, morado, azul) que rompen la paleta y en Windows 10 se ven diferentes según la versión de la fuente de emojis. | **Corregir.** Opción preferida: quitar los iconos y dejar solo texto (el menú tiene 7 ítems con nombres claros; el icono no ayuda a un usuario que lee). Alternativa: 7 SVG de trazo simple, un solo color `--lateral-texto`. |
| 4. Fuente | system-ui / Segoe UI, coherente | OK |
| 5. «AI dashboard tile» | **Parcial**: la tarjeta de filtros tiene borde izquierdo grueso de color (`border-left: 6px`) y las tarjetas de Inicio son cifra grande + etiqueta. | Quitar el borde izquierdo; las tarjetas de Inicio se pueden quedar porque las cifras son reales, pero ordenadas por urgencia, no como mosaico. |
| 6. Métricas inventadas | No: todas salen de los datos | OK |
| 7. Copy de relleno | No. El texto es concreto. «Es su seguro de vida» es algo dramático pero comprensible; se acepta. | OK |
| P1-B. **Nombres genéricos** | **«Inicio»** es genérico; **«Planeación»** es el término que usa el docente en Colombia (planeación de clase), así que no es genérico en este contexto, pero agrupa cosas distintas. «Copias y Excel» habla de cómo, no de para qué. | Renombrar «Inicio» → **«Hoy»** (dice qué encuentra: lo pendiente de hoy). Mantener **«Planeación»** (es el vocabulario del docente; cambiarlo confunde). Renombrar «Copias y Excel» → **«Respaldo»**. |

---

## 2. Mejoras priorizadas (12)

| # | Pantalla | Problema observado | Cambio propuesto | Esfuerzo |
|---|---|---|---|---|
| 1 | Todas (campos, botones secundarios, selects) | Borde `--linea #d3dcd6` sobre blanco = 1,4:1; los cuadros de nota y botones «Excel/PDF/Editar» casi no se ven con sol | Nueva variable `--borde-campo: #7a8a82` (claro, ≈3,6:1) y `#6f8279` (oscuro) para input, select, textarea, `.secundario`, `.pestanas button`, summary del menú. `--linea` queda solo para separar filas | S |
| 2 | Notas | «No aprobado» y «2,5 (no aprobado)» se parten en dos líneas | `.etiqueta` sin salto de línea; en «Definitiva del año» mostrar solo «2,5» en `--mal` negrilla (el estado ya está en la columna Estado). Encabezados más cortos: «Def. periodo» → mejor «Periodo» y «Año» bajo un encabezado agrupador «Definitiva» | S |
| 3 | Notas | Nada impide ni señala visualmente una nota fuera de 1,0–5,0, ni confirma que se guardó | Nota fuera de rango: borde 2px `--mal` + texto bajo la tabla «Beto Pérez, Nota 2: escriba un número entre 1,0 y 5,0». Nota < 3,0: número en `--mal`. Al guardar: texto «Guardado» en `--bien` junto a la tabla durante 2 s | M |
| 4 | Hoy (Inicio) | Aviso de Excel duplicado; tarjeta de año ocupa la primera fila; «Ninguna» en verde | Orden: (1) una sola tarjeta «Respaldo» arriba con estado y botón «Descargar Excel ahora»; fondo `--alerta-fondo` si nunca o hace más de 7 días, `--papel` con texto `--bien` si es reciente. (2) pendientes: notas por escribir, nivelaciones. (3) estudiantes y avance. Mover el selector de año a la barra superior pequeña. «Ninguna» en `--alerta`, no verde | M |
| 5 | Menú | Emojis multicolor como iconos | Quitar `data-icono` y el `::before`; menú solo texto 18px | S |
| 6 | Menú | Ítem activo `--marca` sobre `--lateral` = 2,0:1 como forma (el texto sí se lee) | Activo: fondo `#ffffff`, texto `--marca-fuerte`, negrilla; o mantener fondo y añadir barra izquierda blanca de 4px | S |
| 7 | Menú | Nombres «Inicio» y «Copias y Excel» | «Inicio» → «Hoy»; «Copias y Excel» → «Respaldo». «Planeación» se mantiene | S |
| 8 | Respaldo | El Excel (lo que sale del portátil) va segundo | Primera tarjeta: «Descargar todo en Excel» (principal) + fecha de la última descarga. Segunda: copias automáticas con «Crear copia ahora» como secundario. Tercera, separada y con borde `--mal`: «Recuperar desde un Excel» | S |
| 9 | Estudiantes | Tres botones iguales; «Archivar» en medio | Orden «Documentos» (principal pequeño) · «Editar» · y «Archivar» como enlace en `--mal` al final, con confirmación «¿Archivar a Beto Pérez? Sus notas se conservan» | S |
| 10 | Año y materias | «Cerrar año» sin advertencia; materias sin acciones visibles | Bajo «Cerrar año» texto en `--suave`: «Después de cerrar no podrá cambiar notas de 2026». Confirmación escribiendo el año. Añadir «Renombrar» a cada materia | M |
| 11 | Todas | Ayudas de ~15px (`.suave` 1rem con muchos textos en 16px en la práctica pequeños en las capturas) y encabezados de tabla en gris | Mínimo 16px reales para ayudas; encabezados de tabla en `--texto` peso 600; cifras con números tabulares | S |
| 12 | Todas (oscuro) | El modo oscuro se activa solo por el sistema; con sol es peor | Por defecto claro; selector «Pantalla clara / oscura» en «Año y materias» | M |

---

## 3. Contraste (WCAG 2.1 AA)

Calculado con la fórmula de luminancia relativa sobre los valores de `estilos.css`. AA exige 4,5:1 para texto normal y 3:1 para bordes de controles y estados (1.4.11).

| Par | Claro | Oscuro | ¿Pasa? |
|---|---|---|---|
| Texto suave sobre papel (`--suave`/`--papel`) | 6,8:1 | 7,7:1 | Sí |
| Texto suave sobre fondo de página | 6,2:1 | — | Sí |
| Texto suave sobre tarjeta de alerta | 6,0:1 | — | Sí |
| «No aprobado» sobre papel (`--mal`) | 7,4:1 | 7,0:1 | Sí |
| «No aprobado» sobre fila reprobada (`--mal-fondo`) | 6,3:1 | 6,6:1 | Sí |
| «Aprobado» (`--bien`/papel) | 7,1:1 | 7,5:1 | Sí |
| Botón principal (texto / `--marca`) | 6,4:1 | 8,8:1 | Sí |
| Menú lateral (texto / `--lateral`) | 11,5:1 | 14,7:1 | Sí |
| Alerta (`--alerta`/`--alerta-fondo`) | 5,3:1 | 7,7:1 | Sí |
| **Borde de campos y botones secundarios (`--linea`/papel)** | **1,4:1** | **1,5:1** | **No (1.4.11)** |
| **Ítem activo del menú como forma (`--marca`/`--lateral`)** | **2,0:1** | 8,9:1 | **No en claro** (el texto dentro sí pasa) |

Conclusión: todo el **texto** pasa AA con margen. Fallan los **contornos de controles** en ambos modos y el **resaltado del menú activo** en claro. Son justo los que más sufren con sol: se corrige con las mejoras 1 y 6.

---

## Archivo generado
- `DESIGN.md` en la raíz del proyecto (fuente de verdad visual, con cambios marcados **[Propuesto]**).
