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
// Execute result schemas
// =====================
const PrioritySchema = z.enum(["high", "medium", "low"]);

const EnrichedTaskSchema = z
  .object({
    title: z.string().min(1),
    priority: PrioritySchema,
    reason: z.string().min(1),
  })
  .strict();

const AdviceSchema = z
  .object({
    message: z.string().min(1),
  })
  .strict();

const ExecuteResponseSchema = z.object({
  runId: z.string(),
  status: z.enum(["success", "failed"]),
  results: z.object({
    time_range: TimeRangeSchema,
    tasks: z.array(EnrichedTaskSchema),
    advice: AdviceSchema,
  }),
  logs: z.array(
    z.object({
      step: z.string(),
      type: z.string(),
      status: z.enum(["done", "failed"]),
    })
  ),
});

// =====================
// Helpers
// =====================

function extractTaskCandidatesLocal(input) {
  const lower = input.toLowerCase();

  const match =
    lower.match(/\b(task|tasks|my tasks)\s*:/i) ||
    lower.match(/\b(задачи|завдання)\s*:/i);
  if (!match || match.index == null) return [];

  const idx = match.index + match[0].length;
  const chunk = input.slice(idx).trim();

  return chunk
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 30);
}

// Простой fallback enrichment (если AI упал)
function fallbackEnrich(tasks) {
  return {
    tasks: tasks.map((t, i) => ({
      title: t,
      priority: i === 0 ? "high" : "medium",
      reason:
        i === 0
          ? "Start with the most important task to build momentum."
          : "Keeps steady progress.",
    })),
    advice: {
      message: "Start small, stay consistent — progress beats perfection.",
    },
  };
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

detected_intent MUST be an OBJECT, never a string.
If you cannot follow the schema, return a valid JSON with intent "unknown".

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

Example (unknown):
{
  "detected_intent": {
    "intent": "unknown",
    "confidence": 0.2,
    "entities": {},
    "missing_fields": [],
    "requires_confirmation": false
  },
  "actions": [],
  "preview": { "task_candidates": [], "summary": "I could not determine an intent." }
}
`.trim();
}

// =====================
// JSON repair helper
// =====================
function buildRepairPrompt() {
  return `
You are a JSON repair tool.

Return ONLY raw JSON. No markdown. No explanations.
Output must start with "{" and end with "}".

Fix the provided JSON so it matches the required schema.

REQUIRED top-level fields:
- detected_intent (OBJECT, not string)
- actions (array)
- preview (object)

Rules:
- Keep meaning from the original as much as possible.
- If something is missing, fill it conservatively.
- If unsure, set intent "unknown", confidence 0.2, actions [].
`.trim();
}

async function aiRepairPlan(badJsonText) {
  const resp = await openai.chat.completions.create({
    model: MODEL,
    temperature: 0,
    messages: [
      { role: "system", content: buildRepairPrompt() },
      {
        role: "user",
        content: JSON.stringify({
          bad_json: badJsonText,
          schema_hint: {
            detected_intent: {
              intent: "create_tasks|summarize_text|generate_email|unknown",
              confidence: "number 0..1",
              entities: "object",
              missing_fields: "string[]",
              requires_confirmation: "boolean",
            },
            actions: [
              {
                id: "a1",
                type: "create_task_list|summarize_text|generate_email|send_email",
                input: {},
              },
            ],
            preview: { task_candidates: ["..."], summary: "..." },
          },
        }),
      },
    ],
  });

  return resp.choices?.[0]?.message?.content ?? "";
}

// =====================
// AI Plan
// =====================
async function aiPlan(input) {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is missing in .env");
  }

  const PlanSchema = z.object({
    detected_intent: DetectedIntentSchema,
    actions: z.array(ActionSchema),
    preview: PreviewSchema.optional(),
  });

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

  // 1) parse
  let parsed;
  try {
    parsed = JSON.parse(content);
  } catch (e) {
    throw new Error(`AI returned non-JSON content: ${content.slice(0, 200)}`);
  }

  // 2) validate
  let check = PlanSchema.safeParse(parsed);

  // 3) repair if invalid
  if (!check.success) {
    try {
      const repairedText = await aiRepairPlan(content);

      let repairedParsed;
      try {
        repairedParsed = JSON.parse(repairedText);
      } catch (e) {
        throw new Error(
          `Repair returned non-JSON: ${repairedText.slice(0, 200)}`
        );
      }

      const repairedCheck = PlanSchema.safeParse(repairedParsed);
      if (!repairedCheck.success) {
        throw new Error(
          "AI JSON schema invalid (after repair): " +
            JSON.stringify(repairedCheck.error.flatten())
        );
      }

      check = repairedCheck;
    } catch (repairErr) {
      // если repair упал — выбрасываем исходную ошибку в общий catch (и уйдем в mock)
      throw new Error(
        "AI JSON schema invalid: " + JSON.stringify(check.error.flatten())
      );
    }
  }

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
// AI Enrichment for execute
// =====================
function buildEnrichPrompt() {
  return `
You are a productivity assistant.

Return ONLY raw JSON. No markdown. No explanations.
Output must start with "{" and end with "}".

Input:
- time_range (object)
- task_candidates (array of strings)

Your job:
1) For EACH task, assign a priority: "high" | "medium" | "low"
2) Provide a short reason (1 sentence max) for the priority
3) Provide one short motivational advice message (1-2 sentences)

