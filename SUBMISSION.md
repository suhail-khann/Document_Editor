# Submission contents

## Included in this folder

- `README.md` — setup, seeded accounts, supported imports, and known limitations.
- `ARCHITECTURE.md` — architecture, product priorities, and tradeoffs.
- `AI_WORKFLOW.md` — tools used, AI contributions, and verification.
- `WALKTHROUGH_URL.txt` — walkthrough video link.
- `WALKTHROUGH_SCRIPT.md` — timed outline for the walkthrough.
- `server.js`, `package.json`, `public/`, `test/`, `examples/launch-notes.md`, `render.yaml`, and `.github/workflows/test.yml` — runnable source, tests, import sample, deployment configuration, and CI workflow.

## Review access

- **Local app:** run `npm install` and `npm start`, then open `http://localhost:3000`.
- **Demo accounts:** Aria Chen (`aria@ajaia.test`), Morgan Lee (`morgan@ajaia.test`), and Sam Rivera (`sam@ajaia.test`). No passwords are used; switching accounts simulates sign-in.
- **Source repository:** https://github.com/suhail-khann/Document_Editor/tree/piush
- **Live deployment URL:** `[Paste public app URL here]` (Render setup: `render.yaml`).
- **Google Drive folder:** `[Paste shared folder URL here]`.
- **Walkthrough video URL:** `[Paste unlisted video URL in WALKTHROUGH_URL.txt]` (recording outline: `WALKTHROUGH_SCRIPT.md`).
- **Hosted storage:** Render's free local filesystem is ephemeral. Attach a persistent disk or managed database if reviewer documents need to survive service restarts.

## Scope

The delivered app includes document creation/editing and local persistence, formatting controls, `.txt`/`.md` imports, seeded-user share/revoke and collaborator editing, restorable version history, Render deployment configuration, and automated API tests.

Authentication and durable production storage are intentionally outside this prototype's scope. The optional stretch implemented is version history.

Next improvements: move persistence to a managed database and introduce real identity with per-user authorization.
