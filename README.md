# CMH Manager

CMH Manager is now a dual-surface application:

- A standalone web app for direct manual use.
- A Chrome/Edge Manifest V3 extension that embeds the manager inside Coveo Merchandising Hub.

The shared React codebase uses `@coveord/plasma-mantine` so the embedded experience looks consistent with the existing Coveo platform while preserving standalone operation.

## What it does

- Bulk import and upsert listing pages from CSV.
- Fetch, edit, and save global search, listing, product suggest, and recommendation query configuration.
- Export and import ranking or filter rules through the private Commerce API.
- Export all listing pages to CSV or delete all listing pages for the active tracking ID.
- Reuse the current Merchandising Hub session in extension mode when org and token context can be discovered from the page.

## Architecture

### Standalone web app

- Entry point: `src/main.tsx`
- Uses a browser session store and direct authenticated platform requests.
- Best when you want to connect manually outside of Merchandising Hub.

### Embedded MV3 extension

- Manifest: `src/extension/manifest.ts`
- Content script injects a `CMH Manager` item into the Hub left rail and mounts the app inside a shadow-root overlay.
- Page bridge harvests discoverable session context from the Hub page and captures auth/platform context from page requests.
- Background worker stores per-tab session context and proxies authenticated API requests.

## Environment

### Optional local AI key

If you want AI enhancement to call Gemini directly during local development:

```env
VITE_GEMINI_API_KEY=your_google_gemini_api_key
```

### Extension/backend API base URL

The extension cannot rely on same-origin `/api/*` rewrites. Point it to the deployed web/backend host:

```env
VITE_CMH_API_BASE_URL=https://your-app.netlify.app
```

### Optional sample connection tokens

```env
VITE_TOKEN_TREK=...
VITE_TOKEN_FASHION=...
VITE_TOKEN_ELECTRONICS=...
```

## Development

Install dependencies:

```bash
npm install
```

Run the standalone web app:

```bash
npm run dev:web
```

Run the extension build in dev mode:

```bash
npm run dev:extension
```

## Build outputs

Build both surfaces:

```bash
npm run build
```

Output directories:

- Web app: `dist/web`
- Extension: `dist/extension`

Netlify now builds only the standalone web app with `npm run build:web`.

## Package the extension for a GitHub Release

Create the uploadable release asset:

```bash
npm run package:extension-release
```

Release artifact:

- `dist/release/cmh-manager-extension.zip`

GitHub Actions now packages and uploads that ZIP automatically when a GitHub Release is published.

If you need to rebuild the asset locally or re-upload it manually:

- Run `npm run package:extension-release`
- Upload `dist/release/cmh-manager-extension.zip` to the matching GitHub Release
- Or run the `Release Extension Package` workflow manually with the target tag

The standalone web app download button points to the stable latest-release asset URL for `cmh-manager-extension.zip`.

## Load the extension locally

1. Run `npm run build:extension`.
2. Open `chrome://extensions` or `edge://extensions`.
3. Enable Developer Mode.
4. Click `Load unpacked`.
5. Select `dist/extension`.
6. Open a Merchandising Hub page such as `https://commerce.cloud.coveo.com/...`.
7. Click `CMH Manager` in the left navigation.

## Verification

Validated locally with:

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

Note: lint currently emits the `baseline-browser-mapping` freshness notice from a dependency, but the command exits successfully.
