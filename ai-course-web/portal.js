const modules = COURSE_MODULES;
const profile = JSON.parse(localStorage.getItem("ai-course-profile") || "{}");
const displayName = profile.name || "受講生A";

// Each module owns its learning data. The portal reads those records without
// changing them, while still supporting the original shared progress record.
const moduleStorage = {
  1: { key: "ai-course-module-one-complete", total: 12, collection: "completed", exercisePrefix: "exercise-", exercises: 10, final: ["quiz", "checklist"] },
  2: { key: "llmFundamentalsModuleProgress", total: 10, collection: "completed", exercisePrefix: "exercise-", exercises: 8, final: ["quiz", "sheet"] },
  3: { key: "engineerAiPatternsModuleProgress", total: 12, collection: "done", exercisePrefix: "ex", exercises: 8, final: ["quiz", "map", "flow"] },
  4: { key: "designResearchPracticeModuleProgress", total: 12, collection: "done", exercisePrefix: "ex", exercises: 6, final: ["memo", "final", "quiz"] },
  5: { key: "logAnalysisPracticeModuleProgress", total: 15, collection: "done", exercisePrefix: "ex", exercises: 7, final: ["report", "final", "quiz"] },
  6: { key: "codeRefactorPracticeModuleProgress", total: 12, collection: "done", exercisePrefix: "ex", exercises: 7, final: ["review", "final", "quiz"] },
  7: { key: "promptImprovementModuleProgress", total: 13, collection: "done", exercisePrefix: "ex", exercises: 8, final: ["review", "final", "quiz"] },
  8: { key: "aiOutputVerificationRiskModuleProgress", total: 12, collection: "done", exercisePrefix: "ex", exercises: 7, final: ["review", "final", "quiz"] },
  9: { key: "securityInformationManagementModuleProgress", total: 17, collection: "done", exercisePrefix: "ex", exercises: 7, final: ["criteria", "anon", "pre", "builder", "design", "reid", "approval", "rules", "final", "quiz"], strictProgress: true },
  10: { key: "courseCompletionAssessmentProgress", total: 8, collection: "done", final: ["report", "case", "exam", "plan"], informational: ["progress", "goals"], strictProgress: true }
};

