# userscripts

Tampermonkey userscripts, written in TypeScript and loaded from local files.

## Setup (once)

1. `pnpm install`
2. Chrome/Brave: `chrome://extensions` → Tampermonkey → Details → enable **Allow access to file URLs** and **Allow User Scripts**, then restart the browser. Without the restart the `file://` require loads empty and the script silently does nothing. The Externals tab shows 0 bytes for `file://` requires even when they work.
3. `pnpm build`
4. Drag `dist/<name>.stub.user.js` into the browser and click Install.

## Development

```bash
pnpm build --watch
```

Edit `src/scripts/<name>/`, then reload the page. The stub reads the rebuilt file from disk on every page load. Reinstall the stub only after changing `match` or `grant` in `meta.ts`.

Build a single script: `pnpm build yt-copy`.

## New script

Copy `src/scripts/yt-copy/` to `src/scripts/<new-name>/`, edit `meta.ts` and `main.ts`, run `pnpm build`, install the new stub.

## Scripts

### yt-copy

On a YouTube video page:

- `Alt+C` copies title, link, channel, date and transcript as Markdown.
- `Alt+Shift+C` does the same with a `[m:ss]` timestamp on every line.

Both are also in the Tampermonkey menu. The transcript is the track YouTube shows by default.
