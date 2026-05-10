const tokenKey = "vaultdrop_token";
const dbKey = "vaultdrop_static_db";

const loginForm = document.getElementById("login-form");
const registerForm = document.getElementById("register-form");
const folderForm = document.getElementById("folder-form");
const uploadForm = document.getElementById("upload-form");
const fileInput = document.getElementById("file-input");
const folderNameInput = document.getElementById("folder-name-input");
const folderParentSelect = document.getElementById("folder-parent-select");
const uploadFolderSelect = document.getElementById("upload-folder-select");
const dropZone = document.getElementById("drop-zone");
const pendingFilesContainer = document.getElementById("pending-files");
const authMessage = document.getElementById("auth-message");
const fileMessage = document.getElementById("file-message");
const fileList = document.getElementById("file-list");
const folderGrid = document.getElementById("folder-grid");
const authPage = document.getElementById("auth-page");
const appPage = document.getElementById("app-page");
const welcomeTitle = document.getElementById("welcome-title");
const topbarUsername = document.getElementById("topbar-username");
const profileName = document.getElementById("profile-name");
const profileEmail = document.getElementById("profile-email");
const profileAvatar = document.getElementById("profile-avatar");
const storageUsed = document.getElementById("storage-used");
const storageBreakdown = document.getElementById("storage-breakdown");
const favoriteCount = document.getElementById("favorite-count");
const highlightBreakdown = document.getElementById("highlight-breakdown");
const detailName = document.getElementById("detail-name");
const detailEmail = document.getElementById("detail-email");
const detailJoined = document.getElementById("detail-joined");
const detailLastActivity = document.getElementById("detail-last-activity");
const detailTheme = document.getElementById("detail-theme");
const detailFolderView = document.getElementById("detail-folder-view");
const detailActiveFiles = document.getElementById("detail-active-files");
const detailTrashCount = document.getElementById("detail-trash-count");
const searchInput = document.getElementById("search-input");
const sortSelect = document.getElementById("sort-select");
const typeFilter = document.getElementById("type-filter");
const folderViewSelect = document.getElementById("folder-view-select");
const themeSelect = document.getElementById("theme-select");
const favoritesOnlyToggle = document.getElementById("favorites-only-toggle");
const trashToggle = document.getElementById("trash-toggle");
const previewModal = document.getElementById("preview-modal");
const previewTitle = document.getElementById("preview-title");
const previewContent = document.getElementById("preview-content");

const state = {
  search: "",
  sort: "recent",
  type: "all",
  folderView: "",
  favoritesOnly: false,
  showTrash: false,
  pendingFiles: []
};

let libraryState = {
  folders: [],
  files: [],
  activity: [],
  preferences: {
    theme: "obsidian"
  }
};

function getToken() {
  return localStorage.getItem(tokenKey);
}

function setToken(token) {
  localStorage.setItem(tokenKey, token);
}

function clearToken() {
  localStorage.removeItem(tokenKey);
}

function readDb() {
  const raw = localStorage.getItem(dbKey);

  if (!raw) {
    return { users: [] };
  }

  try {
    const parsed = JSON.parse(raw);
    return {
      users: Array.isArray(parsed.users) ? parsed.users : []
    };
  } catch (error) {
    return { users: [] };
  }
}

function writeDb(db) {
  localStorage.setItem(dbKey, JSON.stringify(db));
}

function normalizeUser(user) {
  return {
    ...user,
    folders: Array.isArray(user.folders) ? user.folders : [],
    files: Array.isArray(user.files) ? user.files : [],
    activity: Array.isArray(user.activity) ? user.activity : [],
    createdAt: user.createdAt || null,
    preferences: {
      theme: user.preferences?.theme || "obsidian"
    }
  };
}

function getCurrentUser() {
  const userId = getToken();

  if (!userId) {
    return null;
  }

  const db = readDb();
  const found = db.users.find((user) => user.id === userId);
  return found ? normalizeUser(found) : null;
}

function saveCurrentUser(updatedUser) {
  const db = readDb();
  const normalized = normalizeUser(updatedUser);
  db.users = db.users.map((user) => (user.id === normalized.id ? normalized : user));
  writeDb(db);
}

