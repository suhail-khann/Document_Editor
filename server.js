const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const express = require("express");
const sanitizeHtml = require("sanitize-html");

const USERS = [
  { id: "aria", name: "Aria Chen", email: "aria@ajaia.test", initials: "AC", color: "#b25a3c" },
  { id: "morgan", name: "Morgan Lee", email: "morgan@ajaia.test", initials: "ML", color: "#52716a" },
  { id: "sam", name: "Sam Rivera", email: "sam@ajaia.test", initials: "SR", color: "#7963a7" }
];

const initialDocuments = () => {
  const now = new Date().toISOString();
  return [
    {
      id: "welcome",
      title: "A calmer way to work together",
      ownerId: "aria",
      sharedWith: [],
      createdAt: now,
      updatedAt: now,
      content: "<p>Good work deserves a little more room to breathe.</p><p>Use this space to capture ideas, shape a plan, or share a first draft with your team.</p><h2>Start with the important part</h2><ul><li>Write down what you're working toward</li><li>Invite someone in when you're ready</li><li>Keep the conversation close to the work</li></ul><p><strong>A note for your team:</strong> the best next step is usually the smallest one you can agree on.</p>"
    },
    {
      id: "launch-brief",
      title: "Spring launch — first thoughts",
      ownerId: "morgan",
      sharedWith: [{ userId: "aria", role: "editor" }],
      createdAt: now,
      updatedAt: now,
      content: "<p>A shared starting point for the launch conversation.</p><h2>What we're aiming for</h2><p>Make the first week feel considered, useful, and easy to talk about.</p><h2>Open questions</h2><ol><li>What would make someone want to come back?</li><li>Which small details will make this feel unmistakably ours?</li></ol><p><em>Add a thought or leave a rough idea. We can make it better together.</em></p>"
    }
  ];
};

const sanitizeContent = (content) => sanitizeHtml(content, {
  allowedTags: ["p", "br", "div", "strong", "b", "em", "i", "u", "h1", "h2", "h3", "ul", "ol", "li", "blockquote"],
  allowedAttributes: {},
  disallowedTagsMode: "discard"
});

