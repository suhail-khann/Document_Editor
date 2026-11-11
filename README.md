# Ajaia Docs

A calm, lightweight document editor with persistent drafts, basic rich-text formatting, text-file import, and seeded-user sharing.

## Run locally

Requirements: Node.js 20 or newer and npm.

```powershell
npm install
npm test
npm start
```

Open [http://localhost:3000](http://localhost:3000). Documents are stored in `data/documents.json` and survive refreshes and server restarts. The first run creates two sample documents so both owned and shared views are immediately testable.

## Try the sharing flow

The account menu simulates sign-in. Switch among:

- Aria Chen — `aria@ajaia.test`
- Morgan Lee — `morgan@ajaia.test`
- Sam Rivera — `sam@ajaia.test`

Aria owns the welcome document and has editor access to Morgan's launch brief. As an owner, open **Share** and invite a teammate. Switch to that teammate to find the document under **Shared with me** and edit it. Account selection is a local demo convenience, not authentication.

## Editing and import

Select text and use the toolbar for bold, italic, underline, headings, lists, and quotes. Changes autosave after a short pause; the save indicator reports success or failure.

Import accepts `.txt` and `.md` files up to 1 MB. Both are imported as editable text with line breaks preserved; Markdown syntax is not rendered as rich text. Try the sample in `examples/launch-notes.md`. Unsupported types and oversized files are rejected.

Open **History** to review and restore the last 20 saved versions. Restoring a version saves the current draft as a new version first.

## Deploy to Netlify

The site is configured for Netlify in `netlify.toml`: Netlify installs dependencies with `npm ci` on Node.js 24, publishes the `public/` folder, and bundles the API function from `netlify/functions/`. The API function handles `/api/*` requests and stores documents in the site-wide Netlify Blobs store named `ajaia-documents`; this avoids relying on the ephemeral filesystem used by serverless functions. Node.js 24 is selected so the current sanitized HTML dependency's ESM parser runs in the serverless runtime.

To redeploy, connect the GitHub repository `suhail-khann/Document_Editor` to Netlify and use the `piush` branch. Keep the base directory at the repository root so Netlify can read `netlify.toml`, `package.json`, and the function source. Netlify Blobs must be available for the site. After deployment, check the deploy's Functions section and verify `https://<your-site>.netlify.app/api/users` returns the three demo users.

If Netlify's **Build settings** UI has custom overrides, clear the base directory and let `netlify.toml` control the publish and functions directories. In **Build & deploy → Branches**, make sure the production branch is `piush`, then trigger a fresh deploy. A successful static publish should serve the home page; `/api/users` should return JSON rather than a 404. If either URL still returns 404, inspect the latest deploy log and confirm the deploy is using this repository and branch.

The Render Blueprint in `render.yaml` remains available for a standalone Node server, but Netlify should use the Netlify Function and Blobs path above.

## Scope and known limitations

- Sharing is simulated with three seeded accounts; there is no password, identity provider, or production access control.
- Local development stores data in a JSON file. Netlify deployments use Netlify Blobs.
- The Netlify demo uses seeded identities, not real authentication or production access control.
- The editor supports a deliberate subset of rich text; it does not provide real-time co-editing, comments, or DOCX/PDF import.
- Add the hosted app, Drive folder, and walkthrough URLs to `SUBMISSION.md` and `WALKTHROUGH_URL.txt` when preparing the final review package.

## Project map

- `server.js` — local Express server and JSON-file repository.
- `document-service.js` — shared document rules used by the local API and Netlify function.
- `netlify/functions/api.mjs` — Netlify serverless API backed by Netlify Blobs.
- `netlify.toml` — Netlify build, publish, and function configuration.
- `public/` — responsive editor UI and client-side interactions.
- `test/server.test.js` and `test/netlify-function.test.js` — local and deployed API integration tests.
- `render.yaml` — optional Render Blueprint for reviewer deployment.
- `.github/workflows/test.yml` — automated test workflow for GitHub pushes and pull requests.
- `ARCHITECTURE.md` — implementation choices and tradeoffs.
- `AI_WORKFLOW.md` — AI usage and verification notes.
- `PROJECT_GUIDE.pdf` and `PROJECT_GUIDE.md` — purpose, features, architecture, API, and implementation walkthrough.

To regenerate the guide PDF after editing its Markdown source, install the optional documentation dependency and run:

```powershell
python -m pip install reportlab
python tools/generate_project_guide.py
```
