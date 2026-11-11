# Architecture and product choices

## Product slice

A focused shared-writing workflow: open or create a document, edit and format it, import an existing text draft, then invite a teammate to keep working on the same document. The interface favors a quiet writing canvas and makes owned versus shared documents visible.

## Implementation

- **UI:** semantic HTML, responsive CSS, and browser-native JavaScript; `contenteditable` supports a small formatting toolbar without a large editor dependency.
- **API:** a shared document service powers the Express local API and the deployed Netlify Function.
- **Persistence:** a local JSON file stores documents during development. The deployed Netlify function persists the same document service's collection in a site-wide Netlify Blobs store with strong consistency, so saves and sharing changes are visible to the next request.
- **Netlify deployment:** `netlify.toml` publishes `public/` and configures a `/api/*` serverless function. An explicit publish directory is essential because the website entry point is in `public/`.
- **Version history:** each changed save stores the previous title and sanitized content; the newest 20 snapshots are kept. Restoring a version first snapshots the current draft, so a restore can be undone.
- **Sharing:** three seeded demo identities stand in for authentication. Owners can grant or revoke editor access; owners and collaborators can read and edit; other users receive no document data.
- **Import:** `.txt` and `.md` contents are escaped and inserted as paragraphs. The API independently sanitizes saved HTML to an explicit formatting allowlist.

## Priorities and tradeoffs

I prioritized the end-to-end loop—edit, save, reopen, share, import, and recover a prior draft—over live collaboration, a heavy editor framework, and infrastructure that requires service credentials. The no-build frontend keeps setup quick and makes the app easy to inspect. A JSON store avoids external services but is intentionally not a production database; replacing it with SQLite or Postgres and adding real authentication would be the first deployment-hardening steps.

## Verification

`npm test` exercises document creation and reopening, formatting sanitization, collaborator editing, shared-document visibility, version history and restore, invalid users, private-document access, and the Netlify function API with an in-memory store adapter. Manual browser checks also covered formatting controls, account switching, sharing, `.md` import, reload persistence, and saving while quickly switching documents.
