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

  const share = await handler(new Request(`https://example.netlify.app/api/documents/${document.id}/share`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ userId: "aria", recipientId: "morgan" })
  }));
  assert.equal(share.status, 200);

  const sharedList = await handler(new Request("https://example.netlify.app/api/documents?userId=morgan"));
  const sharedDocuments = await sharedList.json();
  assert.equal(sharedDocuments.find((item) => item.id === document.id).access, "shared");

  const sharedUpdate = await handler(new Request(`https://example.netlify.app/api/documents/${document.id}`, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ userId: "morgan", title: "Netlify draft", content: "<p>Shared edit.</p>" })
  }));
  assert.equal(sharedUpdate.status, 200);

  const versionsResponse = await handler(new Request(
    `https://example.netlify.app/api/documents/${document.id}/versions?userId=morgan`
  ));
  assert.equal(versionsResponse.status, 200);
  const versions = await versionsResponse.json();
  const savedVersion = versions.find((version) => version.content === "<p>Saved on Netlify.</p>");
  assert.ok(savedVersion);

  const restore = await handler(new Request(
    `https://example.netlify.app/api/documents/${document.id}/versions/${savedVersion.id}/restore`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ userId: "morgan" })
    }
  ));
  assert.equal(restore.status, 200);
  assert.equal((await restore.json()).content, "<p>Saved on Netlify.</p>");

  const revoke = await handler(new Request(
    `https://example.netlify.app/api/documents/${document.id}/share/morgan`,
    {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ userId: "aria" })
    }
  ));
  assert.equal(revoke.status, 200);

  const revokedList = await handler(new Request("https://example.netlify.app/api/documents?userId=morgan"));
  assert.equal((await revokedList.json()).some((item) => item.id === document.id), false);
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
