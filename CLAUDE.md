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

## New script

1. Copy `src/scripts/yt-copy/` to `src/scripts/<name>/` as the template; keep only the files the new script uses.
2. Rewrite `meta.ts`: unique `name`, `match` for the target site, `grant` listing exactly the GM APIs imported from `$`.
3. Write `main.ts`, with pure logic in its own module and a `*.test.ts` beside it.
4. Run all checks.
5. Hand the user the install URL: `file:///Users/work/Dev/custom/userscripts/dist/<name>.stub.user.js`.

Done when every check passes and `dist/<name>.stub.user.js` exists.

## Install gotchas

When the user says a script is installed but does nothing:

- First suspect the browser restart. After enabling **Allow access to file URLs** in the extension details, Chrome/Brave must be restarted. Until then the `file://` require returns `200 OK` with an empty body, and nothing logs an error.
- The Tampermonkey Externals tab always shows 0 bytes for `file://` requires, working or not. Judge by the script's behaviour on the page.

## Agent skills

### Issue tracker

Issues live in GitHub Issues for `MichalSzczepanskii/userscripts`, via the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

Default vocabulary: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: root `GLOSSARY.md` + `docs/adr/`, created lazily. See `docs/agents/domain.md`.