function setMessage(element, text, isError = false) {
  element.textContent = text;
  element.style.color = isError ? "#ff8f8f" : "";
}

function setTopbarUsername(name) {
  topbarUsername.textContent = name || "Guest";
}

function switchAuthMode(mode) {
  const showLogin = mode === "login";
  document.getElementById("show-login").classList.toggle("active", showLogin);
  document.getElementById("show-register").classList.toggle("active", !showLogin);
  loginForm.classList.toggle("hidden", !showLogin);
  registerForm.classList.toggle("hidden", showLogin);
  setMessage(authMessage, "");
}

function showAuthPage() {
  authPage.classList.remove("hidden");
  appPage.classList.add("hidden");
}

function showAppPage() {
  authPage.classList.add("hidden");
  appPage.classList.remove("hidden");
}

function applyTheme(theme) {
  document.body.setAttribute("data-theme", theme || "obsidian");
  themeSelect.value = theme || "obsidian";
}

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function formatRelativeDate(dateValue) {
  if (!dateValue) {
    return "No activity yet";
  }

  const diffMs = Date.now() - new Date(dateValue).getTime();
  const diffMinutes = Math.floor(diffMs / 60000);

  if (diffMinutes < 1) return "just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

function formatCalendarDate(dateValue) {
  if (!dateValue) {
    return "-";
  }

  return new Date(dateValue).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric"
  });
}

function getThemeLabel(theme) {
  const labels = {
    obsidian: "Obsidian Gold",
    champagne: "Champagne Luxe",
    emerald: "Emerald Night"
  };

  return labels[theme] || "Obsidian Gold";
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function createActivity(user, type, message) {
  user.activity.unshift({
    id: crypto.randomUUID(),
    type,
    message,
    createdAt: new Date().toISOString()
  });
  user.activity = user.activity.slice(0, 20);
}

function getFolderChain(folderId) {
  const chain = [];
  let currentId = folderId;

  while (currentId) {
    const folder = libraryState.folders.find((entry) => entry.id === currentId);

    if (!folder) {
      break;
    }

    chain.unshift(folder);
    currentId = folder.parentId;
  }

  return chain;
}

function getFolderPath(folderId) {
  return getFolderChain(folderId)
    .map((entry) => entry.name)
    .join(" / ");
}

function getFolderLabel(folder) {
  return getFolderPath(folder.id) || folder.name;
}

function getFileType(file) {
  const mime = file.mimeType || "";
  const name = file.fileName.toLowerCase();

  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("video/")) return "video";
  if (mime === "application/pdf" || name.endsWith(".pdf")) return "pdf";
  if (mime.startsWith("text/") || /\.(txt|md|json|csv|log|js|ts|css|html)$/i.test(name)) return "text";
  if (/\.(zip|rar|7z|tar|gz)$/i.test(name)) return "archive";
  return "other";
}

function matchFile(file) {
  if (state.showTrash) {
    if (!file.deletedAt) return false;
  } else if (file.deletedAt) {
    return false;
  }

  if (state.favoritesOnly && !file.favorite) {
    return false;
  }

  if (state.folderView && file.folderId !== state.folderView) {
    return false;
  }

  if (state.type !== "all" && getFileType(file) !== state.type) {
    return false;
  }

  if (!state.search) {
    return true;
  }

  const query = state.search.toLowerCase();
  return `${file.fileName} ${getFolderPath(file.folderId)}`.toLowerCase().includes(query);
}

function sortFiles(files) {
  const cloned = [...files];

  switch (state.sort) {
    case "oldest":
      cloned.sort((a, b) => new Date(a.uploadedAt) - new Date(b.uploadedAt));
      break;
    case "name":
      cloned.sort((a, b) => a.fileName.localeCompare(b.fileName));
      break;
    case "size-desc":
      cloned.sort((a, b) => b.size - a.size);
      break;
    case "size-asc":
      cloned.sort((a, b) => a.size - b.size);
      break;
    default:
      cloned.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));
  }

  return cloned;
}

