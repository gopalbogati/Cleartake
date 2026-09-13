# ClearTake download website

The repository includes a static Vercel website in `website/` and a separate desktop build workflow. Vercel hosts HTML/CSS/JavaScript. GitHub builds and stores the large Mac/Windows packages.

## Deploy on Vercel

1. In your Vercel account choose **Add New → Project** and import **gopalbogati/Cleartake**.
2. Keep **Root Directory** at the repository root (`./`), and use the **Other** framework preset.
3. The committed `vercel.json` supplies these settings:
   - Install command: `node --version` (the site has no dependencies to install).
   - Build command: `node scripts/build-website.cjs`.
   - Output directory: `website`.
4. Click **Deploy**. Vercel gives the project its own URL. Optional: add your domain in the project's Domains settings.

Do not use the desktop `npm run build` command as the website build. The website build copies the app icon and writes the source version; it does not install Electron, FFmpeg or TensorFlow. No API key or environment secret is needed for the site. Official configuration reference: https://vercel.com/docs/project-configuration/vercel-json

## Build the app ZIPs

1. Open the repository's **Actions** tab.
2. Select **Build Mac and Windows downloads → Run workflow** on `main`.
3. Wait for both platform jobs to succeed. Each job packages the app and tests the bundled local sound detector. Download the corresponding workflow artifacts if you want to test before publication.
4. When **Prepare a draft release** is selected, the workflow collects both builds into a GitHub draft prerelease. Open **Releases**, inspect the notes/assets and test the apps before publishing the draft.
5. Publish that release when it is ready. The website checks public releases whenever visitors open it; no Vercel redeployment is needed for new app downloads.

Output app filenames:

- `ClearTake-Mac-0.1.0-arm64.zip`
- `ClearTake-Mac-0.1.0-arm64.dmg`
- `ClearTake-Windows-0.1.0-x64.zip`
- Matching `.sha256` checksum files.

GitHub wraps workflow artifacts in an extra ZIP. That outer artifact ZIP is not the app ZIP. The release workflow extracts artifacts and attaches the actual app packages. For a manual release, extract the artifact before attaching its inner app ZIP and checksum.

Use a tag matching the app version, e.g. `v0.1.0`. Future versions must update `package.json` and package-lock.json. The workflow refuses to overwrite an existing release with the same tag. A prerelease is displayed as a development preview. Download buttons appear only for valid, uploaded assets belonging to that release. Source-only releases, missing assets and API failures never become fake download links.

## Supported build targets and current validation

- Mac: Apple Silicon ARM64, macOS 14.2+; ZIP containing ClearTake.app, plus DMG.
- Windows: x64 Intel/AMD; ZIP containing ClearTake.exe and required companion files. Extract the complete folder before running it.
- Intel Mac and Windows ARM64 are not included.

Windows packaging and helper paths are implemented, but this development environment is Linux: it cannot verify native Windows/macOS capture or installability. A completed build is not a native recording test. The draft release notes retain that distinction. These development packages are not Windows code-signed or Apple-notarized.

Keep the third-party notices in the packages and satisfy the exact media-binary corresponding-source obligations documented in THIRD-PARTY.md before public binary distribution. Do not attach personal recordings to releases.

## Release lookup

The browser makes one public request to `https://api.github.com/repos/gopalbogati/Cleartake/releases?per_page=30`. It picks the most recently published release with a supported app ZIP. Missing platforms remain unavailable. GitHub rate limits or network errors show a fallback link to Releases. No tokens are placed in the website, and no recording content is sent.

## Local website check

```sh
node scripts/build-website.cjs
node --test tests/downloads.test.cjs
python3 -m http.server 8080 --directory website
```

Open http://localhost:8080. Native recording is part of the desktop application, not this website.
