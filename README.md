# Sistema de notas

Sistema de notas local, portable y sin conexión, para un solo profesor y un solo PC.

Estado: Sprint 0, repositorio creado. Todavía no hay código ni se ha elegido la pila tecnológica.

## Requisitos de partida
- Funciona sin internet y se ejecuta desde una carpeta, sin instalador.
- Datos solo en el PC del profesor.
- Recuperación de la base de datos si se daña (copias de seguridad, verificación de integridad y restauración).
- Se construye con la metodología SDD de Fragua/FORGE.

## Seguimiento
- `logs/ejecucion.log`: bitácora de cada paso, una línea por evento.
- `reportes/`: informes de avance y de evaluación del marco de trabajo.
- `scripts/registrar.sh`: añade una línea a la bitácora.
