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

const newLogin = `app.post("/api/login", (req, res) => {\n  const { username, password } = req.body;\n\n  if (\n    username !== process.env.ADMIN_USER ||\n    password !== process.env.ADMIN_PASSWORD\n  ) {\n    return res.status(401).json({\n      success: false,\n      error: "Invalid username or password"\n    });\n  }\n\n  // Regenerating the session creates a new session ID and removes the old\n  // one, so the previous admin login is kicked out immediately.\n  req.session.regenerate((error) => {\n    if (error) {\n      console.error("Admin session regeneration failed:", error);\n      return res.status(500).json({\n        success: false,\n        error: "Could not create admin session"\n      });\n    }\n\n    req.session.isAdmin = true;\n    activeAdminSessionId = req.sessionID;\n\n    res.json({\n      success: true\n    });\n  });\n});`;

if (!patchedSource.includes(oldLogin)) {
  throw new Error("Admin-login patch target was not found; refusing to start with an unknown server version.");
}

patchedSource = patchedSource.replace(oldLogin, newLogin);

const runtimePath = path.join(__dirname, ".runtime-server.js");
fs.writeFileSync(runtimePath, patchedSource, "utf8");
require(runtimePath);
