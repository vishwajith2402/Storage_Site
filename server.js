const express = require("express");
const crypto = require("crypto");
const fs = require("fs");
const fsp = require("fs/promises");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, "data");
const UPLOADS_DIR = path.join(__dirname, "uploads");
const DB_PATH = path.join(DATA_DIR, "db.json");

app.use(express.json({ limit: "1gb" }));
app.use(express.static(path.join(__dirname, "public")));

async function ensureStorage() {
  await fsp.mkdir(DATA_DIR, { recursive: true });
  await fsp.mkdir(UPLOADS_DIR, { recursive: true });

  if (!fs.existsSync(DB_PATH)) {
    await writeDb({
      users: [],
      sessions: []
    });
  }
}

async function readDb() {
  const raw = await fsp.readFile(DB_PATH, "utf8");
  return JSON.parse(raw);
}

async function writeDb(db) {
  await fsp.writeFile(DB_PATH, JSON.stringify(db, null, 2));
}

function createPasswordHash(password, salt = crypto.randomBytes(16).toString("hex")) {
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function validatePassword(password, storedHash) {
  const [salt, originalHash] = storedHash.split(":");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return crypto.timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(originalHash, "hex"));
}

function makeToken() {
  return crypto.randomBytes(24).toString("hex");
}

function sanitizeName(fileName) {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
}

function normalizeUser(user) {
  return {
    ...user,
    files: Array.isArray(user.files) ? user.files : [],
    folders: Array.isArray(user.folders) ? user.folders : []
  };
}

async function getDbWithNormalizedUsers() {
  const db = await readDb();
  let changed = false;

  db.users = db.users.map((user) => {
    const normalized = normalizeUser(user);
    if (!Array.isArray(user.files) || !Array.isArray(user.folders)) {
      changed = true;
    }
    return normalized;
  });

  if (changed) {
    await writeDb(db);
  }

  return db;
}

function getFolderPath(folders, folderId) {
  if (!folderId) {
    return "";
  }

  const parts = [];
  let currentId = folderId;

  while (currentId) {
    const folder = folders.find((entry) => entry.id === currentId);

    if (!folder) {
      return null;
    }

    parts.unshift(folder.name);
    currentId = folder.parentId || null;
  }

  return parts.join("/");
}

async function getSessionUser(req) {
  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";

  if (!token) {
    return null;
  }

  const db = await getDbWithNormalizedUsers();
  const session = db.sessions.find((entry) => entry.token === token);

  if (!session) {
    return null;
  }

  return db.users.find((user) => user.id === session.userId) || null;
}

async function authRequired(req, res, next) {
  try {
    const user = await getSessionUser(req);

    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
}

app.post("/api/register", async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: "Name, email, and password are required." });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const db = await readDb();

    if (db.users.some((user) => user.email === normalizedEmail)) {
      return res.status(409).json({ error: "An account with that email already exists." });
    }

    const newUser = {
      id: crypto.randomUUID(),
      name: String(name).trim(),
      email: normalizedEmail,
      passwordHash: createPasswordHash(String(password)),
      files: [],
      folders: []
    };

    const token = makeToken();

    db.users.push(newUser);
    db.sessions.push({
      token,
      userId: newUser.id,
      createdAt: new Date().toISOString()
    });

    await writeDb(db);

    res.status(201).json({
      token,
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email
      }
    });
  } catch (error) {
    next(error);
  }
});

app.post("/api/login", async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required." });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const db = await getDbWithNormalizedUsers();
    const user = db.users.find((entry) => entry.email === normalizedEmail);

    if (!user || !validatePassword(String(password), user.passwordHash)) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    const token = makeToken();
    db.sessions.push({
      token,
      userId: user.id,
      createdAt: new Date().toISOString()
    });

    await writeDb(db);

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email
      }
    });
  } catch (error) {
    next(error);
  }
});

app.get("/api/me", authRequired, async (req, res) => {
  res.json({
    user: {
      id: req.user.id,
      name: req.user.name,
      email: req.user.email
    }
  });
});

app.get("/api/files", authRequired, async (req, res, next) => {
  try {
    const db = await getDbWithNormalizedUsers();
    const user = db.users.find((entry) => entry.id === req.user.id);
    res.json({ files: user.files || [] });
  } catch (error) {
    next(error);
  }
});

