# Auditoría de interfaz y diseño propuesto (2026-10-31)

Base: capturas de las 6 pantallas con datos de ejemplo (`node scripts/captura.mjs <carpeta>`).
Usuario: docente de primaria rural, portátil ASUS, poca práctica con software, uso diario para anotar notas.

## Hallazgos (qué falla hoy)

| # | Hallazgo | Gravedad | Cambio |
|---|---|---|---|
| U1 | No hay pantalla de inicio: no se ve de un vistazo cuántos estudiantes hay, quién no aprueba, qué nivelaciones faltan ni si hay copia reciente | Alta | **Inicio** con tarjetas y accesos |
| U2 | Año, grado y materia se eligen otra vez en cada pantalla y no se recuerdan | Alta | **Barra de contexto** fija, recordada |
| U3 | Estudiantes: 5 botones por fila (Editar, Archivar, Boletín PDF, Boletín Word, Certificado) saturan y confunden | Alta | Un botón **«Documentos»** con menú |
| U4 | Nunca se muestra cuándo fue la última copia ni el último Excel; el «seguro de vida» depende de que el docente se acuerde | Alta | Estado de respaldo en Inicio y aviso si el Excel tiene más de 14 días o no existe |
| U5 | Planeación: las cuatro secciones son botones sin estilo (aspecto roto) | Media | Pestañas con estilo |
| U6 | Notas: no se ve cuántas notas faltan ni el promedio del grupo; no se navega con flechas | Media | Resumen del grupo, casillas vacías resaltadas, flechas ↑↓ |
| U7 | Menú superior largo: en pantallas angostas se parte en dos filas | Media | Menú lateral con iconos y texto |
| U8 | Botón «Elegir archivo» con aspecto del sistema; `pre.texto` con fondo fijo claro (se ve mal en modo oscuro) | Baja | Estilo propio y variables de color |
| U9 | Textos de ayuda pequeños (0,9 rem) en una pantalla que se lee a distancia | Baja | Mínimo 1 rem |

## Brechas funcionales (qué falta de verdad)

| # | Brecha | Estado |
|---|---|---|
| G1 | Resumen y estado de respaldo (necesario para U1 y U4) | Se implementa ahora (`/api/resumen`) |
| G2 | Editar planes, guías y clases desde la pantalla (la API ya lo permite; la pantalla solo crea y borra) | Se implementa ahora para planes y guías |
| G3 | Copias a una carpeta extra o USB: existe en el código, no tiene pantalla | Pendiente (necesita elegir carpeta; sin selector nativo en el navegador) |
| G4 | Boletines de todo el grado de una vez | Pendiente |
| G5 | Adjuntos en guías | Pendiente (cambia respaldo y Excel) |
| G6 | Pantalla de Nivelación sin prueba en navegador | Pendiente |
| G7 | Asistencia | No pedida |

## Diseño propuesto

```
┌────────────┬──────────────────────────────────────────────┐
│ 📘 Notas   │  Año 2026 ▾  Grado ▾  Materia ▾  Periodo ▾    │  ← contexto (solo en Notas y Planeación)
│ ────────── ├──────────────────────────────────────────────┤
│ 🏠 Inicio  │  [ 6 estudiantes ] [ 1 no aprueba ] [ 1 nivel.]│
│ ✏️ Notas    │  [ Avance 50 % ]   [ Copia: hace 2 min ✔ ]     │
│ 👥 Estud.  │  [ Excel: nunca ⚠  Descargar ahora ]           │
│ 🔁 Nivel.  │                                                │
│ 🗓 Planea. │  Accesos: Poner notas · Agregar estudiante     │
│ 💾 Copias  │                                                │
│ ⚙ Año…     │                                                │
└────────────┴──────────────────────────────────────────────┘
```

Principios: un solo lugar para elegir contexto; lo urgente (respaldo, no aprobados) siempre visible en Inicio; acciones raras escondidas en menús; texto mínimo 1 rem; colores con contraste suficiente en claro y oscuro; todo operable con teclado.

## Estado tras la revisión del agente `product-designer` (mismo día)

Revisión completa: `reportes/2026-10-31-revision-diseno.md`. Fuente visual: `DESIGN.md`. Capturas del resultado: `docs/diseno/`.

Aplicado: U1–U9 (Hoy, contexto recordado, menú «Documentos», estado de respaldo, pestañas, resumen del grupo y flechas, menú lateral, estilos, tamaños), edición de planes y guías (G2), y de la revisión de diseño: contornos de campos visibles (contraste 3:1), «No aprobado» sin partirse, menú sin emojis y con el elemento activo en blanco, nombres «Hoy» y «Respaldo», una sola tarjeta de respaldo, Excel primero en Respaldo, «Archivar» al final y con confirmación, advertencia al cerrar el año.

Pendiente de esa revisión: aviso visible de nota fuera de rango en la propia casilla (mejora 3), modo claro/oscuro elegible (12), renombrar materias (10), alineación numérica de columnas.