function createApp(options = {}) {
  const dataFile = options.dataFile || path.join(__dirname, "data", "documents.json");
  fs.mkdirSync(path.dirname(dataFile), { recursive: true });

  if (!fs.existsSync(dataFile)) {
    fs.writeFileSync(dataFile, JSON.stringify(initialDocuments(), null, 2));
  }

  const readDocuments = () => JSON.parse(fs.readFileSync(dataFile, "utf8"));
  const writeDocuments = (documents) => {
    const temporaryFile = `${dataFile}.${process.pid}.tmp`;
    fs.writeFileSync(temporaryFile, JSON.stringify(documents, null, 2));
    fs.renameSync(temporaryFile, dataFile);
  };
  const findUser = (id) => USERS.find((user) => user.id === id);
  const hasAccess = (document, userId) =>
    document.ownerId === userId || document.sharedWith.some((share) => share.userId === userId);

  const app = express();
  app.use(express.json({ limit: "6mb" }));

  app.get("/api/users", (_req, res) => res.json(USERS));

  app.get("/api/documents", (req, res) => {
    const user = findUser(req.query.userId);
    if (!user) return res.status(400).json({ error: "Choose a valid user." });
    const documents = readDocuments()
      .filter((document) => hasAccess(document, user.id))
      .map((document) => ({
        ...document,
        ownerName: findUser(document.ownerId).name,
        access: document.ownerId === user.id ? "owned" : "shared"
      }))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    return res.json(documents);
  });

  app.post("/api/documents", (req, res) => {
    const { userId, title = "Untitled document" } = req.body || {};
    if (!findUser(userId)) return res.status(400).json({ error: "Choose a valid user." });
    if (typeof title !== "string" || !title.trim() || title.trim().length > 120) {
      return res.status(400).json({ error: "Title must be between 1 and 120 characters." });
    }
    const now = new Date().toISOString();
    const document = {
      id: crypto.randomUUID(),
      title: title.trim(),
      content: "<p><br></p>",
      ownerId: userId,
      sharedWith: [],
      createdAt: now,
      updatedAt: now
    };
    const documents = readDocuments();
    documents.push(document);
    writeDocuments(documents);
    return res.status(201).json({ ...document, ownerName: findUser(userId).name, access: "owned" });
  });

  app.get("/api/documents/:id", (req, res) => {
    const userId = req.query.userId;
    const document = readDocuments().find((item) => item.id === req.params.id);
    if (!findUser(userId)) return res.status(400).json({ error: "Choose a valid user." });
    if (!document || !hasAccess(document, userId)) return res.status(404).json({ error: "Document not found." });
    return res.json({
      ...document,
      ownerName: findUser(document.ownerId).name,
      access: document.ownerId === userId ? "owned" : "shared"
    });
  });

  app.put("/api/documents/:id", (req, res) => {
    const { userId, title, content } = req.body || {};
    if (!findUser(userId)) return res.status(400).json({ error: "Choose a valid user." });
    const documents = readDocuments();
    const document = documents.find((item) => item.id === req.params.id);
    if (!document || !hasAccess(document, userId)) return res.status(404).json({ error: "Document not found." });
    if (typeof title !== "string" || !title.trim() || title.trim().length > 120) {
      return res.status(400).json({ error: "Title must be between 1 and 120 characters." });
    }
    if (typeof content !== "string" || content.length > 5_500_000) {
      return res.status(400).json({ error: "Document content must be under 5.5 MB." });
    }
    document.title = title.trim();
    document.content = sanitizeContent(content);
    document.updatedAt = new Date().toISOString();
    writeDocuments(documents);
    return res.json({ ...document, ownerName: findUser(document.ownerId).name, access: document.ownerId === userId ? "owned" : "shared" });
  });

  app.post("/api/documents/:id/share", (req, res) => {
    const { userId, recipientId } = req.body || {};
    if (!findUser(userId) || !findUser(recipientId)) return res.status(400).json({ error: "Choose valid users." });
    const documents = readDocuments();
    const document = documents.find((item) => item.id === req.params.id);
    if (!document) return res.status(404).json({ error: "Document not found." });
    if (document.ownerId !== userId) return res.status(403).json({ error: "Only the owner can manage sharing." });
    if (recipientId === userId) return res.status(400).json({ error: "You already own this document." });
    if (!document.sharedWith.some((share) => share.userId === recipientId)) {
      document.sharedWith.push({ userId: recipientId, role: "editor" });
      document.updatedAt = new Date().toISOString();
      writeDocuments(documents);
    }
    return res.json(document);
  });

  app.delete("/api/documents/:id/share/:recipientId", (req, res) => {
    const { userId } = req.body || {};
    const documents = readDocuments();
    const document = documents.find((item) => item.id === req.params.id);
    if (!document) return res.status(404).json({ error: "Document not found." });
    if (document.ownerId !== userId) return res.status(403).json({ error: "Only the owner can manage sharing." });
    document.sharedWith = document.sharedWith.filter((share) => share.userId !== req.params.recipientId);
    document.updatedAt = new Date().toISOString();
    writeDocuments(documents);
    return res.json(document);
  });

  app.delete("/api/documents/:id", (req, res) => {
    const { userId } = req.body || {};
    const documents = readDocuments();
    const index = documents.findIndex((item) => item.id === req.params.id);
    if (index < 0) return res.status(404).json({ error: "Document not found." });
    if (documents[index].ownerId !== userId) return res.status(403).json({ error: "Only the owner can delete this document." });
    documents.splice(index, 1);
    writeDocuments(documents);
    return res.status(204).end();
  });

  app.use(express.static(path.join(__dirname, "public")));
  return app;
}

if (require.main === module) {
  const port = Number(process.env.PORT) || 3000;
  createApp().listen(port, () => console.log(`Ajaia Docs is ready at http://localhost:${port}`));
}

module.exports = { createApp, sanitizeContent, USERS };
