# Constitución del Proyecto: Sistema de notas rural

> **Versión:** 1.0.0 | **Ratificada:** 2026-10-31 (por el dueño) | **Última enmienda:** 2026-10-31

## Propósito y misión

Dar a un docente de primaria (grados 0 a 5) de una escuela rural de Colombia el control de notas, planes de área y de aula, guías, avance de temas y planeación de clases en su propio PC, sin internet y sin instalar nada complicado. Si el sistema se daña, el docente recupera todo desde una copia o desde un Excel.

## Stack técnico (propuesto, ver ADR-01)

| Aspecto | Valor |
|---------|-------|
| Lenguaje | JavaScript (Node 24 LTS) |
| Almacenamiento | SQLite en un solo archivo (`node:sqlite`) |
| Interfaz | Web local en `127.0.0.1`, sin dependencias de red |
| Exportación | Excel (.xlsx), PDF y Word (.docx) |
| Tests | `node:test` |
| Distribución | Ejecutable portable generado por CI, sin compilar a mano |

> Cualquier cambio de stack requiere un ADR en `.sdd/arquitectura/`.

## Principios fundamentales

### Principio I: Los datos son del docente y viven solo en su PC
El sistema NO DEBE enviar datos a ningún servidor ni abrir puertos fuera de `127.0.0.1`. NO DEBE incluir telemetría.
**Razón:** hay datos de menores de edad y en muchas sedes rurales no hay conexión.

### Principio II: Funciona sin internet, siempre
Todas las funciones DEBEN operar sin conexión. Ninguna dependencia puede descargarse en tiempo de ejecución.
**Razón:** la conectividad rural es intermitente o inexistente.

### Principio III: Un dato nunca se pierde en silencio
Toda escritura DEBE ser transaccional. El sistema DEBE hacer copia de seguridad automática antes de operaciones destructivas, al abrir y al cerrar. Una restauración DEBE verificarse antes de sustituir los datos actuales.
**Razón:** perder un periodo de notas no tiene arreglo.

### Principio IV: El Excel es el seguro de vida
Todos los datos DEBEN poderse exportar a un `.xlsx` completo y reimportarse desde él para reconstruir la base de datos, con validación previa y sin sobrescribir datos existentes sin confirmación.
**Razón:** el docente entiende Excel y puede guardarlo en un USB.

### Principio V: Ligero y simple de usar
El ejecutable DEBE funcionar en un PC modesto (objetivo: 4 GB de RAM, Windows 10 o superior) sin instalador ni permisos de administrador. La interfaz DEBE estar en español, con lenguaje del aula colombiana.
**Razón:** equipos viejos y usuario no técnico.

### Principio VI: Pocas dependencias, todas auditadas
Cada dependencia nueva DEBE justificarse en un ADR (licencia, tamaño, mantenimiento). Se prefiere la biblioteca estándar de Node.
**Razón:** menos superficie de fallo y de seguridad.

## Estándares de calidad

- **Tests:** obligatorios para cálculo de notas, exportación e importación, respaldo y restauración.
- **Tipos:** `// @ts-check` con JSDoc y `tsc --noEmit` en 0 errores.
- **Revisión:** cada cambio pasa por el agente `revisor` antes de cerrar la tarea.
- **Medición:** cada fase deja una línea en `logs/ejecucion.log` y un reporte en `reportes/`.

## Restricciones arquitectónicas

- La capa de dominio (cálculo de notas) NO DEBE depender de la interfaz ni de la base de datos.
- Toda exportación e importación pasa por un esquema versionado.
- Los datos viven en una carpeta `datos/` junto al ejecutable, para que sea portable en USB.

## Gobierno

Las enmiendas se registran con versión semántica. Ratificada por el dueño el 2026-10-31.
