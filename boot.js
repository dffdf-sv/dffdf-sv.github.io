const fs = require("fs");
const path = require("path");

const serverPath = path.join(__dirname, "server.js");
const serverSource = fs.readFileSync(serverPath, "utf8");

const oldSource = `(req.query.page || "home")\n        .replace(/^\\/+/, "")`;
const newSource = `(req.query.page || site.data.defaultPage || "home")\n        .replace(/^\\/+/, "")`;

if (!serverSource.includes(oldSource)) {
  throw new Error("Default-page patch target was not found; refusing to start with an unknown server version.");
}

let patchedSource = serverSource.replace(oldSource, newSource);

// Only one admin session is valid at a time. A successful new login
// invalidates the previous session, including sessions on other devices.
const oldAuth = `function requireAdmin(req, res, next) {\n  if (req.session.isAdmin === true) {\n    return next();\n  }\n\n  res.status(401).json({\n    error: "Unauthorized"\n  });\n}`;

const newAuth = `let activeAdminSessionId = null;\n\nfunction requireAdmin(req, res, next) {\n  if (\n    req.session.isAdmin === true &&\n    activeAdminSessionId &&\n    req.sessionID === activeAdminSessionId\n  ) {\n    return next();\n  }\n\n  if (req.session.isAdmin === true && activeAdminSessionId !== req.sessionID) {\n    req.session.destroy(() => {});\n  }\n\n  res.status(401).json({\n    error: "Unauthorized"\n  });\n}`;

if (!patchedSource.includes(oldAuth)) {
  throw new Error("Admin-auth patch target was not found; refusing to start with an unknown server version.");
}

patchedSource = patchedSource.replace(oldAuth, newAuth);

const oldLogin = `app.post("/api/login", (req, res) => {\n  const { username, password } = req.body;\n\n  if (\n    username !== process.env.ADMIN_USER ||\n    password !== process.env.ADMIN_PASSWORD\n  ) {\n    return res.status(401).json({\n      success: false,\n      error: "Invalid username or password"\n    });\n  }\n\n  req.session.isAdmin = true;\n\n  res.json({\n    success: true\n  });\n});`;

const newLogin = `app.post("/api/login", (req, res) => {\n  const { username, password } = req.body;\n\n  if (\n    username !== process.env.ADMIN_USER ||\n    password !== process.env.ADMIN_PASSWORD\n  ) {\n    return res.status(401).json({\n      success: false,\n      error: "Invalid username or password"\n    });\n  }\n\n  req.session.regenerate((error) => {\n    if (error) {\n      console.error("Admin session regeneration failed:", error);\n      return res.status(500).json({\n        success: false,\n        error: "Could not create admin session"\n      });\n    }\n\n    req.session.isAdmin = true;\n    activeAdminSessionId = req.sessionID;\n\n    res.json({\n      success: true\n    });\n  });\n});`;

if (!patchedSource.includes(oldLogin)) {
  throw new Error("Admin-login patch target was not found; refusing to start with an unknown server version.");
}

patchedSource = patchedSource.replace(oldLogin, newLogin);

// Serve a real password screen when logged out. When authenticated, inject
// a small client guard so a second login kicks the older browser to /admin.
const oldAdminRoute = `app.get("/admin", (req, res) => {\n  res.sendFile(\n    "admin.html",\n    {\n      root: "views"\n    }\n  );\n});`;

const newAdminRoute = `app.get("/admin", (req, res) => {\n  const authenticated =\n    req.session.isAdmin === true &&\n    activeAdminSessionId &&\n    req.sessionID === activeAdminSessionId;\n\n  res.set("Cache-Control", "no-store, no-cache, must-revalidate, private");\n\n  if (!authenticated) {\n    return res.sendFile("admin-login.html", { root: "views" });\n  }\n\n  const adminPath = path.join(__dirname, "views", "admin.html");\n  let html = fs.readFileSync(adminPath, "utf8");\n  if (!html.includes("/admin-auth.js")) {\n    html = html.replace(/<\\/body>/i, '<script src="/admin-auth.js"></script></body>');\n  }\n\n  res.type("html").send(html);\n});`;

if (!patchedSource.includes(oldAdminRoute)) {
  throw new Error("Admin-route patch target was not found; refusing to start with an unknown server version.");
}

patchedSource = patchedSource.replace(oldAdminRoute, newAdminRoute);

const runtimePath = path.join(__dirname, ".runtime-server.js");
fs.writeFileSync(runtimePath, patchedSource, "utf8");
require(runtimePath);