function readJson(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

function legacyProgress() {
  const legacy = readJson("ai-course-state") || {};
  return {
    completed: Array.isArray(legacy.completedModules) ? legacy.completedModules : [],
    submissions: Array.isArray(legacy.submissions)
      ? legacy.submissions
      : legacy.submitted ? [5] : []
  };
}

function quizPassed(record, moduleId) {
  const score = record.quiz?.score ?? record.quiz?.result;
  const passMark = moduleId <= 2 ? 8 : moduleId === 10 ? 8 : 4;
  return Number.isFinite(score) && score >= passMark;
}

function moduleStatus(moduleId, legacy) {
  const config = moduleStorage[moduleId];
  const record = readJson(config.key);
  const difficultyMeta = readJson(`aiCourseDifficultyMeta:v2:${moduleId}`) || {};
  const legacyComplete = legacy.completed.includes(moduleId - 1);
  const legacySubmitted = legacy.submissions.includes(moduleId);

  if (!record) {
    return { percent: legacyComplete ? 100 : 0, completed: legacyComplete, submitted: legacySubmitted };
  }

  const done = record[config.collection] || {};
  const sectionProgress = readJson(`ai-course-section-progress:${moduleId}`) || {};
  const informationalCount = (config.informational || []).filter((section) => sectionProgress[section] && !done[section]).length;
  const count = Object.values(done).filter(Boolean).length + informationalCount;
  const percent = Math.min(100, Math.round((count / config.total) * 100));
  const hasFinalWork = config.final.every((item) => Boolean(done[item]));
  const completedExercises = config.exercises
    ? Object.entries(done).filter(([key, value]) => key.startsWith(config.exercisePrefix) && value).length >= config.exercises
    : true;
  const difficulty = record.difficulty || difficultyMeta;
  const selectedLevel = difficulty.selectedLevel;
  const levelRequirementsMet = (moduleId >= 6 && moduleId <= 8) || !selectedLevel || selectedLevel === "beginner" || Boolean(difficulty.completionByLevel?.[selectedLevel]);
  const recoveredModuleComplete = moduleId >= 6 && moduleId <= 8 && percent >= 100;
  const requiredProgressComplete = !config.strictProgress || count >= config.total;
  // The displayed 100% must always have the same meaning as the completion icon.
  // This also preserves older saved module data that predates difficulty metadata.
  const completed = percent >= 100 || recoveredModuleComplete || (completedExercises && hasFinalWork && quizPassed(record, moduleId) && levelRequirementsMet && requiredProgressComplete) || legacyComplete;

  // A submitted artefact is shown separately from a fully completed module.
  const submitted = legacySubmitted || completed || ["memo", "report", "sheet", "rules"].some((item) => Boolean(done[item]));
  return { percent: completed ? 100 : percent, completed, submitted };
}

const legacy = legacyProgress();
const statuses = modules.map((module) => ({ id: module.id, ...moduleStatus(module.id, legacy) }));
const completedCount = statuses.filter((status) => status.completed).length;
const reviewRecords = readJson("ai-course-submissions-v1") || {};
const reviewStatusLabels = {
  ai_feedback: "AIフィードバック済み",
  teacher_pending: "講師確認待ち",
  passed: "合格",
  revision_requested: "要修正"
};
const reviewedSubmissions = Object.entries(reviewRecords)
  .map(([id, record]) => ({ id: Number(id), ...record }))
  .filter((record) => reviewStatusLabels[record.status]);
const reviewByModule = new Map(reviewedSubmissions.map((record) => [record.id, record]));
const submissions = [...new Set([
  ...statuses.filter((status) => status.submitted).map((status) => status.id),
  ...reviewedSubmissions.map((record) => record.id)
])].map((id) => ({
  id,
  review: reviewByModule.get(id)
}));
const overallPercent = Math.round(statuses.reduce((sum, status) => sum + status.percent, 0) / modules.length);
const savedResume = readJson("ai-course-last-page");
const nextModule = statuses.find((status) => !status.completed)?.id || 10;
const resumeModule = savedResume && moduleStorage[savedResume.module] ? savedResume.module : nextModule;
const hasLearningHistory = statuses.some((status) => status.percent > 0);

document.querySelectorAll(".profile-name").forEach((element) => {
  element.textContent = displayName;
});
document.getElementById("course-progress").textContent = `${overallPercent}%`;
document.getElementById("course-bar").style.width = `${overallPercent}%`;
document.getElementById("completed-count").innerHTML = `${completedCount} <small>/ 10</small>`;
document.getElementById("submission-count").innerHTML = `${submissions.length} <small>件</small>`;

document.querySelectorAll("[data-course-start]").forEach((link) => {
  link.href = `task.html?module=${resumeModule}`;
  const label = link.querySelector("span");
  if (label) label.textContent = hasLearningHistory ? "続きから学習する" : "学習を開始する";
});
document.getElementById("task-list-link").href = `task.html?module=${nextModule}`;
const currentModule = modules.find((module) => module.id === nextModule);
document.getElementById("current-module-number").textContent = String(nextModule).padStart(2, "0");
document.getElementById("current-module-title").textContent = currentModule.title;
document.getElementById("current-module-summary").textContent = currentModule.summary;
document.getElementById("current-module-duration").textContent = COURSE_PLAN[nextModule].duration;

document.getElementById("module-grid").innerHTML = modules.map((module) => {
  const status = statuses.find((item) => item.id === module.id);
  const label = status.completed ? "完了" : status.percent ? `学習中 ${status.percent}%` : "未着手";
  return `<a href="task.html?module=${module.id}" class="module-item ${status.completed ? "done" : ""} ${status.percent && !status.completed ? "in-progress" : ""}"><b>${String(module.id).padStart(2, "0")}</b><span>${module.title}<small>${COURSE_PLAN[module.id].duration} ・ ${label}</small></span><i data-lucide="${status.completed ? "check-circle-2" : status.percent ? "circle-dot" : "circle"}"></i></a>`;
}).join("");

const history = document.getElementById("submission-history");
if (submissions.length) {
  history.outerHTML = submissions.map(({ id, review }) => `<a class="submission-row" href="task.html?module=${id}&review=1"><strong>${COURSE_PLAN[id]?.title || COURSE_MODULES[id - 1].title}</strong><span>${review ? reviewStatusLabels[review.status] : "提出済み"}</span></a>`).join("");
}

const submissionDialog = document.getElementById("submission-dialog");
const profileButton = document.getElementById("profile-button");
const profileMenu = document.getElementById("profile-menu");
document.getElementById("submissions-link").addEventListener("click", (event) => {
  event.preventDefault();
  document.getElementById("dialog-submission-list").innerHTML = submissions.length
    ? submissions.map(({ id, review }) => {
      const status = review ? reviewStatusLabels[review.status] : "提出済み";
      const icon = review?.status === "passed" ? "check-circle-2" : review?.status === "revision_requested" ? "rotate-ccw" : "clock-3";
      return `<a class="dialog-submission" href="task.html?module=${id}&review=1"><i data-lucide="${icon}"></i><div><strong>${COURSE_PLAN[id]?.title || COURSE_MODULES[id - 1].title}</strong><span>${status}</span></div><i data-lucide="arrow-right"></i></a>`;
    }).join("")
    : `<div class="dialog-empty"><i data-lucide="inbox"></i><p>まだ提出された課題はありません。</p></div>`;
  submissionDialog.showModal();
  lucide.createIcons();
});
document.getElementById("close-submissions").addEventListener("click", () => submissionDialog.close());
profileButton.addEventListener("click", () => {
  const open = profileMenu.hidden;
  profileMenu.hidden = !open;
  profileButton.setAttribute("aria-expanded", String(open));
});
document.addEventListener("click", (event) => {
  if (!event.target.closest(".profile-wrap")) {
    profileMenu.hidden = true;
    profileButton.setAttribute("aria-expanded", "false");
  }
});
lucide.createIcons();
