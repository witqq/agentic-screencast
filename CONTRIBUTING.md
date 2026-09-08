# Contributing to Agentic Screencast

**English** | [Русский](CONTRIBUTING.ru.md)

Search existing issues before proposing a change. Report vulnerabilities privately through the process in [SECURITY.md](SECURITY.md).

## Development setup

Use Node.js 20 or newer and install the pinned dependency graph:

```sh
npm ci
npx playwright install chromium
npm test
```

Keep a scenario file as the only authored source for its generated slides and build data. Do not edit generated `slides/`, `.generated-*.json`, `dist/`, `site/`, cache, recording, or video files as source.

## Changes

- Work on a dedicated branch and keep one logical change together with its tests and documentation.
- Reuse the provider, voice, schema, message, and build primitives before adding a parallel mechanism.
- Add a check that distinguishes the requested state from a plausible incorrect state.
- Use the `stub` voice for automated checks. Network speech synthesis costs money and does not belong in CI.
- Keep credentials in the environment. Never add real accounts, tokens, recordings, captured authenticated pages, personal paths, or diagnostic logs.
- Use imperative commit subjects with a `feat:`, `fix:`, `docs:`, `test:`, `build:`, or `chore:` prefix.

Run the complete local gate before opening a pull request:

```sh
npm test
npm run pack:check
npm run site:check
```

Describe the commands and observed results in the pull request. A maintainer performs release, npm publication, and deployment by following [docs/RELEASING.md](docs/RELEASING.md).
