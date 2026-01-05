import express from "express";
import cors from "cors";
import { z } from "zod";
import dotenv from "dotenv";
import OpenAI from "openai";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const MODEL = process.env.OPENAI_MODEL || "gpt-4.1-mini";

// In-memory storage (без БД)
const runs = new Map(); // runId -> { input, plan }

// =====================
// Input schema
// =====================
const CreateRunBody = z.object({
  input: z.string().min(1, "Prompt is required").max(4000),
  dryRun: z.boolean().optional().default(true),
});

// =====================
// Shared schemas
// =====================
const TimeRangeSchema = z.discriminatedUnion("type", [
  z
    .object({
      type: z.literal("preset"),
      value: z.enum(["today", "tomorrow", "this_week", "next_week"]),
    })
    .strict(),
  z
    .object({
      type: z.literal("custom"),
      start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD"),
      end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD"),
    })
    .strict(),
]);

// Preview (то, что пользователь проверяет перед Confirm)
const PreviewSchema = z
  .object({
    task_candidates: z.array(z.string()).default([]),
    summary: z.string().optional(),
  })
  .strict();

// =====================
// Intent schemas
// =====================
const CreateTasksIntent = z.object({
  intent: z.literal("create_tasks"),
  confidence: z.number().min(0).max(1),
  entities: z
    .object({
      time_range: TimeRangeSchema,
    })
    .strict(),
  missing_fields: z.array(z.string()),
  requires_confirmation: z.boolean(),
});

const SummarizeIntent = z.object({
  intent: z.literal("summarize_text"),
  confidence: z.number().min(0).max(1),
  entities: z.object({}).strict(),
  missing_fields: z.array(z.string()),
  requires_confirmation: z.boolean(),
});

const GenerateEmailIntent = z.object({
  intent: z.literal("generate_email"),
  confidence: z.number().min(0).max(1),
  entities: z
    .object({
      to: z.string().email().optional(),
      subject: z.string().optional(),
    })
    .strict(),
  missing_fields: z.array(z.string()),
  requires_confirmation: z.boolean(),
});

const UnknownIntent = z.object({
  intent: z.literal("unknown"),
  confidence: z.number().min(0).max(1),
  entities: z.object({}).strict(),
  missing_fields: z.array(z.string()),
  requires_confirmation: z.boolean(),
});

const DetectedIntentSchema = z.discriminatedUnion("intent", [
  CreateTasksIntent,
  SummarizeIntent,
  GenerateEmailIntent,
  UnknownIntent,
]);

// =====================
// Action schemas
// =====================
const ActionSchema = z.discriminatedUnion("type", [
  z.object({
    id: z.string(),
    type: z.literal("create_task_list"),
    input: z
      .object({
        time_range: TimeRangeSchema,
      })
      .strict(),
    depends_on: z.array(z.string()).optional(),
  }),

  z.object({
    id: z.string(),
    type: z.literal("summarize_text"),
    input: z
      .object({
        text: z.string(),
      })
      .strict(),
    depends_on: z.array(z.string()).optional(),
  }),

  z.object({
    id: z.string(),
    type: z.literal("generate_email"),
    input: z
      .object({
        prompt: z.string(),
      })
      .strict(),
    depends_on: z.array(z.string()).optional(),
  }),

  z.object({
    id: z.string(),
    type: z.literal("send_email"),
    input: z
      .object({
        to: z.string().email(),
        subject: z.string(),
        body: z.string(),
      })
      .strict(),
    depends_on: z.array(z.string()).optional(),
  }),
]);

// Response contract (/api/runs)
const CreateRunResponse = z.object({
  runId: z.string(),
  detected_intent: DetectedIntentSchema,
  actions: z.array(ActionSchema),
  preview: PreviewSchema.optional(),
});

// =====================
// Helpers
// =====================

