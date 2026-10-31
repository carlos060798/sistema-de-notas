---
id: 2026-10-31-nucleo-notas-y-respaldo
titulo: "Notas, planes de área y de aula, avance de temas, respaldo y Excel (primaria, grados 0 a 5)"
tamano: grande
estado: aprobada
creada: 2026-10-31
actualizada: 2026-10-31
autor: humano
constitucion_version: 1.0.0
etiquetas: [notas, planeacion, respaldo, excel, primaria]
---

# Especificación: sistema portable para un docente de primaria rural

## 1. Contexto y motivación
El docente es de primaria en una escuela rural de Colombia y atiende los grados 0 a 5. Hoy lleva notas, planes y guías en papel o en archivos sueltos. Si pierde o daña ese registro pierde el trabajo del año. Su equipo es un portátil ASUS con disco de 2 TB y no siempre hay internet.

## 2. Objetivo
Un programa portable, sin conexión, donde el docente:
1. guarda las notas de cada estudiante por materia (nota 1, nota 2, nota 3, definitiva) y gestiona el plan de nivelación de quien reprueba;
2. organiza los planes de área, los planes de aula y las guías, por materia y por grado;
3. planifica clases y controla el avance de los temas;
4. saca copias de seguridad y un Excel completo para recuperar todo;
5. expide notas (planillas, boletines y certificados) en PDF, Excel y Word.

## 3. Actores
| Actor | Rol | Necesidad |
|---|---|---|
| Docente de primaria | Único usuario | Registrar notas, planear clases, controlar avance, entregar boletines |

## 4. Historias de usuario

### HU-001: Grados, materias y estudiantes
**Como** docente **quiero** crear grados (0 a 5), materias y estudiantes **para** organizar el año.
- [ ] **CA-001-01**: Los grados disponibles son 0, 1, 2, 3, 4 y 5; las materias se crean y editan por grado. (P1)
- [ ] **CA-001-02**: Se crean, editan y archivan estudiantes; archivar no borra su historial. (P1)
- [ ] **CA-001-03**: Hay varios años lectivos; un año cerrado queda de solo lectura. (P2)
- [ ] **CA-001-04**: El sistema es multigrado: el docente atiende los grados 0 a 5 a la vez y todas las vistas (notas, planes, avance) se filtran por grado sin cambiar de año ni de base. (P1)

### HU-002: Notas con escala de 1,0 a 5,0
**Como** docente **quiero** registrar nota 1, nota 2, nota 3 y la definitiva por estudiante y materia **para** saber quién aprueba.
- [ ] **CA-002-01**: La escala es de 1,0 a 5,0; una nota fuera de rango se rechaza con un mensaje claro. (P1)
- [ ] **CA-002-02**: La aprobación es 3,0 o más; menos de 3,0 es desaprobado. El umbral es configurable y por defecto vale 3,0. (P1)
- [ ] **CA-002-03**: En cada periodo, la definitiva es (nota 1 + nota 2 + nota 3) / 3, redondeada a un decimal, y se muestra igual en pantalla, Excel y PDF. Si falta alguna nota, la definitiva del periodo queda «incompleta» y no se calcula. (P1)
- [ ] **CA-002-04**: Las notas desaprobadas se resaltan y se listan por grado y materia. (P1)
- [ ] **CA-002-05**: Hay 4 periodos por año; cada uno tiene tres notas y su definitiva. (P1)
- [ ] **CA-002-06**: La definitiva del año por materia se calcula a partir de los 4 periodos (regla por confirmar, ver pregunta 2). (P1)

### HU-003: Plan de nivelación
**Como** docente **quiero** un plan de nivelación para cada estudiante desaprobado **para** darle una segunda oportunidad documentada.
- [ ] **CA-003-01**: Para toda definitiva menor de 3,0 se puede abrir un plan de nivelación con actividades, fecha y resultado. (P1)
- [ ] **CA-003-02**: La nota de nivelación se guarda aparte de la original y no la borra; el boletín muestra ambas. (P1)
- [ ] **CA-003-03**: Hay un listado de estudiantes con nivelación pendiente. (P1)

### HU-004: Planes de área y planes de aula
**Como** docente **quiero** guardar los planes de área y los planes de aula **para** tenerlos organizados por materia y por grado.
- [ ] **CA-004-01**: Un plan de área se asocia a una materia y a un grado, con objetivos, estándares, competencias, contenidos por periodo y criterios de evaluación. (P1)
- [ ] **CA-004-02**: Un plan de aula se asocia a un plan de área, a un grado y a un periodo. (P1)
- [ ] **CA-004-03**: Los planes se pueden copiar de un año al siguiente sin rehacerlos. (P2)
- [ ] **CA-004-04**: Los planes se exportan a Word y PDF. (P2)

### HU-005: Guías por tema
**Como** docente **quiero** guardar guías de trabajo por tema, grado y materia **para** reutilizarlas.
- [ ] **CA-005-01**: Una guía lleva título, grado, materia, tema, contenido y archivos adjuntos (imagen o documento). (P1)
- [ ] **CA-005-02**: Se buscan guías por grado, materia, tema o palabra. (P1)
- [ ] **CA-005-03**: Una guía se imprime o se exporta a PDF y a Word. (P2)

