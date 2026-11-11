# Submission contents

## Included in this folder

- `README.md` — setup, seeded accounts, supported imports, and known limitations.
- `ARCHITECTURE.md` — architecture, product priorities, and tradeoffs.
- `PROJECT_GUIDE.pdf` and `PROJECT_GUIDE.md` — plain-language explanation of the product and implementation.
- `tools/generate_project_guide.py` — script to regenerate the PDF.
- `AI_WORKFLOW.md` — tools used, AI contributions, and verification.
- `WALKTHROUGH_URL.txt` — walkthrough video link.
- `WALKTHROUGH_SCRIPT.md` — timed outline for the walkthrough.
- `server.js`, `document-service.js`, `package.json`, `public/`, `netlify/`, `netlify.toml`, `test/`, `examples/launch-notes.md`, `render.yaml`, and `.github/workflows/test.yml` — runnable source, local and Netlify APIs, tests, import sample, deployment configuration, and CI workflow.

## Review access

- **Local app:** run `npm install` and `npm start`, then open `http://localhost:3000`.
- **Demo accounts:** Aria Chen (`aria@ajaia.test`), Morgan Lee (`morgan@ajaia.test`), and Sam Rivera (`sam@ajaia.test`). No passwords are used; switching accounts simulates sign-in.
- **Source repository:** https://github.com/suhail-khann/Document_Editor/tree/piush
- **Live deployment URL:** `https://documents-creation.netlify.app/` (Netlify setup: `netlify.toml`; redeploy the `piush` branch after connecting the repository).
- **Google Drive folder:** `[Paste shared folder URL here]`.
- **Walkthrough video URL:** `[Paste unlisted video URL in WALKTHROUGH_URL.txt]` (recording outline: `WALKTHROUGH_SCRIPT.md`).
- **Hosted storage:** Netlify deployments use the site-wide Netlify Blobs store; local development uses `data/documents.json`.

## Scope

The delivered app includes document creation/editing and persistence, formatting controls, `.txt`/`.md` imports, seeded-user share/revoke and collaborator editing, restorable version history, Netlify serverless API and Blobs storage, and automated API tests.

Real authentication and a relational production database are intentionally outside this prototype's scope. The optional stretch implemented is version history.

Next improvements: move persistence to a managed database and introduce real identity with per-user authorization.
