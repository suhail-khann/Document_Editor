const state = {
  users: [],
  userId: localStorage.getItem("ajaia-user") || "aria",
  documents: [],
  activeId: null,
  filter: "all",
  saveTimer: null,
  toastTimer: null,
  saving: false
};

const el = (id) => document.getElementById(id);
const userById = (id) => state.users.find((user) => user.id === id);

async function api(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: { "content-type": "application/json", ...options.headers }
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || "Something went wrong. Please try again.");
  }
  if (response.status === 204) return null;
  return response.json();
}

function escapeHtml(text) {
  return text.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[character]);
}

function formatImportedText(text) {
  return `<p>${escapeHtml(text).replace(/\r?\n/g, "<br>")}</p>`;
}

function showToast(message) {
  const toast = el("toast");
  toast.textContent = message;
  toast.classList.add("visible");
  clearTimeout(state.toastTimer);
  state.toastTimer = setTimeout(() => toast.classList.remove("visible"), 2600);
}

function setSaveState(status, message) {
  const saveState = el("save-state");
  saveState.classList.toggle("saving", status === "saving");
  saveState.classList.toggle("error", status === "error");
  saveState.innerHTML = `<span class="save-dot"></span> ${message}`;
}

function activeDocument() {
  return state.documents.find((document) => document.id === state.activeId);
}

function visibleDocuments() {
  if (state.filter === "all") return state.documents;
  return state.documents.filter((document) => document.access === state.filter);
}

function renderDocuments() {
  const list = el("document-list");
  const documents = visibleDocuments();
  list.replaceChildren();
  if (!documents.length) {
    const empty = document.createElement("div");
    empty.className = "empty-list";
    empty.textContent = state.filter === "shared" ? "No shared documents yet." : "A good idea has to start somewhere.";
    list.append(empty);
  }
  documents.forEach((item) => {
    const row = document.createElement("button");
    row.type = "button";
    row.className = `document-item${item.id === state.activeId ? " active" : ""}`;
    row.innerHTML = `<span class="doc-icon">▤</span><span class="doc-name"></span>${item.access === "shared" ? '<span class="doc-shared" title="Shared with you">↗</span>' : ""}`;
    row.querySelector(".doc-name").textContent = item.title;
    row.title = item.title;
    row.addEventListener("click", () => openDocument(item.id));
    list.append(row);
  });
}

function renderProfile() {
  const currentUser = userById(state.userId);
  el("profile-avatar").textContent = currentUser.initials;
  el("profile-avatar").style.background = `${currentUser.color}20`;
  el("profile-avatar").style.color = currentUser.color;
  el("top-avatar").textContent = currentUser.initials;
  el("top-avatar").style.background = `${currentUser.color}20`;
  el("top-avatar").style.color = currentUser.color;
  el("profile-name").textContent = currentUser.name;
  const menu = el("account-menu");
  menu.replaceChildren();
  state.users.forEach((user) => {
    const option = document.createElement("button");
    option.type = "button";
    option.className = "account-option";
    option.innerHTML = `<span class="avatar" style="background:${user.color}20;color:${user.color}">${user.initials}</span><span><strong></strong><small></small></span>`;
    option.querySelector("strong").textContent = user.name;
    option.querySelector("small").textContent = user.email;
    option.addEventListener("click", async () => {
      state.userId = user.id;
      localStorage.setItem("ajaia-user", user.id);
      state.activeId = null;
      menu.classList.add("hidden");
      renderProfile();
      await loadDocuments();
    });
    menu.append(option);
  });
}

function updateWordCount() {
  const text = el("content-editor").innerText.trim();
  el("word-count").textContent = text ? text.split(/\s+/).length : 0;
}

function renderActiveDocument() {
  const item = activeDocument();
  el("welcome-state").classList.toggle("hidden", Boolean(item));
  el("editor").classList.toggle("hidden", !item);
  el("share-button").disabled = !item || item.ownerId !== state.userId;
  el("history-button").disabled = !item;
  if (!item) {
    el("breadcrumb-title").textContent = state.filter === "all" ? "All documents" : state.filter === "owned" ? "My documents" : "Shared with me";
    renderDocuments();
    return;
  }
  el("breadcrumb-title").textContent = item.title;
  el("title-input").value = item.title;
  el("document-badge").textContent = item.access === "owned" ? "OWNED" : "SHARED WITH YOU";
  el("document-badge").classList.toggle("shared", item.access === "shared");
  el("document-owner").textContent = item.access === "shared" ? `by ${item.ownerName}` : "";
  el("content-editor").innerHTML = item.content;
  el("save-state").classList.remove("error", "saving");
  el("save-state").innerHTML = '<span class="save-dot"></span> All changes saved';
  updateWordCount();
  renderDocuments();
}

async function loadDocuments() {
  try {
    state.documents = await api(`/api/documents?userId=${encodeURIComponent(state.userId)}`);
    if (!state.documents.some((item) => item.id === state.activeId)) {
      state.activeId = state.documents[0]?.id || null;
    }
    renderActiveDocument();
  } catch (error) {
    showToast(error.message);
  }
}