// Быстрый локальный extraction кандидатов задач из формата "Task: ..."
function extractTaskCandidatesLocal(input) {
  const idx = input.toLowerCase().indexOf("task:");
  if (idx === -1) return [];

  const chunk = input.slice(idx + 5).trim();
  return chunk
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 30);
}

// =====================
// Mock plan fallback
// =====================
function mockPlan(input) {
  const text = input.toLowerCase();

  // summarize
  if (
    text.includes("summary") ||
    text.includes("суммар") ||
    text.includes("резюм")
  ) {
    return {
      detected_intent: {
        intent: "summarize_text",
        confidence: 0.8,
        entities: {},
        missing_fields: [],
        requires_confirmation: false,
      },
      actions: [{ id: "a1", type: "summarize_text", input: { text: input } }],
      preview: {
        summary: "I will summarize the provided text.",
        task_candidates: [],
      },
    };
  }

  // email
  if (
    text.includes("email") ||
    text.includes("письм") ||
    text.includes("почт")
  ) {
    return {
      detected_intent: {
        intent: "generate_email",
        confidence: 0.8,
        entities: {},
        missing_fields: ["email_to"],
        requires_confirmation: true,
      },
      actions: [{ id: "a1", type: "generate_email", input: { prompt: input } }],
      preview: {
        summary: "I will draft an email based on your request.",
        task_candidates: [],
      },
    };
  }

  // create tasks
  const time_range = { type: "preset", value: "next_week" };
  const task_candidates = extractTaskCandidatesLocal(input);

  return {
    detected_intent: {
      intent: "create_tasks",
      confidence: 0.75,
      entities: { time_range },
      missing_fields: [],
      requires_confirmation: false,
    },
    actions: [{ id: "a1", type: "create_task_list", input: { time_range } }],
    preview: {
      task_candidates,
      summary:
        "I will create a task list for the selected period using tasks from your input.",
    },
  };
}

// =====================
// Prompt (PLANNING + PREVIEW candidates)
// =====================
function buildSystemPrompt() {
  return `
You are an AI automation planner.
Return ONLY raw JSON. No markdown. No explanations.
Output must start with "{" and end with "}".

Use EXACT snake_case keys:
- detected_intent
- missing_fields
- requires_confirmation
- task_candidates

Top-level fields must be exactly:
- detected_intent
- actions
- preview

Allowed intents:
- create_tasks
- summarize_text
- generate_email
- unknown

Allowed action types:
- create_task_list
- summarize_text
- generate_email
- send_email

IMPORTANT: This is PLANNING only.
Do NOT generate final outputs (no final task plan, no email body, no summaries).
Instead, return a PREVIEW that helps the user confirm understanding.

time_range format (REQUIRED for create_tasks):
- preset: { "type": "preset", "value": "today|tomorrow|this_week|next_week" }
- custom: { "type": "custom", "start_date": "YYYY-MM-DD", "end_date": "YYYY-MM-DD" }

Rules:
1) confidence must be between 0 and 1.
2) If required data is missing, add it to missing_fields and set requires_confirmation=true.
3) action.id must be unique like "a1", "a2"...
4) detected_intent.entities must contain ONLY allowed keys (for create_tasks only time_range).
5) For action type "create_task_list": input must contain ONLY { "time_range": <time_range_object> }.
6) preview.task_candidates must list tasks that are EXPLICITLY mentioned by the user (extract-only; do NOT invent).
7) If user provided tasks separated by commas, extract them into preview.task_candidates.
8) If no explicit tasks are provided, return preview.task_candidates as [].
9) If you cannot determine a valid time_range, use preset next_week.

preview object:
{
  "task_candidates": ["..."], 
  "summary": "One short sentence describing what will happen"
}

Example:
{
  "detected_intent": {
    "intent": "create_tasks",
    "confidence": 0.82,
    "entities": { "time_range": { "type": "preset", "value": "next_week" } },
    "missing_fields": [],
    "requires_confirmation": false
  },
  "actions": [
    { "id": "a1", "type": "create_task_list", "input": { "time_range": { "type": "preset", "value": "next_week" } } }
  ],
  "preview": {
    "task_candidates": ["Gym", "Reading"],
    "summary": "I will create a task list for next week using tasks from your input."
  }
}
`.trim();
}

