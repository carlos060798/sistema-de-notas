# Tareas

## F0 Sprint 0
- [x] **T0.1** Constitución 1.0.0, spec aprobada, ADR-01 aceptada.
- [x] **T0.2** Spikes S0.1 a S0.4 (sin la prueba visual de PDF/Word ni la del ASUS).
- [~] **T0.3** Revisión independiente de la spec y del plan: la revisión independiente hecha cubrió el código y las reglas de negocio, no una crítica formal del documento de spec/plan.

## F1 Dominio y datos
- [x] **T1.1** `package.json`, `tsconfig` (`checkJs`), `node:test`. Prueba: `npm test` y `tsc` en 0. Hecho 2026-10-31.
- [x] **T1.2** Dominio de notas con pruebas primero: casos 2,9 / 3,0 / 5,0, incompleta, redondeo. Cubre CA-002-01 a 06. Hecho 2026-10-31: 17 pruebas.
- [x] **T1.3** Migraciones y esquema v1 con transacciones. Cubre RF-002, RF-004. Hecho 2026-10-31: 10 pruebas (migraciones, rangos, claves foráneas, transacciones).

## F2 Respaldo y Excel
- [x] **T2.1** Copia automática al abrir y cerrar, retención de N. Cubre CA-007-01. Hecho 2026-10-31.
- [x] **T2.2** Verificar y restaurar con copia previa; oferta al detectar daño. Cubre CA-007-02 a 04. Hecho 2026-10-31.
- [x] **T2.3** Copia en carpeta adicional (USB). Cubre CA-007-05. Hecho 2026-10-31.
- [x] **T2.4** Exportar a `.xlsx` con `_version`. Cubre CA-008-01. Hecho 2026-10-31.
- [x] **T2.5** Importar con validación, resumen previo y transacción única. Cubre CA-008-02 a 04. Hecho 2026-10-31.

## F3 Notas y nivelación
- [x] **T3.1** Servidor local con token. Cubre RF-003 (prueba: no escucha fuera de 127.0.0.1). Hecho 2026-10-31.
- [x] **T3.2** Grados, materias y estudiantes. Cubre CA-001-01 a 04. Hecho 2026-10-31.
- [x] **T3.3** Pantalla de notas, desaprobadas resaltadas. Cubre CA-002-04. Hecho 2026-10-31.
- [x] **T3.4** Plan de nivelación y listado pendiente. Cubre CA-003-01 a 03. Hecho 2026-10-31.

- [x] **T3.5** Respaldo y Excel en la interfaz (crear copia, restaurar, descargar Excel, revisar e importar con resumen) y pantalla de recuperación si la base está dañada. Cubre CA-007-03, CA-008-01 a 04 desde la pantalla. Hecho 2026-10-31.
- [x] **T3.6** Arranque: instancia única, copia al abrir y al cerrar, apagado al cerrar la ventana, apertura en ventana de aplicación. Cubre CA-007-01. Hecho 2026-10-31.

## F4 Planes, guías y avance
- [x] **T4.1** Plan de área y plan de aula. Cubre CA-004-01 a 03.
- [x] **T4.2** Guías con adjuntos. Cubre CA-005-01, 02, RF-005. (Los adjuntos viven dentro de la base: entran en cada copia de seguridad; NO entran en el Excel, que no guarda archivos. Máximo 15 MB por archivo.)
- [x] **T4.3** Temas, avance y clases. Cubre CA-006-01 a 04.

## F5 Reportes
- [x] **T5.1** Planilla en `.xlsx` y `.pdf`. Cubre CA-009-01.
- [x] **T5.2** Boletín y certificado en `.pdf` y `.docx`. Cubre CA-009-02 a 04.
- [x] **T5.3** Planes y guías a Word y PDF. Cubre CA-004-04, CA-005-03.

## F6 Empaquetado y cierre
- [x] **T6.1** `esbuild` + SEA + GitHub Actions que publica el `.exe`.
- [ ] **T6.2** Prueba en el ASUS con Windows 10: arranque, memoria, restauración.
- [ ] **T6.3** Prueba visual de PDF y Word.
- [x] **T6.4** Revisión independiente (informe en reportes/2026-10-31-revision-independiente.md; altos y medios atendidos, 3 bajos pendientes), suite completa, verificacion.md.
