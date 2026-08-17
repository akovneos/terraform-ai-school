(() => {
  const moduleId = Number(new URLSearchParams(location.search).get("module"));
  if (!moduleId) return;

  const resumeKey = "ai-course-last-page";
  const moduleKeys = {
    1: "ai-course-module-one-complete",
    2: "llmFundamentalsModuleProgress",
    3: "engineerAiPatternsModuleProgress",
    4: "designResearchPracticeModuleProgress",
    5: "logAnalysisPracticeModuleProgress",
    6: "codeRefactorPracticeModuleProgress",
    7: "promptImprovementModuleProgress",
    8: "aiOutputVerificationRiskModuleProgress",
    9: "securityInformationManagementModuleProgress",
    10: "courseCompletionAssessmentProgress"
  };
  const trackedKeys = new Set(Object.values(moduleKeys));
  const navigationTargets = ["view", "page", "x", "id", "go", "section"];
  const submissionKey = "ai-course-submissions-v1";

  // Successful saves are displayed without blocking the learning flow.
  window.alert = (message) => {
    document.querySelector(".learner-toast")?.remove();
    const toast = document.createElement("div");
    toast.className = "learner-toast";
    toast.setAttribute("role", "status");
    toast.textContent = String(message || "保存しました。");
    document.body.append(toast);
    window.setTimeout(() => toast.remove(), 2800);
  };

  function sanitizeImportedData(value) {
    if (typeof value === "string") return value.replace(/[<>]/g, (character) => character === "<" ? "＜" : "＞");
    if (Array.isArray(value)) return value.map(sanitizeImportedData);
    if (value && typeof value === "object") {
      return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, sanitizeImportedData(item)]));
    }
    return value;
  }
  window.AICourseSanitizeImport = sanitizeImportedData;

  // Keep a learner's strongest quiz result without requiring every module to
  // duplicate the same bookkeeping. Reset still clears only its own module.
  const nativeSetItem = Storage.prototype.setItem;
  const nativeRemoveItem = Storage.prototype.removeItem;
  Storage.prototype.setItem = function setCourseItem(key, value) {
    if (trackedKeys.has(key) && typeof value === "string") {
      try {
        const next = JSON.parse(value);
        const previous = JSON.parse(this.getItem(key) || "{}");
        const score = next.quiz?.score ?? next.quiz?.result;
        if (next.quiz && !Number.isFinite(score) && Number.isFinite(previous.quiz?.bestScore)) {
          next.quiz.bestScore = previous.quiz.bestScore;
          next.quiz.attempts = previous.quiz.attempts || 1;
          next.quiz.lastAttemptAt = previous.quiz.lastAttemptAt;
          value = JSON.stringify(next);
        }
        if (Number.isFinite(score)) {
          const previousScore = previous.quiz?.score ?? previous.quiz?.result;
          next.quiz.bestScore = Math.max(Number.isFinite(previous.quiz?.bestScore) ? previous.quiz.bestScore : -Infinity, score);
          next.quiz.attempts = previous.quiz?.attempts || 0;
          if (!Number.isFinite(previousScore) || previousScore !== score) next.quiz.attempts += 1;
          next.quiz.lastAttemptAt = new Date().toISOString();
          value = JSON.stringify(next);
        }
      } catch {
        // Existing module saves remain available even if an old record is malformed.
      }
    }
    return nativeSetItem.call(this, key, value);
  };
  Storage.prototype.removeItem = function removeCourseItem(key) {
    const result = nativeRemoveItem.call(this, key);
    const id = Object.entries(moduleKeys).find(([, storedKey]) => storedKey === key)?.[0];
    if (id) {
      nativeRemoveItem.call(this, `aiCourseDifficultyMeta:v2:${id}`);
      nativeRemoveItem.call(this, `ai-course-section-progress:${id}`);
      nativeRemoveItem.call(this, `ai-course-exercise-count:${id}`);
    }
    return result;
  };

  function saveResume(target) {
    const view = navigationTargets.map((key) => target.dataset[key]).find(Boolean);
    if (!view) return;
    try {
      localStorage.setItem(resumeKey, JSON.stringify({ module: moduleId, view, updatedAt: new Date().toISOString() }));
    } catch {
      // The module itself continues to work when browser storage is unavailable.
    }
  }

  function addSafetyNotice() {
    const view = document.querySelector(".m1-view");
    if (!view || view.querySelector(".learner-safety-notice")) return;
    const notice = document.createElement("aside");
    notice.className = "learner-safety-notice";
    notice.setAttribute("role", "note");
    notice.innerHTML = "<strong>学習用データの注意</strong><span>実際の個人情報、顧客情報、機密情報、認証情報、未公開コードを入力しないでください。画面の例はすべて架空の学習用データです。</span>";
    const anchor = view.querySelector(".m1-lead") || view.querySelector(".m1-title");
    anchor?.after(notice);
  }

  function addAccessibleLabels() {
    const view = document.querySelector(".m1-view");
    if (!view) return;
    view.querySelectorAll('textarea:not([aria-label]), input[type="text"]:not([aria-label])').forEach((field) => {
      const previous = field.previousElementSibling;
      const containerLabel = field.closest("label")?.textContent?.trim();
      const label = previous?.matches("label") ? previous.textContent.trim() : containerLabel;
      if (label) field.setAttribute("aria-label", label);
    });
  }

  function addQuizHistory() {
    const view = document.querySelector(".m1-view");
    const result = view?.querySelector(".m1-result");
    if (!result || result.querySelector(".learner-quiz-history")) return;
    try {
      const record = JSON.parse(localStorage.getItem(moduleKeys[moduleId]) || "{}");
      const quiz = record.quiz || {};
      if (!Number.isFinite(quiz.bestScore)) return;
      const info = document.createElement("p");
      info.className = "learner-quiz-history";
      const date = quiz.lastAttemptAt ? new Date(quiz.lastAttemptAt).toLocaleDateString("ja-JP") : "-";
      info.textContent = `最高点：${quiz.bestScore} / 受験回数：${quiz.attempts || 1}回 / 最終受験日：${date}`;
      result.append(info);
    } catch {
      // Quiz feedback is optional and must not block the result page.
    }
  }

  function exerciseFinished(record, index) {
    const completed = record.completed || record.done || {};
    const answer = record.answers?.[`ex${index}`] || record.answers?.[`exercise-${index}`];
    return Boolean(
      completed[`ex${index}`] ||
      completed[`exercise-${index}`] ||
      answer?.decision ||
      answer?.completed
    );
  }

  function lockExercisesInOrder() {
    const buttons = [...document.querySelectorAll(".m1-exercises [data-ex], .m1-grid [data-exercise]")];
    if (!buttons.length) return;

    let record = {};
    try {
      record = JSON.parse(localStorage.getItem(moduleKeys[moduleId]) || "{}");
    } catch {
      return;
    }

    localStorage.setItem(`ai-course-exercise-count:${moduleId}`, String(buttons.length));

    buttons.forEach((button, position) => {
      const index = Number(button.dataset.ex ?? button.dataset.exercise ?? position);
      const unlocked = index === 0 || Array.from({ length: index }, (_, previous) => exerciseFinished(record, previous)).every(Boolean);
      button.disabled = !unlocked;
      button.classList.toggle("learner-task-locked", !unlocked);
      button.setAttribute("aria-disabled", String(!unlocked));
      button.title = unlocked ? "" : "前の実習を完了すると開けます。";
    });
  }

  function navigationTarget(button) {
    return navigationTargets.map((key) => button.dataset[key]).find(Boolean);
  }

  function readModuleRecord() {
    try {
      return JSON.parse(localStorage.getItem(moduleKeys[moduleId]) || "{}");
    } catch {
      return {};
    }
  }

  function readSectionProgress() {
    try {
      return JSON.parse(localStorage.getItem(`ai-course-section-progress:${moduleId}`) || "{}");
    } catch {
      return {};
    }
  }

  function markInformationalSectionComplete() {
    const active = document.querySelector(".m1-nav button.active");
    const section = active && navigationTarget(active);
    if (!section || !["learn", "theory", "progress", "goals"].includes(section)) return;
    const progress = readSectionProgress();
    if (progress[section]) return;
    progress[section] = true;
    localStorage.setItem(`ai-course-section-progress:${moduleId}`, JSON.stringify(progress));
  }

  function sectionFinished(record, section) {
    if (["home", "results", "terms", "glossary", "instructor", "result", "certificate"].includes(section)) return true;
    if (["learn", "theory", "progress", "goals"].includes(section)) return Boolean(readSectionProgress()[section]);
    if (["exercises", "list"].includes(section)) {
      const total = Number(localStorage.getItem(`ai-course-exercise-count:${moduleId}`));
      if (!Number.isFinite(total) || total < 1) return learningCompleted();
      return Array.from({ length: total }, (_, index) => exerciseFinished(record, index)).every(Boolean);
    }
    const completed = record.completed || record.done || {};
    return Boolean(completed[section]);
  }

  function sectionUnlocked(target) {
    if (learningCompleted()) return true;
    const record = readModuleRecord();
    // Existing completed work remains reachable even when older browser data
    // was saved before sequential navigation was introduced.
    if (sectionFinished(record, target)) return true;
    const buttons = [...document.querySelectorAll(".m1-nav button")].filter((button) => !button.dataset.levelSettings && !button.dataset.reviewPage);
    const targetIndex = buttons.findIndex((button) => navigationTarget(button) === target);
    if (targetIndex < 0 || targetIndex < 2) return true;
    return buttons.slice(1, targetIndex).every((button) => sectionFinished(record, navigationTarget(button)));
  }

  function lockModuleNavigation() {
    const buttons = [...document.querySelectorAll(".m1-nav button")].filter((button) => !button.dataset.levelSettings && !button.dataset.reviewPage);
    buttons.forEach((button) => {
      const unlocked = sectionUnlocked(navigationTarget(button));
      button.disabled = !unlocked;
      button.classList.toggle("learner-section-locked", !unlocked);
      button.setAttribute("aria-disabled", String(!unlocked));
      button.title = unlocked ? "" : "前の学習項目を完了すると開けます。";
    });

    const review = document.querySelector("[data-review-page]");
    if (review) {
      const unlocked = learningCompleted();
      review.disabled = !unlocked;
      review.classList.toggle("learner-section-locked", !unlocked);
      review.setAttribute("aria-disabled", String(!unlocked));
      review.title = unlocked ? "" : "モジュールを完了すると提出できます。";
    }
  }

  function addModuleProfileLink() {
    const actions = document.querySelector(".m1-header-actions");
    if (!actions || actions.querySelector(".learner-module-profile")) return;

    const name = [...actions.querySelectorAll(":scope > span")].find((item) => {
      const text = item.textContent.trim();
      return text && !item.classList.contains("m1-avatar") && !/自動保存|保存済み/.test(text);
    });
    const avatar = actions.querySelector(".m1-avatar");
    if (!name && !avatar) return;

    const profile = JSON.parse(localStorage.getItem("ai-course-profile") || "{}");
    const wrap = document.createElement("div");
    wrap.className = "profile-wrap learner-module-profile";
    const learnerName = profile.name || name?.textContent.trim() || "受講生A";
    wrap.innerHTML = `<button type="button" class="profile" data-module-profile-button aria-expanded="false" aria-controls="module-profile-menu"><i data-lucide="user-round"></i><span class="profile-name"></span><i data-lucide="chevron-down"></i></button><div class="learner-module-profile-menu" id="module-profile-menu" hidden><strong></strong><span>AI業務活用研修</span><hr><a href="profile.html"><i data-lucide="contact-round"></i> プロフィール</a><a href="levels.html"><i data-lucide="settings"></i> 学習レベル</a></div>`;
    wrap.querySelector(".profile-name").textContent = learnerName;
    wrap.querySelector("strong").textContent = learnerName;
    name?.remove();
    avatar?.remove();
    actions.append(wrap);
    window.lucide?.createIcons();
  }

  function readSubmissions() {
    try {
      const records = JSON.parse(localStorage.getItem(submissionKey) || "{}");
      return records && typeof records === "object" ? records : {};
    } catch {
      return {};
    }
  }

  function readSubmission() {
    return readSubmissions()[moduleId] || { status: "draft", memo: "", checks: [] };
  }

  function saveSubmission(next) {
    const records = readSubmissions();
    records[moduleId] = next;
    localStorage.setItem(submissionKey, JSON.stringify(records));
  }

  function learningCompleted() {
    const progress = document.querySelector("#progress, #p, [id$='-progress'], .m1-progress-label b")?.textContent || "";
    return Number.parseInt(progress, 10) === 100;
  }

  function submissionStatus(status) {
    if (status === "draft" && learningCompleted()) return ["提出準備完了", "blue"];
    return {
      draft: ["下書き", "muted"],
      ai_evaluating: ["AI評価中", "blue"],
      ai_feedback: ["AIフィードバック済み", "blue"],
      teacher_pending: ["講師確認待ち", "yellow"],
      passed: ["合格", "green"],
      revision_requested: ["要修正", "red"]
    }[status] || ["下書き", "muted"];
  }

  function addReviewMenuItem() {
    const nav = document.querySelector(".m1-nav");
    if (!nav) return;
    if (nav.querySelector("[data-review-page]")) {
      updateReviewMenu();
      return;
    }
    const button = document.createElement("button");
    const [label, tone] = submissionStatus(readSubmission().status);
    button.type = "button";
    button.className = "learner-review-menu";
    button.dataset.reviewPage = "true";
    button.innerHTML = `<i data-lucide="file-check-2"></i><span>提出・評価</span><small class="learner-review-menu-status ${tone}">${label}</small>`;
    nav.append(button);
    window.lucide?.createIcons();
  }

  function updateReviewMenu() {
    const [label, tone] = submissionStatus(readSubmission().status);
    document.querySelectorAll(".learner-review-menu-status").forEach((element) => {
      const className = `learner-review-menu-status ${tone}`;
      if (element.textContent !== label) element.textContent = label;
      if (element.className !== className) element.className = className;
    });
  }

  const maxAttachmentCount = 5;
  const maxAttachmentSize = 10 * 1024 * 1024;

  function fileMetadata(file) {
    return {
      name: file.name,
      size: file.size,
      type: file.type || "application/octet-stream",
      lastModified: file.lastModified
    };
  }

  function formatFileSize(size) {
    if (!Number.isFinite(size)) return "-";
    if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))} KB`;
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  }

  function renderAttachmentList(list, attachments, savedCount = attachments.length) {
    list.innerHTML = "";
    if (!attachments.length) {
      const empty = document.createElement("p");
      empty.className = "learner-attachment-empty";
      empty.textContent = "添付ファイルはありません。";
      list.append(empty);
      return;
    }
    attachments.forEach((attachment, index) => {
      const item = document.createElement("li");
      const details = document.createElement("span");
      const name = document.createElement("strong");
      const meta = document.createElement("small");
      name.textContent = attachment.name;
      meta.textContent = `${formatFileSize(attachment.size)}${index >= savedCount ? " ・ 保存時に追加" : ""}`;
      details.append(name, meta);
      item.append(details);
      if (index < savedCount) {
        const remove = document.createElement("button");
        remove.type = "button";
        remove.dataset.removeAttachment = String(index);
        remove.setAttribute("aria-label", `${attachment.name} を削除`);
        remove.textContent = "削除";
        item.append(remove);
      }
      list.append(item);
    });
  }

  function addAttachmentField(view, record) {
    const memo = view.querySelector("#submission-memo");
    if (!memo || view.querySelector("[data-submission-files]")) return;
    const attachments = Array.isArray(record.attachments) ? record.attachments : [];
    const field = document.createElement("section");
    field.className = "learner-attachment-field";
    field.innerHTML = '<label for="submission-files">添付ファイル</label><input id="submission-files" data-submission-files type="file" multiple><p>補足資料、作成したドキュメント、画面キャプチャを最大5件、各10 MBまで添付できます。個人情報・認証情報・機密情報は添付しないでください。</p><ul class="learner-attachment-list" data-attachment-list></ul><small class="learner-attachment-note">現在は画面試作です。下書き保存時にはファイル本体ではなく、ファイル名・形式・サイズのみが保存されます。</small>';
    memo.closest(".m1-field")?.after(field);
    const list = field.querySelector("[data-attachment-list]");
    renderAttachmentList(list, attachments);
    field.querySelector("[data-submission-files]").addEventListener("change", (event) => {
      renderAttachmentList(list, [...attachments, ...Array.from(event.target.files).map(fileMetadata)], attachments.length);
    });
  }

  function collectAttachmentMetadata() {
    const current = readSubmission();
    const existing = Array.isArray(current.attachments) ? current.attachments : [];
    const selected = Array.from(document.querySelector("[data-submission-files]")?.files || []);
    if (existing.length + selected.length > maxAttachmentCount) {
      alert(`添付ファイルは最大${maxAttachmentCount}件までです。`);
      return null;
    }
    if (selected.some((file) => file.size > maxAttachmentSize)) {
      alert("添付ファイルは1件あたり10 MB以下にしてください。");
      return null;
    }
    return [...existing, ...selected.map(fileMetadata)];
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function responseLabel(key) {
    const labels = {
      prompt: "AIへの質問",
      answer: "回答",
      reason: "判断理由",
      correct: "正しい点",
      verify: "確認内容",
      judgement: "最終判断",
      facts: "確認できる事実",
      hypotheses: "原因候補",
      additional: "追加確認項目",
      incident: "障害概要",
      report: "レポート",
      summary: "要約",
      conclusion: "結論",
      review: "レビュー内容",
      improvement: "改善内容",
      risk: "リスク",
      result: "結果",
      memo: "メモ"
    };
    if (/^ex\d+$/.test(key)) return `実習 ${String(Number(key.slice(2)) + 1).padStart(2, "0")}`;
    return labels[key] || key;
  }

  function collectLearningResponses(value, path = [], items = []) {
    if (items.length >= 40 || value === null || value === undefined) return items;
    if (typeof value === "string") {
      const text = value.trim();
      if (text.length >= 2 && !/^\d{4}-\d{2}-\d{2}T/.test(text)) {
        items.push({ label: path.map(responseLabel).join(" / ") || "学習回答", text });
      }
      return items;
    }
    if (Array.isArray(value)) {
      value.forEach((entry, index) => collectLearningResponses(entry, [...path, `回答 ${index + 1}`], items));
      return items;
    }
    if (typeof value === "object") {
      Object.entries(value).forEach(([key, entry]) => {
        if (["completed", "done", "checks", "quiz", "level", "attachments"].includes(key)) return;
        collectLearningResponses(entry, [...path, key], items);
      });
    }
    return items;
  }

  function learningRecordMarkup() {
    let learningRecord = {};
    try {
      learningRecord = JSON.parse(localStorage.getItem(moduleKeys[moduleId]) || "{}");
    } catch {
      // An unavailable or malformed record must not prevent submission.
    }
    const items = collectLearningResponses(learningRecord);
    const completed = Object.keys(learningRecord.completed || learningRecord.done || {}).length;
    const quiz = learningRecord.quiz || {};
    const quizScore = Number.isFinite(quiz.bestScore) ? `${quiz.bestScore}点` : Number.isFinite(quiz.score) ? `${quiz.score}点` : "未受験";
    const answers = items.length
      ? `<div class="learner-submission-answers">${items.map((item) => `<details><summary>${escapeHtml(item.label)}</summary><p>${escapeHtml(item.text).replace(/\n/g, "<br>")}</p></details>`).join("")}</div>`
      : "<p class=\"learner-submission-empty\">保存済みの実習回答はまだありません。</p>";
    return `<section class="learner-review-card learner-submission-record"><h2>提出する学習記録</h2><p>このモジュールで保存した実習回答と学習記録です。AIと講師は、提出メモとあわせて確認します。</p><div class="learner-submission-stats"><span>完了項目：<strong>${completed}件</strong></span><span>テスト結果：<strong>${quizScore}</strong></span><span>回答数：<strong>${items.length}件</strong></span></div>${answers}</section>`;
  }

  function reviewMarkup(record) {
    const [label, tone] = submissionStatus(record.status);
    const review = record.aiReview;
    const scores = review ? `<section class="learner-review-card"><div class="learner-review-card-head"><div><p class="m1-kicker">AI REVIEW</p><h2>AIによる事前評価</h2></div><span class="learner-review-status ${tone}">${label}</span></div><p class="learner-review-disclaimer">これは画面試作のサンプル評価です。現在は外部AIへ送信していません。正式運用では、AIの評価結果を講師が必ず確認します。</p><div class="learner-review-scores"><div><span>総合</span><strong>${review.overall}</strong><small>/ 100</small></div><div><span>課題の充足</span><strong>${review.completeness}</strong><small>/ 100</small></div><div><span>根拠・検証</span><strong>${review.evidence}</strong><small>/ 100</small></div><div><span>安全性</span><strong>${review.safety}</strong><small>/ 100</small></div></div><div class="learner-review-feedback"><div><h3>できている点</h3><p>${review.strength}</p></div><div><h3>改善するとよい点</h3><p>${review.improvement}</p></div><div><h3>講師が確認する点</h3><p>${review.teacherFocus}</p></div></div></section>` : "";
    const teacher = record.teacherReview ? `<section class="learner-review-card learner-teacher-result"><p class="m1-kicker">INSTRUCTOR REVIEW</p><h2>講師の最終評価</h2><p><strong>${record.teacherReview.result}</strong></p><p>${record.teacherReview.comment || "講師コメントはまだありません。"}</p></section>` : "";
    return `<p class="m1-kicker">SUBMISSION & REVIEW</p><h1 class="m1-title">提出・評価</h1><p class="m1-lead">AIの事前評価を参考に内容を見直し、最終評価は講師が行います。</p><section class="learner-review-card"><div class="learner-review-card-head"><div><h2>提出状況</h2><p>このモジュール：${COURSE_PLAN[moduleId]?.title || `MODULE ${moduleId}`}</p></div><span class="learner-review-status ${tone}">${label}</span></div><ol class="learner-review-flow"><li class="${record.status !== "draft" ? "done" : ""}">提出内容を確認</li><li class="${["ai_feedback", "teacher_pending", "passed", "revision_requested"].includes(record.status) ? "done" : ""}">AIの事前評価</li><li class="${["teacher_pending", "passed", "revision_requested"].includes(record.status) ? "done" : ""}">講師の最終確認</li></ol><div class="m1-field"><label for="submission-memo">提出メモ・最終判断</label><textarea id="submission-memo" placeholder="このモジュールで学んだこと、自分が確認した根拠、最終判断、残る課題をまとめてください。">${record.memo || ""}</textarea></div><label class="m1-check"><input type="checkbox" data-submission-check="0" ${record.checks?.[0] ? "checked" : ""}><span>提出内容に個人情報、機密情報、認証情報を含めていない</span></label><label class="m1-check"><input type="checkbox" data-submission-check="1" ${record.checks?.[1] ? "checked" : ""}><span>AIの回答を根拠とともに自分で確認した</span></label><label class="m1-check"><input type="checkbox" data-submission-check="2" ${record.checks?.[2] ? "checked" : ""}><span>最終判断をAIに委ねていない</span></label><div class="m1-actions"><button type="button" class="m1-secondary" data-save-submission>下書きを保存</button>${record.status === "teacher_pending" ? "" : `<button type="button" class="m1-primary" data-request-ai>AI評価を依頼する</button>`}</div></section>${learningRecordMarkup()}${scores}${teacher}${record.status === "ai_feedback" ? `<section class="learner-review-card"><h2>講師確認へ進む</h2><p>AIの改善提案を確認したうえで、講師による最終評価を依頼します。</p><div class="m1-actions"><button type="button" class="m1-secondary" data-resubmit>内容を見直す</button><button type="button" class="m1-primary" data-send-teacher>講師確認へ提出する</button></div></section>` : ""}${record.status === "teacher_pending" ? `<section class="learner-review-card"><h2>講師確認待ち</h2><p>講師の最終評価を待っています。提出内容は確認待ちの間も下書きとして保存できます。</p></section>` : ""}`;
  }

  function openReviewPage() {
    const view = document.querySelector(".m1-view");
    if (!view) return;
    view.classList.add("learner-review-screen");
    view.innerHTML = reviewMarkup(readSubmission());
    addAttachmentField(view, readSubmission());
    window.lucide?.createIcons();
  }

  function collectSubmission() {
    return {
      memo: document.getElementById("submission-memo")?.value.trim() || "",
      checks: [...document.querySelectorAll("[data-submission-check]")].map((input) => input.checked),
      attachments: collectAttachmentMetadata()
    };
  }

  function createPreviewReview(submission) {
    const detailed = submission.memo.length >= 160;
    return {
      overall: detailed ? 82 : 70,
      completeness: detailed ? 84 : 72,
      evidence: detailed ? 78 : 64,
      safety: 90,
      strength: "提出前の安全確認を完了し、AIに最終判断を委ねない方針が明確です。",
      improvement: detailed ? "根拠となるログ、仕様、確認手順をさらに具体的に記録すると、第三者が判断を追跡しやすくなります。" : "提出メモに、確認した事実・根拠・自分の最終判断をもう少し具体的に追加してください。",
      teacherFocus: "回答が実際の実習内容と整合しているか、根拠が妥当かを講師が確認します。"
    };
  }

  function restoreResume() {
    try {
      const saved = JSON.parse(localStorage.getItem(resumeKey) || "null");
      if (!saved || saved.module !== moduleId || !saved.view) return;
      const selector = `[data-view="${saved.view}"], [data-page="${saved.view}"], [data-x="${saved.view}"], [data-id="${saved.view}"]`;
      const target = document.querySelector(selector);
      if (target) target.click();
    } catch {
      // An invalid old record must never prevent a learner from opening a module.
    }
  }

  function levelLabel(level) {
    return window.AICourseDifficulty?.config?.[level]?.label || "未経験者向け";
  }

  function removeInlineLevelControls() {
    const view = document.querySelector(".m1-view");
    if (!view || view.classList.contains("learner-level-screen")) return;
    view.querySelectorAll('input[name="level"]').forEach((input) => {
      input.closest("section")?.remove();
    });
    view.querySelectorAll(".difficulty-panel").forEach((panel) => panel.remove());
    view.querySelectorAll(".m1-card span").forEach((label) => {
      if (label.textContent.trim() === "現在の学習レベル") label.closest(".m1-card")?.remove();
    });
  }

  function addLevelMenuItem() {
    const nav = document.querySelector(".m1-nav");
    if (!nav || nav.querySelector("[data-level-settings]")) return;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "learner-level-menu";
    button.dataset.levelSettings = "true";
    button.innerHTML = '<i data-lucide="sliders-horizontal"></i><span>学習レベル</span><small>' + levelLabel(window.AICourseDifficulty?.currentLevel?.()) + '</small>';
    const theory = [...nav.querySelectorAll("button")].find((item) => /基礎知識|基礎を学ぶ|理論/.test(item.textContent));
    (theory || nav.firstElementChild)?.after(button);
    window.lucide?.createIcons();
  }

  function openLevelSettings() {
    const view = document.querySelector(".m1-view");
    if (!view) return;
    const difficulty = window.AICourseDifficulty;
    const selected = difficulty?.currentLevel?.() || "beginner";
    const levels = difficulty?.config || {
      beginner: { label: "未経験者向け", description: "ヒントと例を使い、基本用語と人間による確認を学びます。" },
      intermediate: { label: "IT基礎経験者向け", description: "根拠、影響、主要リスクまで整理します。" },
      engineer: { label: "現役エンジニア向け", description: "技術的根拠、影響範囲、検証手順、改善案まで記録します。" }
    };
    view.classList.add("learner-level-screen");
    view.innerHTML = `<p class="m1-kicker">LEARNING SETTINGS</p><h1 class="m1-title">学習レベル</h1><p class="m1-lead">取り組むテーマは変わりません。レベルにより、ヒントの量と回答に求める深さが変わります。</p><section class="learner-level-card"><h2>現在のレベルを選択</h2><div class="learner-level-options">${Object.entries(levels).map(([id, item]) => `<label class="learner-level-option ${selected === id ? "selected" : ""}"><input type="radio" name="course-level" value="${id}" ${selected === id ? "checked" : ""}><strong>${item.label}</strong><span>${item.description}</span></label>`).join("")}</div><p class="learner-level-help">レベルを変更しても、入力済みの回答や提出データは削除されません。</p><div class="learner-level-actions"><button type="button" class="m1-secondary" data-level-back>前の画面へ戻る</button><button type="button" class="m1-primary" data-level-save>学習レベルを保存</button></div><p class="learner-level-status" aria-live="polite"></p></section>`;
    window.lucide?.createIcons();
  }

  function returnFromLevelSettings() {
    document.querySelector(".m1-view")?.classList.remove("learner-level-screen");
    const saved = JSON.parse(localStorage.getItem(resumeKey) || "null");
    const selector = saved?.module === moduleId && saved?.view
      ? `[data-view="${saved.view}"], [data-page="${saved.view}"], [data-x="${saved.view}"], [data-id="${saved.view}"]`
      : '[data-view="home"], [data-page="home"], [data-x="home"], [data-id="home"]';
    const target = document.querySelector(selector);
    if (target) target.click();
  }

  document.addEventListener("click", (event) => {
    const nextTarget = event.target.closest("[data-go]")?.dataset.go;
    if (nextTarget) markInformationalSectionComplete();
    if (nextTarget && !sectionUnlocked(nextTarget)) {
      event.preventDefault();
      event.stopImmediatePropagation();
      alert("前の学習項目を完了してから進んでください。");
      return;
    }
    const attachmentRemove = event.target.closest("[data-remove-attachment]");
    if (attachmentRemove) {
      const current = readSubmission();
      const attachments = Array.isArray(current.attachments) ? [...current.attachments] : [];
      attachments.splice(Number(attachmentRemove.dataset.removeAttachment), 1);
      saveSubmission({ ...current, attachments, updatedAt: new Date().toISOString() });
      openReviewPage();
      return;
    }
    const reviewButton = event.target.closest("[data-review-page]");
    if (reviewButton) {
      event.preventDefault();
      event.stopImmediatePropagation();
      openReviewPage();
      return;
    }
    const profileButton = event.target.closest("[data-module-profile-button]");
    if (profileButton) {
      const menu = profileButton.closest(".learner-module-profile")?.querySelector(".learner-module-profile-menu");
      const open = Boolean(menu?.hidden);
      if (menu) menu.hidden = !open;
      profileButton.setAttribute("aria-expanded", String(open));
      return;
    }
    if (!event.target.closest(".learner-module-profile")) {
      document.querySelectorAll(".learner-module-profile-menu").forEach((menu) => {
        menu.hidden = true;
      });
      document.querySelectorAll("[data-module-profile-button]").forEach((button) => {
        button.setAttribute("aria-expanded", "false");
      });
    }
    const levelButton = event.target.closest("[data-level-settings]");
    if (levelButton) {
      event.preventDefault();
      openLevelSettings();
      return;
    }
    if (event.target.closest("[data-level-save]")) {
      const level = document.querySelector('input[name="course-level"]:checked')?.value;
      if (level && window.AICourseDifficulty?.setLevel) {
        window.AICourseDifficulty.setLevel(level);
        const status = document.querySelector(".learner-level-status");
        if (status) status.textContent = `${levelLabel(level)}に保存しました。`;
        document.querySelectorAll(".learner-level-option").forEach((option) => option.classList.toggle("selected", option.querySelector("input")?.value === level));
        document.querySelectorAll(".learner-level-menu small").forEach((item) => item.textContent = levelLabel(level));
      }
      return;
    }
    if (event.target.closest("[data-level-back]")) {
      returnFromLevelSettings();
      return;
    }
    if (event.target.closest("[data-save-submission]")) {
      const current = readSubmission();
      const submission = collectSubmission();
      if (!submission.attachments) return;
      saveSubmission({ ...current, ...submission, status: current.status === "draft" ? "draft" : current.status, updatedAt: new Date().toISOString() });
      updateReviewMenu();
      openReviewPage();
      return;
    }
    if (event.target.closest("[data-request-ai]")) {
      const submission = collectSubmission();
      if (!submission.attachments || !submission.memo || submission.checks.some((value) => !value)) {
        alert("提出メモと3つの確認項目を完了してください。");
        return;
      }
      saveSubmission({ ...readSubmission(), ...submission, status: "ai_evaluating", submittedAt: new Date().toISOString() });
      updateReviewMenu();
      openReviewPage();
      setTimeout(() => {
        const current = readSubmission();
        if (current.status !== "ai_evaluating") return;
        saveSubmission({ ...current, status: "ai_feedback", aiReview: createPreviewReview(current), aiReviewedAt: new Date().toISOString() });
        updateReviewMenu();
        if (document.querySelector(".learner-review-screen")) openReviewPage();
      }, 900);
      return;
    }
    if (event.target.closest("[data-resubmit]")) {
      saveSubmission({ ...readSubmission(), status: "draft" });
      updateReviewMenu();
      openReviewPage();
      return;
    }
    if (event.target.closest("[data-send-teacher]")) {
      saveSubmission({ ...readSubmission(), status: "teacher_pending", teacherSubmittedAt: new Date().toISOString() });
      updateReviewMenu();
      openReviewPage();
      return;
    }
    const target = event.target.closest("[data-view], [data-page], [data-x], [data-id], [data-go]");
    if (target) saveResume(target);
  }, true);

  const observer = new MutationObserver(() => {
    addSafetyNotice();
    addAccessibleLabels();
    addQuizHistory();
    lockExercisesInOrder();
    lockModuleNavigation();
    addModuleProfileLink();
    removeInlineLevelControls();
    addReviewMenuItem();
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
  addSafetyNotice();
  addAccessibleLabels();
  addQuizHistory();
  lockExercisesInOrder();
  lockModuleNavigation();
  addModuleProfileLink();
  removeInlineLevelControls();
  addReviewMenuItem();
  setTimeout(() => {
    if (new URLSearchParams(location.search).get("review") === "1") {
      openReviewPage();
      return;
    }
    restoreResume();
  }, 40);
})();
