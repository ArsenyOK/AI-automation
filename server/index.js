import express from "express";
import cors from "cors";
import { z } from "zod";
import dotenv from "dotenv";
import OpenAI from "openai";
import { Resend } from "resend";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const resend = new Resend(process.env.RESEND_API_KEY);

const MODEL = process.env.OPENAI_MODEL || "gpt-4.1-mini";
const runs = new Map(); // runId -> { input, plan, executeResult? }

// =====================
// Input schemas
// =====================
const CreateRunBody = z.object({
  input: z.string().min(1, "Prompt is required").max(4000),
  dryRun: z.boolean().optional().default(true),
});

const ExecuteBodySchema = z.object({
  email: z.string().email().optional(),
});

const SendEmailBodySchema = z.object({
  to: z.string().email(),
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
  entities: z.object({ time_range: TimeRangeSchema }).strict(),
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
// NOTE: send_email.to is OPTIONAL/"" in RUN planning (so Zod won't fail)
const ActionSchema = z.discriminatedUnion("type", [
  z.object({
    id: z.string(),
    type: z.literal("create_task_list"),
    input: z.object({ time_range: TimeRangeSchema }).strict(),
    depends_on: z.array(z.string()).optional(),
  }),

  z.object({
    id: z.string(),
    type: z.literal("summarize_text"),
    input: z.object({ text: z.string() }).strict(),
    depends_on: z.array(z.string()).optional(),
  }),

  z.object({
    id: z.string(),
    type: z.literal("generate_email"),
    input: z.object({ prompt: z.string() }).strict(),
    depends_on: z.array(z.string()).optional(),
  }),

  z.object({
    id: z.string(),
    type: z.literal("send_email"),
    input: z
      .object({
        to: z.string().email().optional().or(z.literal("")),
        subject: z.string(),
        body: z.string(),
      })
      .strict(),
    depends_on: z.array(z.string()).optional(),
  }),
]);

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

const AdviceSchema = z.object({ message: z.string().min(1) }).strict();

const EmailStatusSchema = z
  .object({
    sent: z.boolean(),
    to: z.string().email(),
    error: z.string().optional(),
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
  email_status: EmailStatusSchema.optional(),
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

function escapeHtml(s = "") {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function timeRangeLabel(time_range) {
  if (!time_range) return "your plan";
  if (time_range.type === "preset")
    return time_range.value.replaceAll("_", " ");
  return `${time_range.start_date} → ${time_range.end_date}`;
}

function renderTasksEmail({ time_range, tasks, advice }) {
  const title = `Your task plan (${timeRangeLabel(time_range)})`;
  const items = tasks
    .map(
      (t) =>
        `<li><b>[${escapeHtml(t.priority.toUpperCase())}]</b> ${escapeHtml(
          t.title
        )} — ${escapeHtml(t.reason)}</li>`
    )
    .join("");

  return `
  <div style="font-family: ui-sans-serif, system-ui; line-height: 1.5; color:#111827">
    <h2 style="margin:0 0 12px 0">${escapeHtml(title)}</h2>
    <ul style="padding-left:18px; margin:0 0 16px 0">${items}</ul>
    <hr style="border:none; border-top:1px solid #E5E7EB; margin:16px 0" />
    <p style="margin:0"><b>Coach tip:</b> ${escapeHtml(
      advice?.message ?? ""
    )}</p>
  </div>
  `.trim();
}

async function sendEmail({ to, subject, html }) {
  if (!process.env.RESEND_API_KEY) throw new Error("RESEND_API_KEY is missing");

  const from = process.env.EMAIL_FROM || "onboarding@resend.dev";

  await resend.emails.send({
    from,
    to,
    subject,
    html,
  });
}

// =====================
// Mock plan fallback
// =====================
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
      preview: {
        summary: "I will summarize the provided text.",
        task_candidates: [],
      },
    };
  }

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
    actions: [
      { id: "a1", type: "create_task_list", input: { time_range } },
      {
        id: "a2",
        type: "send_email",
        input: { to: "", subject: "Weekly Task Plan", body: "" },
        depends_on: ["a1"],
      },
    ],
    preview: {
      task_candidates,
      summary:
        "I will create a task list for the selected period using tasks from your input.",
    },
  };
}

// =====================
// Prompt (planning)
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
6) preview.task_candidates must list tasks EXPLICITLY mentioned by the user (extract-only; do NOT invent).
7) If user provided tasks separated by commas, extract them into preview.task_candidates.
8) If no explicit tasks are provided, return preview.task_candidates as [].
9) If you cannot determine a valid time_range, use preset next_week.
10) If intent is "create_tasks", include TWO actions:
   - a1: create_task_list
   - a2: send_email (OPTIONAL email): set "to" to "" (empty), subject string, body "".

