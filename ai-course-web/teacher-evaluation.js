(() => {
  const key = "ai-course-exercise-evaluations-v1";
  const statusLabels = { passed: "AI確認: 合格", needs_revision: "AI確認: 修正が必要", checking: "AI確認中", error: "AI確認エラー", outdated: "再確認が必要", not_checked: "未確認" };
  function read() { try { return JSON.parse(localStorage.getItem(key) || "{}") || {}; } catch { return {}; } }
  function render() {
    const root = document.getElementById("teacher-ai-evaluation-panel");
    if (!root) return;
    const items = Object.values(read()).sort((a, b) => String(b.checkedAt || b.lastAttemptAt || "").localeCompare(String(a.checkedAt || a.lastAttemptAt || "")));
    root.innerHTML = `<h2>AI確認結果</h2><p class="teacher-data-note">AI確認は課題要件の充足を確認する補助機能です。技術的妥当性と最終評価は講師が確認してください。</p>${items.length ? `<div class="teacher-ai-list">${items.map((item) => `<article><div><b>${item.status === "passed" ? "合格" : "要確認"}</b><span>${statusLabels[item.status] || "未確認"}</span></div><p>${item.summary || "確認結果はありません。"}</p><small>試行 ${item.attemptCount || 0} 回 / ${item.checkedAt ? new Date(item.checkedAt).toLocaleString("ja-JP") : "未確認"}</small>${item.improvements?.length ? `<ul>${item.improvements.map((text) => `<li>${text}</li>`).join("")}</ul>` : ""}</article>`).join("")}</div>` : "<p>AI確認の記録はまだありません。</p>"}`;
  }
  window.addEventListener("storage", render); document.addEventListener("DOMContentLoaded", render);
})();
