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

## Scope and known limitations

- Sharing is simulated with three seeded accounts; there is no password, identity provider, or production access control.
- Storage is a local JSON file intended for a single-instance demo, not concurrent multi-instance deployment.
- The editor supports a deliberate subset of rich text; it does not provide real-time co-editing, comments, version history, or DOCX/PDF import.
- A public deployment, Google Drive folder, and recorded walkthrough are not included: this workspace has no deployment or Drive/video credentials. See `SUBMISSION.md` and `WALKTHROUGH_URL.txt`.

## Project map

- `server.js` — Express API, validation, access checks, HTML sanitization, JSON persistence.
- `public/` — responsive editor UI and client-side interactions.
- `test/server.test.js` — API integration tests for persistence, sanitization, and sharing access.
- `ARCHITECTURE.md` — implementation choices and tradeoffs.
- `AI_WORKFLOW.md` — AI usage and verification notes.
