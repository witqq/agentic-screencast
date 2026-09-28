# Release runbook

CI, GitHub Release creation, npm publication, and landing deployment are separate gates. Complete each gate from the same accepted commit and record its observed result; one successful effect does not prove another.

## Public-history gate

The public repository uses a clean history. The release gate rejects any reachable ref containing `pitch/screens/`, where authenticated captures must never be published. Run publication checks from a fresh clone of the public remote: a maintainer's older recovery refs may contain private history and must remain local. Never push all refs or mirror a maintenance checkout.

If the gate fails on the public clone, stop publication and inspect the exact refs. Any destructive history rewrite or force push requires separate owner approval. The capture-path gate complements secret scanning; it does not establish that arbitrary files are safe to publish.

## Publish landing media separately

When `website/landing/media-manifest.json` changes, publish its exact silent MP4 and JPEG bytes before a clean-checkout CI run or landing deployment. The manifest's fixed URLs use the separate `landing-media-20260928` release tag; this tag does not match the package release's `vMAJOR.MINOR.PATCH` trigger. Keep the package release's sole tarball asset separate.

From the accepted source, run `node website/overview/build-landing-media.mjs` after preparing its captures and material, then `npm run site:static`. The builder puts heavy media in `agent_temp_files_local/landing-media-cache/` by SHA-256; only the manifest and compact source-render frames belong in Git. Stage the exact cached bytes under the names used by the manifest:

```sh
node --input-type=module -e '
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
const manifest = JSON.parse(readFileSync("website/landing/media-manifest.json", "utf8"));
const out = "agent_temp_files_local/landing-media-publish";
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
for (const asset of manifest.assets) {
  const extension = asset.kind === "video" ? "mp4" : "jpg";
  const bytes = readFileSync(`agent_temp_files_local/landing-media-cache/${asset.sha256}.${extension}`);
  if (bytes.length !== asset.bytes || createHash("sha256").update(bytes).digest("hex") !== asset.sha256) {
    throw new Error(`${asset.source}: cache differs from manifest`);
  }
  writeFileSync(join(out, basename(asset.source)), bytes);
}
'
```

Push the accepted branch, then create the media release at that pushed commit with precisely those named assets:

```sh
MEDIA_SOURCE_COMMIT="$(git rev-parse HEAD)"
gh release create landing-media-20260928 agent_temp_files_local/landing-media-publish/* --target "$MEDIA_SOURCE_COMMIT" --title "Agentic Screencast landing media" --notes "Silent bilingual landing excerpts"
```

Check the published asset names and digests against the manifest. Then run `npm run site:static` from a clean checkout of the pushed branch with no local media cache: `build-site.mjs` must download and verify every exact asset. A local cached build alone does not prove public reproducibility. Do not replace a published media tag or asset; change the manifest URL to a new media tag when bytes change.

## Prepare a release

Use Node.js 24.20.0 or a compatible newer supported release on a clean feature branch. Update `package.json.version`; it is the only version source. Then run:

```sh
npm ci
npm run ci:verify
npm run history:check
git status --short
```

`ci:verify` runs the browser-free unit gate, checks the package candidate and verifies the static landing and clip reference frames. The scheduled nightly workflow owns browser and video E2E tests, the product suite and the full browser site check. `pack:check` writes the accepted tarball and `candidate-evidence.json` under `agent_temp_files_local/package-candidate/`. It rejects generated state, stale build files, local paths and secret-bearing file classes, installs the exact tarball into an isolated consumer, and runs the public CLI with the free `stub` voice.

Do not rebuild a candidate after it passes unless repository bytes change. Commit, review, merge and tag the exact accepted tree. Commit and push remain maintainer actions.

## Create the GitHub Release

Create and push an annotated `vMAJOR.MINOR.PATCH` tag matching `package.json.version`. The `release.yml` workflow checks full history, runs the fast product and package gates without Chromium, and creates one GitHub Release with one asset named `agentic-screencast-MAJOR.MINOR.PATCH.tgz`.

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
ACCEPTED_SHA256="<64-lowercase-hex>"
gh workflow run publish-npm.yml --ref main -f tag=v1.0.0 -f "sha256=$ACCEPTED_SHA256"
gh run list --workflow publish-npm.yml --limit 1 --json databaseId,status,conclusion,headSha,url
gh run watch "<databaseId>" --exit-status
npm view agentic-screencast version dist-tags --json
```

The workflow downloads the sole GitHub Release asset, verifies its GitHub digest, local SHA-256, tag, version, package name and repository, then publishes those exact bytes with OIDC. Never run `npm publish` locally for an official release.

## Deploy the landing

Deployment starts from the same clean committed release revision, after the media release and clean-fetch check above when the landing manifest changed:

```sh
npm run deploy:prod
infra-tools status agentic-screencast --server witqq.ru --remote-dir /opt/agentic-screencast
curl --fail --silent --show-error https://agentic-screencast.witqq.dev/release.json
curl --fail --silent --show-error --output /dev/null https://agentic-screencast.witqq.dev/
curl --fail --silent --show-error https://agentic-screencast.witqq.dev/robots.txt
curl --fail --silent --show-error --output /dev/null https://agentic-screencast.witqq.dev/sitemap.xml
```

The landing is built by `scripts/build-site.mjs` with the pinned `agentic-report` as a directory page with the public address `https://agentic-screencast.witqq.dev/`: the page carries canonical and OpenGraph metadata, its assets carry content hashes and are served as immutable, and `generateSitemap` writes `sitemap.xml` and a `robots.txt` that names it. `release.json` lists every published file and the `agentic-report` version in `builtWith`.

Confirm trusted TLS, the exact package version, `builtWith` and 40-character source revision in `release.json`, HTML delivery with the canonical address, `robots.txt` naming the absolute sitemap, `sitemap.xml` served as XML, revalidation headers, and a real 404 for an absent path. Update the maintainer's deployment inventory in the same deployment task with the observed service, host, remote directory, source, data risk, revision and verification time.

The site is stateless. To roll back, check out the last accepted tag and run the same deployment contract; do not edit remote files by hand. Inspect the failed stage before retrying, and repeat only that stage and later effects unless repository bytes changed.