function renderFolderOptions() {
  const folders = libraryState.folders
    .slice()
    .sort((a, b) => getFolderLabel(a).localeCompare(getFolderLabel(b)));

  const options = folders
    .map((folder) => `<option value="${folder.id}">${escapeHtml(getFolderLabel(folder))}</option>`)
    .join("");

  folderParentSelect.innerHTML = `<option value="">Create at root level</option>${options}`;
  uploadFolderSelect.innerHTML = `<option value="">Upload to root level</option>${options}`;
  folderViewSelect.innerHTML = `<option value="">All folders</option>${options}`;
  folderViewSelect.value = state.folderView;
}

function renderPendingFiles() {
  if (!state.pendingFiles.length) {
    pendingFilesContainer.innerHTML = '<p class="file-meta">No files queued yet.</p>';
    return;
  }

  pendingFilesContainer.innerHTML = state.pendingFiles
    .map(
      (file) => `
        <div class="pending-item">
          <span>${escapeHtml(file.name)}</span>
          <small>${formatSize(file.size)}</small>
        </div>
      `
    )
    .join("");
}

function renderFolders() {
  const folders = libraryState.folders.filter((folder) => {
    if (!state.search) {
      return true;
    }
    return getFolderLabel(folder).toLowerCase().includes(state.search.toLowerCase());
  });

  if (!folders.length) {
    folderGrid.innerHTML = '<p class="file-meta">No folders match the current view.</p>';
    return;
  }

  folderGrid.innerHTML = folders
    .map((folder) => {
      const fileCount = libraryState.files.filter((file) => file.folderId === folder.id && !file.deletedAt).length;
      return `
        <article class="folder-card">
          <div class="folder-top">
            <div class="folder-icon">FD</div>
            <div>
              <p class="folder-title">${escapeHtml(folder.name)}</p>
              <p class="file-meta">${escapeHtml(getFolderLabel(folder))}</p>
            </div>
          </div>
          <div class="folder-summary">
            <span class="folder-chip">${fileCount} files</span>
          </div>
          <div class="folder-actions">
            <button class="ghost-btn" type="button" data-folder-action="focus" data-folder-id="${folder.id}">Open view</button>
          </div>
        </article>
      `;
    })
    .join("");
}

function renderFiles() {
  const files = sortFiles(libraryState.files.filter(matchFile));

  if (!files.length) {
    fileList.innerHTML = '<p class="file-meta">No files match the current filters.</p>';
    return;
  }

  fileList.innerHTML = files
    .map((file) => {
      const folderPath = getFolderPath(file.folderId) || "Root";

      return `
        <article class="file-row ${file.favorite ? "favorite-file" : ""}">
          <div class="file-main">
            <div class="file-heading">
              <p class="file-name">${escapeHtml(file.fileName)}</p>
              <div class="file-badges">
                <span class="folder-chip">${escapeHtml(getFileType(file))}</span>
                ${file.favorite ? '<span class="folder-chip">Favorite</span>' : ""}
                ${file.deletedAt ? '<span class="folder-chip">In trash</span>' : ""}
              </div>
            </div>
            <p class="file-meta">${formatSize(file.size)} - ${escapeHtml(folderPath)} - uploaded ${new Date(file.uploadedAt).toLocaleString()}</p>
            <p class="file-meta">Last opened ${formatRelativeDate(file.lastAccessedAt)}</p>
          </div>
          <div class="file-actions">
            <button class="ghost-btn" type="button" data-file-action="preview" data-file-id="${file.id}">Preview</button>
            <button class="ghost-btn" type="button" data-file-action="download" data-file-id="${file.id}">Download</button>
            <button class="ghost-btn" type="button" data-file-action="favorite" data-file-id="${file.id}">${file.favorite ? "Unfavorite" : "Favorite"}</button>
            <button class="ghost-btn" type="button" data-file-action="${file.deletedAt ? "restore" : "delete"}" data-file-id="${file.id}">
              ${file.deletedAt ? "Restore" : "Trash"}
            </button>
          </div>
        </article>
      `;
    })
    .join("");
}

