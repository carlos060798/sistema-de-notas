# Hooks personalizados de SDD-ES

Coloca aquí tus scripts ejecutables para integrar tu workflow con SDD.

## Hooks por fase

- `antes_constitucion.sh`    `despues_constitucion.sh`
- `antes_especificar.sh`     `despues_especificar.sh`
- `antes_aclarar.sh`         `despues_aclarar.sh`
- `antes_planificar.sh`      `despues_planificar.sh`
- `antes_tareas.sh`          `despues_tareas.sh`
- `antes_analizar.sh`        `despues_analizar.sh`
- `antes_implementar.sh`     `despues_implementar.sh`
- `antes_cada_tarea.sh`      `despues_cada_tarea.sh`  (recibe T_ID como arg)
- `antes_verificar.sh`       `despues_verificar.sh`
- `antes_importar.sh`

Recuerda dar permiso de ejecución a tus hooks en sistemas Unix:
`chmod +x .sdd/hooks/tu-hook.sh`

Ver más ejemplos en docs/EJEMPLOS.md del plugin.
