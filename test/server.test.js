const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { createApp } = require("../server");

test("documents persist, sanitize edits, and enforce shared access", async (t) => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "ajaia-docs-"));
  const server = createApp({ dataFile: path.join(directory, "documents.json") }).listen(0);
  t.after(() => {
    server.close();
    fs.rmSync(directory, { recursive: true, force: true });
  });
  await new Promise((resolve) => server.once("listening", resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  const request = (url, options = {}) => fetch(`${baseUrl}${url}`, {
    ...options,
    headers: { "content-type": "application/json", ...options.headers }
  });

  const create = await request("/api/documents", {
    method: "POST",
    body: JSON.stringify({ userId: "aria", title: "Review notes" })
  });
  assert.equal(create.status, 201);
  const document = await create.json();

  const edit = await request(`/api/documents/${document.id}`, {
    method: "PUT",
    body: JSON.stringify({
      userId: "aria",
      title: "Review notes",
      content: "<h2>Next steps</h2><script>alert(1)</script><p onclick=\"alert(1)\">A clear plan.</p>"
    })
  });
  assert.equal(edit.status, 200);
  assert.equal((await edit.json()).content, "<h2>Next steps</h2><p>A clear plan.</p>");

  const share = await request(`/api/documents/${document.id}/share`, {
    method: "POST",
    body: JSON.stringify({ userId: "aria", recipientId: "morgan" })
  });
  assert.equal(share.status, 200);
  const sharedList = await request("/api/documents?userId=morgan");
  const sharedDocuments = await sharedList.json();
  assert.equal(sharedDocuments.find((item) => item.id === document.id).access, "shared");

  const collaboratorEdit = await request(`/api/documents/${document.id}`, {
    method: "PUT",
    body: JSON.stringify({ userId: "morgan", title: "Review notes", content: "<p>Saved together.</p>" })
  });
  assert.equal(collaboratorEdit.status, 200);
  const reopen = await request(`/api/documents/${document.id}?userId=aria`);
  assert.match((await reopen.json()).content, /Saved together/);
});

test("rejects unknown users and blocks access to private documents", async (t) => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "ajaia-docs-"));
  const server = createApp({ dataFile: path.join(directory, "documents.json") }).listen(0);
  t.after(() => {
    server.close();
    fs.rmSync(directory, { recursive: true, force: true });
  });
  await new Promise((resolve) => server.once("listening", resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  const invalid = await fetch(`${baseUrl}/api/documents?userId=unknown`);
  assert.equal(invalid.status, 400);
  const privateDocument = await fetch(`${baseUrl}/api/documents/welcome?userId=sam`);
  assert.equal(privateDocument.status, 404);
});
