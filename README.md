# Sistema de notas

Sistema de notas local, portable y sin conexión, para un docente de primaria rural (grados 0 a 5, multigrado). Los datos viven solo en el PC del docente.

**Estado:** en desarrollo. Fases 1 a 3 hechas (notas, respaldo, Excel, pantallas). Faltan planes de área y de aula, guías, avance de temas, boletines y certificados (PDF y Word) y el ejecutable portable.

## Reglas de notas
- Escala de 1,0 a 5,0. Aprueba con 3,0 o más.
- 4 periodos al año, tres notas por periodo. Definitiva del periodo = (n1 + n2 + n3) / 3, un decimal, la mitad hacia arriba.
- Definitiva del año = promedio simple de los 4 periodos.
- Si la definitiva del año de una materia es menor de 3,0, se abre el plan de nivelación (la nota se guarda aparte).

## Cómo probarlo (desarrollo)
Requiere Node 24 o superior.

```
npm install
npm start                 # abre la ventana; los datos quedan en la carpeta datos/
npm test                  # pruebas
npm run typecheck         # tipos
```

`npm start -- --datos D:\MisNotas` usa otra carpeta de datos (por ejemplo una memoria USB). `--sin-ventana` no abre ventana.

## Copias de seguridad y recuperación
- Copia automática al abrir y al cerrar (`datos/copias/`), con las últimas 10.
- Si la base se daña, el programa lo detecta al abrir y ofrece restaurar la última copia sana.
- «Copias y Excel» permite descargar todo en un Excel y reconstruir desde él.

## Seguimiento del proyecto
- `logs/ejecucion.log`: bitácora de cada paso. `scripts/registrar.sh` añade una línea.
- `reportes/`: reporte de cada fase y de cada spike.
- `.sdd/`: constitución, decisiones de arquitectura (ADR), especificación, plan y tareas (metodología Fragua/SDD).
