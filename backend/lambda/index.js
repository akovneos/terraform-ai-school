"use strict";

const https = require("https");

const COURSE = {
  id: "ai-business-training",
  title: "AI業務活用研修",
  description:
    "AI出力をそのまま採用せず、根拠に基づいて検証できるエンジニアを育成する研修です。",
  modules: [
    "AI / 機械学習 / 生成AIの役割と違い",
    "LLMの基本構造",
    "エンジニア業務におけるAI活用パターン",
    "実務演習: 設計・調査",
    "実務演習: ログ解析・エラー調査",
    "実務演習: コード理解・リファクタ",
    "プロンプト改善",
    "AI出力の検証・リスク評価",
    "セキュリティ・情報管理",
  ],
};

const ASSIGNMENTS = [
  {
    id: "business-classification",
    title: "業務分類シート",
    module: "AI / 機械学習 / 生成AIの役割と違い",
    level: "basic",
    status: "available",
    objective:
      "業務ごとにAI適用可否を分類し、AI判断との差分とリスクを説明する。",
    deliverables: [
      "対象業務名",
      "AI適用可否分類",
      "分類理由",
      "想定リスク",
      "AI回答との差分",
      "最終判断",
    ],
  },
  {
    id: "llm-behavior-analysis",
    title: "LLM挙動分析シート",
    module: "LLMの基本構造",
    level: "basic",
    status: "available",
    objective:
      "同一質問・曖昧質問・条件追加質問の回答差分を観察し、LLMの出力ブレを説明する。",
    deliverables: [
      "実施した質問内容",
      "回答差分",
      "誤情報が出た箇所",
      "業務利用時の注意点",
    ],
  },
  {
    id: "log-investigation",
    title: "ログ分析レポート",
    module: "実務演習: ログ解析・エラー調査",
    level: "intermediate",
    status: "available",
    objective:
      "障害ログをAIで分析し、AI回答をログ根拠に基づいて検証する。",
    scenario:
      "API 500エラーが断続的に発生しています。ログから原因候補を整理し、AIの分析を検証してください。",
    sampleLog:
      "2026-07-10T09:15:21Z ERROR api request_id=req-1829 status=500 path=/submit message=\"database connection timeout\"\n2026-07-10T09:15:22Z WARN db pool active=20 idle=0 waiting=8\n2026-07-10T09:15:23Z INFO retry request_id=req-1829 attempt=2",
    deliverables: [
      "障害概要",
      "AIによる原因分析結果",
      "ログ根拠",
      "AI回答の問題点",
      "最終原因",
      "再発防止案",
    ],
  },
  {
    id: "refactor-review",
    title: "リファクタ提案書",
    module: "実務演習: コード理解・リファクタ",
    level: "intermediate",
    status: "available",
    objective:
      "AIのリファクタ提案を評価し、副作用・仕様変更・安全性を確認する。",
    deliverables: [
      "対象コードの概要",
      "AIによる改善提案",
      "副作用・影響範囲",
      "採用／不採用判断",
      "判断理由",
    ],
  },
  {
    id: "ai-output-verification",
    title: "AI検証チェックシート",
    module: "AI出力の検証・リスク評価",
    level: "intermediate",
    status: "available",
    objective:
      "AI出力を検証し、採用可否と修正理由を根拠付きで説明する。",
    deliverables: [
      "AI出力の概要",
      "検証項目一覧",
      "誤り指摘内容",
      "根拠",
      "採用可否判断",
    ],
  },
  {
    id: "information-security",
    title: "情報分類ルール",
    module: "セキュリティ・情報管理",
    level: "advanced",
    status: "available",
    objective:
      "AIに入力してよい情報、匿名化が必要な情報、入力禁止の情報を分類する。",
    deliverables: [
      "情報カテゴリ一覧",
      "入力可／匿名化可／禁止の分類",
      "匿名化ルール",
      "リスク説明",
      "最終運用ルール",
    ],
  },
];