Rules:
- Do NOT add new tasks.
- Do NOT rename tasks (keep the same title text).
- Keep reasons short.

Output:
{
  "tasks": [
    { "title": "...", "priority": "high|medium|low", "reason": "..." }
  ],
  "advice": { "message": "..." }
}
`.trim();
}

async function aiEnrichTasks({ time_range, task_candidates }) {
  const messages = [
    { role: "system", content: buildEnrichPrompt() },
    { role: "user", content: JSON.stringify({ time_range, task_candidates }) },
  ];

  const resp = await openai.chat.completions.create({
    model: MODEL,
    messages,
    temperature: 0.4,
  });

  const content = resp.choices?.[0]?.message?.content ?? "";

  let parsed;
  try {
    parsed = JSON.parse(content);
  } catch (e) {
    throw new Error(
      `Enrich returned non-JSON content: ${content.slice(0, 200)}`
    );
  }

  const EnrichSchema = z
    .object({
      tasks: z.array(EnrichedTaskSchema),
      advice: AdviceSchema,
    })
    .strict();

  const check = EnrichSchema.safeParse(parsed);
  if (!check.success) {
    throw new Error(
      "Enrich JSON schema invalid: " + JSON.stringify(check.error.flatten())
    );
  }

  const inputTitles = task_candidates;
  const outputTitles = check.data.tasks.map((t) => t.title);

  const sameTitles =
    inputTitles.length === outputTitles.length &&
    inputTitles.every((t, i) => t === outputTitles[i]);

  if (!sameTitles) return fallbackEnrich(task_candidates);

  return check.data;
}

// =====================
// Routes
// =====================

// 1) RUN = planning only
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

// 2) CONFIRM & EXECUTE = выполнить план и вернуть enriched результат
app.post("/api/runs/:id/execute", async (req, res) => {
  const runId = req.params.id;
  const stored = runs.get(runId);

  if (!stored) {
    return res.status(404).json({ error: "Run not found" });
  }

  const { input, plan } = stored;
  const firstAction = plan.actions?.[0];

  if (!firstAction) {
    return res.status(400).json({ error: "No actions to execute" });
  }

  if (firstAction.type === "create_task_list") {
    const task_candidates = plan.preview?.task_candidates?.length
      ? plan.preview.task_candidates
      : extractTaskCandidatesLocal(input);

    const time_range = firstAction.input.time_range;

    try {
      const enriched = await aiEnrichTasks({ time_range, task_candidates });

      const response = {
        runId,
        status: "success",
        results: { time_range, tasks: enriched.tasks, advice: enriched.advice },
        logs: [
          { step: firstAction.id, type: firstAction.type, status: "done" },
        ],
      };

      const check = ExecuteResponseSchema.safeParse(response);
      if (!check.success) {
        return res.status(500).json({
          error: "Execute response invalid",
          details: check.error.flatten(),
        });
      }

      return res.json(response);
    } catch (err) {
      const reason = err?.message || String(err);
      console.error("AI ENRICH ERROR:", reason);

      const fallback = fallbackEnrich(task_candidates);

      return res.json({
        runId,
        status: "success",
        results: { time_range, tasks: fallback.tasks, advice: fallback.advice },
        logs: [
          { step: firstAction.id, type: firstAction.type, status: "done" },
        ],
        _fallback: "enrich_mock",
        _ai_error: reason,
      });
    }
  }

  return res
    .status(400)
    .json({ error: `Unsupported action type: ${firstAction.type}` });
});

app.listen(3001, () => {
  console.log("API running on http://localhost:3001");
});
