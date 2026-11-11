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

  const historyResponse = await request(`/api/documents/${document.id}/versions?userId=morgan`);
  assert.equal(historyResponse.status, 200);
  const versions = await historyResponse.json();
  assert.equal(versions.length, 2);
  const earlierVersion = versions.find((version) => version.content.includes("Next steps"));
  assert.ok(earlierVersion);
  assert.equal(earlierVersion.userName, "Aria Chen");

  const restored = await request(`/api/documents/${document.id}/versions/${earlierVersion.id}/restore`, {
    method: "POST",
    body: JSON.stringify({ userId: "morgan" })
  });
  assert.equal(restored.status, 200);
  assert.equal((await restored.json()).content, "<h2>Next steps</h2><p>A clear plan.</p>");

  const reopen = await request(`/api/documents/${document.id}?userId=aria`);
  assert.match((await reopen.json()).content, /Next steps/);

  const updatedHistory = await request(`/api/documents/${document.id}/versions?userId=aria`);
  assert.equal((await updatedHistory.json()).length, 3);
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
  const privateHistory = await fetch(`${baseUrl}/api/documents/welcome/versions?userId=sam`);
  assert.equal(privateHistory.status, 404);
});

test("keeps only the 20 most recent document versions", async (t) => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "ajaia-docs-"));
  const server = createApp({ dataFile: path.join(directory, "documents.json") }).listen(0);
  t.after(() => {
    server.close();
    fs.rmSync(directory, { recursive: true, force: true });
  });
  await new Promise((resolve) => server.once("listening", resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  const create = await fetch(`${baseUrl}/api/documents`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ userId: "aria", title: "Version limit" })
  });
  const document = await create.json();

  for (let revision = 0; revision <= 21; revision += 1) {
    const response = await fetch(`${baseUrl}/api/documents/${document.id}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ userId: "aria", title: "Version limit", content: `<p>Revision ${revision}</p>` })
    });
    assert.equal(response.status, 200);
  }

  const historyResponse = await fetch(`${baseUrl}/api/documents/${document.id}/versions?userId=aria`);
  const versions = await historyResponse.json();
  assert.equal(versions.length, 20);
  assert.match(versions[0].content, /Revision 20/);
  assert.match(versions.at(-1).content, /Revision 1/);
});
