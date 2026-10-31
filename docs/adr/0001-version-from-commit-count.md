# Script version is the meta version plus the commit count

Each script is installed on several machines from its hosted URL, and Tampermonkey only pulls an update when `@version` grows. A forgotten manual bump would silently leave every machine on the old code, so the build sets `@version` to `<meta.ts version>.<git rev-list --count HEAD>` (for example `1.3.0.42`), both locally and in CI. The semver in `meta.ts` stays for humans.

## Consequences

- Every push updates every script, changed or not.
- A stub built from the same commit has the same version as the hosted script, so Tampermonkey leaves it alone; once a newer commit is deployed, Tampermonkey replaces the stub with the hosted script. Pull before developing, or the stub is replaced at once.

## Considered Options

- Manual bump in `meta.ts`: no code, but a forgotten bump means no update and no error.
- Manual bump with a CI check against changed files: catches the mistake, but needs diff logic over `src/scripts/<name>` and `src/lib`.
