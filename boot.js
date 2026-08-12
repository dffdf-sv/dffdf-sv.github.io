const fs = require("fs");
const path = require("path");

const serverPath = path.join(__dirname, "server.js");
const serverSource = fs.readFileSync(serverPath, "utf8");

const oldSource = `(req.query.page || "home")\n        .replace(/^\\/+/, "")`;
const newSource = `(req.query.page || site.data.defaultPage || "home")\n        .replace(/^\\/+/, "")`;

if (!serverSource.includes(oldSource)) {
  throw new Error("Default-page patch target was not found; refusing to start with an unknown server version.");
}

const patchedSource = serverSource.replace(oldSource, newSource);
const runtimePath = path.join(__dirname, ".runtime-server.js");
fs.writeFileSync(runtimePath, patchedSource, "utf8");
require(runtimePath);
