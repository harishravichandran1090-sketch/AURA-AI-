import 'dotenv/config';
import express from 'express';
import path from 'path';
import {fileURLToPath} from 'url';
import {GoogleGenAI, Type} from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT =
  process.env.NODE_ENV === 'production' ? Number(process.env.PORT) || 3000 : 3000;
const MODEL_NAME = 'gemini-4-hydrogen';

function getAiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

async function withRetry<T>(fn: () => Promise<T>, maxRetries = 2): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      const msg = err instanceof Error ? err.message : String(err);
      const isTransient =
        msg.includes('503') ||
        msg.includes('500') ||
        msg.includes('429') ||
        msg.includes('UNAVAILABLE') ||
        msg.includes('DEADLINE_EXCEEDED');
      if (!isTransient || attempt === maxRetries) {
        throw err;
      }
      await new Promise((r) => setTimeout(r, 400 * Math.pow(2, attempt)));
    }
  }
  throw lastError;
}

function formatGeminiError(err: unknown): {status: number; message: string} {
  const raw = err instanceof Error ? err.message : String(err);
  if (raw.includes('PERMISSION_DENIED') || raw.includes('API_KEY_INVALID') || raw.includes('403') || raw.includes('400')) {
    return {
      status: 400,
      message: 'AURA could not authenticate with Gemini. Please verify your API key in Settings > Secrets.',
    };
  }
  if (raw.includes('RESOURCE_EXHAUSTED') || raw.includes('429')) {
    return {
      status: 429,
      message: 'Gemini quota temporarily reached. Please wait a moment and try again, Daddy.',
    };
  }
  if (raw.includes('NOT_FOUND') || raw.includes('404')) {
    return {
      status: 404,
      message: 'Requested Gemini model was not found. Please verify model availability.',
    };
  }
  return {
    status: 500,
    message: raw || 'AURA encountered an unexpected neural processing error.',
  };
}

interface IncomingTask {
  id: string;
  title: string;
  category: string;
  status: string;
  priority: string;
  steps?: string[];
}

interface IncomingMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface IncomingTimer {
  durationSeconds: number;
  remainingSeconds: number;
  isRunning: boolean;
  label: string;
}

const chatResponseSchema = {
  type: Type.OBJECT,
  properties: {
    reply: {
      type: Type.STRING,
      description:
        'AURA conversational response addressing the user naturally as Daddy. May contain clear Markdown, code blocks, or step-by-step explanations.',
    },
    actions: {
      type: Type.ARRAY,
      description:
        'Structured UI triggers to execute automatically when Daddy requests task or focus timer operations. Return an empty array when no UI state change is requested.',
      items: {
        type: Type.OBJECT,
        properties: {
          type: {
            type: Type.STRING,
            description:
              'One of: ADD_TASK, UPDATE_TASK_STATUS, GENERATE_TASK_PLAN, DELETE_TASK, TIMER_CONTROL',
          },
          title: {
            type: Type.STRING,
            description: 'Required for ADD_TASK: concise title of the college task.',
          },
          category: {
            type: Type.STRING,
            description:
              'For ADD_TASK: exactly one of "Lab / Assignment", "Exam Prep", "Project", "College Admin".',
          },
          priority: {
            type: Type.STRING,
            description: 'For ADD_TASK: exactly one of "High", "Medium", "Low".',
          },
          steps: {
            type: Type.ARRAY,
            items: {type: Type.STRING},
            description:
              'For ADD_TASK or GENERATE_TASK_PLAN: exactly 3 crisp, actionable execution steps tailored to the task.',
          },
          taskId: {
            type: Type.STRING,
            description: 'Optional exact task ID when updating, planning, or deleting an existing task.',
          },
          taskTitleMatch: {
            type: Type.STRING,
            description:
              'Substring or title of the target task when taskId is not specified by the user.',
          },
          status: {
            type: Type.STRING,
            description:
              'For UPDATE_TASK_STATUS: exactly one of "Pending", "In Progress", "Completed".',
          },
          command: {
            type: Type.STRING,
            description:
              'For TIMER_CONTROL: exactly one of "START", "PAUSE", "RESET", "SET_MINUTES".',
          },
          minutes: {
            type: Type.NUMBER,
            description: 'For TIMER_CONTROL when command is SET_MINUTES: focus duration in minutes.',
          },
        },
        required: ['type'],
      },
    },
  },
  required: ['reply', 'actions'],
};