async function openDocument(id) {
  state.activeId = id;
  renderActiveDocument();
  try {
    const document = await api(`/api/documents/${encodeURIComponent(id)}?userId=${encodeURIComponent(state.userId)}`);
    state.documents = state.documents.map((item) => item.id === id ? document : item);
    renderActiveDocument();
  } catch (error) {
    showToast(error.message);
  }
}

async function createDocument(title = "Untitled document", content = "<p><br></p>") {
  try {
    const created = await api("/api/documents", {
      method: "POST",
      body: JSON.stringify({ userId: state.userId, title })
    });
    state.documents.unshift(created);
    state.filter = "all";
    document.querySelectorAll(".nav-item").forEach((button) => button.classList.toggle("active", button.dataset.filter === "all"));
    state.activeId = created.id;
    renderActiveDocument();
    if (content !== "<p><br></p>") {
      el("content-editor").innerHTML = content;
      queueSave();
    }
    el("title-input").focus();
    el("title-input").select();
  } catch (error) {
    showToast(error.message);
  }
}

function queueSave() {
  if (!activeDocument()) return;
  const documentId = state.activeId;
  const userId = state.userId;
  const title = el("title-input").value;
  const content = el("content-editor").innerHTML;
  updateWordCount();
  setSaveState("saving", "Saving…");
  clearTimeout(state.saveTimer);
  state.saveTimer = setTimeout(() => saveDocument(documentId, userId, title, content), 550);
}

async function saveDocument(documentId, userId, title, content) {
  const item = state.documents.find((document) => document.id === documentId);
  if (!item) return;
  const trimmedTitle = title.trim();
  if (!trimmedTitle) {
    if (state.activeId === documentId) setSaveState("error", "Add a title to save");
    return;
  }
  try {
    const saved = await api(`/api/documents/${encodeURIComponent(item.id)}`, {
      method: "PUT",
      body: JSON.stringify({ userId, title: trimmedTitle, content })
    });
    state.documents = state.documents.map((document) => document.id === saved.id ? saved : document);
    if (state.activeId === saved.id) {
      el("breadcrumb-title").textContent = saved.title;
      setSaveState("saved", "All changes saved");
    }
    renderDocuments();
  } catch (error) {
    if (state.activeId === documentId) setSaveState("error", "Couldn't save");
    showToast(error.message);
  }
}

async function openShareDialog() {
  const item = activeDocument();
  if (!item || item.ownerId !== state.userId) return;
  el("share-feedback").textContent = "";
  renderShareDialog(item);
  el("share-dialog").showModal();
}

async function openHistoryDialog() {
  const item = activeDocument();
  if (!item) return;
  el("history-feedback").textContent = "";
  el("version-list").replaceChildren();
  el("version-list").textContent = "Loading saved versions…";
  el("history-dialog").showModal();
  try {
    const versions = await api(`/api/documents/${encodeURIComponent(item.id)}/versions?userId=${encodeURIComponent(state.userId)}`);
    renderHistory(versions, item.id);
  } catch (error) {
    el("version-list").replaceChildren();
    el("history-feedback").textContent = error.message;
  }
}

function renderHistory(versions, documentId) {
  const list = el("version-list");
  list.replaceChildren();
  if (!versions.length) {
    const empty = document.createElement("p");
    empty.className = "history-empty";
    empty.textContent = "Your next edit will create the first saved version.";
    list.append(empty);
    return;
  }
  versions.forEach((version) => {
    const row = document.createElement("article");
    row.className = "version-card";
    const details = document.createElement("div");
    details.className = "version-details";
    const title = document.createElement("strong");
    title.className = "version-title";
    title.textContent = version.title;
    const byline = document.createElement("small");
    byline.textContent = `${version.userName} · ${new Date(version.createdAt).toLocaleString()}`;
    const preview = document.createElement("p");
    preview.className = "version-preview";
    preview.textContent = version.content.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim() || "An empty draft";
    details.append(title, byline, preview);
    const restore = document.createElement("button");
    restore.type = "button";
    restore.className = "restore-button";
    restore.textContent = "Restore";
    restore.addEventListener("click", async () => {
      restore.disabled = true;
      try {
        const restored = await api(`/api/documents/${encodeURIComponent(documentId)}/versions/${encodeURIComponent(version.id)}/restore`, {
          method: "POST",
          body: JSON.stringify({ userId: state.userId })
        });
        state.documents = state.documents.map((item) => item.id === restored.id ? restored : item);
        renderActiveDocument();
        el("history-dialog").close();
        showToast("Version restored. Your previous draft is in history.");
      } catch (error) {
        restore.disabled = false;
        el("history-feedback").textContent = error.message;
      }
    });
    row.append(details, restore);
    list.append(row);
  });
}

