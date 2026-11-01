// @ts-check
// Entrada del programa empaquetado (.exe): la interfaz va incrustada y los datos quedan junto al .exe.
import path from 'node:path';
import { iniciar } from './arranque.js';
import recursos from '../dist/ui-embebida.js';

async function principal() {
const carpetaDatos = path.join(path.dirname(process.execPath), 'datos');
const app = await iniciar({
  carpetaDatos, abrirVentana: !process.argv.includes('--sin-ventana'),
  leerRecurso: (nombre) => {
    const b64 = /** @type {Record<string, string>} */ (recursos)[nombre];
    if (!b64) throw new Error(`Recurso no incluido: ${nombre}`);
    return Buffer.from(b64, 'base64');
  },
});
if (app.yaEstabaAbierta) process.exit(0);
let saliendo = false;
const salir = async () => { if (saliendo) return; saliendo = true; await app.cerrar(); process.exit(0); };
process.on('SIGINT', salir); process.on('SIGTERM', salir);
process.on('notas:cerrado', () => process.exit(0));
}
principal().catch((e) => { console.error(e); process.exit(1); });
