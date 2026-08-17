(() => {
  function escapeHtml(value) {
    return String(value || "").replace(/[&<>\"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[char]);
  }

  window.renderRecoveredModule = (config) => {
    const moduleId = Number(new URLSearchParams(location.search).get("module"));
    if (moduleId !== config.id) return;

    const state = JSON.parse(localStorage.getItem(config.key) || "{}") || {};
    state.done ||= {};
    state.answers ||= {};
    state.quiz ||= {};
    const total = config.exercises.length + 5;

    const save = () => localStorage.setItem(config.key, JSON.stringify(state));
    const count = () => Object.keys(state.done).length;
    const percent = () => Math.min(100, Math.round((count() / total) * 100));

    document.body.innerHTML = `
      <div class="m1-page">
        <header class="m1-header"><a class="m1-brand" href="index.html"><i data-lucide="graduation-cap"></i>AI業務活用研修</a><span class="m1-header-title">MODULE ${String(config.id).padStart(2, "0")}　${config.title}</span><div class="m1-header-actions"><span><i data-lucide="cloud-check"></i> 自動保存</span><span>受講生A</span><span class="m1-avatar">A</span></div></header>
        <div class="m1-shell"><aside class="m1-sidebar"><div class="m1-progress-label"><span>モジュール進捗</span><b id="progress">${percent()}%</b></div><div class="m1-progress"><span id="bar" style="width:${percent()}%"></span></div><p class="m5-note" id="count">完了 ${count()}件 / 未完了 ${Math.max(0, total - count())}件</p><nav class="m1-nav" id="nav"></nav></aside><main class="m1-main"><div class="m1-view" id="view"></div></main></div>
      </div>`;

    const view = document.getElementById("view");
    const nav = document.getElementById("nav");
    const sections = [
      ["home", "モジュール概要"], ["basics", "基礎知識"], ["pre", "実習前整理"], ["list", "実習一覧"], ["review", "確認・比較"], ["final", "総合課題"], ["quiz", "総合テスト"], ["results", "学習結果"]
    ];

    function refresh() {
      document.getElementById("progress").textContent = `${percent()}%`;
      document.getElementById("bar").style.width = `${percent()}%`;
      document.getElementById("count").textContent = `完了 ${count()}件 / 未完了 ${Math.max(0, total - count())}件`;
    }

    function drawMenu(active) {
      nav.innerHTML = sections.map(([id, label]) => `<button class="${active === id ? "active" : ""} ${state.done[id] ? "done" : ""}" data-section="${id}">${state.done[id] ? "✓ " : ""}${label}</button>`).join("");
      nav.querySelectorAll("button").forEach((button) => button.onclick = () => render(button.dataset.section));
      refresh();
    }

    function notice(text) {
      const node = document.getElementById("notice");
      if (node) node.textContent = text;
    }

    function home() {
      view.innerHTML = `<p class="m1-kicker">MODULE ${String(config.id).padStart(2, "0")}</p><h1 class="m1-title">${config.title}</h1><p class="m1-lead">${config.lead}</p><section class="m1-card"><h2>学習の目的</h2><p>${config.goal}</p><p>AIの回答をそのまま採用せず、根拠・影響・リスクを確認し、最終判断を人間が行います。</p></section><section class="m1-card" style="margin-top:14px"><h2>実習</h2><p>${config.exercises.length}件の実習、確認・比較、総合課題、総合テストで構成されています。</p></section><div class="m1-actions"><button class="m1-primary" id="start">学習を開始する</button></div>`;
      document.getElementById("start").onclick = () => render("basics");
    }

    function basics() {
      view.innerHTML = `<p class="m1-kicker">基礎知識</p><h1 class="m1-title">${config.basicsTitle}</h1><section class="m1-card"><h2>重要な考え方</h2><ul class="m1-task-list">${config.basics.map((item) => `<li>${item}</li>`).join("")}</ul><label class="m1-check"><input id="basicsCheck" type="checkbox" ${state.done.basics ? "checked" : ""}> AIの提案は候補であり、根拠確認と人間による最終判断が必要だと理解した</label><button class="m1-primary" id="saveBasics">基礎知識を確認した</button><p id="notice" class="m5-note"></p></section>`;
      document.getElementById("saveBasics").onclick = () => { if (!document.getElementById("basicsCheck").checked) return notice("確認チェックを選択してください。"); state.done.basics = true; save(); drawMenu("basics"); notice("保存しました。"); };
    }

    function pre() {
      const data = state.pre || {};
      view.innerHTML = `<p class="m1-kicker">実習前整理</p><h1 class="m1-title">AIを使う前の考え</h1><section class="m1-card"><div class="m1-field"><label>対象業務・目的</label><textarea id="purpose">${escapeHtml(data.purpose)}</textarea></div><div class="m1-field"><label>確認したい点・前提条件</label><textarea id="context">${escapeHtml(data.context)}</textarea></div><div class="m1-field"><label>想定されるリスク・人間が確認する点</label><textarea id="risk">${escapeHtml(data.risk)}</textarea></div><button class="m1-primary" id="savePre">実習前整理を保存する</button><p id="notice" class="m5-note"></p></section>`;
      document.getElementById("savePre").onclick = () => { const data = { purpose: document.getElementById("purpose").value.trim(), context: document.getElementById("context").value.trim(), risk: document.getElementById("risk").value.trim() }; if (Object.values(data).some((value) => !value)) return notice("3項目すべてを記入してください。"); state.pre = data; state.done.pre = true; save(); drawMenu("pre"); notice("保存しました。"); };
    }

    function list() {
      view.innerHTML = `<p class="m1-kicker">実習一覧</p><h1 class="m1-title">実務演習</h1><p class="m1-lead">各実習について、AI案の確認、問題またはリスク、判断理由、人間確認を記録します。</p><div class="m1-grid">${config.exercises.map((exercise, index) => `<section class="m1-card"><p class="m1-kicker">実習 ${String(index + 1).padStart(2, "0")}</p><h2>${exercise.title}</h2><p>${exercise.description}</p><span class="l2-badge ${state.done[`ex${index}`] ? "done" : ""}">${state.done[`ex${index}`] ? "完了" : "未完了"}</span><div class="m1-actions"><button class="m1-primary" data-exercise="${index}">${state.done[`ex${index}`] ? "回答を確認する" : "実習を開始する"}</button></div></section>`).join("")}</div>`;
      view.querySelectorAll("[data-exercise]").forEach((button) => button.onclick = () => exercise(Number(button.dataset.exercise)));
    }

    function exercise(index) {
      const item = config.exercises[index];
      const answer = state.answers[`ex${index}`] || {};
      view.innerHTML = `<p class="m1-kicker">実習 ${String(index + 1).padStart(2, "0")} / ${config.exercises.length}</p><h1 class="m1-title">${item.title}</h1><section class="m1-card"><h2>シナリオ</h2><p>${item.description}</p><div class="m1-ai"><b>AIの学習用サンプル</b><p>${item.ai}</p></div><div class="m1-field"><label>確認できる事実・有用な点</label><textarea id="facts">${escapeHtml(answer.facts)}</textarea></div><div class="m1-field"><label>問題点・リスク・追加確認</label><textarea id="risks">${escapeHtml(answer.risks)}</textarea></div><div class="m1-field"><label>最終判断と人間が確認する内容</label><textarea id="judgment">${escapeHtml(answer.judgment)}</textarea></div><label class="m1-check"><input id="check" type="checkbox" ${answer.check ? "checked" : ""}> AIの提案をそのまま実行せず、要件・根拠・影響を確認した</label><div class="m1-actions"><button class="m1-secondary" id="back">実習一覧へ戻る</button><button class="m1-primary" id="saveExercise">実習を保存する</button></div><p id="notice" class="m5-note"></p></section>`;
      document.getElementById("back").onclick = list;
      document.getElementById("saveExercise").onclick = () => { const data = { facts: document.getElementById("facts").value.trim(), risks: document.getElementById("risks").value.trim(), judgment: document.getElementById("judgment").value.trim(), check: document.getElementById("check").checked }; if (!data.facts || !data.risks || !data.judgment || !data.check) return notice("回答3項目と確認チェックを完了してください。"); state.answers[`ex${index}`] = data; state.done[`ex${index}`] = true; save(); drawMenu("list"); notice("実習を保存しました。"); };
    }

    function review() {
      const data = state.review || {};
      view.innerHTML = `<p class="m1-kicker">確認・比較</p><h1 class="m1-title">AI出力の確認</h1><section class="m1-card"><p>完了実習：${config.exercises.filter((_, index) => state.done[`ex${index}`]).length} / ${config.exercises.length}</p><div class="m1-field"><label>AI案から採用できる部分</label><textarea id="adopt">${escapeHtml(data.adopt)}</textarea></div><div class="m1-field"><label>修正・不採用にする部分と理由</label><textarea id="revise">${escapeHtml(data.revise)}</textarea></div><div class="m1-field"><label>追加で確認する根拠・テスト・レビュー</label><textarea id="evidence">${escapeHtml(data.evidence)}</textarea></div><button class="m1-primary" id="saveReview">確認結果を保存する</button><p id="notice" class="m5-note"></p></section>`;
      document.getElementById("saveReview").onclick = () => { const data = { adopt: document.getElementById("adopt").value.trim(), revise: document.getElementById("revise").value.trim(), evidence: document.getElementById("evidence").value.trim() }; if (Object.values(data).some((value) => !value)) return notice("3項目すべてを記入してください。"); state.review = data; state.done.review = true; save(); drawMenu("review"); notice("保存しました。"); };
    }

    function finalTask() {
      const data = state.final || {};
      view.innerHTML = `<p class="m1-kicker">総合課題</p><h1 class="m1-title">${config.finalTitle}</h1><section class="m1-card"><p>${config.finalPrompt}</p><div class="m1-field"><label>分析・確認した根拠</label><textarea id="analysis">${escapeHtml(data.analysis)}</textarea></div><div class="m1-field"><label>リスクと修正案</label><textarea id="risk">${escapeHtml(data.risk)}</textarea></div><div class="m1-field"><label>最終判断と人間の責任</label><textarea id="decision">${escapeHtml(data.decision)}</textarea></div><label class="m1-check"><input id="check" type="checkbox" ${data.check ? "checked" : ""}> 本番環境への変更は、人間の確認・承認・テスト後に行う</label><button class="m1-primary" id="saveFinal">総合課題を保存する</button><p id="notice" class="m5-note"></p></section>`;
      document.getElementById("saveFinal").onclick = () => { const data = { analysis: document.getElementById("analysis").value.trim(), risk: document.getElementById("risk").value.trim(), decision: document.getElementById("decision").value.trim(), check: document.getElementById("check").checked }; if (!data.analysis || !data.risk || !data.decision || !data.check) return notice("回答と安全確認を完了してください。"); state.final = data; state.done.final = true; save(); drawMenu("final"); notice("保存しました。"); };
    }

    function quiz() {
      const questions = ["AI出力の位置付けは？", "根拠として適切なのは？", "高リスク項目への対応は？", "本番変更前に必要なことは？", "最終判断の責任者は？"];
      const score = state.quiz.score;
      if (score !== undefined) { view.innerHTML = `<p class="m1-kicker">総合テスト</p><h1 class="m1-title">テスト結果</h1><section class="m1-card"><h2>${score} / 5</h2><p>${score >= 4 ? "合格です。" : "再確認が必要です。"}</p></section>`; return; }
      const index = state.quiz.index || 0;
      view.innerHTML = `<p class="m1-kicker">総合テスト ${index + 1} / 5</p><h1 class="m1-title">総合テスト</h1><section class="m1-card"><h2>${questions[index]}</h2><label class="m1-option"><input type="radio" name="answer" value="correct"> 根拠を確認し、人間が最終判断する</label><label class="m1-option"><input type="radio" name="answer" value="wrong"> AIの回答をそのまま採用する</label><label class="m1-option"><input type="radio" name="answer" value="wrong"> テストや確認は不要である</label><button class="m1-primary" id="nextQuiz">${index === 4 ? "採点する" : "次へ"}</button><p id="notice" class="m5-note"></p></section>`;
      document.getElementById("nextQuiz").onclick = () => { const selected = view.querySelector("input[name='answer']:checked"); if (!selected) return notice("回答を選択してください。"); state.quiz.answers ||= []; state.quiz.answers[index] = selected.value; if (index < 4) state.quiz.index = index + 1; else { state.quiz.score = state.quiz.answers.filter((answer) => answer === "correct").length; state.done.quiz = state.quiz.score >= 4; } save(); render("quiz"); };
    }

    function results() {
      const completed = config.exercises.filter((_, index) => state.done[`ex${index}`]).length;
      view.innerHTML = `<p class="m1-kicker">学習結果</p><h1 class="m1-title">${config.title}</h1><div class="m1-grid"><section class="m1-card"><b>${completed} / ${config.exercises.length}</b><p>完了実習</p></section><section class="m1-card"><b>${state.quiz.score ?? "-"} / 5</b><p>総合テスト</p></section><section class="m1-card"><b>${percent()}%</b><p>モジュール進捗</p></section></div><section class="m1-card" style="margin-top:14px"><h2>到達目標</h2><p>${percent() === 100 ? "✓ すべての学習項目を完了しました。" : "○ 未完了の学習項目を確認してください。"}</p></section>`;
    }

    function render(section) { drawMenu(section); ({ home, basics, pre, list, review, final: finalTask, quiz, results })[section](); }
    render("home");
  };
})();
