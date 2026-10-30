# userscripts

Personal Tampermonkey userscripts. TypeScript, built with Vite + `vite-plugin-monkey`. pnpm, Node >= 23.6 (`scripts/build.ts` runs with native type stripping).

Personal repo: shortcut comments allowed.

## Layout

- `src/scripts/<name>/meta.ts`: userscript header (`MonkeyUserScript`). `main.ts`: entry.
- `src/lib/`: code shared between scripts.
- `scripts/build.ts`: builds each script to `dist/<name>.user.js` and writes `dist/<name>.stub.user.js`, a header-only script that `@require`s the built file via `file://`. The stub is what gets installed in Tampermonkey.

## Rules

- GM APIs come from `import { ... } from '$'`, and every one used must be listed in `grant` in `meta.ts`. The stub copies the header, so a new `@grant` or `@match` means reinstalling the stub.
- Keep page-independent logic (parsing, formatting) in pure modules with a `*.test.ts` next to them. Page integration is checked by hand.
- Checks: `pnpm test`, `pnpm typecheck`, `pnpm format:check`, `pnpm build`.
