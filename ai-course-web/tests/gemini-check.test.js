const test = require("node:test");
const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");
const path = require("node:path");
const criteria = require("../exercise-evaluation-criteria.js");

const port = 4183;
let server;
test.before(async () => {
  server = spawn(process.execPath, ["server.js"], { cwd: path.resolve(__dirname, ".."), env: { ...process.env, PORT: String(port), GEMINI_EVALUATION_MOCK: "true" } });
  await new Promise((resolve, reject) => { const timer = setTimeout(() => reject(new Error("server timeout")), 5000); server.stdout.on("data", () => { clearTimeout(timer); resolve(); }); server.on("error", reject); });
});
test.after(() => server.kill());
async function request(body) { return fetch(`http://127.0.0.1:${port}/api/gemini/check-exercise`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }); }
let sequence = 0;
function body(answerData) { sequence += 1; return { userId: `test-student-${sequence}`, role: "student", moduleId: 1, exerciseId: `exercise-${sequence}`, moduleTitle: "生成AIの基礎", exerciseTitle: "分類", level: "beginner", answerData }; }

test("criteria registry supports all ten modules and levels", () => { for (let id = 1; id <= 10; id += 1) { const item = criteria.get(id, "exercise-1", "engineer"); assert.equal(item.evaluationVersion, 1); assert.equal(item.criteria.length, 3); assert.ok(item.depth.length > 0); } });
test("wrong role is rejected", async () => { const response = await request({ ...body({ answer: "十分な回答です" }), role: "teacher" }); assert.equal(response.status, 403); });
test("sensitive data is blocked before provider call", async () => { const response = await request(body({ answer: "api_key=abcdefghijklmnopqrstuvwxyz", reason: "確認" })); assert.equal(response.status, 400); assert.equal((await response.json()).error, "sensitive_data"); });
test("mock check returns revision for an insufficient semantic answer", async () => { const response = await request(body({ answer: "短い回答" })); assert.equal(response.status, 200); assert.equal((await response.json()).result.status, "needs_revision"); });
test("mock check returns normalized passed result", async () => { const response = await request(body({ answer: "AIの回答は候補にすぎないため、仕様書と公式資料を確認し、顧客情報を入力せず、担当者が最終的に判断します。追加でログと設定を確認します。", humanCheck: true })); assert.equal(response.status, 200); const payload = await response.json(); assert.equal(payload.result.status, "passed"); assert.equal(payload.result.provider, "mock"); assert.equal(payload.result.evaluationVersion, 1); assert.ok(payload.result.checkedAnswerHash); });
