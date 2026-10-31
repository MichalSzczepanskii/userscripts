// Builds every src/scripts/<name> into dist/<name>.user.js plus an installable
// dist/<name>.stub.user.js that @requires the built file from disk.
// The built file is also the hosted script, deployed to GitHub Pages by CI.
// Usage: pnpm build [name] [--watch]
import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { build, type Rolldown } from 'vite';
import monkey, { type MonkeyUserScript } from 'vite-plugin-monkey';

const root = resolve(import.meta.dirname, '..');
const watch = process.argv.includes('--watch');
const only = process.argv.slice(2).find((arg) => !arg.startsWith('--'));
const names = readdirSync(resolve(root, 'src/scripts')).filter((name) => !only || name === only);
if (names.length === 0) throw new Error(`No script named "${only}" in src/scripts`);

const hostedUrl = 'https://michalszczepanskii.github.io/userscripts';
// Tampermonkey updates only when @version grows, so every commit gets a higher one (docs/adr/0001).
const buildNumber = execFileSync('git', ['rev-list', '--count', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();

function writeStub(name: string) {
  const file = resolve(root, 'dist', `${name}.user.js`);
  const header = readFileSync(file, 'utf8').match(/^\/\/ ==UserScript==[\s\S]*?\/\/ ==\/UserScript==/m)?.[0];
  if (!header) throw new Error(`No userscript header in ${file}`);
  const stub = header.replace('// ==/UserScript==', `// @require      ${pathToFileURL(file).href}\n// ==/UserScript==`);
  writeFileSync(resolve(root, 'dist', `${name}.stub.user.js`), stub + '\n');
}

for (const name of names) {
  const meta: MonkeyUserScript = (await import(pathToFileURL(resolve(root, 'src/scripts', name, 'meta.ts')).href))
    .default;
  const url = `${hostedUrl}/${name}.user.js`;
  const userscript = { ...meta, version: `${meta.version}.${buildNumber}`, downloadURL: url, updateURL: url };
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