Example:
{
  "detected_intent": {
    "intent": "create_tasks",
    "confidence": 0.9,
    "entities": { "time_range": { "type": "preset", "value": "next_week" } },
    "missing_fields": [],
    "requires_confirmation": false
  },
  "actions": [
    { "id": "a1", "type": "create_task_list", "input": { "time_range": { "type": "preset", "value": "next_week" } } },
    { "id": "a2", "type": "send_email", "input": { "to": "", "subject": "Weekly Task Plan", "body": "" }, "depends_on": ["a1"] }
  ],
  "preview": { "task_candidates": ["Gym", "Meditation"], "summary": "I will create a task list for next week." }
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
      { role: "user", content: JSON.stringify({ bad_json: badJsonText }) },
    ],
  });

  return resp.choices?.[0]?.message?.content ?? "";
}

// =====================
// AI Plan
// =====================
async function aiPlan(input) {
  if (!process.env.OPENAI_API_KEY)
    throw new Error("OPENAI_API_KEY is missing in .env");

  const PlanSchema = z.object({
    detected_intent: DetectedIntentSchema,
    actions: z.array(ActionSchema),
    preview: PreviewSchema.optional(),
  });

  const resp = await openai.chat.completions.create({
    model: MODEL,
    messages: [
      { role: "system", content: buildSystemPrompt() },
      { role: "user", content: input },
    ],
    temperature: 0.2,
  });

  const content = resp.choices?.[0]?.message?.content ?? "";

  let parsed;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error(`AI returned non-JSON content: ${content.slice(0, 200)}`);
  }

  let check = PlanSchema.safeParse(parsed);

  if (!check.success) {
    try {
      const repairedText = await aiRepairPlan(content);
      const repairedParsed = JSON.parse(repairedText);

      const repairedCheck = PlanSchema.safeParse(repairedParsed);
      if (!repairedCheck.success) {
        throw new Error(
          "AI JSON schema invalid (after repair): " +
            JSON.stringify(repairedCheck.error.flatten())
        );
      }

      check = repairedCheck;
    } catch {
      throw new Error(
        "AI JSON schema invalid: " + JSON.stringify(check.error.flatten())
      );
    }
  }

  // ---- server-side guarantees for create_tasks ----
  if (check.data.detected_intent.intent === "create_tasks") {
    const localCandidates = extractTaskCandidatesLocal(input);
    const existing = check.data.preview?.task_candidates ?? [];
    const merged = existing.length ? existing : localCandidates;

    // Ensure send_email action exists (don't rely on AI)
    const hasSendEmail = check.data.actions.some(
      (a) => a.type === "send_email"
    );
    const actions = [...check.data.actions];

    if (!hasSendEmail) {
      actions.push({
        id: `a${actions.length + 1}`,
        type: "send_email",
        input: { to: "", subject: "Weekly Task Plan", body: "" },
        depends_on: ["a1"],
      });
    }

    // Ensure depends_on for send_email
    for (const a of actions) {
      if (a.type === "send_email" && !a.depends_on) a.depends_on = ["a1"];
      if (a.type === "send_email") {
        // normalize empty email
        if (typeof a.input?.to !== "string") a.input.to = "";
      }
    }

    return {
      ...check.data,
      actions,
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
  const resp = await openai.chat.completions.create({
    model: MODEL,
    messages: [
      { role: "system", content: buildEnrichPrompt() },
      {
        role: "user",
        content: JSON.stringify({ time_range, task_candidates }),
      },
    ],
    temperature: 0.4,
  });

  const content = resp.choices?.[0]?.message?.content ?? "";

  let parsed;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error(
      `Enrich returned non-JSON content: ${content.slice(0, 200)}`
    );
  }

  const EnrichSchema = z
    .object({ tasks: z.array(EnrichedTaskSchema), advice: AdviceSchema })
    .strict();

  const check = EnrichSchema.safeParse(parsed);
  if (!check.success) {
    throw new Error(
      "Enrich JSON schema invalid: " + JSON.stringify(check.error.flatten())
    );
  }

  // Keep same titles & order
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
  if (!parsed.success)
    return res.status(400).json({ error: parsed.error.flatten() });

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

    return res.json({ runId, ...plan, _fallback: "mock", _ai_error: reason });
  }
});