function renderOverview() {
  const user = getCurrentUser();
  const activeFiles = libraryState.files.filter((file) => !file.deletedAt);
  const used = activeFiles.reduce((sum, file) => sum + file.size, 0);
  const favorites = activeFiles.filter((file) => file.favorite).length;
  const trashCount = libraryState.files.filter((file) => file.deletedAt).length;
  const latestActivity = libraryState.activity[0];

  profileName.textContent = user?.name || "Guest";
  profileEmail.textContent = user?.email || "No active account";
  profileAvatar.textContent = (user?.name || "G").slice(0, 1).toUpperCase();
  storageUsed.textContent = formatSize(used);
  storageBreakdown.textContent = `${activeFiles.length} files across ${libraryState.folders.length} folders`;
  favoriteCount.textContent = `${favorites} favorites`;
  highlightBreakdown.textContent = `${libraryState.folders.length} folders, ${trashCount} items in trash`;

  detailName.textContent = user?.name || "Guest";
  detailEmail.textContent = user?.email || "No active account";
  detailJoined.textContent = formatCalendarDate(user?.createdAt);
  detailLastActivity.textContent = latestActivity ? formatRelativeDate(latestActivity.createdAt) : "No activity yet";
  detailTheme.textContent = getThemeLabel(libraryState.preferences.theme);
  detailFolderView.textContent = state.folderView
    ? getFolderPath(state.folderView) || "Selected folder"
    : "All folders";
  detailActiveFiles.textContent = String(activeFiles.length);
  detailTrashCount.textContent = String(trashCount);
}

function renderAll() {
  renderFolderOptions();
  renderPendingFiles();
  renderFolders();
  renderFiles();
  renderOverview();
}

function loadLibrary() {
  const user = getCurrentUser();
  libraryState = {
    folders: user?.folders || [],
    files: user?.files || [],
    activity: user?.activity || [],
    preferences: user?.preferences || { theme: "obsidian" }
  };

  applyTheme(libraryState.preferences.theme);
  renderAll();
}

function showDashboard() {
  const user = getCurrentUser();

  if (!user) {
    throw new Error("No active session");
  }

  welcomeTitle.textContent = `Welcome back, ${user.name}`;
  setTopbarUsername(user.name);
  showAppPage();
  loadLibrary();
}

function downloadFile(file) {
  const link = document.createElement("a");
  link.href = file.dataUrl;
  link.download = file.fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
}

function markFileAccess(user, file, actionLabel) {
  file.lastAccessedAt = new Date().toISOString();
  createActivity(user, "access", `${actionLabel} ${file.fileName}`);
  saveCurrentUser(user);
  loadLibrary();
}

function openPreview(file) {
  previewTitle.textContent = file.fileName;
  const fileType = getFileType(file);

  if (fileType === "image") {
    previewContent.innerHTML = `<img src="${file.dataUrl}" alt="${escapeHtml(file.fileName)}" class="preview-media" />`;
  } else if (fileType === "video") {
    previewContent.innerHTML = `<video src="${file.dataUrl}" class="preview-media" controls></video>`;
  } else if (fileType === "pdf") {
    previewContent.innerHTML = `<iframe src="${file.dataUrl}" class="preview-frame" title="${escapeHtml(file.fileName)}"></iframe>`;
  } else if (fileType === "text") {
    const [, data] = file.dataUrl.split(",");
    const text = atob(data || "");
    previewContent.innerHTML = `<pre class="preview-text">${escapeHtml(text.slice(0, 20000))}</pre>`;
  } else {
    previewContent.innerHTML = `
      <div class="preview-placeholder">
        <p>This file type does not have an inline preview in the static demo.</p>
        <a class="primary-btn inline-btn" href="${file.dataUrl}" download="${escapeHtml(file.fileName)}">Download file</a>
      </div>
    `;
  }

  previewModal.classList.remove("hidden");
}

function closePreview() {
  previewModal.classList.add("hidden");
  previewContent.innerHTML = "";
}

function toggleFavorite(user, file) {
  file.favorite = !file.favorite;
  createActivity(user, "favorite", `${file.favorite ? "Favorited" : "Unfavorited"} ${file.fileName}`);
  saveCurrentUser(user);
  loadLibrary();
}

function moveToTrash(user, file) {
  file.deletedAt = new Date().toISOString();
  createActivity(user, "trash", `Moved ${file.fileName} to the recycle bin`);
  saveCurrentUser(user);
  loadLibrary();
}

