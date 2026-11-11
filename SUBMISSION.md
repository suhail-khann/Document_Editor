# Submission contents

## Included in this folder

- `README.md` — setup, seeded accounts, supported imports, and known limitations.
- `ARCHITECTURE.md` — architecture, product priorities, and tradeoffs.
- `AI_WORKFLOW.md` — tools used, AI contributions, and verification.
- `WALKTHROUGH_URL.txt` — walkthrough recording status.
- `WALKTHROUGH_SCRIPT.md` — timed outline for recording the requested walkthrough.
- `server.js`, `package.json`, `public/`, `test/`, `examples/launch-notes.md`, `render.yaml`, and `.github/workflows/test.yml` — runnable source, tests, import sample, deployment configuration, and CI workflow.

## Review access

- **Local app:** run `npm install` and `npm start`, then open `http://localhost:3000`.
- **Demo accounts:** Aria Chen (`aria@ajaia.test`), Morgan Lee (`morgan@ajaia.test`), and Sam Rivera (`sam@ajaia.test`). No passwords are used; switching accounts simulates sign-in.
- **Source repository:** https://github.com/suhail-khann/Document_Editor/tree/piush
- **Live deployment:** The Render Blueprint is ready, but the submitter must authorize Render and create the public service. The free instance uses ephemeral storage; attach a persistent disk or managed database for durable hosted documents.
- **Google Drive folder:** Not created; no Drive access was provided.
- **Walkthrough video:** Not recorded; see `WALKTHROUGH_SCRIPT.md` and `WALKTHROUGH_URL.txt`.

## Remaining work

Working: document creation/editing and local persistence, formatting controls, `.txt`/`.md` imports, seeded-user share/revoke and collaborator editing, restorable version history, Render deployment configuration, and automated API tests.

Incomplete: real authentication, durable production database, actually creating the hosted service, and the external Drive/video deliverables. The optional stretch implemented is version history.

With another 2–4 hours: move persistence to a managed database, introduce real identity and per-user authorization, finish the public deployment with durable storage, then record the requested walkthrough and capture screenshots.
