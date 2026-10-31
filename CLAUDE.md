# userscripts

Personal Tampermonkey userscripts. TypeScript, built with Vite + `vite-plugin-monkey`. pnpm, Node >= 23.6 (`scripts/build.ts` runs with native type stripping).

Personal repo: shortcut comments allowed.

## Layout

- `src/scripts/<name>/meta.ts`: userscript header (`MonkeyUserScript`). `main.ts`: entry.
- `src/lib/`: code shared between scripts.
- `scripts/build.ts`: builds each script to `dist/<name>.user.js` and writes `dist/<name>.stub.user.js`, a header-only script that `@require`s the built file via `file://`. Terms (hosted script, stub) are in `GLOSSARY.md`.
- `.github/workflows/pages.yml`: on push to `main`, runs the checks and deploys every `dist/<name>.user.js` (not stubs) to `https://michalszczepanskii.github.io/userscripts/<name>.user.js`. That is the hosted script, installed on every machine (macOS and Windows) for everyday use. The stub replaces it only while developing.
- `@version` is `<meta.ts version>.<commit count>`, set by the build (`docs/adr/0001-version-from-commit-count.md`). Bump the semver in `meta.ts` for humans; Tampermonkey updates either way.

## Rules

- GM APIs come from `import { ... } from '$'`, and every one used must be listed in `grant` in `meta.ts`. The stub copies the header, so a new `@grant` or `@match` means reinstalling the stub.
- Keep page-independent logic (parsing, formatting) in pure modules with a `*.test.ts` next to them. Page integration is checked by hand.
- Checks: `pnpm test`, `pnpm typecheck`, `pnpm format:check`, `pnpm build`.

## New script

1. Copy `src/scripts/yt-copy/` to `src/scripts/<name>/` as the template; keep only the files the new script uses.
2. Rewrite `meta.ts`: unique `name`, `match` for the target site, `grant` listing exactly the GM APIs imported from `$`.
3. Write `main.ts`, with pure logic in its own module and a `*.test.ts` beside it.
4. Run all checks.
5. Hand the user both install URLs: the hosted script `https://michalszczepanskii.github.io/userscripts/<name>.user.js` (live after the push deploys) and, for developing, the stub at `dist/<name>.stub.user.js` in their checkout.

Done when every check passes and `dist/<name>.stub.user.js` exists.

## Install gotchas

When the user says a script is installed but does nothing:

- First suspect the browser restart. After enabling **Allow access to file URLs** in the extension details, Chrome/Brave must be restarted. Until then the `file://` require returns `200 OK` with an empty body, and nothing logs an error.
- The Tampermonkey Externals tab always shows 0 bytes for `file://` requires, working or not. Judge by the script's behaviour on the page.
- A stub holds an absolute path from the machine that built it. Never sync it between machines (Tampermonkey cloud sync would break it on the other OS); each machine builds and installs its own.
- A stub that vanished mid-development was replaced by the hosted script: a newer commit was deployed (pushed from here, or from the other machine without a local pull). Pull, rebuild, reinstall the stub.

## Agent skills

### Issue tracker

Issues live in GitHub Issues for `MichalSzczepanskii/userscripts`, via the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

Default vocabulary: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: root `GLOSSARY.md` + `docs/adr/`, created lazily. See `docs/agents/domain.md`.