const planTaskSchema = {
  type: Type.OBJECT,
  properties: {
    steps: {
      type: Type.ARRAY,
      items: {type: Type.STRING},
      description: 'Exactly 3 concrete, practical action steps for completing the college task.',
    },
  },
  required: ['steps'],
};

function buildSystemInstruction(params: {
  tasks: IncomingTask[];
  timerState?: IncomingTimer;
  mode: string;
  clientTime?: string;
}): string {
  const {tasks, timerState, mode, clientTime} = params;

  const taskSummary =
    tasks.length === 0
      ? 'No college tasks currently logged.'
      : tasks
          .map(
            (t) =>
              `- [id=${t.id}] "${t.title}" | Category: ${t.category} | Status: ${t.status} | Priority: ${t.priority}`
          )
          .join('\n');

  const timerLine = timerState
    ? `Timer Label: ${timerState.label}, Remaining: ${Math.floor(timerState.remainingSeconds / 60)}m ${timerState.remainingSeconds % 60}s of ${Math.floor(timerState.durationSeconds / 60)}m, Running: ${timerState.isRunning}`
    : 'Timer: 25m Focus (Idle)';

  const briefingAddendum =
    mode === 'briefing'
      ? `\nMODE: PROACTIVE BRIEFING\nDaddy pressed "Brief Me". Deliver a sharp, composed, Jarvis-style tactical briefing (around 65 to 110 words, clean prose without markdown clutter so it sounds great spoken aloud). Summarize what is pending or in progress, recommend the single best next task to tackle right now and why, and offer a quick focus nudge. Do not emit unnecessary task mutations unless explicitly helpful.`
      : '';

  return `You are AURA — a personal AI assistant combining the composed, loyal, subtly witty precision of Jarvis with full Gemini reasoning intelligence.

CORE IDENTITY & ADDRESSING:
- Name: AURA.
- Always address the user naturally as "Daddy". Never drop into generic "User" or robotic "Sir/Ma'am" — use "Daddy" smoothly and authentically.
- Tone: Sharp, calm, encouraging, witty when fitting, never sycophantic or verbose without purpose.

DOMAIN INTELLIGENCE:
- Deeply capable across B.E. CSE / AI & ML coursework: C, Java, Python, Data Structures & Algorithms, Operating Systems, DBMS, Computer Networks, Machine Learning, Deep Learning, lab records, viva prep, exam revision, debugging, writing, and project architecture.
- When Daddy asks a technical or coding question, give crystal-clear, accurate explanations, clean runnable code blocks, time/space complexity when relevant, and step-by-step reasoning.
- When answering voice-friendly or conversational prompts, keep prose tight and clear so it sounds great spoken aloud while remaining informative on screen.

LIVE WORKSPACE CONTEXT:
- Local Time: ${clientTime || new Date().toISOString()}
- Focus Timer: ${timerLine}
- Daddy's College Tasks:
${taskSummary}

STRUCTURED ACTION TRIGGERS:
- Whenever Daddy asks to add, create, schedule, plan, start, complete, update, or delete a task — OR asks to start, pause, reset, or set the focus/study timer — respond conversationally in "reply" AND emit the appropriate action object(s) in "actions".
- For ADD_TASK: always include a well-chosen category ("Lab / Assignment" | "Exam Prep" | "Project" | "College Admin"), priority ("High" | "Medium" | "Low"), and exactly 3 actionable steps in "steps".
- For UPDATE_TASK_STATUS or DELETE_TASK or GENERATE_TASK_PLAN: match the existing task using its "taskId" from the list above (or "taskTitleMatch" if unsure).
- For TIMER_CONTROL: emit "START", "PAUSE", "RESET", or "SET_MINUTES" (with "minutes"). If Daddy says "start a 30 minute focus timer", emit SET_MINUTES with minutes=30 and START.
- If no task or timer modification is requested, return "actions": [].${briefingAddendum}`;
}

