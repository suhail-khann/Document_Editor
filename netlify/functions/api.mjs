import { getStore } from "@netlify/blobs";
import documentServiceModule from "../../document-service.js";
import sanitizeHtml from "../../sanitize-content.js";

const { createDocumentService, createInitialDocuments, ServiceError, USERS } = documentServiceModule;
const STORE_NAME = "ajaia-documents";
const STORE_KEY = "documents";

function createBlobRepository(store) {
  return {
    async readDocuments() {
      const documents = await store.get(STORE_KEY, { type: "json" });
      if (Array.isArray(documents)) return documents;

      const initialDocuments = createInitialDocuments();
      await store.setJSON(STORE_KEY, initialDocuments, { onlyIfNew: true });
      const initializedDocuments = await store.get(STORE_KEY, { type: "json" });
      if (!Array.isArray(initializedDocuments)) {
        throw new Error("Netlify Blobs did not return the initialized document store.");
      }
      return initializedDocuments;
    },
    async writeDocuments(documents) {
      await store.setJSON(STORE_KEY, documents);
    }
  };
}

function jsonResponse(status, value) {
  return new Response(status === 204 ? null : JSON.stringify(value), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store"
    }
  });
}

async function requestBody(request) {
  const text = await request.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    throw new ServiceError(400, "Request body must be valid JSON.");
  }
}

export function createNetlifyHandler(options = {}) {
  const resolveStore = options.getStore || (() => getStore(STORE_NAME));

  return async function handler(request) {
    try {
      const url = new URL(request.url);
      const segments = url.pathname.split("/").filter(Boolean).map(decodeURIComponent);
      const method = request.method.toUpperCase();
      if (segments.length === 2 && segments[0] === "api" && segments[1] === "users" && method === "GET") {
        return jsonResponse(200, USERS);
      }
      if (segments[0] !== "api" || segments[1] !== "documents") {
        return jsonResponse(404, { error: "API route not found." });
      }

      const service = createDocumentService(createBlobRepository(resolveStore()), sanitizeHtml);
      const body = method === "GET" ? {} : await requestBody(request);

      if (segments.length === 2 && method === "GET") {
        return jsonResponse(200, await service.list(url.searchParams.get("userId")));
      }
      if (segments.length === 2 && method === "POST") {
        return jsonResponse(201, await service.create(body.userId, body.title));
      }
      if (segments.length === 4 && segments[2] === "versions" && method === "GET") {
        return jsonResponse(200, await service.versions(segments[1], url.searchParams.get("userId")));
      }
      if (segments.length === 6 && segments[2] === "versions" && segments[5] === "restore" && method === "POST") {
        return jsonResponse(200, await service.restore(segments[1], body.userId, segments[4]));
      }
      if (segments.length === 4 && segments[2] === "share" && method === "POST") {
        return jsonResponse(200, await service.share(segments[1], body.userId, body.recipientId));
      }
      if (segments.length === 5 && segments[2] === "share" && method === "DELETE") {
        return jsonResponse(200, await service.revoke(segments[1], body.userId, segments[4]));
      }
      if (segments.length === 3 && method === "GET") {
        return jsonResponse(200, await service.get(segments[2], url.searchParams.get("userId")));
      }
      if (segments.length === 3 && method === "PUT") {
        return jsonResponse(200, await service.update(segments[2], body.userId, body.title, body.content));
      }
      if (segments.length === 3 && method === "DELETE") {
        await service.remove(segments[2], body.userId);
        return jsonResponse(204);
      }
      return jsonResponse(404, { error: "API route not found." });
    } catch (error) {
      if (error instanceof ServiceError) return jsonResponse(error.status, { error: error.message });
      console.error("Netlify API function failed:", error);
      return jsonResponse(500, { error: "The server could not complete the request." });
    }
  };
}

export const config = { path: "/api/*" };
export default createNetlifyHandler();
