# AI workflow note

- **AI tool used:** Copilot SDK in VS Code (this coding assistant).
- **Where it helped:** Turning the assignment into a bounded product slice, scaffolding the UI and API together, and drafting focused API integration tests and setup notes.
- **What I changed or rejected:** I kept the implementation dependency-light instead of adopting a larger frontend framework or attempting real-time collaboration. I also made the mock-account limitation explicit, added server-side input checks and HTML sanitization, and wrote tests around authorization and persistence rather than relying on generated UI code alone.
- **How I verified it:** The automated Node test suite checks the API's save/reopen, shared editing, visibility, and sanitization behavior. The app is designed for local browser review at `http://localhost:3000`; a public deployment and recorded walkthrough still require external account access and are not represented as complete.
