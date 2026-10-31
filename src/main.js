// @ts-check
// Punto de entrada: `node src/main.js [--datos <carpeta>] [--sin-ventana]`.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { iniciar } from './arranque.js';

const args = process.argv.slice(2);
const valor = (/** @type {string} */ flag) => { const i = args.indexOf(flag); return i >= 0 ? args[i + 1] : undefined; };
// Los datos viven en una carpeta `datos` junto al programa, para que se pueda copiar a un USB.
const carpetaDatos = valor('--datos') ?? path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'datos');

const app = await iniciar({ carpetaDatos, abrirVentana: !args.includes('--sin-ventana') });
if (app.yaEstabaAbierta) {
  console.log(`El programa ya estaba abierto: ${app.url}`);
  process.exit(0);
}
console.log(app.modo === 'recuperacion'
  ? `La base está dañada; abra ${app.url} para recuperarla.`
  : `Sistema de notas abierto en ${app.url} (se cierra solo al cerrar la ventana).`);

let saliendo = false;
const salir = async () => { if (saliendo) return; saliendo = true; await app.cerrar(); process.exit(0); };
process.on('SIGINT', salir);
process.on('SIGTERM', salir);
process.on('notas:cerrado', () => process.exit(0));
