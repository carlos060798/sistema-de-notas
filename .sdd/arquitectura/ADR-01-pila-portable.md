# ADR-01: Pila portable sin conexión

> Estado: aceptada (por delegación del dueño, 2026-10-31; pendiente la prueba en el ASUS y la medición de memoria)
> Fecha: 2026-10-31
> Spec relacionada: 2026-10-31-nucleo-notas-y-respaldo
> Autor: agente (pendiente de aprobación del dueño)

## Contexto

Un docente rural necesita un sistema de notas en su PC, sin internet, portable, ligero, que se descargue ya hecho (sin compilar a mano) y que se pueda recuperar y exportar a Excel, PDF y Word. En el equipo de desarrollo hay Node 24, npm, git y Docker, y no hay Rust. No se conoce todavía el sistema operativo de los PC de las escuelas.

## Decisión

Datos en **SQLite de un solo archivo con `node:sqlite`** (integrado en Node, sin módulo nativo). Interfaz **web local en `127.0.0.1`**. Distribución como **ejecutable portable generado por GitHub Actions** que el docente descarga ya hecho. La forma de ventana (A o B) se decide con el spike S0.1.

## Alternativas consideradas

- **A. Node SEA + ventana de Edge/Chrome en modo aplicación.** Un `.exe` único de unos 90 MB, sin Chromium propio, el más ligero en memoria. Depende de que haya Edge o Chrome (Windows 10 y 11 traen Edge). Candidata principal.
- **B. Electron (portable de electron-builder).** Autónomo, con Chromium incluido, interfaz idéntica en todos los PC. Pesa más (unos 100 MB de descarga y 250 MB o más de RAM) y exige Windows 10 o superior. Alternativa si A falla en el spike.
- **C. Tauri.** Muy ligero, pero exige Rust y WebView2, y se sale del ecosistema Node.
- **D. Aplicación web con servidor Docker.** Descartada: un docente rural no instalará Docker.
- **E. `better-sqlite3`.** Rechazada de partida: módulo nativo que complica el empaquetado. `node:sqlite` lo evita.

## Bibliotecas previstas (cada una se confirma en su tarea)

Excel: `exceljs`. PDF: `pdfkit` o `pdf-lib`. Word: `docx`. Todas JavaScript puro, empaquetables en un solo archivo con `esbuild`.

## Consecuencias

### Positivas
- Un solo archivo de datos, fácil de copiar a un USB.
- Sin módulos nativos, así que el empaquetado es más simple.
- El docente solo descarga y ejecuta.

### Negativas
- `node:sqlite` aún está marcado como en desarrollo en Node; hay que fijar la versión de Node del ejecutable.
- La opción A depende de un navegador instalado.

## Cuándo revisitar

- Si los PC objetivo son Windows 7/8 o no tienen Edge/Chrome.
- Si `node:sqlite` cambia su API de forma incompatible.

## Spikes previos (Sprint 0)

- **S0.1** Generar un ejecutable SEA que abra SQLite y sirva una página, y medir tamaño y memoria.
- **S0.2** Exportar e importar un `.xlsx` de ida y vuelta sin perder datos.
- **S0.3** Generar un PDF y un DOCX con tildes y eñes.
- **S0.4** Guardar adjuntos de las guías dentro de `datos/` y comprobar que el respaldo y el Excel los recuperan.
