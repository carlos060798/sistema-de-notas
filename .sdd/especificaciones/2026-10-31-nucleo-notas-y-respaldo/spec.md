---
id: 2026-10-31-nucleo-notas-y-respaldo
titulo: "Núcleo de notas, respaldo y exportación a Excel"
tamano: grande
estado: borrador
creada: 2026-10-31
actualizada: 2026-10-31
autor: humano
constitucion_version: 0.1.0
etiquetas: [nucleo, respaldo, excel]
---

# Especificación: núcleo de notas, respaldo y exportación

## 1. Contexto y motivación
Un docente de una escuela rural de Colombia lleva hoy las notas y el control de clase en papel o en hojas sueltas. Si pierde o daña ese registro pierde el periodo. Necesita un sistema en su PC, sin internet, que se pueda recuperar.

## 2. Objetivo
El docente registra cursos, estudiantes, actividades y notas; consulta resúmenes por periodo; y puede sacar y restaurar copias de todo (archivo de respaldo y Excel completo) sin perder información.

## 3. Actores
| Actor | Rol | Necesidad |
|---|---|---|
| Docente | Único usuario | Registrar y consultar notas y asistencia, preparar clases, entregar boletines |

## 4. Historias de usuario

### HU-001: Cursos, estudiantes y periodos
**Como** docente **quiero** crear cursos, matricular estudiantes y definir periodos académicos **para** organizar el año.
- [ ] **CA-001-01**: Se crean, editan y archivan cursos y estudiantes; archivar no borra el historial. (P1)
- [ ] **CA-001-02**: Los periodos y sus pesos son configurables (por defecto 4 periodos). (P1)

### HU-002: Notas y cálculo
**Como** docente **quiero** registrar actividades con peso y sus notas **para** obtener el promedio por periodo y la nota definitiva.
- [ ] **CA-002-01**: La escala por defecto es 1,0 a 5,0 y es configurable. (P1)
- [ ] **CA-002-02**: El promedio ponderado por periodo y la definitiva se calculan igual en pantalla, en Excel y en PDF. (P1)
- [ ] **CA-002-03**: Se muestra el desempeño (Superior, Alto, Básico, Bajo) según los rangos configurados; los rangos por defecto se confirman con el reglamento de la institución. (P1)
- [ ] **CA-002-04**: Una nota fuera de la escala se rechaza con un mensaje claro. (P1)

### HU-003: Asistencia y observaciones
**Como** docente **quiero** pasar lista y anotar observaciones **para** hacer seguimiento de cada estudiante.
- [ ] **CA-003-01**: Registrar asistencia por fecha y curso, con presente, ausente, excusa y tarde. (P1)
- [ ] **CA-003-02**: Registrar observaciones por estudiante con fecha. (P2)

### HU-004: Respaldo y recuperación
**Como** docente **quiero** copias automáticas y poder restaurarlas **para** no perder información si el sistema se daña.
- [ ] **CA-004-01**: Al abrir y al cerrar se crea una copia con fecha; se conservan las últimas N configurables. (P1)
- [ ] **CA-004-02**: Antes de restaurar se ejecuta una comprobación de integridad de la copia; si falla, no se toca la base actual. (P1)
- [ ] **CA-004-03**: Si al abrir la base se detecta daño, el sistema ofrece restaurar la última copia sana. (P1)
- [ ] **CA-004-04**: Una restauración conserva antes la base actual como copia, para poder deshacerla. (P1)

### HU-005: Excel como seguro de vida
**Como** docente **quiero** exportar todo a un Excel y reconstruir desde él **para** recuperar mi trabajo aunque se pierda la base.
- [ ] **CA-005-01**: Exportar todos los datos a un `.xlsx` con una hoja por tabla y una hoja de versión del esquema. (P1)
- [ ] **CA-005-02**: Importar ese `.xlsx` en una base vacía reconstruye cursos, estudiantes, actividades, notas y asistencia idénticos (prueba de ida y vuelta). (P1)
- [ ] **CA-005-03**: Importar sobre datos existentes pide confirmación, muestra un resumen previo (nuevos, cambiados, iguales) y no sobrescribe sin aprobar. (P1)
- [ ] **CA-005-04**: Un Excel con datos inválidos o de otra versión se rechaza con el detalle de filas y columnas, sin cambios parciales. (P1)

### HU-006: Reportes
**Como** docente **quiero** descargar notas en Excel, PDF y Word **para** entregar boletines y planillas.
- [ ] **CA-006-01**: Planilla de notas por curso y periodo en `.xlsx` y en `.pdf`. (P1)
- [ ] **CA-006-02**: Boletín individual por estudiante en `.pdf` y `.docx`. (P2)
- [ ] **CA-006-03**: Tildes y eñes se muestran bien en todos los formatos. (P1)

### HU-007: Preparación de clases (posterior)
- [ ] **CA-007-01**: Plantilla de planeación de clase guardada por curso y exportable a Word. (P3)

## 5. Escenarios
- **Caso feliz:** el docente registra una nota 4,5 en una actividad de 30 % y el promedio del periodo se actualiza.
- **Caso de error:** escribe 6,5 y se rechaza con el mensaje «La nota debe estar entre 1,0 y 5,0».
- **Caso borde:** la base está dañada al abrir; el sistema ofrece la última copia sana y deja la dañada aparte.

## 6. Requisitos funcionales
- **RF-001**: El sistema DEBE funcionar sin conexión.
- **RF-002**: El sistema DEBE guardar todo en un solo archivo de base de datos dentro de `datos/`.
- **RF-003**: El sistema NO DEBE abrir puertos fuera de `127.0.0.1`.
- **RF-004**: El sistema DEBE escribir cada cambio de forma transaccional.

## 7. Requisitos no funcionales
| Categoría | Requisito | Métrica |
|---|---|---|
| Rendimiento | Abrir en un PC modesto | menos de 5 s en 4 GB de RAM |
| Tamaño | Ejecutable descargable | objetivo: menos de 120 MB (a confirmar en S0.1) |
| Seguridad | Datos de menores de edad, solo locales | sin tráfico de red externo (prueba automática) |
| Recuperación | Pérdida máxima tras un fallo | la última operación confirmada |

## 8. Fuera de alcance
Sincronización en la nube, varios usuarios, aplicación móvil.

## 9. Preguntas abiertas (para el dueño)
1. ¿Qué sistema operativo y cuánta RAM tienen los PC de la escuela? Decide entre las opciones A y B del ADR-01.
2. ¿«Quemas de clase» significa control o lista de clase, o es otra cosa? Aquí lo tomé como asistencia y control de clase.
3. ¿La escala y los rangos de desempeño siguen el reglamento (SIEE) de la institución? Hay que confirmarlos con ellos.
4. ¿Cuántos cursos y estudiantes maneja, aproximadamente?
5. ¿Necesita proteger el acceso con una clave?
