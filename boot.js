const fs = require("fs");
const path = require("path");

const serverPath = path.join(__dirname, "server.js");
let source = fs.readFileSync(serverPath, "utf8");

const oldRequire = `function requireAdmin(req, res, next) {
  if (req.session.isAdmin === true) {
    return next();
  }

  res.status(401).json({
    error: "Unauthorized"
  });
}`;
const newRequire = `let activeAdminSessionId = null;

function isActiveAdminSession(req) {
  return req.session.isAdmin === true &&
    activeAdminSessionId !== null &&
    req.sessionID === activeAdminSessionId;
}

function requireAdmin(req, res, next) {
  if (isActiveAdminSession(req)) return next();

  if (req.session.isAdmin === true && req.sessionID !== activeAdminSessionId) {
    req.session.destroy(() => {});
  }

  res.status(401).json({ error: "Unauthorized" });
}`;
const oldAuth = `app.get("/api/admin/session", (req, res) => {
  res.json({
    authenticated:
      req.session.isAdmin === true
  });
});

app.post("/api/login", (req, res) => {
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

  res.json({
    success: true
  });
});

app.post("/api/logout", (req, res) => {
  req.session.destroy(() => {
    res.json({
      success: true
    });
  });
});`;
const newAuth = `app.get("/api/admin/session", (req, res) => {
  res.set("Cache-Control", "no-store, no-cache, must-revalidate, private");
  res.json({ authenticated: isActiveAdminSession(req) });
});

app.post("/api/login", (req, res) => {
  const { username, password } = req.body;

  if (username !== process.env.ADMIN_USER || password !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ success: false, error: "Invalid username or password" });
  }

  req.session.regenerate((error) => {
    if (error) return res.status(500).json({ success: false, error: "Could not create admin session" });
    req.session.isAdmin = true;
    activeAdminSessionId = req.sessionID;
    req.session.save((saveError) => {
      if (saveError) return res.status(500).json({ success: false, error: "Could not save admin session" });
      res.json({ success: true });
    });
  });
});

app.post("/api/logout", (req, res) => {
  if (req.sessionID === activeAdminSessionId) activeAdminSessionId = null;
  req.session.destroy(() => {
    res.set("Cache-Control", "no-store");
    res.json({ success: true });
  });
});`;
const oldAdmin = `app.get("/admin", (req, res) => {
  res.sendFile(
    "admin.html",
    {
      root: "views"
    }
  );
});`;
const newAdmin = `app.get("/admin", (req, res) => {
  res.set("Cache-Control", "no-store, no-cache, must-revalidate, private");
  if (!isActiveAdminSession(req)) {
    return res.sendFile("admin-login.html", { root: "views" });
  }
  res.sendFile("admin.html", { root: "views" });
});`;
const defaultPageOld = `(req.query.page || "home")
        .replace(/^\\/+/, "")`;
const defaultPageNew = `(req.query.page || site.data.defaultPage || "home")
        .replace(/^\\/+/, "")`;

for (const [from, to, name] of [
  [defaultPageOld, defaultPageNew, "default page"],
  [oldRequire, newRequire, "admin auth"],
  [oldAuth, newAuth, "login"],
  [oldAdmin, newAdmin, "admin route"]
]) {
  if (!source.includes(from)) throw new Error("DFFDF boot patch target missing: " + name);
  source = source.replace(from, to);
}

const runtimePath = path.join(__dirname, ".runtime-server.js");
fs.writeFileSync(runtimePath, source, "utf8");
require(runtimePath);