// =====================
// AI Plan
// =====================
async function aiPlan(input) {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is missing in .env");
  }

  const messages = [
    { role: "system", content: buildSystemPrompt() },
    { role: "user", content: input },
  ];

  const resp = await openai.chat.completions.create({
    model: MODEL,
    messages,
    temperature: 0.2,
  });

  const content = resp.choices?.[0]?.message?.content ?? "";

  let parsed;
  try {
    parsed = JSON.parse(content);
  } catch (e) {
    throw new Error(`AI returned non-JSON content: ${content.slice(0, 200)}`);
  }

  // Validate plan (preview optional but we want it for UX)
  const PlanSchema = z.object({
    detected_intent: DetectedIntentSchema,
    actions: z.array(ActionSchema),
    preview: PreviewSchema.optional(),
  });

  const check = PlanSchema.safeParse(parsed);
  if (!check.success) {
    throw new Error(
      "AI JSON schema invalid: " + JSON.stringify(check.error.flatten())
    );
  }

  // Если AI не дал preview.task_candidates — добавим локально (как страховку)
  if (check.data.detected_intent.intent === "create_tasks") {
    const localCandidates = extractTaskCandidatesLocal(input);
    const existing = check.data.preview?.task_candidates ?? [];
    const merged = existing.length ? existing : localCandidates;

    return {
      ...check.data,
      preview: {
        task_candidates: merged,
        summary:
          check.data.preview?.summary ||
          "I will create a task list for the selected period using tasks from your input.",
      },
    };
  }

  return check.data;
}

// =====================
// Routes
// =====================

// 1) RUN = planning only (возвращает preview для подтверждения)
app.post("/api/runs", async (req, res) => {
  const parsed = CreateRunBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const { input } = parsed.data;
  const runId = `run_${Date.now()}`;

  try {
    const plan = await aiPlan(input);

    const response = { runId, ...plan };

    const check = CreateRunResponse.safeParse(response);
    if (!check.success) {
      return res.status(500).json({
        error: "Response schema invalid",
        details: check.error.flatten(),
      });
    }

    // сохраняем для execute
    runs.set(runId, { input, plan });

    return res.json(response);
  } catch (err) {
    const reason = err?.message || String(err);
    console.error("AI PLAN ERROR:", reason);

    const plan = mockPlan(input);
    runs.set(runId, { input, plan });

    const response = { runId, ...plan, _fallback: "mock", _ai_error: reason };
    return res.json(response);
  }
});

// 2) CONFIRM & EXECUTE = выполнить план и вернуть результат
app.post("/api/runs/:id/execute", async (req, res) => {
  const runId = req.params.id;
  const stored = runs.get(runId);

  if (!stored) {
    return res.status(404).json({ error: "Run not found" });
  }

  const { input, plan } = stored;

  // MVP: поддержим только create_task_list как первый шаг
  const firstAction = plan.actions?.[0];
  if (!firstAction) {
    return res.status(400).json({ error: "No actions to execute" });
  }

  // В этом варианте “результат” = финальный список задач.
  // Пока делаем просто: берём preview.task_candidates (уже проверено пользователем).
  if (firstAction.type === "create_task_list") {
    const tasks = plan.preview?.task_candidates?.length
      ? plan.preview.task_candidates
      : extractTaskCandidatesLocal(input);

    return res.json({
      runId,
      status: "success",
      results: {
        time_range: firstAction.input.time_range,
        tasks,
      },
      logs: [{ step: firstAction.id, type: firstAction.type, status: "done" }],
    });
  }

  // Остальные actions позже
  return res
    .status(400)
    .json({ error: `Unsupported action type: ${firstAction.type}` });
});

app.listen(3001, () => {
  console.log("API running on http://localhost:3001");
});
