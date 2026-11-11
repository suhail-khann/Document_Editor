# AI workflow note

- **AI tool used:** Copilot SDK in VS Code (this coding assistant).
- **Where it helped:** Turning the assignment into a bounded product slice, scaffolding the UI and API together, and drafting focused API integration tests and setup notes.
- **What I changed or rejected:** I kept the implementation dependency-light instead of adopting a larger frontend framework or attempting real-time collaboration. I also made the mock-account limitation explicit, added server-side input checks and HTML sanitization, and wrote tests around authorization and persistence rather than relying on generated UI code alone.
- **How I verified it:** The automated Node test suite checks save/reopen, shared editing, visibility, version history, sanitization, and the Netlify Function API. A local Netlify build bundles the API function. Browser checks covered formatting, sharing, import, persistence, and history restore.
