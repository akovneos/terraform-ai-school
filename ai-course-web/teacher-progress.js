(() => {
  const rosterKey = "ai-course-teacher-roster-v1";
  const moduleConfig = {
    1: { key: "ai-course-module-one-complete", total: 12, collection: "completed", exercisePrefix: "exercise-", exercises: 10, final: ["quiz", "checklist"] },
    2: { key: "llmFundamentalsModuleProgress", total: 10, collection: "completed", exercisePrefix: "exercise-", exercises: 8, final: ["quiz", "sheet"] },
    3: { key: "engineerAiPatternsModuleProgress", total: 12, collection: "done", exercisePrefix: "ex", exercises: 8, final: ["quiz", "map", "flow"] },
    4: { key: "designResearchPracticeModuleProgress", total: 12, collection: "done", exercisePrefix: "ex", exercises: 6, final: ["memo", "final", "quiz"] },
    5: { key: "logAnalysisPracticeModuleProgress", total: 15, collection: "done", exercisePrefix: "ex", exercises: 7, final: ["report", "final", "quiz"] },
    6: { key: "codeRefactorPracticeModuleProgress", total: 15, collection: "done", exercisePrefix: "ex", exercises: 7, final: ["report", "final", "quiz"] },
    7: { key: "promptImprovementModuleProgress", total: 15, collection: "done", exercisePrefix: "ex", exercises: 8, final: ["report", "final", "quiz"] },
    8: { key: "aiOutputVerificationRiskModuleProgress", total: 15, collection: "done", exercisePrefix: "ex", exercises: 7, final: ["sheet", "final", "quiz"] },
    9: { key: "securityInformationManagementModuleProgress", total: 17, collection: "done", exercisePrefix: "ex", exercises: 7, final: ["criteria", "anon", "pre", "builder", "design", "reid", "approval", "rules", "final", "quiz"] },
    10: { key: "courseCompletionAssessmentProgress", total: 10, collection: "done", final: ["report", "case", "exam"] }
  };

  function readJson(key, fallback) {
    try {
      const value = JSON.parse(localStorage.getItem(key) || "");
      return value && typeof value === "object" ? value : fallback;
    } catch {
      return fallback;
    }
  }

  function currentLearner() {
    const profile = readJson("ai-course-profile", {});
    const submissions = readJson("ai-course-submissions-v1", {});
    return {
      id: "current-browser",
      name: profile.name || "受講生A",
      source: "local",
      submissions,
      legacy: readJson("ai-course-state", {}),
      difficultyMeta: Object.fromEntries(Object.keys(moduleConfig).map((id) => [id, readJson(`aiCourseDifficultyMeta:v2:${id}`, {})])),
      moduleRecords: Object.fromEntries(Object.entries(moduleConfig).map(([id, config]) => [id, readJson(config.key, {})]))
    };
  }

  function learners() {
    const roster = readJson(rosterKey, []);
    if (Array.isArray(roster) && roster.length) return roster;
    return [currentLearner()];
  }

  function recordFor(learner, moduleId) {
    return learner.moduleRecords?.[moduleId] || learner.moduleRecords?.[String(moduleId)] || {};
  }

  function quizPassed(record, moduleId) {
    const score = record.quiz?.score ?? record.quiz?.result;
    const passMark = moduleId <= 2 ? 8 : moduleId === 10 ? 8 : 4;
    return Number.isFinite(score) && score >= passMark;
  }

  function legacyStatus(learner, moduleId) {
    const legacy = learner.legacy || {};
    return {
      completed: Array.isArray(legacy.completedModules) && legacy.completedModules.includes(moduleId - 1),
      submitted: Array.isArray(legacy.submissions) ? legacy.submissions.includes(moduleId) : Boolean(legacy.submitted && moduleId === 5)
    };
  }

  function moduleStatus(learner, moduleId) {
    const record = recordFor(learner, moduleId);
    const config = moduleConfig[moduleId];
    const legacy = legacyStatus(learner, moduleId);
    if (!Object.keys(record).length) return { percent: legacy.completed ? 100 : 0, completed: legacy.completed, submitted: legacy.submitted };
    const done = record[config.collection] || {};
    const count = Object.values(done).filter(Boolean).length;
    const percent = Math.min(100, Math.round((count / config.total) * 100));
    const hasFinalWork = config.final.every((item) => Boolean(done[item]));
    const completedExercises = config.exercises
      ? Object.entries(done).filter(([key, value]) => key.startsWith(config.exercisePrefix) && value).length >= config.exercises
      : true;
    const difficulty = record.difficulty || learner.difficultyMeta?.[moduleId] || learner.difficultyMeta?.[String(moduleId)] || {};
    const selectedLevel = difficulty.selectedLevel;
    const levelRequirementsMet = !selectedLevel || selectedLevel === "beginner" || Boolean(difficulty.completionByLevel?.[selectedLevel]);
    // Keep the teacher view consistent with the learner portal: 100% is complete.
    const completed = percent >= 100 || (completedExercises && hasFinalWork && quizPassed(record, moduleId) && levelRequirementsMet) || legacy.completed;
    const submitted = legacy.submitted || completed || ["memo", "report", "sheet", "rules"].some((item) => Boolean(done[item]));
    return { percent: completed ? 100 : percent, completed, submitted };
  }

  function moduleTitle(moduleId) {
    return COURSE_PLAN[moduleId]?.title || `モジュール ${String(moduleId).padStart(2, "0")}`;
  }

  const answerLabels = {
    prompt: "AIへの依頼",
    correct: "確認できる事実",
    verify: "検証・注意点",
    judgment: "最終判断",
    checks: "確認項目",
    facts: "確認できる事実",
    uncertain: "不確かな点・推測",
    reason: "判断理由",
    review: "AI回答の確認",
    final: "最終方針",
    analysis: "分析内容",
    answer: "回答",
    result: "結果"
  };

  function readableLabel(label) {
    if (/^\d+$/.test(label)) return `実習 ${String(Number(label) + 1).padStart(2, "0")}`;
    if (/^ex\d+$/.test(label)) return `実習 ${String(Number(label.slice(2)) + 1).padStart(2, "0")}`;
    return answerLabels[label] || label;
  }

  function appendValue(container, label, value) {
    const row = document.createElement("div");
    const name = document.createElement("strong");
    name.textContent = readableLabel(label);
    row.append(name);
    if (value && typeof value === "object" && !Array.isArray(value)) {
      const details = document.createElement("dl");
      Object.entries(value).forEach(([key, item]) => {
        const term = document.createElement("dt");
        const description = document.createElement("dd");
        term.textContent = readableLabel(key);
        description.textContent = Array.isArray(item)
          ? `${item.filter(Boolean).length} / ${item.length} 項目を確認`
          : typeof item === "object" && item !== null
            ? JSON.stringify(item)
            : String(item || "未入力");
        details.append(term, description);
      });
      row.append(details);
    } else {
      const content = document.createElement("pre");
      content.textContent = Array.isArray(value)
        ? `${value.filter(Boolean).length} / ${value.length} 項目を確認`
        : String(value || "未入力");
      row.append(content);
    }
    container.append(row);
  }

  function renderAnswers(learner, moduleId) {
    const panel = document.getElementById("learner-answer-panel");
    const record = recordFor(learner, moduleId);
    panel.replaceChildren();
    const title = document.createElement("h3");
    title.textContent = `${moduleTitle(moduleId)} の回答`;
    const note = document.createElement("p");
    note.textContent = "保存済みの学習回答、課題の記録、テスト結果を確認できます。";
    panel.append(title, note);

    const answers = record.answers || {};
    const answerEntries = Object.entries(answers);
    if (answerEntries.length) {
      const answersBlock = document.createElement("section");
      answersBlock.className = "teacher-answer-block";
      const heading = document.createElement("h4");
      heading.textContent = "学習回答";
      answersBlock.append(heading);
      answerEntries.forEach(([key, value]) => appendValue(answersBlock, key, value));
      panel.append(answersBlock);
    }

    if (record.quiz && Object.keys(record.quiz).length) {
      const quizBlock = document.createElement("section");
      quizBlock.className = "teacher-answer-block";
      const heading = document.createElement("h4");
      heading.textContent = "総合テスト";
      quizBlock.append(heading);
      appendValue(quizBlock, "結果", record.quiz);
      panel.append(quizBlock);
    }

    const submission = learner.submissions?.[moduleId] || learner.submissions?.[String(moduleId)];
    if (submission?.memo) {
      const submissionBlock = document.createElement("section");
      submissionBlock.className = "teacher-answer-block";
      const heading = document.createElement("h4");
      heading.textContent = "提出メモ";
      submissionBlock.append(heading);
      appendValue(submissionBlock, "最終判断", submission.memo);
      panel.append(submissionBlock);
    }

    if (!answerEntries.length && !record.quiz && !submission?.memo) {
      const empty = document.createElement("p");
      empty.className = "teacher-answer-empty";
      empty.textContent = "このモジュールには、まだ保存済みの回答がありません。";
      panel.append(empty);
    }
  }

  function renderProgress(learner) {
    const progressPanel = document.getElementById("learner-progress-panel");
    const statuses = Object.keys(moduleConfig).map((id) => moduleStatus(learner, Number(id)));
    const average = Math.round(statuses.reduce((total, status) => total + status.percent, 0) / statuses.length);
    const completed = statuses.filter((status) => status.completed).length;
    const submissions = Object.keys(learner.submissions || {}).length;
    progressPanel.innerHTML = `<div class="teacher-learner-stats"><div><span>全体進捗</span><strong>${average}%</strong></div><div><span>完了モジュール</span><strong>${completed} / 10</strong></div><div><span>提出記録</span><strong>${submissions}</strong></div></div>`;
    const table = document.createElement("div");
    table.className = "teacher-progress-table";
    Object.keys(moduleConfig).forEach((id) => {
      const moduleId = Number(id);
      const progress = moduleStatus(learner, moduleId).percent;
      const record = recordFor(learner, moduleId);
      const row = document.createElement("button");
      row.type = "button";
      row.className = "teacher-progress-row";
      row.dataset.answerModule = String(moduleId);
      row.innerHTML = `<b>${String(moduleId).padStart(2, "0")}</b><span>${moduleTitle(moduleId)}</span><i><em style="width:${progress}%"></em></i><strong>${progress}%</strong>`;
      row.disabled = !Object.keys(record.answers || {}).length && !record.quiz && !learner.submissions?.[moduleId];
      table.append(row);
    });
    progressPanel.append(table);
  }

  function renderDashboard() {
    const root = document.getElementById("teacher-learning-dashboard");
    if (!root) return;
    const roster = learners();
    let selectedId = root.dataset.selectedLearner || roster[0].id;
    if (!roster.some((learner) => learner.id === selectedId)) selectedId = roster[0].id;
    const selected = roster.find((learner) => learner.id === selectedId);
    root.dataset.selectedLearner = selectedId;
    root.innerHTML = `<div class="teacher-learning-head"><div><p class="kicker">受講進捗</p><h2>受講進捗・学習回答</h2><p>受講生ごとの進捗、保存された回答、テスト結果を確認します。</p></div><label>受講生<select id="teacher-learner-select">${roster.map((learner) => `<option value="${learner.id}">${learner.name}</option>`).join("")}</select></label></div><p class="teacher-data-note">${selected.source === "local" ? "現在はこのブラウザに保存された受講生データを表示しています。複数受講生の共有表示は、Cognito・API・RDS連携後に有効になります。" : "共有された受講生データを表示しています。"}</p><div id="learner-progress-panel"></div><section class="teacher-answer-panel" id="learner-answer-panel"></section>`;
    document.getElementById("teacher-learner-select").value = selectedId;
    document.getElementById("teacher-learner-select").addEventListener("change", (event) => {
      root.dataset.selectedLearner = event.target.value;
      renderDashboard();
    });
    renderProgress(selected);
    const firstAnswered = Object.keys(moduleConfig).map(Number).find((id) => {
      const record = recordFor(selected, id);
      return Object.keys(record.answers || {}).length || record.quiz || selected.submissions?.[id];
    }) || 1;
    renderAnswers(selected, firstAnswered);
    root.querySelectorAll("[data-answer-module]").forEach((button) => button.addEventListener("click", () => renderAnswers(selected, Number(button.dataset.answerModule))));
  }

  window.addEventListener("storage", renderDashboard);
  renderDashboard();
})();