### HU-006: Planificación de clases y avance de temas
**Como** docente **quiero** planificar mis clases y marcar el avance de cada tema **para** saber qué falta ver en el periodo.
- [ ] **CA-006-01**: Cada tema de un plan tiene estado (pendiente, en curso, visto) y fecha. (P1)
- [ ] **CA-006-02**: Una vista muestra el porcentaje de avance por grado, materia y periodo. (P1)
- [ ] **CA-006-03**: Una clase planificada se vincula a un tema y a una guía. (P2)
- [ ] **CA-006-04**: Se registra la asistencia por fecha y grado. (P2)

### HU-007: Respaldo y recuperación
**Como** docente **quiero** copias automáticas y poder restaurarlas **para** no perder información si el sistema se daña.
- [ ] **CA-007-01**: Al abrir y al cerrar se crea una copia con fecha; se conservan las últimas N, configurables. (P1)
- [ ] **CA-007-02**: Antes de restaurar se comprueba la integridad de la copia; si falla, no se toca la base actual. (P1)
- [ ] **CA-007-03**: Si al abrir la base se detecta daño, el sistema ofrece restaurar la última copia sana. (P1)
- [ ] **CA-007-04**: Una restauración conserva antes la base actual como copia, para poder deshacerla. (P1)
- [ ] **CA-007-05**: Se puede elegir una carpeta adicional para copias, por ejemplo un USB o un disco externo. (P1)

### HU-008: Excel como seguro de vida
**Como** docente **quiero** exportar todo a un Excel y reconstruir desde él **para** recuperar mi trabajo aunque se pierda la base.
- [ ] **CA-008-01**: Se exportan todos los datos (notas, nivelaciones, planes, guías, avance) a un `.xlsx` con una hoja por tabla y una hoja de versión del esquema. (P1)
- [ ] **CA-008-02**: Importar ese `.xlsx` en una base vacía reconstruye todo idéntico (prueba de ida y vuelta). (P1)
- [ ] **CA-008-03**: Importar sobre datos existentes pide confirmación, muestra un resumen previo (nuevos, cambiados, iguales) y no sobrescribe sin aprobar. (P1)
- [ ] **CA-008-04**: Un Excel con datos inválidos o de otra versión se rechaza con el detalle de filas y columnas, sin cambios parciales. (P1)

### HU-009: Expedición de notas
**Como** docente **quiero** expedir planillas, boletines y certificados **para** entregarlos a los acudientes y a la institución.
- [ ] **CA-009-01**: Planilla de notas por grado, materia y periodo en `.xlsx` y `.pdf`. (P1)
- [ ] **CA-009-02**: Boletín individual con notas, definitiva, nivelación y observaciones, en `.pdf` y `.docx`. (P1)
- [ ] **CA-009-03**: Certificado de notas por año, en `.pdf` y `.docx`, con encabezado institucional opcional y configurable. (P2)
- [ ] **CA-009-04**: Tildes y eñes se ven bien en todos los formatos. (P1)

## 5. Escenarios
- **Caso feliz:** el docente registra 4,0, 3,5 y 4,5 en tercero de matemáticas; la definitiva sale 4,0 y el estudiante aparece aprobado.
- **Caso de error:** escribe 6,5 y el sistema responde «La nota debe estar entre 1,0 y 5,0».
- **Reprueba:** definitiva de 2,6; queda en la lista de nivelación pendiente. El docente registra la nivelación con 3,4; el boletín muestra 2,6 y 3,4.
- **Caso borde:** la base está dañada al abrir; el sistema ofrece la última copia sana y deja la dañada aparte.

## 6. Requisitos funcionales
- **RF-001**: El sistema DEBE funcionar sin conexión.
- **RF-002**: El sistema DEBE guardar todo en un solo archivo de base de datos dentro de `datos/`.
- **RF-003**: El sistema NO DEBE abrir puertos fuera de `127.0.0.1`.
- **RF-004**: El sistema DEBE escribir cada cambio de forma transaccional.
- **RF-005**: Los adjuntos de las guías DEBEN guardarse dentro de `datos/` para que el respaldo los incluya.

## 7. Requisitos no funcionales
| Categoría | Requisito | Métrica |
|---|---|---|
| Rendimiento | Abrir en un portátil modesto | menos de 5 s |
| Tamaño | Ejecutable descargable | objetivo: menos de 120 MB (a confirmar en S0.1) |
| Seguridad | Datos de menores de edad, solo locales | sin tráfico de red externo (prueba automática) |
| Recuperación | Pérdida máxima tras un fallo | la última operación confirmada |
| Usabilidad | Lenguaje del aula, sin términos técnicos | revisión con el docente |

## 8. Fuera de alcance
Sincronización en la nube, varios usuarios, aplicación móvil, envío de boletines por correo.

## 9. Decisiones del docente (2026-10-31)

- 4 periodos al año; tres notas por periodo; la definitiva del periodo es la suma de las tres dividida entre tres.
- La definitiva del año por materia es el promedio simple de los 4 periodos (todos pesan lo mismo).
- Escala de 1,0 a 5,0; aprueba con 3,0 o más; menos de 3,0 es desaprobado.
- Multigrado: grados 0 a 5 a la vez.
- Equipo: portátil ASUS con Windows 10 y disco de 2 TB.
- Sin niveles Superior/Alto/Básico/Bajo y sin clave de acceso (valores por defecto aceptados; ambos quedan como opción futura).
- Certificados y boletines: el encabezado institucional es opcional y se deja abierto por ahora; el uso es personal, no entregable a terceros. Los datos (nombre, sede, DANE, logo) se pueden configurar después.

## 10. Preguntas abiertas
Ninguna que bloquee el Sprint 0.
