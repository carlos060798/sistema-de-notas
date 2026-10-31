#!/bin/sh
# Uso: scripts/registrar.sh <fase> <resultado: ok|fallo|aviso> "<detalle>"
d=$(dirname "$0")/..
printf '%s | %s | %s | %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$1" "$2" "$3" >> "$d/logs/ejecucion.log"
