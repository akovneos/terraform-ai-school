(() => {
  const evaluationKey = "ai-course-exercise-evaluations-v1";
  const draftKey = "ai-course-exercise-drafts-v1";
  const moduleStorage = {
    1: "ai-course-module-one-complete", 2: "llmFundamentalsModuleProgress", 3: "engineerAiPatternsModuleProgress",
    4: "designResearchPracticeModuleProgress", 5: "logAnalysisPracticeModuleProgress", 6: "codeRefactorPracticeModuleProgress",
    7: "promptImprovementModuleProgress", 8: "aiOutputVerificationRiskModuleProgress", 9: "securityInformationManagementModuleProgress",
    10: "courseCompletionAssessmentProgress"
  };
  const statusText = { not_checked: "AI確認を実行してください。", checking: "AI確認中です。", passed: "AI確認に合格しました。", needs_revision: "修正が必要です。内容を見直して再確認してください。", error: "確認サービスでエラーが発生しました。", outdated: "確認後に回答が変更されています。再確認してください。" };
  const errorText = { not_configured: "AI確認機能が設定されていません。管理者にお問い合わせください。", sensitive_data: "個人情報・認証情報・秘密情報の可能性があるため、AI確認を中止しました。内容を匿名化してください。", answer_too_long: "回答が長すぎます。内容を整理してから、もう一度確認してください。", rate_limit: "AI確認の利用上限に達しました。講師または管理者に確認してください。", cooldown: "短時間に確認が繰り返されています。少し待ってから再実行してください。", timeout: "AI確認サービスに接続できませんでした。時間をおいてもう一度お試しください。", invalid_provider_json: "AI確認結果を正しく読み取れませんでした。もう一度確認してください。", invalid_model: "AI確認モデルの設定を確認してください。", invalid_key: "AI確認機能の認証設定を確認してください。", forbidden: "この操作は受講者のみ実行できます。", default: "AI確認サービスに接続できませんでした。時間をおいてもう一度お試しください。" };
  const inFlight = new Set();
  function read(key, fallback) { try { const value = JSON.parse(localStorage.getItem(key) || ""); return value && typeof value === "object" ? value : fallback; } catch { return fallback; } }
  function write(key, value) { localStorage.setItem(key, JSON.stringify(value)); }
  function hash(value) { const text = JSON.stringify(value); let value32 = 2166136261; for (let i = 0; i < text.length; i += 1) { value32 ^= text.charCodeAt(i); value32 = Math.imul(value32, 16777619); } return `fnv1a-${(value32 >>> 0).toString(16)}-${text.length}`; }
  function moduleId() { return Number(new URLSearchParams(location.search).get("module")) || 1; }
  function selectedLevel(id) { return read(`aiCourseDifficultyMeta:v2:${id}`, {}).selectedLevel || "beginner"; }
  function currentIdentity() { const profile = read("ai-course-profile", {}); return { userId: profile.id || "current-browser-student", role: "student" }; }
  function getExerciseIndex(root) { const text = root.querySelector(".m1-kicker")?.textContent || ""; const match = text.match(/(?:PRACTICE|VERIFY|CASE|INCIDENT|CODE PRACTICE|実習)\s*(\d+)/i); return match ? Math.max(0, Number(match[1]) - 1) : 0; }
  function identity(root) { const id = moduleId(); const title = root.querySelector("h1")?.textContent?.trim() || `実習 ${getExerciseIndex(root) + 1}`; return { moduleId: id, exerciseId: `exercise-${getExerciseIndex(root) + 1}-${title.replace(/\s+/g, "-").slice(0, 80)}`, index: getExerciseIndex(root), title }; }
  function recordId(meta) { return `${meta.moduleId}:${meta.exerciseId}`; }
  function controls(root) { return [...root.querySelectorAll("textarea, input:not([type=button]):not([type=submit]):not([type=hidden]):not([type=file]), select")].filter((element) => !element.closest(".exercise-evaluation")); }
  function answerData(root) {
    const values = {};
    controls(root).forEach((element, index) => {
      const name = element.name || element.id || element.dataset.field || `${element.tagName.toLowerCase()}_${index}`;
      if (element.type === "checkbox") values[name] = element.checked;
      else if (element.type === "radio") { if (element.checked) values[name] = element.value; }
      else values[name] = String(element.value || "").trim();
    });
    return values;
  }
  function localValidation(root) {
    const fields = controls(root);
    const textFields = fields.filter((element) => element.tagName === "TEXTAREA" || (element.tagName === "INPUT" && !["checkbox", "radio"].includes(element.type)));
    const unchecked = fields.filter((element) => element.type === "checkbox" && !element.checked);
    const blank = textFields.filter((element) => !String(element.value || "").trim());
    const size = JSON.stringify(answerData(root)).length;
    if (!textFields.length) return { valid: false, message: "回答を入力してください。" };
    if (blank.length) return { valid: false, message: "必須の回答を入力してください。" };
    if (unchecked.length) return { valid: false, message: "確認チェックを完了してください。" };
    if (size > 24000) return { valid: false, message: "回答が長すぎます。内容を整理してから、もう一度確認してください。" };
    return { valid: true, message: "回答をAIで確認できます。" };
  }
  function containsSensitiveData(value) {
    const text = JSON.stringify(value);
    return [/AKIA[0-9A-Z]{16}/, /(?:api[_ -]?key|secret|password|token)\s*[:=]\s*[^\s,]{8,}/i, /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/, /\b\d{3}-?\d{2}-?\d{4}\b/].some((pattern) => pattern.test(text));
  }
  function isHistorical(meta) {
    const record = read(moduleStorage[meta.moduleId], {});
    const done = record.completed || record.done || {};
    return Boolean(done[`exercise-${meta.index}`] || done[`ex${meta.index}`]);
  }
  function saveDraft(meta, answer) { const drafts = read(draftKey, {}); drafts[recordId(meta)] = { answer, updatedAt: new Date().toISOString() }; write(draftKey, drafts); }
  function restoreDraft(root, meta) {
    const draft = read(draftKey, {})[recordId(meta)]?.answer;
    if (!draft) return;
    controls(root).forEach((element, index) => {
      const name = element.name || element.id || element.dataset.field || `${element.tagName.toLowerCase()}_${index}`;
      if (!(name in draft)) return;
      if (element.type === "checkbox") element.checked = Boolean(draft[name]); else element.value = draft[name];
      element.dispatchEvent(new Event("input", { bubbles: true }));
    });
  }
  function updateStored(meta, update) { const all = read(evaluationKey, {}); const current = all[recordId(meta)] || { status: "not_checked", attemptCount: 0, evaluationVersion: ExerciseEvaluationCriteria.version }; all[recordId(meta)] = { ...current, ...update }; write(evaluationKey, all); return all[recordId(meta)]; }
  function readStored(meta) { return read(evaluationKey, {})[recordId(meta)] || null; }
  function feedbackHtml(result) {
    if (!result || !result.summary) return "";
    const list = (title, values) => values?.length ? `<strong>${title}</strong><ul>${values.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>` : "";
    return `<div class="exercise-evaluation__feedback"><strong>AI確認の要約</strong><p>${escapeHtml(result.summary)}</p>${list("できている点", result.strengths)}${list("修正・追加が必要な点", result.improvements)}${list("完了前に解決する点", result.blockingIssues)}${list("リスク", result.riskFlags)}</div>`;
  }
  function escapeHtml(value) { const item = document.createElement("span"); item.textContent = String(value); return item.innerHTML; }
  function render(widget, root, meta, completion) {
    const current = readStored(meta) || { status: "not_checked", evaluationVersion: ExerciseEvaluationCriteria.version, attemptCount: 0 };
    const validation = localValidation(root);
    const currentHash = hash(answerData(root));
    const criteria = ExerciseEvaluationCriteria.get(meta.moduleId, meta.exerciseId, selectedLevel(meta.moduleId));
    const versionChanged = current.evaluationVersion && current.evaluationVersion !== criteria.evaluationVersion;
    const changed = current.status === "passed" && current.checkedAnswerFingerprint !== currentHash;
    let status = versionChanged ? "outdated" : changed ? "outdated" : current.status;
    if ((versionChanged || changed) && current.status !== "outdated") updateStored(meta, { status: "outdated" });
    const historical = isHistorical(meta) && !current.checkedAt;
    const canComplete = status === "passed" && validation.valid && current.checkedAnswerFingerprint === currentHash;
    completion.disabled = !canComplete && !historical;
    completion.dataset.evaluationComplete = "true";
    completion.title = canComplete || historical ? "" : (statusText[status] || statusText.not_checked);
    const reason = historical ? "旧基準で完了しています。回答を編集して再受講する場合はAI確認が必要です。" : (!validation.valid ? validation.message : statusText[status]);
    const mock = current.provider === "mock" ? '<p class="exercise-evaluation__mock">開発用モック確認</p>' : "";
    widget.innerHTML = `<h3>AI確認</h3><p>回答の必須要件への適合を確認します。最終評価は講師が行います。</p><ul>${criteria.criteria.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul><p class="exercise-evaluation__status" data-status="${status}" aria-live="polite">${escapeHtml(reason)}</p>${mock}${feedbackHtml(current)}<div class="exercise-evaluation__actions"><button type="button" class="exercise-evaluation__check" ${validation.valid && status !== "checking" ? "" : "disabled"}>回答をAIで確認する</button></div>`;
    widget.querySelector(".exercise-evaluation__check").addEventListener("click", () => check(widget, root, meta, completion));
  }
  async function check(widget, root, meta, completion) {
    const validation = localValidation(root);
    if (!validation.valid) { render(widget, root, meta, completion); return; }
    const answer = answerData(root);
    if (containsSensitiveData(answer)) { updateStored(meta, { status: "error", summary: errorText.sensitive_data, checkedAt: null }); render(widget, root, meta, completion); return; }
    const id = recordId(meta);
    if (inFlight.has(id)) return;
    inFlight.add(id);
    const previous = readStored(meta) || {};
    updateStored(meta, { status: "checking", attemptCount: Number(previous.attemptCount || 0) + 1, lastAttemptAt: new Date().toISOString(), evaluationVersion: ExerciseEvaluationCriteria.version });
    render(widget, root, meta, completion);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25000);
    try {
      const identity = currentIdentity();
      const response = await fetch("/api/gemini/check-exercise", { method: "POST", headers: { "Content-Type": "application/json" }, signal: controller.signal, body: JSON.stringify({ ...identity, moduleId: meta.moduleId, exerciseId: meta.exerciseId, moduleTitle: COURSE_PLAN?.[meta.moduleId]?.title || `モジュール ${meta.moduleId}`, exerciseTitle: meta.title, level: selectedLevel(meta.moduleId), answerData: answer }) });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.result) throw new Error(payload.error || "default");
      updateStored(meta, { ...payload.result, checkedAnswerFingerprint: hash(answer), attemptCount: Number(previous.attemptCount || 0) + 1 });
    } catch (error) {
      const code = error.name === "AbortError" ? "timeout" : error.message || "default";
      updateStored(meta, { status: "error", summary: errorText[code] || errorText.default, checkedAt: null, provider: null });
    } finally {
      clearTimeout(timeout); inFlight.delete(id); render(widget, root, meta, completion);
    }
  }
  function candidateButtons(root) {
    return [...root.querySelectorAll("button")].filter((button) => {
      const id = button.id || "";
      const isAnswerSave = id.startsWith("save") || id.startsWith("finish") || id === "complete" || button.hasAttribute("data-complete") || button.hasAttribute("data-save-step");
      return isAnswerSave && !button.dataset.evaluationBound;
    });
  }
  function mount(root, button) {
    button.dataset.evaluationBound = "true";
    const meta = identity(root);
    const widget = document.createElement("section"); widget.className = "exercise-evaluation"; widget.setAttribute("aria-label", "AI確認");
    const actions = button.closest(".m1-actions");
    if (actions) actions.before(widget);
    else button.before(widget);
    restoreDraft(root, meta);
    const invalidate = () => {
      if (!widget.isConnected) return;
      saveDraft(meta, answerData(root));
      const current = readStored(meta);
      if (current?.status === "passed" && current.checkedAnswerFingerprint !== hash(answerData(root))) updateStored(meta, { status: "outdated" });
      render(widget, root, meta, button);
    };
    root.addEventListener("input", invalidate); root.addEventListener("change", invalidate);
    button.addEventListener("click", (event) => {
      const current = readStored(meta); const valid = current?.status === "passed" && current.checkedAnswerFingerprint === hash(answerData(root)) && localValidation(root).valid;
      if (!valid && !isHistorical(meta)) { event.preventDefault(); event.stopImmediatePropagation(); render(widget, root, meta, button); }
    }, true);
    render(widget, root, meta, button);
  }
  function scan() {
    const root = document.querySelector(".module-content") || document.querySelector(".module-main") || document.querySelector("main");
    if (!root || !root.querySelector("textarea")) return;
    candidateButtons(root).forEach((button) => mount(root, button));
  }
  const observer = new MutationObserver(() => scan());
  document.addEventListener("DOMContentLoaded", () => { scan(); observer.observe(document.body, { childList: true, subtree: true }); });
})();
