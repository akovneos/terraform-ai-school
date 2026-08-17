(() => {
  const moduleId = Number(new URLSearchParams(location.search).get("module"));
  const storageKeys = { 1: "ai-course-module-one-complete", 2: "llmFundamentalsModuleProgress", 3: "engineerAiPatternsModuleProgress", 4: "designResearchPracticeModuleProgress", 5: "logAnalysisPracticeModuleProgress", 6: "codeRefactorPracticeModuleProgress", 7: "promptImprovementModuleProgress", 8: "aiOutputVerificationRiskModuleProgress", 9: "securityInformationManagementModuleProgress", 10: "courseCompletionAssessmentProgress" };
  const storageKey = storageKeys[moduleId];
  const metaKey = `aiCourseDifficultyMeta:v2:${moduleId}`;
  const config = {
    beginner: { label: "未経験者", legacy: "未経験者向け", advanced: false, description: "ヒントとテンプレートを使い、基本用語と人間による確認を学びます。" },
    intermediate: { label: "IT基礎経験者", legacy: "IT基礎経験者", advanced: false, description: "技術的な根拠と影響を短く整理します。" },
    engineer: { label: "現役エンジニア", legacy: "現役エンジニア向け", advanced: true, description: "技術的根拠、影響範囲、検証手順、改善案まで記録します。" }
  };

  const fromLegacy = (value) => value === "現役エンジニア向け" || value === "現役エンジニア" ? "engineer" : value === "IT基礎経験者" ? "intermediate" : "beginner";
  const readJson = (key) => { try { return JSON.parse(localStorage.getItem(key) || "{}"); } catch { return {}; } };
  const readRecord = () => storageKey ? readJson(storageKey) : {};
  const readMeta = () => readJson(metaKey);

  function writeRecord(record) {
    if (storageKey) localStorage.setItem(storageKey, JSON.stringify(record));
  }

  function migrateRecord(key) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return;
      const record = JSON.parse(raw);
      if (!record || typeof record !== "object" || Array.isArray(record) || record.version >= 2) return;
      const level = fromLegacy(record.level || record.difficulty?.selectedLevel);
      record.version = 2;
      record.difficultyModel = "shared-task-depth-based";
      record.difficulty = { selectedLevel: level, completionByLevel: record.difficulty?.completionByLevel || {}, exerciseDepth: record.difficulty?.exerciseDepth || {}, migratedAt: new Date().toISOString() };
      localStorage.setItem(key, JSON.stringify(record));
    } catch {
      // Existing module data remains usable even if an old record is malformed.
    }
  }

  function migrate() { Object.values(storageKeys).forEach(migrateRecord); }

  function current() {
    const record = readRecord();
    return record.difficulty?.selectedLevel || readMeta().selectedLevel || fromLegacy(record.level);
  }

  function persistLevel(level) {
    const meta = readMeta();
    localStorage.setItem(metaKey, JSON.stringify({ ...meta, selectedLevel: level, version: 2, difficultyModel: "shared-task-depth-based" }));
    if (!storageKey) return;
    const record = readRecord();
    record.version = 2;
    record.difficultyModel = "shared-task-depth-based";
    record.difficulty ||= { completionByLevel: {}, exerciseDepth: {} };
    record.difficulty.selectedLevel = level;
    record.level = config[level].legacy;
    writeRecord(record);
  }

  function depthData() {
    const record = readRecord();
    return record.difficulty?.submissionDepth || readMeta().submissionDepth || {};
  }

  function persistDepth(values) {
    const level = current();
    const advanced = !config[level].advanced || Boolean(values.technicalEvidence && values.impact && values.procedure && values.improvement);
    const entry = { ...values, common: true, advanced, updatedAt: new Date().toISOString() };
    const meta = readMeta();
    localStorage.setItem(metaKey, JSON.stringify({ ...meta, selectedLevel: level, submissionDepth: entry, version: 2, difficultyModel: "shared-task-depth-based" }));
    if (!storageKey) return;
    const record = readRecord();
    record.difficulty ||= { completionByLevel: {}, exerciseDepth: {} };
    record.difficulty.submissionDepth = entry;
    record.difficulty.completionByLevel ||= {};
    record.difficulty.completionByLevel[level] = advanced;
    writeRecord(record);
  }

  function depthPanel() {
    const view = document.querySelector(".m1-view");
    if (!view || !view.classList.contains("learner-review-screen") || view.querySelector(".difficulty-depth")) return;
    const level = current();
    const data = depthData();
    const additional = level === "beginner"
      ? `<p class="difficulty-beginner-note">未経験者は、この画面の提出メモと安全確認を完了すれば追加記述は不要です。</p>`
      : level === "intermediate"
        ? `<label>根拠・影響の補足（任意）<textarea data-difficulty="technical" placeholder="確認した技術的根拠と、考えられる影響を短く記入してください。">${data.technicalEvidence || ""}</textarea></label>`
        : `<label>技術的根拠<textarea data-difficulty="technical" placeholder="一次情報、ログ、仕様、実測値などの根拠を記入してください。">${data.technicalEvidence || ""}</textarea></label><label>影響範囲・副作用<textarea data-difficulty="impact" placeholder="security・performance・operation・costを含む影響を記入してください。">${data.impact || ""}</textarea></label><label>再現可能な検証手順<textarea data-difficulty="procedure" placeholder="第三者が確認できる手順を記入してください。">${data.procedure || ""}</textarea></label><label>改善提案<textarea data-difficulty="improvement" placeholder="比較した案と改善提案を記入してください。">${data.improvement || ""}</textarea></label>`;
    const panel = document.createElement("section");
    panel.className = "difficulty-depth";
    panel.innerHTML = `<h3>レベル別の提出補足 <span class="difficulty-status"></span></h3><small>共通の確認・判断理由は各実習と提出メモで記録します。この欄は選択レベルに応じた補足だけを扱います。</small>${additional}<button type="button" class="m1-secondary difficulty-save">補足を保存</button>`;
    const anchor = view.querySelector(".learner-review-card");
    anchor?.after(panel);
    const updateStatus = () => {
      const complete = depthData().advanced;
      const status = panel.querySelector(".difficulty-status");
      status.textContent = complete ? "保存済み" : level === "engineer" ? "記入が必要" : "任意";
      status.classList.toggle("complete", complete);
    };
    updateStatus();
    panel.querySelector(".difficulty-save").addEventListener("click", () => {
      const values = {
        technicalEvidence: panel.querySelector('[data-difficulty="technical"]')?.value.trim() || "",
        impact: panel.querySelector('[data-difficulty="impact"]')?.value.trim() || "",
        procedure: panel.querySelector('[data-difficulty="procedure"]')?.value.trim() || "",
        improvement: panel.querySelector('[data-difficulty="improvement"]')?.value.trim() || ""
      };
      if (level === "engineer" && Object.values(values).some((value) => !value)) {
        alert("現役エンジニア向けの4項目を完了してください。");
        return;
      }
      persistDepth(values);
      updateStatus();
      alert("レベル別の補足を保存しました。");
    });
  }

  function resultsPanel() {
    const view = document.querySelector(".m1-view");
    if (!view || view.querySelector(".difficulty-rubric")) return;
    const title = view.querySelector(".m1-title")?.textContent || "";
    if (!/(学習結果|修了結果|講師評価|修了証明)/.test(title)) return;
    const level = current();
    const complete = Boolean(depthData().advanced);
    const rubric = level === "beginner"
      ? ["問題や差分に気づいているか", "基本riskと最低限の検証があるか", "自分の言葉で人間確認を説明しているか"]
      : level === "intermediate"
        ? ["技術的理由と根拠があるか", "impact・risk・decisionが整合しているか", "verification processが具体的か"]
        : ["Technical evidence quality と再現性", "影響範囲、副作用、security、performance、operation、cost", "比較案、改善提案、実務適用可能性"];
    const panel = document.createElement("section");
    panel.className = "difficulty-rubric";
    panel.innerHTML = `<h3>${config[level].label}の評価基準</h3><p>共通部分は実習と提出内容で確認します。レベル別補足：${complete ? "保存済み" : level === "engineer" ? "要確認" : "任意"}。</p><ul>${rubric.map((item) => `<li>${item}</li>`).join("")}</ul><p>AIの評価は補助情報です。技術的妥当性、根拠の質、実務適用性は講師または責任者が確認してください。</p>`;
    view.append(panel);
  }

  function enhance() { depthPanel(); resultsPanel(); }

  migrate();
  window.AICourseDifficulty = { config, currentLevel: current, migrate, enhance, setLevel: persistLevel };
  const observer = new MutationObserver(enhance);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  document.addEventListener("DOMContentLoaded", enhance);
  setTimeout(enhance, 0);
})();