app.get("/api/library", authRequired, async (req, res, next) => {
  try {
    const db = await getDbWithNormalizedUsers();
    const user = db.users.find((entry) => entry.id === req.user.id);

    res.json({
      folders: user.folders || [],
      files: user.files || []
    });
  } catch (error) {
    next(error);
  }
});

app.post("/api/folders", authRequired, async (req, res, next) => {
  try {
    const { name, parentId } = req.body;

    if (!name || !String(name).trim()) {
      return res.status(400).json({ error: "Folder name is required." });
    }

    const db = await getDbWithNormalizedUsers();
    const user = db.users.find((entry) => entry.id === req.user.id);
    const cleanName = String(name).trim();

    if (parentId && !user.folders.some((folder) => folder.id === parentId)) {
      return res.status(404).json({ error: "Parent folder not found." });
    }

    const duplicate = user.folders.some(
      (folder) => folder.name.toLowerCase() === cleanName.toLowerCase() && (folder.parentId || null) === (parentId || null)
    );

    if (duplicate) {
      return res.status(409).json({ error: "A folder with that name already exists here." });
    }

    const folder = {
      id: crypto.randomUUID(),
      name: cleanName,
      parentId: parentId || null,
      createdAt: new Date().toISOString()
    };

    user.folders.unshift(folder);
    await writeDb(db);

    res.status(201).json({ folder });
  } catch (error) {
    next(error);
  }
});

app.post("/api/files", authRequired, async (req, res, next) => {
  try {
    const { fileName, mimeType, contentBase64, folderId } = req.body;

    if (!fileName || !contentBase64) {
      return res.status(400).json({ error: "A file name and file content are required." });
    }

    const buffer = Buffer.from(contentBase64, "base64");
    const db = await getDbWithNormalizedUsers();
    const user = db.users.find((entry) => entry.id === req.user.id);

    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    if (folderId && !user.folders.some((folder) => folder.id === folderId)) {
      return res.status(404).json({ error: "Selected folder was not found." });
    }

    const id = crypto.randomUUID();
    const safeName = sanitizeName(String(fileName));
    const storedName = `${id}-${safeName}`;
    const folderPath = getFolderPath(user.folders, folderId || null);

    if (folderId && folderPath === null) {
      return res.status(404).json({ error: "Selected folder path could not be resolved." });
    }

    const relativePath = path.join(req.user.id, folderPath || "", storedName);
    const targetDir = path.join(UPLOADS_DIR, req.user.id, folderPath || "");
    const absolutePath = path.join(targetDir, storedName);

    await fsp.mkdir(targetDir, { recursive: true });
    await fsp.writeFile(absolutePath, buffer);

    const fileRecord = {
      id,
      fileName: String(fileName),
      mimeType: mimeType || "application/octet-stream",
      size: buffer.length,
      uploadedAt: new Date().toISOString(),
      relativePath,
      folderId: folderId || null,
      folderPath: folderPath || ""
    };

    user.files = user.files || [];
    user.files.unshift(fileRecord);

    await writeDb(db);

    res.status(201).json({ file: fileRecord });
  } catch (error) {
    next(error);
  }
});

app.get("/api/files/:id/download", authRequired, async (req, res, next) => {
  try {
    const db = await getDbWithNormalizedUsers();
    const user = db.users.find((entry) => entry.id === req.user.id);
    const file = (user.files || []).find((entry) => entry.id === req.params.id);

    if (!file) {
      return res.status(404).json({ error: "File not found." });
    }

    const absolutePath = path.join(UPLOADS_DIR, file.relativePath);
    res.download(absolutePath, file.fileName);
  } catch (error) {
    next(error);
  }
});

app.delete("/api/files/:id", authRequired, async (req, res, next) => {
  try {
    const db = await getDbWithNormalizedUsers();
    const user = db.users.find((entry) => entry.id === req.user.id);
    const fileIndex = (user.files || []).findIndex((entry) => entry.id === req.params.id);

    if (fileIndex === -1) {
      return res.status(404).json({ error: "File not found." });
    }

    const [file] = user.files.splice(fileIndex, 1);
    const absolutePath = path.join(UPLOADS_DIR, file.relativePath);

    if (fs.existsSync(absolutePath)) {
      await fsp.unlink(absolutePath);
    }

    await writeDb(db);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

app.use((error, req, res, next) => {
  console.error(error);
  res.status(500).json({ error: "Something went wrong on the server." });
});

ensureStorage()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Storage site running at http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error("Failed to start server:", error);
    process.exit(1);
  });