// 2) CONFIRM & EXECUTE = execute + optionally send email (if email provided)
app.post("/api/runs/:id/execute", async (req, res) => {
  const runId = req.params.id;

  const bodyParsed = ExecuteBodySchema.safeParse(req.body ?? {});
  if (!bodyParsed.success)
    return res.status(400).json({ error: bodyParsed.error.flatten() });
  const email = bodyParsed.data.email; // optional

  const stored = runs.get(runId);
  if (!stored) return res.status(404).json({ error: "Run not found" });

  const { input, plan } = stored;

  const firstAction = plan.actions?.find((a) => a.type === "create_task_list");
  if (!firstAction)
    return res.status(400).json({ error: "No actions to execute" });

  const task_candidates = plan.preview?.task_candidates?.length
    ? plan.preview.task_candidates
    : extractTaskCandidatesLocal(input);

  const time_range = firstAction.input.time_range;

  let enriched;
  let enrichFallbackMeta = null;

  try {
    enriched = await aiEnrichTasks({ time_range, task_candidates });
  } catch (err) {
    const reason = err?.message || String(err);
    console.error("AI ENRICH ERROR:", reason);
    enriched = fallbackEnrich(task_candidates);
    enrichFallbackMeta = { _fallback: "enrich_mock", _ai_error: reason };
  }

  // optional email sending
  let email_status;
  if (email) {
    try {
      const subject = `Your task plan (${timeRangeLabel(time_range)})`;
      const html = renderTasksEmail({
        time_range,
        tasks: enriched.tasks,
        advice: enriched.advice,
      });
      await sendEmail({ to: email, subject, html });
      email_status = { sent: true, to: email };
    } catch (err) {
      const reason = err?.message || String(err);
      console.error("EMAIL SEND ERROR:", reason);
      email_status = { sent: false, to: email, error: reason };
    }
  }

  const response = {
    runId,
    status: "success",
    results: { time_range, tasks: enriched.tasks, advice: enriched.advice },
    logs: [{ step: firstAction.id, type: firstAction.type, status: "done" }],
    email_status,
    ...(enrichFallbackMeta || {}),
  };

  const check = ExecuteResponseSchema.safeParse(response);
  if (!check.success) {
    return res
      .status(500)
      .json({
        error: "Execute response invalid",
        details: check.error.flatten(),
      });
  }

  runs.set(runId, { ...stored, executeResult: response });
  return res.json(response);
});

// 3) SEND EMAIL after execute (recommended UI flow)
app.post("/api/runs/:id/email", async (req, res) => {
  const runId = req.params.id;

  const bodyParsed = SendEmailBodySchema.safeParse(req.body ?? {});
  if (!bodyParsed.success)
    return res.status(400).json({ error: bodyParsed.error.flatten() });

  const stored = runs.get(runId);
  if (!stored) return res.status(404).json({ error: "Run not found" });

  const { executeResult } = stored;
  if (!executeResult || executeResult.status !== "success") {
    return res.status(400).json({ error: "Run is not executed yet" });
  }

  const to = bodyParsed.data.to;

  try {
    const { time_range, tasks, advice } = executeResult.results;
    const subject = `Your task plan (${timeRangeLabel(time_range)})`;
    const html = renderTasksEmail({ time_range, tasks, advice });
    await sendEmail({ to, subject, html });

    return res.json({ runId, email_status: { sent: true, to } });
  } catch (err) {
    const reason = err?.message || String(err);
    console.error("EMAIL SEND ERROR:", reason);
    return res
      .status(500)
      .json({ runId, email_status: { sent: false, to, error: reason } });
  }
});

app.listen(3001, () => {
  console.log("API running on http://localhost:3001");
});
