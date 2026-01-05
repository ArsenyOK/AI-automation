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

const CreateRunBody = z.object({
  input: z.string().min(1, "Prompt is required").max(4000),
  dryRun: z.boolean().optional().default(true),
});

const CreateTasksIntent = z.object({
  intent: z.literal("create_tasks"),
  confidence: z.number().min(0).max(1),
  entities: z
    .object({
      time_range: z.string().default("next_week"),
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

const ActionSchema = z.discriminatedUnion("type", [
  z.object({
    id: z.string(),
    type: z.literal("create_task_list"),
    input: z
      .object({
        time_range: z.string(),
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

function mockPlan(input) {
  const text = input.toLowerCase();

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
    };
  }

  if (
    text.includes("email") ||
    text.includes("письм") ||
    text.includes("почт")
  ) {
    return {
      detected_intent: {
        intent: "generate_email",
        confidence: 0.8,
        entities: { to: null },
        missing_fields: ["email_to"],
        requires_confirmation: true,
      },
      actions: [{ id: "a1", type: "generate_email", input: { prompt: input } }],
    };
  }

  return {
    detected_intent: {
      intent: "create_tasks",
      confidence: 0.75,
      entities: { time_range: "next_week" },
      missing_fields: [],
      requires_confirmation: false,
    },
    actions: [
      {
        id: "a1",
        type: "create_task_list",
        input: { time_range: "next_week" },
      },
    ],
  };
}

function buildSystemPrompt() {
  return `
You are an AI automation planner.
Return ONLY valid JSON. No markdown. No explanations.

You must output an object with exactly these fields:
- detected_intent: { intent, confidence, entities, missing_fields, requires_confirmation }
- actions: array of actions

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

Rules:
1) Always return confidence between 0 and 1.
2) If required data is missing, put it into missing_fields and set requires_confirmation=true.
3) action.id must be unique like "a1", "a2"...
4) If you use send_email, you MUST have "to" inside its input.
5) Keep entities minimal and useful.

IMPORTANT PLANNING RULES:
- This is PLANNING only. Do NOT generate final outputs (e.g. do not generate the actual tasks list).
- For intent "create_tasks": entities must contain ONLY { "time_range": "<...>" }.
- For action type "create_task_list": input must contain ONLY { "time_range": "<...>" }.
- Never add extra keys to entities or action.input.
- Do NOT include lists of tasks, email bodies, or summaries in planning.

Example shape:
{
  "detected_intent": {
    "intent": "create_tasks",
    "confidence": 0.82,
    "entities": { "time_range": "next_week" },
    "missing_fields": [],
    "requires_confirmation": false
  },
  "actions": [
    { "id": "a1", "type": "create_task_list", "input": { "time_range": "next_week" } }
  ]
}
`.trim();
}

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

  const PlanSchema = z.object({
    detected_intent: DetectedIntentSchema,
    actions: z.array(ActionSchema),
  });

  const check = PlanSchema.safeParse(parsed);
  if (!check.success) {
    throw new Error(
      "AI JSON schema invalid: " + JSON.stringify(check.error.flatten())
    );
  }

  return check.data;
}

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

    return res.json(response);
  } catch (err) {
    console.error("AI PLAN ERROR:", err?.message || err);

    const plan = mockPlan(input);
    const response = { runId, ...plan, _fallback: "mock" };

    return res.json(response);
  }
});

app.listen(3001, () => {
  console.log("API running on http://localhost:3001");
});