function restoreFile(user, file) {
  file.deletedAt = null;
  createActivity(user, "restore", `Restored ${file.fileName}`);
  saveCurrentUser(user);
  loadLibrary();
}

loginForm.addEventListener("submit", (event) => {
  event.preventDefault();

  try {
    const formData = new FormData(loginForm);
    const values = Object.fromEntries(formData);
    const db = readDb();
    const user = db.users.find((entry) => entry.email === String(values.email).trim().toLowerCase());

    if (!user || user.password !== String(values.password)) {
      throw new Error("Invalid email or password.");
    }

    setToken(user.id);
    setMessage(authMessage, "");
    showDashboard();
  } catch (error) {
    setMessage(authMessage, error.message, true);
  }
});

registerForm.addEventListener("submit", (event) => {
  event.preventDefault();

  try {
    const formData = new FormData(registerForm);
    const values = Object.fromEntries(formData);
    const db = readDb();
    const normalizedEmail = String(values.email).trim().toLowerCase();

    if (db.users.some((entry) => entry.email === normalizedEmail)) {
      throw new Error("An account with that email already exists.");
    }

    const user = {
      id: crypto.randomUUID(),
      name: String(values.name).trim(),
      email: normalizedEmail,
      password: String(values.password),
      createdAt: new Date().toISOString(),
      folders: [],
      files: [],
      activity: [],
      preferences: {
        theme: "obsidian"
      }
    };

    createActivity(user, "account", `Created account for ${user.name}`);
    db.users.push(user);
    writeDb(db);

    setToken(user.id);
    setMessage(authMessage, "");
    showDashboard();
  } catch (error) {
    setMessage(authMessage, error.message, true);
  }
});

folderForm.addEventListener("submit", (event) => {
  event.preventDefault();

  try {
    setMessage(fileMessage, "Creating folder...");
    const user = getCurrentUser();

    if (!user) {
      throw new Error("Please log in again.");
    }

    const cleanName = folderNameInput.value.trim();

    if (!cleanName) {
      throw new Error("Folder name is required.");
    }

    const duplicate = user.folders.some(
      (folder) => folder.name.toLowerCase() === cleanName.toLowerCase() && (folder.parentId || "") === (folderParentSelect.value || "")
    );

    if (duplicate) {
      throw new Error("A folder with that name already exists here.");
    }

    user.folders.unshift({
      id: crypto.randomUUID(),
      name: cleanName,
      parentId: folderParentSelect.value || null,
      createdAt: new Date().toISOString()
    });

    createActivity(user, "folder", `Created folder ${cleanName}`);
    saveCurrentUser(user);
    folderForm.reset();
    loadLibrary();
    setMessage(fileMessage, "Folder created.");
  } catch (error) {
    setMessage(fileMessage, error.message, true);
  }
});

function setPendingFiles(fileListValue) {
  state.pendingFiles = Array.from(fileListValue || []);
  renderPendingFiles();
}

fileInput.addEventListener("change", () => {
  setPendingFiles(fileInput.files);
});

dropZone.addEventListener("dragover", (event) => {
  event.preventDefault();
  dropZone.classList.add("drop-zone-active");
});

dropZone.addEventListener("dragleave", () => {
  dropZone.classList.remove("drop-zone-active");
});

dropZone.addEventListener("drop", (event) => {
  event.preventDefault();
  dropZone.classList.remove("drop-zone-active");
  setPendingFiles(event.dataTransfer.files);
});

uploadForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const files = state.pendingFiles.length ? state.pendingFiles : Array.from(fileInput.files || []);

  if (!files.length) {
    setMessage(fileMessage, "Choose at least one file before uploading.", true);
    return;
  }

  try {
    setMessage(fileMessage, `Uploading ${files.length} file${files.length === 1 ? "" : "s"}...`);
    const user = getCurrentUser();

    if (!user) {
      throw new Error("Please log in again.");
    }

    const folderId = uploadFolderSelect.value || null;
    const uploadedFiles = await Promise.all(
      files.map(async (file) => ({
        id: crypto.randomUUID(),
        fileName: file.name,
        mimeType: file.type || "application/octet-stream",
        size: file.size,
        uploadedAt: new Date().toISOString(),
        folderId,
        favorite: false,
        lastAccessedAt: null,
        deletedAt: null,
        dataUrl: await fileToDataUrl(file)
      }))
    );

    user.files.unshift(...uploadedFiles);
    createActivity(user, "upload", `Uploaded ${uploadedFiles.length} file${uploadedFiles.length === 1 ? "" : "s"}`);
    saveCurrentUser(user);

    uploadForm.reset();
    state.pendingFiles = [];
    loadLibrary();
    renderPendingFiles();
    setMessage(fileMessage, `${uploadedFiles.length} file${uploadedFiles.length === 1 ? "" : "s"} uploaded successfully.`);
  } catch (error) {
    setMessage(fileMessage, error.message, true);
  }
});

folderGrid.addEventListener("click", (event) => {
  const button = event.target.closest("[data-folder-action]");

  if (!button) {
    return;
  }

  state.folderView = button.getAttribute("data-folder-id");
  loadLibrary();
});

fileList.addEventListener("click", (event) => {
  const actionButton = event.target.closest("[data-file-action]");

  if (!actionButton) {
    return;
  }

  const fileId = actionButton.getAttribute("data-file-id");
  const action = actionButton.getAttribute("data-file-action");
  const user = getCurrentUser();

  if (!user) {
    return;
  }

  const file = user.files.find((entry) => entry.id === fileId);

  if (!file) {
    return;
  }

  if (action === "preview") {
    openPreview(file);
    markFileAccess(user, file, "Previewed");
    return;
  }

  if (action === "download") {
    downloadFile(file);
    markFileAccess(user, file, "Downloaded");
    return;
  }

  if (action === "favorite") {
    toggleFavorite(user, file);
    return;
  }

  if (action === "delete") {
    moveToTrash(user, file);
    return;
  }

  if (action === "restore") {
    restoreFile(user, file);
  }
});

document.addEventListener("click", (event) => {
  const closeButton = event.target.closest("[data-close-modal]");

  if (closeButton) {
    closePreview();
  }
});

document.getElementById("show-login").addEventListener("click", () => switchAuthMode("login"));
document.getElementById("show-register").addEventListener("click", () => switchAuthMode("register"));
document.getElementById("refresh-btn").addEventListener("click", () => {
  setMessage(fileMessage, "Refreshing...");
  loadLibrary();
  setMessage(fileMessage, "Up to date.");
});

document.getElementById("clear-folder-view-btn").addEventListener("click", () => {
  state.folderView = "";
  loadLibrary();
});

document.getElementById("logout-btn").addEventListener("click", () => {
  clearToken();
  setTopbarUsername("Guest");
  showAuthPage();
  state.pendingFiles = [];
  renderPendingFiles();
  setMessage(fileMessage, "");
});

searchInput.addEventListener("input", (event) => {
  state.search = event.target.value.trim();
  renderFolders();
  renderFiles();
});

sortSelect.addEventListener("change", (event) => {
  state.sort = event.target.value;
  renderFiles();
});

typeFilter.addEventListener("change", (event) => {
  state.type = event.target.value;
  renderFiles();
});

folderViewSelect.addEventListener("change", (event) => {
  state.folderView = event.target.value;
  renderFiles();
});

favoritesOnlyToggle.addEventListener("change", (event) => {
  state.favoritesOnly = event.target.checked;
  renderFiles();
});

trashToggle.addEventListener("change", (event) => {
  state.showTrash = event.target.checked;
  renderFiles();
});

themeSelect.addEventListener("change", (event) => {
  const user = getCurrentUser();

  if (!user) {
    return;
  }

  user.preferences.theme = event.target.value;
  saveCurrentUser(user);
  loadLibrary();
});

(function bootstrap() {
  switchAuthMode("login");
  setTopbarUsername("Guest");
  applyTheme("obsidian");
  renderPendingFiles();
  showAuthPage();

  if (!getToken()) {
    return;
  }

  try {
    showDashboard();
  } catch (error) {
    clearToken();
  }
})();
