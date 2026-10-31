# Instrucciones del proyecto

## FORGE

FORGE está activo en este proyecto. Es tu equipo de ingeniería en Claude Code.

### Comandos principales
- `/forge "tu idea"` — Inicia o continúa el pipeline SDD+TDD
- `/forge.explicame` — Explica en lenguaje humano qué está pasando
- `forge ui` — Abre el dashboard de progreso en el navegador

### Archivos del sistema FORGE (no editar manualmente)
- `.sdd/estado.json` — Estado del pipeline
- `.sdd/observabilidad/consumo.jsonl` — Telemetría de agentes
- `.sdd/sdd.config.yaml` — Configuración del proyecto

### Cómo interpretar `.sdd/`
- `pipeline_step`: fase actual (input → ir → spec → plan → implementando → verificado)
- `spec_activa`: spec aprobada en uso
- `plan_activo`: plan de tareas generado

Para modo avanzado: usa `/sdd` en lugar de `/forge`.
<!-- forge-version: 5.0.0 -->
