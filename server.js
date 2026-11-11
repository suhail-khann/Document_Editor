const fs = require("node:fs");
const path = require("node:path");
const express = require("express");
const createSanitizer = require("./sanitize-content");
const sanitizeHtml = createSanitizer(require("xss"));
const {
  createDocumentService,
  createInitialDocuments,
  sanitizeContent,
  ServiceError,
  USERS
} = require("./document-service");

function createFileRepository(dataFile) {
  fs.mkdirSync(path.dirname(dataFile), { recursive: true });

  if (!fs.existsSync(dataFile)) {
    fs.writeFileSync(dataFile, JSON.stringify(createInitialDocuments(), null, 2));
  }

  return {
    readDocuments: async () => JSON.parse(fs.readFileSync(dataFile, "utf8")),
    writeDocuments: async (documents) => {
      const temporaryFile = `${dataFile}.${process.pid}.tmp`;
      fs.writeFileSync(temporaryFile, JSON.stringify(documents, null, 2));
      fs.renameSync(temporaryFile, dataFile);
    }
  };
}

function createApp(options = {}) {
  const dataFile = options.dataFile || path.join(__dirname, "data", "documents.json");
  const repository = options.repository || createFileRepository(dataFile);
  const service = createDocumentService(repository, sanitizeHtml);
  const app = express();
  app.use(express.json({ limit: "6mb" }));

  app.get("/api/users", (_req, res) => res.json(USERS));
  app.get("/api/documents", async (req, res, next) => {
    try {
      return res.json(await service.list(req.query.userId));
    } catch (error) {
      return next(error);
    }
  });
  app.post("/api/documents", async (req, res, next) => {
    try {
      const { userId, title = "Untitled document" } = req.body || {};
      return res.status(201).json(await service.create(userId, title));
    } catch (error) {
      return next(error);
    }
  });
  app.get("/api/documents/:id/versions", async (req, res, next) => {
    try {
      return res.json(await service.versions(req.params.id, req.query.userId));
    } catch (error) {
      return next(error);
    }
  });
  app.post("/api/documents/:id/versions/:versionId/restore", async (req, res, next) => {
    try {
      const { userId } = req.body || {};
      return res.json(await service.restore(req.params.id, userId, req.params.versionId));
    } catch (error) {
      return next(error);
    }
  });
  app.get("/api/documents/:id", async (req, res, next) => {
    try {
      return res.json(await service.get(req.params.id, req.query.userId));
    } catch (error) {
      return next(error);
    }
  });
  app.put("/api/documents/:id", async (req, res, next) => {
    try {
      const { userId, title, content } = req.body || {};
      return res.json(await service.update(req.params.id, userId, title, content));
    } catch (error) {
      return next(error);
    }
  });
  app.post("/api/documents/:id/share", async (req, res, next) => {
    try {
      const { userId, recipientId } = req.body || {};
      return res.json(await service.share(req.params.id, userId, recipientId));
    } catch (error) {
      return next(error);
    }
  });
  app.delete("/api/documents/:id/share/:recipientId", async (req, res, next) => {
    try {
      const { userId } = req.body || {};
      return res.json(await service.revoke(req.params.id, userId, req.params.recipientId));
    } catch (error) {
      return next(error);
    }
  });
  app.delete("/api/documents/:id", async (req, res, next) => {
    try {
      const { userId } = req.body || {};
      await service.remove(req.params.id, userId);
      return res.status(204).end();
    } catch (error) {
      return next(error);
    }
  });

  app.use(express.static(path.join(__dirname, "public")));
  app.use((error, _req, res, _next) => {
    if (error instanceof ServiceError) return res.status(error.status).json({ error: error.message });
    console.error("Unhandled API error:", error);
    return res.status(500).json({ error: "The server could not complete the request." });
  });
  return app;
}

if (require.main === module) {
  const port = Number(process.env.PORT) || 3000;
  createApp().listen(port, () => console.log(`Ajaia Docs is ready at http://localhost:${port}`));
}

module.exports = { createApp, createFileRepository, sanitizeContent, ...require("./document-service") };
