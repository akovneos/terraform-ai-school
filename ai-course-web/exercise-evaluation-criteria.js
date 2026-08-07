/* Shared public criteria. The server imports the same registry; no secret is stored here. */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.ExerciseEvaluationCriteria = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  const version = 1;
  const moduleCriteria = {
    1: ["課題に沿った分類または判断がある", "選択理由または根拠がある", "AIだけに任せない人間確認がある"],
    2: ["LLMの出力の特徴または限界に触れている", "事実確認または不確実性を説明している", "人間による確認がある"],
    3: ["AIで補助できる作業と人間判断を区別している", "具体的なリスクまたは検証方法がある", "最終判断者が明確である"],
    4: ["要件・前提・影響を整理している", "AI案を採用・修正・不採用のいずれかで判断している", "根拠または追加確認を示している"],
    5: ["ログまたは監視情報から確認できる事実がある", "仮説と事実を区別している", "安全な追加確認または対応がある"],
    6: ["コードまたは仕様の問題点を説明している", "AI提案の副作用・影響・テストを確認している", "人間が最終方針を判断している"],
    7: ["目的・前提・出力形式・制約を含む", "根拠のない断定を避ける指定がある", "不明点または人間確認の扱いがある"],
    8: ["AI出力の誤り・不足・要件不一致を指摘している", "根拠またはリスクを示している", "採用判断と人間の最終確認がある"],
    9: ["情報の安全な扱いを分類している", "匿名化・入力禁止・承認のいずれかを具体的に示している", "認証情報や個人情報をそのまま扱わない判断がある"],
    10: ["AI利用の利点とリスクを整理している", "実務上の確認・承認・記録を示している", "最終判断を人間が行うことを明記している"]
  };
  const depth = {
    beginner: "用語を正しく使い、短い理由と人間確認を記録する。",
    basic: "根拠・影響範囲・追加確認を具体的に説明する。",
    engineer: "前提、代替案、運用・セキュリティ上の影響と判断根拠を明確にする。"
  };
  function get(moduleId, exerciseId, level) {
    const id = Number(moduleId);
    return {
      evaluationVersion: version,
      moduleId: id,
      exerciseId: String(exerciseId),
      criteria: moduleCriteria[id] || moduleCriteria[1],
      depth: depth[level] || depth.beginner
    };
  }
  return { version, get, moduleCriteria, depth };
});
