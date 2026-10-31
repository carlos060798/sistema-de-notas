# Plan técnico: sistema de notas para primaria

> Spec: `2026-10-31-nucleo-notas-y-respaldo` | ADR-01 | Constitución 1.0.0

## 1. Arquitectura
- **Dominio** (`src/dominio/`): funciones puras: cálculo de definitivas, aprobación, avance. Sin base de datos ni HTTP.
- **Datos** (`src/datos/`): SQLite con `node:sqlite`, migraciones numeradas, transacciones.
- **Respaldo** (`src/respaldo/`): copias con `VACUUM INTO`, verificación con `integrity_check`, restauración con copia previa.
- **Excel** (`src/excel/`): exportar e importar con esquema versionado (hoja `_version`).
- **Reportes** (`src/reportes/`): PDF (pdfkit) y Word (docx).
- **Servidor** (`src/servidor/`): HTTP solo en `127.0.0.1`, puerto libre, token por arranque contra otras páginas del navegador.
- **Interfaz** (`src/ui/`): HTML, CSS y JavaScript simples, sin framework, en español.
- **Empaquetado** (`scripts/empaquetar.mjs`): `esbuild` y Node SEA; GitHub Actions publica el `.exe`.

## 2. Modelo de datos (v1)
`anio_lectivo`, `grado`(0 a 5), `materia`, `estudiante`, `matricula`, `nota`(estudiante, materia, periodo 1 a 4, n1, n2, n3), `nivelacion`, `plan_area`, `plan_aula`, `tema`(estado, fecha), `guia`, `adjunto`, `clase`, `asistencia`, `config`.

## 3. Reglas de dominio
- Definitiva del periodo = (n1 + n2 + n3) / 3, un decimal; incompleta si falta alguna.
- Definitiva del año = promedio simple de los 4 periodos completos.
- Aprobado si definitiva >= 3,0. Escala 1,0 a 5,0.
- Redondeo: hacia arriba en la mitad (4,25 pasa a 4,3). **A confirmar con el docente.**

## 4. Riesgos
| Riesgo | Mitigación |
|---|---|
| `node:sqlite` cambia de API | fijar la versión de Node en el ejecutable; pruebas de contrato |
| SmartScreen avisa por falta de firma | guía de primer arranque; firmar más adelante si se justifica |
| Ejecutable demasiado grande | medir en cada compilación; presupuesto de 120 MB |
| Importar Excel corrompe datos | validación previa, transacción única, resumen antes de aplicar |
| Navegador sin Edge o Chrome | detectar al arrancar y abrir el navegador predeterminado |
| Otro programa abre el puerto local | token por arranque y comprobación del origen |

## 5. Orden de entrega
F1 dominio y datos. F2 respaldo y Excel. F3 notas y nivelación (interfaz). F4 planes, guías y avance. F5 reportes. F6 empaquetado y prueba en el ASUS.
