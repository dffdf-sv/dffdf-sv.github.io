```js
require("dotenv").config();

const express = require("express");
const session = require("express-session");

const app = express();
const PORT = process.env.PORT || 3000;

const GITHUB_OWNER = process.env.GITHUB_OWNER;
const GITHUB_REPO = process.env.GITHUB_REPO;
const GITHUB_BRANCH = process.env.GITHUB_BRANCH || "main";
const GITHUB_FILE = process.env.GITHUB_FILE || "data/site-content.json";
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

app.set("trust proxy", 1);

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 1000 * 60 * 60 * 8
    }
  })
);

app.use(express.static("public"));

function requireAdmin(req, res, next) {
  if (req.session.isAdmin) {
    return next();
  }

  res.status(401).json({ error: "Unauthorized" });
}

async function githubRequest(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "GitHub request failed");
  }

  return data;
}

async function getContent() {
  const url =
    `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}` +
    `/contents/${GITHUB_FILE}?ref=${encodeURIComponent(GITHUB_BRANCH)}`;

  const file = await githubRequest(url);

  return {
    content: JSON.parse(
      Buffer.from(file.content, "base64").toString("utf8")
    ),
    sha: file.sha
  };
}

async function updateContent(content, sha) {
  const url =
    `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}` +
    `/contents/${GITHUB_FILE}`;

  const encoded = Buffer.from(
    JSON.stringify(content, null, 2) + "\n"
  ).toString("base64");

  return githubRequest(url, {
    method: "PUT",
    body: JSON.stringify({
      message: "Update website from admin panel",
      content: encoded,
      sha,
      branch: GITHUB_BRANCH
    })
  });
}

/* Public website */

app.get("/", (req, res) => {
  res.sendFile("index.html", { root: "public" });
});

app.get("/api/content", async (req, res) => {
  try {
    const result = await getContent();
    res.json(result.content);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to load website content" });
  }
});

/* Admin */

app.get("/admin", (req, res) => {
  res.sendFile("admin.html", { root: "views" });
});

app.get("/api/admin/session", (req, res) => {
  res.json({
    authenticated: !!req.session.isAdmin
  });
});

app.post("/api/login", async (req, res) => {
  const { username, password } = req.body;

  if (
    username !== process.env.ADMIN_USER ||
    password !== process.env.ADMIN_PASSWORD
  ) {
    return res.status(401).json({
      success: false,
      error: "Invalid username or password"
    });
  }

  req.session.isAdmin = true;

  res.json({ success: true });
});

app.post("/api/logout", (req, res) => {
  req.session.destroy(() => {
    res.json({ success: true });
  });
});

app.get("/api/admin/content", requireAdmin, async (req, res) => {
  try {
    const result = await getContent();
    res.json(result.content);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Unable to load content"
    });
  }
});

app.post("/api/admin/save", requireAdmin, async (req, res) => {
  try {
    if (!req.body.content || typeof req.body.content !== "object") {
      return res.status(400).json({
        error: "Invalid content"
      });
    }

    const current = await getContent();

    await updateContent(
      req.body.content,
      current.sha
    );

    res.json({
      success: true,
      message: "Changes published successfully."
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`DFFDF website running on port ${PORT}`);
});
```
