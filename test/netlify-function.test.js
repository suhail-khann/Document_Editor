const assert = require("node:assert/strict");
const test = require("node:test");

test("Netlify function serves users and keeps document edits in its persistent store", async () => {
  const { createNetlifyHandler } = await import("../netlify/functions/api.mjs");
  let documents = null;
  const handler = createNetlifyHandler({
    getStore: () => ({
      async get(_key, options) {
        assert.equal(options.type, "json");
        return documents;
      },
      async setJSON(_key, value, options = {}) {
        if (options.onlyIfNew && documents) return { modified: false };
        documents = structuredClone(value);
        return { modified: true };
      }
    })
  });

  const users = await handler(new Request("https://example.netlify.app/api/users"));
  assert.equal(users.status, 200);
  assert.equal((await users.json()).length, 3);

  const list = await handler(new Request("https://example.netlify.app/api/documents?userId=aria"));
  assert.equal(list.status, 200);
  assert.equal((await list.json()).length, 2);

  const create = await handler(new Request("https://example.netlify.app/api/documents", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ userId: "aria", title: "Netlify draft" })
  }));
  assert.equal(create.status, 201);
  const document = await create.json();

  const update = await handler(new Request(`https://example.netlify.app/api/documents/${document.id}`, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ userId: "aria", title: "Netlify draft", content: "<p>Saved on Netlify.</p>" })
  }));
  assert.equal(update.status, 200);

  const reopen = await handler(new Request(`https://example.netlify.app/api/documents/${document.id}?userId=aria`));
  assert.equal((await reopen.json()).content, "<p>Saved on Netlify.</p>");
});

test("Netlify function reports invalid users and malformed JSON as client errors", async () => {
  const { createNetlifyHandler } = await import("../netlify/functions/api.mjs");
  const handler = createNetlifyHandler({
    getStore: () => ({
      async get() {
        return [];
      },
      async setJSON() {
        return { modified: true };
      }
    })
  });

  const invalidUser = await handler(new Request("https://example.netlify.app/api/documents?userId=unknown"));
  assert.equal(invalidUser.status, 400);

  const malformedJson = await handler(new Request("https://example.netlify.app/api/documents", {
    method: "POST",
    body: "{invalid"
  }));
  assert.equal(malformedJson.status, 400);
});
