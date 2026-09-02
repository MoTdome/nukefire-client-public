# Automated GitHub Distribution Builds

NukeFire Client uses GitHub Actions to build the same unsigned desktop distributions that were previously produced manually.

## Produced distributions

A successful three-platform run produces:

- macOS Universal DMG
- macOS Universal ZIP
- Windows x64 Setup EXE
- Windows x64 Portable EXE
- Linux x64 AppImage

Published releases also include a source ZIP, `DISTRIBUTION-NOTES.txt`, and `SHA256SUMS.txt`. GitHub additionally provides its normal automatic source archives.

## Safety model

The workflow does not run on pull requests. It runs only from an explicit manual dispatch or from a repository tag beginning with `v`.

Before building, it verifies that:

- `package.json` provides `verify`, `dist:mac`, and `dist:win` scripts;
- the electron-builder product name is `NukeFire Client`;
- `package-lock.json` exists;
- a published release tag is exactly `v` plus the package version; and
- the release tag points to the exact commit being built.

The complete `npm run verify` suite must pass before any platform packaging jobs start.

## Manual test build

Open **Actions → Build and Release Distributions → Run workflow**.

Leave **Publish Release** off. Optionally enter a branch, tag, or commit in **ref**. The completed run exposes the three platform artifact bundles on the workflow-run page for 14 days. No GitHub Release is created.

## Publishing an existing tag manually

This is useful for a release tag that existed before the workflow itself was added to the repository.

Run the workflow manually with:

- **ref**: the existing version tag, for example `v0.3.1-beta.73`
- **Publish Release**: on
- **release_tag**: the same version tag

The workflow refuses publication if the tag does not exist, does not match `package.json`, or does not point to the exact requested build commit.

## Future automatic releases

For future releases, first commit and push the release source with the correct version in `package.json` and `package-lock.json`. Then create and push the matching tag, for example:

```bash
git tag -a v0.3.1-beta.74 -m "NukeFire Client 0.3.1-beta.74"
git push origin v0.3.1-beta.74
```

The pushed `v*` tag automatically runs verification, builds all three platforms, checks the five expected binaries, creates SHA-256 checksums, and creates the GitHub Release.

Do not move an existing release tag to a different commit.

## Signing status

These builds are deliberately unsigned unless signing credentials are added in a later project decision. macOS Gatekeeper and Windows SmartScreen may therefore warn users. No Apple or Microsoft signing secret is required for the current workflow.

## Build runners

The workflow currently uses:

- Ubuntu 24.04 x64 for verification, Linux packaging, and release assembly;
- Windows Server 2022 x64 for Windows packaging;
- macOS 15 Intel for the Universal macOS package; and
- Node.js 22 with `npm ci` for dependency installation.

The macOS build continues to use the repository's existing `dist:mac` script, which asks electron-builder for a Universal application. The Windows build continues to use `dist:win`. Linux continues to use electron-builder's x64 AppImage target.