async function startServer() {
  const app = express();
  app.use(express.json({limit: '1mb'}));

  app.get('/api/health', (_req, res) => {
    res.json({ok: true, service: 'AURA'});
  });

  app.post('/api/aura/chat', async (req, res) => {
    const ai = getAiClient();
    if (!ai) {
      res.status(503).json({
        error: 'Gemini API key is not configured. Please add GEMINI_API_KEY in Settings > Secrets.',
      });
      return;
    }

    try {
      const {
        message = '',
        history = [],
        tasks = [],
        timerState,
        mode = 'chat',
        clientTime,
      } = req.body as {
        message?: string;
        history?: IncomingMessage[];
        tasks?: IncomingTask[];
        timerState?: IncomingTimer;
        mode?: string;
        clientTime?: string;
      };

      const trimmed = typeof message === 'string' ? message.trim() : '';
      if (!trimmed && mode !== 'briefing') {
        res.status(400).json({error: 'Message is required.'});
        return;
      }

      const systemInstruction = buildSystemInstruction({
        tasks: Array.isArray(tasks) ? tasks : [],
        timerState,
        mode,
        clientTime,
      });

      const recentHistory = Array.isArray(history) ? history.slice(-14) : [];
      const contents = [
        ...recentHistory
          .filter((m) => m && typeof m.content === 'string' && m.content.trim().length > 0)
          .map((m) => ({
            role: m.role === 'assistant' ? 'model' : 'user',
            parts: [{text: m.content}],
          })),
        {
          role: 'user',
          parts: [
            {
              text:
                mode === 'briefing'
                  ? 'Give me my tactical college briefing right now, AURA.'
                  : trimmed,
            },
          ],
        },
      ];

      const response = await withRetry(() =>
        ai.models.generateContent({
          model: MODEL_NAME,
          contents,
          config: {
            systemInstruction,
            responseMimeType: 'application/json',
            responseSchema: chatResponseSchema,
          },
        })
      );

      const rawText = (response.text ?? '').trim();
      let parsed: {reply?: string; actions?: unknown[]} = {};
      try {
        const cleaned = rawText
          .replace(/^```json\s*/i, '')
          .replace(/^```\s*/i, '')
          .replace(/```$/i, '')
          .trim();
        parsed = JSON.parse(cleaned || '{}');
      } catch {
        parsed = {reply: rawText || "I'm right here, Daddy. How can I help?", actions: []};
      }

      res.json({
        reply: typeof parsed.reply === 'string' && parsed.reply.trim() ? parsed.reply : "Ready when you are, Daddy.",
        actions: Array.isArray(parsed.actions) ? parsed.actions : [],
      });
    } catch (err) {
      const formatted = formatGeminiError(err);
      res.status(formatted.status).json({error: formatted.message});
    }
  });

  app.post('/api/aura/plan-task', async (req, res) => {
    const ai = getAiClient();
    if (!ai) {
      res.status(503).json({
        error: 'Gemini API key is not configured. Please add GEMINI_API_KEY in Settings > Secrets.',
      });
      return;
    }

    try {
      const {title, category, priority} = req.body as {
        title?: string;
        category?: string;
        priority?: string;
      };

      if (!title || typeof title !== 'string' || !title.trim()) {
        res.status(400).json({error: 'Task title is required.'});
        return;
      }

      const response = await withRetry(() =>
        ai.models.generateContent({
          model: MODEL_NAME,
          contents: `Create a sharp, practical 3-step execution plan for a B.E. CSE / AI & ML college student for this task:
Title: "${title.trim()}"
Category: ${category || 'Lab / Assignment'}
Priority: ${priority || 'Medium'}
Each step should be concise (8-16 words), concrete, and immediately actionable.`,
          config: {
            responseMimeType: 'application/json',
            responseSchema: planTaskSchema,
          },
        })
      );

      const rawText = (response.text ?? '{"steps":[]}').trim();
      const parsed = JSON.parse(rawText) as {steps?: unknown[]};
      const steps = Array.isArray(parsed.steps)
        ? parsed.steps.filter((s): s is string => typeof s === 'string' && s.trim().length > 0).slice(0, 3)
        : [];

      res.json({steps});
    } catch (err) {
      const formatted = formatGeminiError(err);
      res.status(formatted.status).json({error: formatted.message});
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const {createServer: createViteServer} = await import('vite');
    const vite = await createViteServer({
      server: {middlewareMode: true},
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get(/^(?!\/api\/).*/, (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`AURA server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start AURA server:', err);
  process.exit(1);
});
