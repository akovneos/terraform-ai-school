const storageKeys = { 1: "ai-course-module-one-complete", 2: "llmFundamentalsModuleProgress", 3: "engineerAiPatternsModuleProgress", 4: "designResearchPracticeModuleProgress", 5: "logAnalysisPracticeModuleProgress", 6: "codeRefactorPracticeModuleProgress", 7: "promptImprovementModuleProgress", 8: "aiOutputVerificationRiskModuleProgress", 9: "securityInformationManagementModuleProgress", 10: "courseCompletionAssessmentProgress" };
const levels = {
  beginner: { label: "未経験者", legacy: "未経験者向け", description: "ヒント・例・テンプレートを使う" },
  intermediate: { label: "IT基礎経験者", legacy: "IT基礎経験者", description: "根拠と影響を短く整理する" },
  engineer: { label: "現役エンジニア", legacy: "現役エンジニア向け", description: "根拠・影響・検証・改善まで記録する" }
};

function readJson(key) { try { return JSON.parse(localStorage.getItem(key) || "{}"); } catch { return {}; } }
function currentLevel(moduleId) {
  const record = readJson(storageKeys[moduleId]);
  const meta = readJson(`aiCourseDifficultyMeta:v2:${moduleId}`);
  return record.difficulty?.selectedLevel || meta.selectedLevel || "beginner";
}
function saveLevel(moduleId, level) {
  const metaKey = `aiCourseDifficultyMeta:v2:${moduleId}`;
  const meta = readJson(metaKey);
  localStorage.setItem(metaKey, JSON.stringify({ ...meta, selectedLevel: level, version: 2, difficultyModel: "shared-task-depth-based" }));
  const recordKey = storageKeys[moduleId];
  const raw = localStorage.getItem(recordKey);
  if (!raw) return;
  const record = readJson(recordKey);
  record.version = 2;
  record.difficultyModel = "shared-task-depth-based";
  record.difficulty ||= { completionByLevel: {}, exerciseDepth: {} };
  record.difficulty.selectedLevel = level;
  record.level = levels[level].legacy;
  localStorage.setItem(recordKey, JSON.stringify(record));
}

const profile = readJson("ai-course-profile");
document.querySelectorAll(".profile-name").forEach((element) => { element.textContent = profile.name || "受講生A"; });
document.getElementById("levels-grid").innerHTML = Object.entries(COURSE_PLAN).map(([id, plan]) => {
  const moduleId = Number(id);
  const selected = currentLevel(moduleId);
  return `<article class="level-module"><b class="level-module-number">${String(moduleId).padStart(2, "0")}</b><div><h2>${plan.title}</h2><p>${plan.duration}</p></div><div class="level-options">${Object.entries(levels).map(([level, item]) => `<label class="level-option"><input type="radio" name="module-${moduleId}-level" value="${level}" ${selected === level ? "checked" : ""}><strong>${item.label}</strong><span>${item.description}</span></label>`).join("")}</div></article>`;
}).join("");
document.querySelectorAll(".level-options input").forEach((input) => input.addEventListener("change", () => {
  const moduleId = Number(input.name.match(/module-(\d+)-level/)[1]);
  saveLevel(moduleId, input.value);
  document.getElementById("levels-status").textContent = `MODULE ${String(moduleId).padStart(2, "0")}：${levels[input.value].label}として保存しました。`;
}));
lucide.createIcons();
