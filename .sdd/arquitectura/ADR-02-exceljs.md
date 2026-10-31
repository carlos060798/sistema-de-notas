# ADR-02: Biblioteca de Excel

> Estado: aceptada (por delegación del dueño, 2026-10-31)
> Fecha: 2026-10-31
> Spec relacionada: 2026-10-31-nucleo-notas-y-respaldo (HU-008, HU-009)
> Autor: agente

## Contexto
Hay que leer y escribir `.xlsx` sin conexión, dentro de un ejecutable único (Principio VI: cada dependencia se justifica).

## Decisión
Usar `exceljs` 4.4.0 (licencia MIT), JavaScript puro, sin módulos nativos.

## Alternativas
- **SheetJS (`xlsx`)**: la versión del registro npm está sin mantenimiento y con avisos de seguridad conocidos; las nuevas se distribuyen fuera de npm. Rechazada.
- **Escribir el formato a mano**: coste y riesgo altos. Rechazada.

## Consecuencias
- Positivas: probada en el spike S0.2 (ida y vuelta idéntica).
- Negativas: pesa unos 20 MB sin empaquetar y arrastra dependencias transitivas; se mide en la compilación (T6.1).

## Cuándo revisitar
Si el ejecutable supera el presupuesto de 120 MB o aparece una vulnerabilidad sin corregir.
