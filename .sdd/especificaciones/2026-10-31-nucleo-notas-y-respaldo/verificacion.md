# Verificación — núcleo de notas y respaldo (2026-10-31)

| Requisito | Evidencia | Estado |
|---|---|---|
| Notas 1,0–5,0, aprobar ≥ 3,0, 4 periodos, definitiva = promedio | `tests/dominio-notas.test.js`, `academico.test.js`, Edge real | Cumplido |
| Nivelación sin reemplazar la nota original | `academico.test.js`, `reportes.test.js` | Cumplido |
| Respaldo automático, restauración, base dañada | `respaldo.test.js`, `arranque.test.js` | Cumplido |
| Excel completo ida y vuelta (incluye planeación) | `excel.test.js`, `planeacion.test.js` | Cumplido |
| Planes, guías, temas/avance, clases (con exportación a Word y PDF y datos de la institución) | `planeacion*.test.js`, `institucion-textos.test.js`, Edge real (temas, estudiantes, copias, institución) | Cumplido |
| Planilla xlsx/pdf; boletín y certificado pdf/docx | `reportes*.test.js`, PDF revisado a ojo, `scripts/humo-exe.mjs` | Cumplido (Word sin revisión visual) |
| Ejecutable sin compilar por el docente | `scripts/empaquetar.mjs`, humo del .exe local (96 MB, 77 MB de RAM en reposo), `.github/workflows/exe.yml` | Parcial: el flujo de GitHub aún no se ha ejecutado |
| Seguridad local (127.0.0.1, token, Host/Origin) | `servidor.test.js` + 5 mutaciones detectadas | Cumplido |

**Cifras:** 111 pruebas, 0 fallos; tipos en 0; corridas completas seguidas en verde.

**No verificado:** ejecución en el ASUS con Windows 10; flujo de GitHub Actions; Word y certificado a la vista;   aviso moderado de `npm audit` (minimatch en exceljs).

**Revisión independiente (T0.3 / T6.4): NO realizada.** Solo hubo autorrevisión por el mismo agente que construyó. Una revisión de otro agente o persona sigue pendiente y no debe darse por cumplida.

**Validaciones pendientes con el docente:** redondeo mitad hacia arriba; aprobar sobre el valor redondeado (2,96 → 3,0 aprueba); notas con hasta 2 decimales; nivelación por definitiva del año; retención de 10 copias; formato del certificado; datos de la institución.

**Actualización (adjuntos y pantalla):** las guías admiten adjuntos (pdf, Word, Excel, PowerPoint, png, jpg, txt; máx. 15 MB). Quedan dentro de la base y por eso viajan en cada copia de seguridad, **pero no en el Excel de respaldo** (no guarda archivos): quien solo tenga el Excel recupera el texto de las guías, no sus archivos. Materias renombrables, nota fuera de rango marcada en la casilla, modo claro/oscuro/automático, Nivelación probada en navegador real. 120 pruebas.

**Revisión independiente (T6.4): realizada** por un agente distinto del que construyó (reportes/2026-10-31-revision-independiente.md). Hallazgos altos y medios corregidos el mismo día (ver «Respuesta del equipo» en el informe); quedan 3 bajos sin atender. Copia a USB (CA-007-05) ahora implementada. 127 pruebas.

**Cruce contra los criterios de la spec:** ver `docs/TRAZABILIDAD-SPEC.md`. De 33 criterios, 31 cumplidos y 2 con desviación (materias comunes a todos los grados; plan de área como un solo texto con plantilla). Añadido en este cruce: nota mínima configurable, lista de quienes no aprueban, plan de aula enlazado a plan de área y periodo, copiar planes al año siguiente, búsqueda de guías por palabra, avance por periodo, clase con guía, asistencia, observaciones del boletín y copias a conservar configurables. 138 pruebas.

**v0.1.4:** cerradas las dos desviaciones de la spec (materias por grado; plan de área con campos separados): 33 de 33 criterios cumplidos (`docs/TRAZABILIDAD-SPEC.md`). Atendidos los tres hallazgos bajos de la revisión independiente (el del Excel en curso, sin prueba automática). 148 pruebas.