exports.handler = async (event) => {
  try {
    const method = event.requestContext?.http?.method || event.httpMethod || "GET";
    const path = normalizePath(event.rawPath || event.path || "/");

    if (method === "OPTIONS") {
      return response(204, null);
    }

    if (method === "GET" && path === "/health") {
      return response(200, {
        ok: true,
        service: "ai-school-api",
        project: process.env.PROJECT || "ai-school",
        timestamp: new Date().toISOString(),
      });
    }

    if (method === "GET" && path === "/courses") {
      return response(200, { courses: [COURSE] });
    }

    if (method === "GET" && path === "/assignments") {
      return response(200, { assignments: ASSIGNMENTS });
    }

    const assignmentMatch = path.match(/^\/assignments\/([^/]+)$/);
    if (method === "GET" && assignmentMatch) {
      const assignment = findAssignment(assignmentMatch[1]);
      if (!assignment) return response(404, { error: "Assignment not found" });
      return response(200, { assignment });
    }

    const aiMatch = path.match(/^\/assignments\/([^/]+)\/ai$/);
    if (method === "POST" && aiMatch) {
      const assignment = findAssignment(aiMatch[1]);
      if (!assignment) return response(404, { error: "Assignment not found" });

      const body = parseBody(event);
      const prompt = String(body.prompt || "").trim();
      if (!prompt) {
        return response(400, { error: "prompt is required" });
      }

      const aiResult = await generateAiSupport({
        assignment,
        prompt,
        learnerContext: body.context || "",
      });

      return response(200, {
        assignmentId: assignment.id,
        mode: aiResult.mode,
        answer: aiResult.answer,
        verificationHints: buildVerificationHints(assignment),
      });
    }

    const submissionMatch = path.match(/^\/assignments\/([^/]+)\/submissions$/);
    if (method === "POST" && submissionMatch) {
      const assignment = findAssignment(submissionMatch[1]);
      if (!assignment) return response(404, { error: "Assignment not found" });

      const body = parseBody(event);
      const validation = validateSubmission(assignment, body);
      if (!validation.ok) {
        return response(400, {
          error: "Submission is incomplete",
          missingFields: validation.missingFields,
        });
      }

      return response(201, {
        submissionId: `sub_${Date.now()}`,
        assignmentId: assignment.id,
        status: "submitted",
        receivedAt: new Date().toISOString(),
        nextAction: "講師レビューを待ってください。",
      });
    }

    return response(404, {
      error: "Route not found",
      method,
      path,
    });
  } catch (error) {
    console.error("Unhandled error", error);
    return response(500, {
      error: "Internal server error",
      requestId: event.requestContext?.requestId,
    });
  }
};

function normalizePath(path) {
  if (!path || path === "/") return "/";
  return path.endsWith("/") ? path.slice(0, -1) : path;
}

function parseBody(event) {
  if (!event.body) return {};
  const raw = event.isBase64Encoded
    ? Buffer.from(event.body, "base64").toString("utf8")
    : event.body;

  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function findAssignment(id) {
  return ASSIGNMENTS.find((assignment) => assignment.id === id);
}

async function generateAiSupport({ assignment, prompt, learnerContext }) {
  const openAiKey = await getOpenAiApiKey();
  if (openAiKey) {
    const answer = await callOpenAi({
      apiKey: openAiKey,
      assignment,
      prompt,
      learnerContext,
    });
    return { mode: "openai", answer };
  }

  return {
    mode: "training-fallback",
    answer: buildTrainingFallbackAnswer(assignment, prompt),
  };
}

async function getOpenAiApiKey() {
  if (process.env.OPENAI_API_KEY) {
    return process.env.OPENAI_API_KEY;
  }

  if (!process.env.OPENAI_SECRET_ARN) {
    return "";
  }

  try {
    const { SecretsManagerClient, GetSecretValueCommand } = require("@aws-sdk/client-secrets-manager");
    const client = new SecretsManagerClient({});
    const result = await client.send(
      new GetSecretValueCommand({
        SecretId: process.env.OPENAI_SECRET_ARN,
      })
    );
    const secret = JSON.parse(result.SecretString || "{}");
    return secret.api_key || "";
  } catch (error) {
    console.warn("OpenAI secret is not available; using training fallback.", {
      message: error.message,
    });
    return "";
  }
}

function callOpenAi({ apiKey, assignment, prompt, learnerContext }) {
  const payload = JSON.stringify({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content:
          "You are an AI training assistant for Japanese engineering learners. Give concise support, but always remind the learner to verify the answer with evidence. Do not present uncertain claims as facts.",
      },
      {
        role: "user",
        content: [
          `課題: ${assignment.title}`,
          `目的: ${assignment.objective}`,
          learnerContext ? `受講者コンテキスト:\n${learnerContext}` : "",
          `質問:\n${prompt}`,
        ]
          .filter(Boolean)
          .join("\n\n"),
      },
    ],
    temperature: 0.3,
  });

  const options = {
    hostname: "api.openai.com",
    path: "/v1/chat/completions",
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(payload),
    },
    timeout: 15000,
  };

  return new Promise((resolve, reject) => {
    const request = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => {
        data += chunk;
      });
      res.on("end", () => {
        try {
          const parsed = JSON.parse(data);
          if (res.statusCode >= 400) {
            reject(new Error(parsed.error?.message || "OpenAI API error"));
            return;
          }
          resolve(parsed.choices?.[0]?.message?.content || "");
        } catch (error) {
          reject(error);
        }
      });
    });

    request.on("error", reject);
    request.on("timeout", () => {
      request.destroy(new Error("OpenAI request timed out"));
    });
    request.write(payload);
    request.end();
  });
}

