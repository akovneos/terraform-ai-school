const submissionKey = "ai-course-submissions-v1";
let selectedModule = null;

function readSubmissions() {
  try {
    const value = JSON.parse(localStorage.getItem(submissionKey) || "{}");
    return value && typeof value === "object" ? value : {};
  } catch {
    return {};
  }
}

function writeSubmissions(records) {
  localStorage.setItem(submissionKey, JSON.stringify(records));
}

function moduleTitle(id) {
  return COURSE_PLAN[id]?.title || `モジュール ${String(id).padStart(2, "0")}`;
}

function formatAttachmentSize(size) {
  if (!Number.isFinite(size)) return "-";
  if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function renderAttachments(panel, record) {
  const memo = panel.querySelector(".teacher-memo");
  const attachments = Array.isArray(record.attachments) ? record.attachments : [];
  if (!memo || !attachments.length) return;
  const section = document.createElement("section");
  section.className = "teacher-attachments";
  const heading = document.createElement("h3");
  heading.textContent = "添付ファイル";
  const note = document.createElement("p");
  note.textContent = "画面試作のため、ファイル本体は未保存です。S3連携後にダウンロードできるようになります。";
  const list = document.createElement("ul");
  attachments.forEach((attachment) => {
    const item = document.createElement("li");
    const name = document.createElement("strong");
    const meta = document.createElement("small");
    name.textContent = attachment.name;
    meta.textContent = `${formatAttachmentSize(attachment.size)} ・ ${attachment.type || "不明"}`;
    item.append(name, meta);
    list.append(item);
  });
  section.append(heading, note, list);
  memo.after(section);
}

function statusLabel(status) {
  return { teacher_pending: "講師確認待ち", passed: "合格", revision_requested: "要修正", ai_feedback: "AIフィードバック済み" }[status] || "下書き";
}

function recordsForReview() {
  return Object.entries(readSubmissions())
    .map(([id, item]) => ({ id: Number(id), ...item }))
    .filter((item) => ["teacher_pending", "passed", "revision_requested"].includes(item.status))
    .sort((a, b) => (b.teacherSubmittedAt || b.updatedAt || "").localeCompare(a.teacherSubmittedAt || a.updatedAt || ""));
}

function renderSummary(records) {
  const pending = records.filter((item) => item.status === "teacher_pending").length;
  const passed = records.filter((item) => item.status === "passed").length;
  const revision = records.filter((item) => item.status === "revision_requested").length;
  document.getElementById("teacher-summary").innerHTML = `<div><span>提出物</span><strong>${records.length}</strong></div><div><span>講師確認待ち</span><strong>${pending}</strong></div><div><span>合格</span><strong>${passed}</strong></div><div><span>要修正</span><strong>${revision}</strong></div>`;
}

function renderList() {
  const records = recordsForReview();
  if (!selectedModule && records.length) selectedModule = records[0].id;
  if (selectedModule && !records.some((item) => item.id === selectedModule)) selectedModule = records[0]?.id || null;
  renderSummary(records);
  document.getElementById("submission-list").innerHTML = records.length ? records.map((item) => `<button type="button" class="teacher-submission ${item.id === selectedModule ? "active" : ""}" data-module-id="${item.id}"><strong>${moduleTitle(item.id)}</strong><span>受講生A ・ ${item.teacherSubmittedAt ? new Date(item.teacherSubmittedAt).toLocaleDateString("ja-JP") : "AI評価済み"}</span><small>${statusLabel(item.status)}</small></button>`).join("") : `<p class="teacher-empty">講師確認へ提出された課題はまだありません。<br>受講者画面でAI評価後に「講師確認へ提出する」を選択してください。</p>`;
  document.querySelectorAll("[data-module-id]").forEach((button) => button.addEventListener("click", () => { selectedModule = Number(button.dataset.moduleId); renderList(); renderReview(); }));
}

function renderReview() {
  const panel = document.getElementById("teacher-review-panel");
  const record = readSubmissions()[selectedModule];
  if (!record) { panel.innerHTML = `<div class="teacher-placeholder">左側の一覧から提出物を選択してください。</div>`; return; }
  const review = record.aiReview || {};
  panel.innerHTML = `<p class="kicker">モジュール ${String(selectedModule).padStart(2, "0")}</p><h2>${moduleTitle(selectedModule)}</h2><p class="teacher-module-meta">受講者：受講生A　/　AI評価：${record.aiReviewedAt ? new Date(record.aiReviewedAt).toLocaleString("ja-JP") : "未実行"}</p><span class="teacher-status">${statusLabel(record.status)}</span><h3>受講者の提出メモ</h3><div class="teacher-memo">${record.memo || "提出メモはありません。"}</div><h3>AIの事前評価</h3><div class="teacher-scores"><div><span>総合</span><strong>${review.overall ?? "-"}</strong><small>/ 100</small></div><div><span>課題の充足</span><strong>${review.completeness ?? "-"}</strong><small>/ 100</small></div><div><span>根拠・検証</span><strong>${review.evidence ?? "-"}</strong><small>/ 100</small></div><div><span>安全性</span><strong>${review.safety ?? "-"}</strong><small>/ 100</small></div></div><div class="teacher-feedback"><div><strong>できている点</strong><p>${review.strength || "AI評価はまだありません。"}</p></div><div><strong>改善点</strong><p>${review.improvement || "-"}</p></div><div><strong>講師確認点</strong><p>${review.teacherFocus || "-"}</p></div></div><form class="teacher-form" id="teacher-review-form"><label>最終評価<select id="teacher-result"><option value="passed">合格</option><option value="revision_requested">要修正</option></select></label><label>講師コメント<textarea id="teacher-comment" placeholder="評価理由、良かった点、次に修正すべき点を記入してください。">${record.teacherReview?.comment || ""}</textarea></label><button class="button primary" type="submit"><i data-lucide="check"></i> 最終評価を保存</button></form>`;
  renderAttachments(panel, record);
  document.getElementById("teacher-result").value = record.status === "revision_requested" ? "revision_requested" : "passed";
  document.getElementById("teacher-review-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const comment = document.getElementById("teacher-comment").value.trim();
    if (!comment) { alert("講師コメントを記入してください。"); return; }
    const result = document.getElementById("teacher-result").value;
    const records = readSubmissions();
    records[selectedModule] = { ...records[selectedModule], status: result, teacherReview: { result: result === "passed" ? "合格" : "要修正", comment, reviewedAt: new Date().toISOString() } };
    writeSubmissions(records);
    renderList();
    renderReview();
  });
  lucide.createIcons();
}

document.getElementById("refresh-list").addEventListener("click", () => { renderList(); renderReview(); lucide.createIcons(); });
renderList();
renderReview();
lucide.createIcons();