function renderShareDialog(item) {
  const existing = el("share-existing");
  existing.replaceChildren();
  if (!item.sharedWith.length) {
    const note = document.createElement("p");
    note.className = "modal-description";
    note.textContent = "No teammates have access yet.";
    existing.append(note);
  }
  item.sharedWith.forEach((share) => {
    const user = userById(share.userId);
    if (!user) return;
    const row = document.createElement("div");
    row.className = "share-person";
    row.innerHTML = `<span class="avatar" style="background:${user.color}20;color:${user.color}">${user.initials}</span><span></span><small>Can edit</small><button class="remove-share" type="button">Remove</button>`;
    row.querySelector("span:nth-child(2)").textContent = user.name;
    row.querySelector(".remove-share").addEventListener("click", async () => {
      try {
        await api(`/api/documents/${encodeURIComponent(item.id)}/share/${encodeURIComponent(user.id)}`, {
          method: "DELETE", body: JSON.stringify({ userId: state.userId })
        });
        const updated = await api(`/api/documents/${encodeURIComponent(item.id)}?userId=${encodeURIComponent(state.userId)}`);
        state.documents = state.documents.map((doc) => doc.id === item.id ? updated : doc);
        renderShareDialog(updated);
        await loadDocuments();
        el("share-dialog").showModal();
      } catch (error) {
        el("share-feedback").textContent = error.message;
      }
    });
    existing.append(row);
  });

  const recipient = el("recipient-select");
  recipient.replaceChildren();
  state.users.filter((user) => user.id !== state.userId && !item.sharedWith.some((share) => share.userId === user.id))
    .forEach((user) => {
      const option = document.createElement("option");
      option.value = user.id;
      option.textContent = `${user.name} · ${user.email}`;
      recipient.append(option);
    });
  el("invite-button").disabled = !recipient.options.length;
  el("invite-button").textContent = recipient.options.length ? "Invite" : "Everyone invited";
}

async function importFile(file) {
  if (!file) return;
  const extension = file.name.split(".").pop().toLowerCase();
  if (!["txt", "md"].includes(extension) || file.size > 1_000_000) {
    showToast("Choose a .txt or .md file under 1 MB.");
    el("file-input").value = "";
    return;
  }
  try {
    const content = formatImportedText(await file.text());
    const title = file.name.replace(/\.(txt|md)$/i, "").slice(0, 120) || "Imported document";
    await createDocument(title, content);
    showToast("File imported as a new document.");
  } catch (error) {
    showToast(error.message);
  } finally {
    el("file-input").value = "";
  }
}

function initialize() {
  el("user-switcher").addEventListener("click", () => el("account-menu").classList.toggle("hidden"));
  document.addEventListener("click", (event) => {
    if (!event.target.closest("#user-switcher") && !event.target.closest("#account-menu")) el("account-menu").classList.add("hidden");
  });
  document.querySelectorAll(".nav-item").forEach((button) => button.addEventListener("click", () => {
    state.filter = button.dataset.filter;
    document.querySelectorAll(".nav-item").forEach((item) => item.classList.toggle("active", item === button));
    const first = visibleDocuments()[0];
    state.activeId = first?.id || null;
    renderActiveDocument();
  }));
  el("new-document").addEventListener("click", () => createDocument());
  el("welcome-new").addEventListener("click", () => createDocument());
  el("file-input").addEventListener("change", (event) => importFile(event.target.files[0]));
  el("title-input").addEventListener("input", queueSave);
  el("content-editor").addEventListener("input", queueSave);
  el("content-editor").addEventListener("keyup", updateWordCount);
  el("share-button").addEventListener("click", openShareDialog);
  el("history-button").addEventListener("click", openHistoryDialog);
  el("invite-button").addEventListener("click", async () => {
    const item = activeDocument();
    const recipientId = el("recipient-select").value;
    if (!item || !recipientId) return;
    try {
      await api(`/api/documents/${encodeURIComponent(item.id)}/share`, {
        method: "POST",
        body: JSON.stringify({ userId: state.userId, recipientId })
      });
      const updated = await api(`/api/documents/${encodeURIComponent(item.id)}?userId=${encodeURIComponent(state.userId)}`);
      state.documents = state.documents.map((doc) => doc.id === item.id ? updated : doc);
      renderShareDialog(updated);
      el("share-feedback").textContent = "Invite sent — your teammate can edit this document.";
      await loadDocuments();
      el("share-dialog").showModal();
    } catch (error) {
      el("share-feedback").textContent = error.message;
    }
  });
  document.querySelectorAll(".toolbar [data-command]").forEach((button) => button.addEventListener("mousedown", (event) => event.preventDefault()));
  document.querySelectorAll(".toolbar [data-command]").forEach((button) => button.addEventListener("click", () => {
    el("content-editor").focus();
    document.execCommand(button.dataset.command, false, button.dataset.value || null);
    queueSave();
  }));
  el("format-select").addEventListener("change", (event) => {
    el("content-editor").focus();
    document.execCommand("formatBlock", false, event.target.value);
    queueSave();
  });

  api("/api/users").then(async (users) => {
    state.users = users;
    if (!userById(state.userId)) state.userId = "aria";
    renderProfile();
    await loadDocuments();
  }).catch((error) => showToast(error.message));
}

initialize();
