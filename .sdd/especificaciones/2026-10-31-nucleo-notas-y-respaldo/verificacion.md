# Verificación — núcleo de notas y respaldo (2026-10-31)

| Requisito | Evidencia | Estado |
|---|---|---|
| Notas 1,0–5,0, aprobar ≥ 3,0, 4 periodos, definitiva = promedio | `tests/dominio-notas.test.js`, `academico.test.js`, Edge real | Cumplido |
| Nivelación sin reemplazar la nota original | `academico.test.js`, `reportes.test.js` | Cumplido |
| Respaldo automático, restauración, base dañada | `respaldo.test.js`, `arranque.test.js` | Cumplido |
| Excel completo ida y vuelta (incluye planeación) | `excel.test.js`, `planeacion.test.js` | Cumplido |
| Planes, guías, temas/avance, clases (con exportación a Word y PDF y datos de la institución) | `planeacion*.test.js`, `institucion-textos.test.js`, Edge real (temas, estudiantes, copias, institución) | Cumplido (guías sin adjuntos) |
| Planilla xlsx/pdf; boletín y certificado pdf/docx | `reportes*.test.js`, PDF revisado a ojo, `scripts/humo-exe.mjs` | Cumplido (Word sin revisión visual) |
| Ejecutable sin compilar por el docente | `scripts/empaquetar.mjs`, humo del .exe local (96 MB, 77 MB de RAM en reposo), `.github/workflows/exe.yml` | Parcial: el flujo de GitHub aún no se ha ejecutado |
| Seguridad local (127.0.0.1, token, Host/Origin) | `servidor.test.js` + 5 mutaciones detectadas | Cumplido |

**Cifras:** 111 pruebas, 0 fallos; tipos en 0; corridas completas seguidas en verde.

**No verificado:** ejecución en el ASUS con Windows 10; flujo de GitHub Actions; Word y certificado a la vista; botones de Nivelación en navegador; adjuntos de guías (no implementados); aviso moderado de `npm audit` (minimatch en exceljs).

**Revisión independiente (T0.3 / T6.4): NO realizada.** Solo hubo autorrevisión por el mismo agente que construyó. Una revisión de otro agente o persona sigue pendiente y no debe darse por cumplida.

**Validaciones pendientes con el docente:** redondeo mitad hacia arriba; aprobar sobre el valor redondeado (2,96 → 3,0 aprueba); notas con hasta 2 decimales; nivelación por definitiva del año; retención de 10 copias; formato del certificado; datos de la institución.
