// Genera dist/notas.exe: incrusta la interfaz, empaqueta con esbuild y crea el ejecutable con Node SEA.
// Uso: node scripts/empaquetar.mjs   (en la máquina de compilación; el docente solo recibe el .exe)
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { build } from 'esbuild';

const raiz = path.resolve(import.meta.dirname, '..');
const dist = path.join(raiz, 'dist');
fs.rmSync(dist, { recursive: true, force: true }); fs.mkdirSync(dist);

// 1. La interfaz como módulo con los archivos en base64
const ui = Object.fromEntries(['index.html', 'app.js', 'estilos.css'].map((n) => [n, fs.readFileSync(path.join(raiz, 'src/ui', n)).toString('base64')]));
fs.writeFileSync(path.join(dist, 'ui-embebida.js'), `export default ${JSON.stringify(ui)};\n`);

// 2. Un solo archivo JS. pdfkit trae sus tipografías incrustadas en la versión «standalone».
await build({
  entryPoints: [path.join(raiz, 'src/main-exe.js')], outfile: path.join(dist, 'notas.cjs'), bundle: true, platform: 'node', format: 'cjs',
  target: 'node24', minify: true, logLevel: 'warning',
  alias: { pdfkit: path.join(raiz, 'node_modules/pdfkit/js/pdfkit.standalone.js') },
  define: { 'import.meta.url': process.platform === 'win32' ? '"file:///C:/notas/"' : '"file:///notas/"' }, // solo lo usa el modo de desarrollo para ubicar la interfaz
  external: ['node:sqlite'],
});

// 3. Ejecutable: copia de node.exe + el paquete inyectado
fs.writeFileSync(path.join(dist, 'sea-config.json'), JSON.stringify({ main: 'notas.cjs', output: 'sea.blob', disableExperimentalSEAWarning: true }));
execFileSync(process.execPath, ['--experimental-sea-config', 'sea-config.json'], { cwd: dist, stdio: 'inherit' });
const exe = path.join(dist, process.platform === 'win32' ? 'notas.exe' : 'notas');
fs.copyFileSync(process.execPath, exe);
execFileSync(process.execPath, [path.join(raiz, 'node_modules/postject/dist/cli.js'), exe, 'NODE_SEA_BLOB', path.join(dist, 'sea.blob'), '--sentinel-fuse', 'NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2'], { stdio: 'inherit' });
console.log(`Listo: ${exe} (${(fs.statSync(exe).size / 1e6).toFixed(0)} MB)`);
