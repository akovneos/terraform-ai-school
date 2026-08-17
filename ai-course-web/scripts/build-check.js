const fs = require("fs");
const path = require("path");
const root = path.resolve(__dirname, "..");
const required = ["index.html", "task.html", "server.js", "exercise-evaluation.js", "exercise-evaluation-criteria.js", "exercise-evaluation.css"];
const missing = required.filter((file) => !fs.existsSync(path.join(root, file)));
if (missing.length) throw new Error(`Required files are missing: ${missing.join(", ")}`);
for (const file of ["server.js", "exercise-evaluation.js", "exercise-evaluation-criteria.js"]) {
  new Function(fs.readFileSync(path.join(root, file), "utf8"));
}
console.log("Static build check passed.");
