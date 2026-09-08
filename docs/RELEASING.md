# Release runbook

CI, GitHub Release creation, npm publication, and landing deployment are separate gates. Complete each gate from the same accepted commit and record its observed result; one successful effect does not prove another.

## Publication blocker in the current private history

The initial commit contains removed authenticated Moira MHTML captures under `pitch/screens/`. Secret scanners found no credential, but the captures contain private operational identifiers and one non-placeholder account address. Do not make the repository public or create a public release while `npm run history:check` fails.

Cleaning the existing history requires a destructive rewrite and force push. Creating a clean public history changes repository continuity. Either choice needs the repository owner's explicit authorization. After the chosen cleanup, run gitleaks and trufflehog across every resulting ref, inspect the former capture paths manually, and require `npm run history:check` to pass before changing visibility.

## Prepare a release

Use Node.js 24.20.0 or a compatible newer supported release on a clean feature branch. Update `package.json.version`; it is the only version source. Then run:

```sh
npm ci
npm test
npm run pack:check
npm run site:check
npm run history:check
git status --short
```

`pack:check` writes the accepted tarball and `candidate-evidence.json` under `agent_temp_files_local/package-candidate/`. It rejects generated state, stale build files, local paths and secret-bearing file classes, installs the exact tarball into an isolated consumer, and runs the public CLI with the free `stub` voice.

Do not rebuild a candidate after it passes unless repository bytes change. Commit, review, merge and tag the exact accepted tree. Commit and push remain maintainer actions.

## Create the GitHub Release

Create and push an annotated `vMAJOR.MINOR.PATCH` tag matching `package.json.version`. The `release.yml` workflow checks full history, runs the product and package gates, and creates one GitHub Release with one asset named `agentic-screencast-MAJOR.MINOR.PATCH.tgz`.

```sh
git tag -a v1.0.0 -m "agentic-screencast 1.0.0"
git push origin v1.0.0
gh run list --workflow release.yml --limit 1 --json databaseId,status,conclusion,headSha,url
gh run watch "<databaseId>" --exit-status
```

Tags and release assets are immutable. Do not move a public tag or replace an asset. Repair repository bytes and release a new version when a published candidate is wrong.

## Publish the accepted bytes to npm

Configure npm trusted publishing for repository `witqq/agentic-screencast` and workflow `publish-npm.yml`. No npm token belongs in GitHub secrets.

Read the asset SHA-256 from the successful release job, then dispatch the publication workflow:

```sh
gh workflow run publish-npm.yml --ref main -f tag=v1.0.0 -f sha256=<64-lowercase-hex>
gh run list --workflow publish-npm.yml --limit 1 --json databaseId,status,conclusion,headSha,url
gh run watch "<databaseId>" --exit-status
npm view agentic-screencast version dist-tags --json
```

The workflow downloads the sole GitHub Release asset, verifies its GitHub digest, local SHA-256, tag, version, package name and repository, then publishes those exact bytes with OIDC. Never run `npm publish` locally for an official release.

## Deploy the landing

Deployment starts from the same clean committed release revision:

```sh
npm run deploy:prod
infra-tools status agentic-screencast --server witqq.ru --remote-dir /opt/agentic-screencast
curl --fail --silent --show-error https://agentic-screencast.witqq.dev/release.json
curl --fail --silent --show-error --output /dev/null https://agentic-screencast.witqq.dev/
```

Confirm trusted TLS, the exact package version and 40-character source revision in `release.json`, HTML delivery, revalidation headers, and a real 404 for an absent path. Update `/Users/mike/WebstormProjects/DEPLOYMENT-INVENTORY.md` in the same deployment task with the observed service, host, remote directory, source, data risk, revision and verification time.

The site is stateless. To roll back, check out the last accepted tag and run the same deployment contract; do not edit remote files by hand. Inspect the failed stage before retrying, and repeat only that stage and later effects unless repository bytes changed.
