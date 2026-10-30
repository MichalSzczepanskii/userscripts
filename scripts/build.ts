// Builds every src/scripts/<name> into dist/<name>.user.js plus an installable
// dist/<name>.stub.user.js that @requires the built file from disk.
// Usage: pnpm build [name] [--watch]
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { build, type Rolldown } from 'vite';
import monkey, { type MonkeyUserScript } from 'vite-plugin-monkey';

const root = resolve(import.meta.dirname, '..');
const watch = process.argv.includes('--watch');
const only = process.argv.slice(2).find((arg) => !arg.startsWith('--'));
const names = readdirSync(resolve(root, 'src/scripts')).filter((name) => !only || name === only);
if (names.length === 0) throw new Error(`No script named "${only}" in src/scripts`);

function writeStub(name: string) {
  const file = resolve(root, 'dist', `${name}.user.js`);
  const header = readFileSync(file, 'utf8').match(/^\/\/ ==UserScript==[\s\S]*?\/\/ ==\/UserScript==/m)?.[0];
  if (!header) throw new Error(`No userscript header in ${file}`);
  const stub = header.replace('// ==/UserScript==', `// @require      file://${file}\n// ==/UserScript==`);
  writeFileSync(resolve(root, 'dist', `${name}.stub.user.js`), stub + '\n');
}

for (const name of names) {
  const userscript: MonkeyUserScript = (await import(resolve(root, 'src/scripts', name, 'meta.ts'))).default;
  const result = await build({
    configFile: false,
    root,
    logLevel: 'warn',
    plugins: [
      monkey({
        entry: `src/scripts/${name}/main.ts`,
        userscript,
        build: { fileName: `${name}.user.js` },
      }),
    ],
    build: { emptyOutDir: false, watch: watch ? {} : null },
  });

  if (watch) {
    (result as Rolldown.RolldownWatcher).on('event', (event) => {
      if (event.code === 'END') {
        writeStub(name);
        console.log(`[${new Date().toLocaleTimeString()}] built ${name}`);
      }
    });
  } else {
    writeStub(name);
    console.log(`built ${name}`);
  }
}
