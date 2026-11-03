/*
 * Package an isolated copy of the SAME source files used by GitHub Pages.
 * Never include finance backups, test fixtures or Git metadata in the APK.
 */
import { cp, mkdir, rm, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const here = dirname(fileURLToPath(import.meta.url));
const mobile = resolve(here, '..');
const root = resolve(mobile, '..');
const output = join(mobile, 'www');
const allowed = [
  'index.html', 'styles.css', 'fonts.css', 'report-pdf.js',
  'manifest.webmanifest', 'privacy.html',
  'icon.svg', 'icon-192.png', 'icon-512.png',
  'icon-maskable-512.png', 'apple-touch-icon.png',
  'src', 'fonts'
];

await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
for (const item of allowed) await cp(join(root, item), join(output, item), { recursive: true });

const indexPath = join(output, 'index.html');
let index = await readFile(indexPath, 'utf8');
const anchor = '<!-- Core (pure, also tested in Node) -->';
if (!index.includes(anchor)) throw new Error('تعذر العثور على موقع تحميل التطبيق في index.html');
index = index.replace(anchor, '<script src="./native-bridge.js"></script>\n' + anchor);
await writeFile(indexPath, index, 'utf8');

await build({
  entryPoints: [join(mobile, 'native-bridge.mjs')],
  outfile: join(output, 'native-bridge.js'),
  bundle: true,
  minify: true,
  platform: 'browser',
  format: 'iife',
  target: ['chrome105']
});
console.log('Android web assets prepared: ' + output);
