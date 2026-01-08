# AI Prompt → Action Engine

AI Prompt → Action Engine is a web application that transforms a plain text user prompt into **clear, structured actions** with priorities and actionable results.

The product helps users:
- understand **what they really want to do**
- convert text into a **concrete action plan**
- assign **priorities** to tasks
- optionally **send the result by email**

---

## 🚀 What the App Does

1. The user writes a plan in natural language  
2. AI analyzes the input and detects the **intent**
3. The app shows a **preview of the understanding**
4. The user confirms the plan
5. AI:
   - generates a task list
   - assigns priorities
   - adds a short motivational tip
6. (Optional) The result can be **sent to email**

---

## 🧠 Core Idea

> **Understanding first. Execution second.**

The AI never performs actions immediately.

Instead, it:
- explains **how it understood the request**
- shows **what will be done**
- waits for explicit user confirmation

This makes the process:
- transparent
- safe
- user-controlled

---

## ✍️ How to Use

### 1. Write Your Plan

Enter your plan in plain text, for example:


<img width="1226" height="254" alt="image" src="https://github.com/user-attachments/assets/3fd29b3a-d997-4b74-9048-f57511d8fb98" />


---

### 2. Click **Run**

The AI will:
- detect the intent (e.g. `create_tasks`)
- extract mentioned tasks
- show a preview of the plan

<img width="1168" height="663" alt="image" src="https://github.com/user-attachments/assets/9fd0ebfb-13a5-4e38-9ba0-51533199e184" />


---

### 3. Review and Click **Confirm**

After confirmation:
- tasks are enriched with priorities (`high / medium / low`)
- a short **Coach tip** is added

<img width="1104" height="464" alt="image" src="https://github.com/user-attachments/assets/90e2f2b7-6eaa-4bc4-934f-da4d2f1eb0d4" />


---

### 4. (Optional) Send to Email

You can:
- enter an email address
- send the generated plan with one click

<img width="1102" height="153" alt="image" src="https://github.com/user-attachments/assets/00058ff9-2d52-4ffe-a6cc-9bc59498ae77" />


---

## 🗂 History

The app keeps a history of previous runs:
- past prompts
- detected intents
- short previews
- execution timestamps

You can:
- reopen previous plans
- restore results
- delete individual history items

<img width="917" height="1113" alt="image" src="https://github.com/user-attachments/assets/c3b40b4a-5273-42d6-98e4-3bb528746b45" />


---

## ⚙️ Settings

In the settings menu you can:
- switch theme (Light / Dark / System)
- reset the current session

<img width="299" height="286" alt="image" src="https://github.com/user-attachments/assets/5ab81c8d-1cea-40a9-9305-c55822901997" />


---

## 🌙 Dark Theme Support

The application supports:
- Light theme
- Dark theme
- System theme

Theme changes are applied globally and persist across sessions.

<img width="1216" height="1119" alt="image" src="https://github.com/user-attachments/assets/cadf43bf-de91-4efa-bd4a-48b5796169a9" />


---

## 🛠 Tech Stack

**Frontend**
- React
- TypeScript
- Tailwind CSS (v4)
- Vite

**Backend**
- Node.js
- Express
- OpenAI API
- Zod (schema validation)

**Email**
- Resend API

---

## 🔐 Architecture & Approach

- Clear separation of responsibilities:
  - `Run` → planning only
  - `Execute` → final execution
- Strict API contracts validated with Zod
- AI responses are always structured JSON
- Fallback logic is implemented for AI failures

---

## 📦 Local Development

```bash
# Frontend
npm install
npm run dev

# Backend
node index.js


