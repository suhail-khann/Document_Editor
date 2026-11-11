const crypto = require("node:crypto");
const sanitizeHtml = require("sanitize-html");

const USERS = [
  { id: "aria", name: "Aria Chen", email: "aria@ajaia.test", initials: "AC", color: "#b25a3c" },
  { id: "morgan", name: "Morgan Lee", email: "morgan@ajaia.test", initials: "ML", color: "#52716a" },
  { id: "sam", name: "Sam Rivera", email: "sam@ajaia.test", initials: "SR", color: "#7963a7" }
];
const MAX_VERSIONS = 20;

function createInitialDocuments() {
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
}

function sanitizeContent(content) {
  return sanitizeHtml(content, {
    allowedTags: ["p", "br", "div", "strong", "b", "em", "i", "u", "h1", "h2", "h3", "ul", "ol", "li", "blockquote"],
    allowedAttributes: {},
    disallowedTagsMode: "discard"
  });
}

class ServiceError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function createDocumentService(repository) {
  const findUser = (id) => USERS.find((user) => user.id === id);
  const requireUser = (id, message = "Choose a valid user.") => {
    const user = findUser(id);
    if (!user) throw new ServiceError(400, message);
    return user;
  };
  const getDocument = async (id) => (await repository.readDocuments()).find((item) => item.id === id);
  const hasAccess = (document, userId) =>
    document.ownerId === userId || document.sharedWith.some((share) => share.userId === userId);
  const requireDocumentAccess = async (id, userId) => {
    const document = await getDocument(id);
    if (!document || !hasAccess(document, userId)) throw new ServiceError(404, "Document not found.");
    return document;
  };
  const toResponse = (document, userId) => ({
    ...document,
    ownerName: findUser(document.ownerId)?.name || "Former collaborator",
    access: document.ownerId === userId ? "owned" : "shared"
  });
  const recordVersion = (document, createdAt) => {
    const versions = Array.isArray(document.versions) ? document.versions : [];
    versions.push({
      id: crypto.randomUUID(),
      title: document.title,
      content: document.content,
      userId: document.updatedBy || document.ownerId,
      createdAt
    });
    document.versions = versions.slice(-MAX_VERSIONS);
  };

  return {
    list: async (userId) => {
      requireUser(userId);
      return (await repository.readDocuments())
        .filter((document) => hasAccess(document, userId))
        .map((document) => toResponse(document, userId))
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    },

    get: async (id, userId) => {
      requireUser(userId);
      return toResponse(await requireDocumentAccess(id, userId), userId);
    },

    create: async (userId, title = "Untitled document") => {
      requireUser(userId);
      if (typeof title !== "string" || !title.trim() || title.trim().length > 120) {
        throw new ServiceError(400, "Title must be between 1 and 120 characters.");
      }
      const now = new Date().toISOString();
      const document = {
        id: crypto.randomUUID(),
        title: title.trim(),
        content: "<p><br></p>",
        ownerId: userId,
        updatedBy: userId,
        sharedWith: [],
        versions: [],
        createdAt: now,
        updatedAt: now
      };
      const documents = await repository.readDocuments();
      documents.push(document);
      await repository.writeDocuments(documents);
      return toResponse(document, userId);
    },

    update: async (id, userId, title, content) => {
      requireUser(userId);
      const documents = await repository.readDocuments();
      const document = documents.find((item) => item.id === id);
      if (!document || !hasAccess(document, userId)) throw new ServiceError(404, "Document not found.");
      if (typeof title !== "string" || !title.trim() || title.trim().length > 120) {
        throw new ServiceError(400, "Title must be between 1 and 120 characters.");
      }
      if (typeof content !== "string" || content.length > 5_500_000) {
        throw new ServiceError(400, "Document content must be under 5.5 MB.");
      }
      const nextTitle = title.trim();
      const nextContent = sanitizeContent(content);
      const now = new Date().toISOString();
      if (document.title !== nextTitle || document.content !== nextContent) {
        recordVersion(document, now);
        document.title = nextTitle;
        document.content = nextContent;
        document.updatedBy = userId;
        document.updatedAt = now;
      }
      await repository.writeDocuments(documents);
      return toResponse(document, userId);
    },

    share: async (id, userId, recipientId) => {
      requireUser(userId, "Choose valid users.");
      requireUser(recipientId, "Choose valid users.");
      const documents = await repository.readDocuments();
      const document = documents.find((item) => item.id === id);
      if (!document) throw new ServiceError(404, "Document not found.");
      if (document.ownerId !== userId) throw new ServiceError(403, "Only the owner can manage sharing.");
      if (recipientId === userId) throw new ServiceError(400, "You already own this document.");
      if (!document.sharedWith.some((share) => share.userId === recipientId)) {
        document.sharedWith.push({ userId: recipientId, role: "editor" });
        document.updatedAt = new Date().toISOString();
        await repository.writeDocuments(documents);
      }
      return toResponse(document, userId);
    },

    revoke: async (id, userId, recipientId) => {
      requireUser(userId);
      const documents = await repository.readDocuments();
      const document = documents.find((item) => item.id === id);
      if (!document) throw new ServiceError(404, "Document not found.");
      if (document.ownerId !== userId) throw new ServiceError(403, "Only the owner can manage sharing.");
      document.sharedWith = document.sharedWith.filter((share) => share.userId !== recipientId);
      document.updatedAt = new Date().toISOString();
      await repository.writeDocuments(documents);
      return toResponse(document, userId);
    },

    remove: async (id, userId) => {
      requireUser(userId);
      const documents = await repository.readDocuments();
      const index = documents.findIndex((item) => item.id === id);
      if (index < 0) throw new ServiceError(404, "Document not found.");
      if (documents[index].ownerId !== userId) throw new ServiceError(403, "Only the owner can delete this document.");
      documents.splice(index, 1);
      await repository.writeDocuments(documents);
    },

    versions: async (id, userId) => {
      requireUser(userId);
      const document = await requireDocumentAccess(id, userId);
      return (Array.isArray(document.versions) ? document.versions : [])
        .slice()
        .reverse()
        .map((version) => ({ ...version, userName: findUser(version.userId)?.name || "Former collaborator" }));
    },

    restore: async (id, userId, versionId) => {
      requireUser(userId);
      const documents = await repository.readDocuments();
      const document = documents.find((item) => item.id === id);
      if (!document || !hasAccess(document, userId)) throw new ServiceError(404, "Document not found.");
      const version = (Array.isArray(document.versions) ? document.versions : [])
        .find((item) => item.id === versionId);
      if (!version) throw new ServiceError(404, "Document version not found.");
      const now = new Date().toISOString();
      recordVersion(document, now);
      document.title = version.title;
      document.content = sanitizeContent(version.content);
      document.updatedBy = userId;
      document.updatedAt = now;
      await repository.writeDocuments(documents);
      return toResponse(document, userId);
    }
  };
}

module.exports = { createDocumentService, createInitialDocuments, sanitizeContent, ServiceError, USERS };