function buildTrainingFallbackAnswer(assignment, prompt) {
  if (assignment.id === "log-investigation") {
    return [
      "AI分析案:",
      "1. ログ上は database connection timeout が直接のエラーとして出ています。",
      "2. DB pool が active=20, idle=0, waiting=8 になっているため、接続プール枯渇またはDB応答遅延が疑われます。",
      "3. ただし、この情報だけではDB本体の高負荷、アプリ側の接続リーク、急なリクエスト増加のどれかは断定できません。",
      "",
      "検証してください:",
      "- 同時刻のDB CPU/接続数/遅いクエリを確認する。",
      "- アプリ側で接続をcloseしているか確認する。",
      "- 500エラーとwaiting数の時系列が一致するか確認する。",
      "",
      `受講者の質問要約: ${prompt.slice(0, 160)}`,
    ].join("\n");
  }

  return [
    "AI回答案:",
    `この課題では「${assignment.objective}」が中心です。`,
    "まずAIの回答を参考情報として扱い、最終判断はログ・仕様・コード・要件などの根拠で確認してください。",
    "",
    "確認観点:",
    "- AI回答に事実誤認はないか",
    "- 前提条件と矛盾していないか",
    "- 機密情報や個人情報を含めていないか",
    "- 採用する場合のリスクを説明できるか",
    "",
    `受講者の質問要約: ${prompt.slice(0, 160)}`,
  ].join("\n");
}

function buildVerificationHints(assignment) {
  const common = [
    "AI回答をそのまま採用しない",
    "根拠をログ・仕様・コード・要件で確認する",
    "誤りまたは不足観点を1つ以上記載する",
  ];

  if (assignment.id === "log-investigation") {
    return [
      ...common,
      "エラーメッセージと時系列を確認する",
      "原因候補を断定せず、追加確認項目を書く",
    ];
  }

  if (assignment.id === "information-security") {
    return [
      ...common,
      "個人情報・認証情報・内部設計情報を分類する",
      "匿名化しても再識別できないか確認する",
    ];
  }

  return common;
}

function validateSubmission(assignment, body) {
  const missingFields = assignment.deliverables.filter((field) => {
    const key = toSubmissionKey(field);
    return !String(body[key] || "").trim();
  });

  return {
    ok: missingFields.length === 0,
    missingFields,
  };
}

function toSubmissionKey(label) {
  const map = {
    障害概要: "incidentSummary",
    AIによる原因分析結果: "aiAnalysis",
    ログ根拠: "logEvidence",
    AI回答の問題点: "aiIssues",
    最終原因: "finalCause",
    再発防止案: "preventionPlan",
  };
  return map[label] || label;
}

function response(statusCode, body) {
  return {
    statusCode,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type,Authorization",
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
      "Content-Type": "application/json; charset=utf-8",
    },
    body: body === null ? "" : JSON.stringify(body),
  };
}
