(() => {
  const exactLabels = new Map([
    ["CURRICULUM", "コース内容"],
    ["COURSE DASHBOARD", "コース概要"],
    ["CURRENT ASSIGNMENT", "学習中"],
    ["SUBMISSIONS", "提出状況"],
    ["LEARN", "学習内容"],
    ["LEARNING", "学習内容"],
    ["LEARNING PLAN", "学習スケジュール"],
    ["LEARNING LEVEL", "難易度設定"],
    ["LEARNING SETTINGS", "学習設定"],
    ["PRACTICE", "実習"],
    ["CHECK", "確認"],
    ["GOAL", "目標"],
    ["THEORY", "基礎知識"],
    ["GLOSSARY", "用語集"],
    ["RESULTS", "達成状況"],
    ["COMPARE", "比較"],
    ["PREPARATION", "事前準備"],
    ["HISTORY", "履歴"],
    ["ANALYSIS SHEET", "分析シート"],
    ["SELF CHECK", "自己診断"],
    ["FINAL TASK", "総合課題"],
    ["FINAL QUIZ", "総合テスト"],
    ["FINAL CHECKLIST", "最終確認"],
    ["FINAL MODULE", "最終モジュール"],
    ["FINAL CODE EXERCISE", "総合コード演習"],
    ["QUIZ RESULT", "テスト結果"],
    ["AI REVIEW", "AI事前評価"],
    ["INSTRUCTOR REVIEW", "講師確認"],
    ["SUBMISSION & REVIEW", "提出・評価"],
    ["LEARNER PROGRESS", "受講管理"],
    ["MY PROFILE", "受講者情報"],
    ["PREFERENCES", "設定"]
    ,["ACCOUNT", "アカウント"]
    ,["AI MAP", "AI活用マップ"]
    ,["ANALYSIS", "分析"]
    ,["ANONYMIZATION", "匿名化"]
    ,["ANONYMIZATION DESIGN", "匿名化設計"]
    ,["APPROVAL", "承認"]
    ,["BUILDER", "作成"]
    ,["CASE", "事例"]
    ,["CERTIFICATE", "修了証"]
    ,["CHECK SHEET", "確認シート"]
    ,["CLASSIFICATION", "分類"]
    ,["CLASSIFICATION BUILDER", "分類作成"]
    ,["CODE ANALYSIS", "コード分析"]
    ,["CODE PRACTICE", "コード演習"]
    ,["COMPLETED", "完了"]
    ,["COMPLETION RESULT", "修了結果"]
    ,["DECISION", "判断"]
    ,["DESIGN MEMO", "設計メモ"]
    ,["DIFF", "差分"]
    ,["DIFFICULTY DESIGN", "難易度設計"]
    ,["EVALUATE", "評価"]
    ,["EVIDENCE", "根拠"]
    ,["FINAL CASE", "総合事例"]
    ,["FINAL EXAM", "総合テスト"]
    ,["FINAL EXAM RESULT", "総合テスト結果"]
    ,["FINAL INCIDENT", "総合障害演習"]
    ,["FINAL REPORT", "最終レポート"]
    ,["FINAL VERIFICATION", "最終検証"]
    ,["GOALS", "到達目標"]
    ,["HISTORY", "履歴"]
    ,["HYPOTHESES", "仮説"]
    ,["IDENTIFICATION", "特定"]
    ,["IMPACT", "影響"]
    ,["INCIDENT", "障害"]
    ,["INTEGRATED CASE", "総合事例"]
    ,["NEXT PLAN", "次の学習計画"]
    ,["PATTERNS", "活用パターン"]
    ,["POLICY", "方針"]
    ,["PRE", "事前確認"]
    ,["PROMPT BUILDER", "プロンプト作成"]
    ,["PROMPT PARTS", "プロンプト構成要素"]
    ,["PROPOSAL", "提案"]
    ,["QUIZ", "テスト"]
    ,["READ CODE", "コード読解"]
    ,["READ LOGS", "ログ読解"]
    ,["REPORT", "レポート"]
    ,["REPRODUCIBILITY", "再現性"]
    ,["REVIEW", "検証"]
    ,["RISK", "リスク"]
    ,["SELF ASSESSMENT", "自己診断"]
    ,["SHEET", "シート"]
    ,["SKILL CHECK", "スキル確認"]
    ,["STEP", "手順"]
    ,["SUBMISSION", "提出"]
    ,["TEST PLAN", "テスト計画"]
    ,["TIMELINE", "時系列"]
    ,["VERIFY", "検証"]
    ,["VIEWPOINTS", "確認観点"]
    ,["WORKFLOW", "手順"]
  ]);
  const excluded = "textarea,input,pre,code,.m1-evidence,.teacher-memo,.teacher-answer-block";

  function localizeText(text) {
    const trimmed = text.trim();
    if (exactLabels.has(trimmed)) return text.replace(trimmed, exactLabels.get(trimmed));
    return text
      .replace(/MODULE\s+(\d{1,2})/g, "モジュール $1")
      .replace(/WEEK\s+(\d{1,2})/g, "第$1週")
      .replace(/DAY\s+(\d{1,2})/g, "第$1日")
      .replace(/PRACTICE\s+(\d{1,2})/g, "実習 $1")
      .replace(/QUIZ\s+(\d{1,2})/g, "テスト $1");
  }

  function localizeNode(node) {
    if (node.nodeType !== Node.TEXT_NODE || !node.nodeValue.trim()) return;
    const parent = node.parentElement;
    if (!parent || parent.closest(excluded)) return;
    const localized = localizeText(node.nodeValue);
    if (localized !== node.nodeValue) node.nodeValue = localized;
  }

  function localizeTree(root) {
    if (root.nodeType === Node.TEXT_NODE) {
      localizeNode(root);
      return;
    }
    if (!(root instanceof Element || root instanceof Document || root instanceof DocumentFragment)) return;
    const elements = [
      ...(root instanceof Element ? [root] : []),
      ...root.querySelectorAll?.("*") || []
    ];
    elements.forEach((element) => {
      element.childNodes.forEach(localizeNode);
    });
    hideDuplicateKickers(root);
  }

  function hideDuplicateKickers(root) {
    const scope = root instanceof Element ? root : document;
    const kickers = [
      ...(scope.matches?.(".kicker, .m1-kicker") ? [scope] : []),
      ...scope.querySelectorAll?.(".kicker, .m1-kicker") || []
    ];
    kickers.forEach((kicker) => {
      const label = kicker.textContent.trim();
      if (kicker.classList.contains("m1-kicker") && !/^(モジュール\s+\d+|最終モジュール)$/.test(label)) {
        kicker.hidden = true;
        return;
      }
      if (["学習中", "コース内容", "提出状況"].includes(label)) {
        kicker.hidden = true;
        return;
      }
      const heading = kicker.nextElementSibling;
      if (!heading?.matches("h1,h2,h3")) return;
      if (label === heading.textContent.trim()) kicker.hidden = true;
    });
  }

  localizeTree(document);
  hideDuplicateKickers(document);
  new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === "characterData") localizeNode(mutation.target);
      mutation.addedNodes.forEach(localizeTree);
    });
    hideDuplicateKickers(document);
  }).observe(document.documentElement, { childList: true, characterData: true, subtree: true });
})();
