import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  Volume2,
  VolumeX,
  SlidersHorizontal,
  Radio,
  MessageSquare,
  ListChecks,
  Timer as TimerIcon,
  Zap,
  AlertCircle,
  X,
} from 'lucide-react';
import {NeuralBrainCanvas} from './components/NeuralBrainCanvas';
import {FocusTimer} from './components/FocusTimer';
import {TaskPanel} from './components/TaskPanel';
import {ChatPanel} from './components/ChatPanel';
import {VoiceSettingsModal} from './components/VoiceSettingsModal';
import {PWAInstallButton} from './components/PWAInstallButton';
import {OfflineIndicator} from './components/OfflineIndicator';
import {useVoiceAssistant} from './hooks/useVoiceAssistant';
import type {
  AuraAction,
  ChatMessage,
  CollegeTask,
  NeuralState,
  TaskCategory,
  TaskPriority,
  TaskStatus,
  TimerState,
  VoiceSettings,
} from './types/aura';

const STORAGE_KEYS = {
  INITIALIZED: 'aura_initialized_v1',
  TASKS: 'aura_tasks_v1',
  CHAT: 'aura_chat_v1',
  VOICE: 'aura_voice_settings_v1',
  TIMER: 'aura_timer_v1',
};

const DEFAULT_TASKS: CollegeTask[] = [
  {
    id: 'task-seed-1',
    title: 'DSA Lab: Implement Dijkstra Shortest Path in Python',
    category: 'Lab / Assignment',
    status: 'In Progress',
    priority: 'High',
    steps: [
      'Implement priority-queue Dijkstra using heapq with adjacency list input.',
      'Test edge cases including disconnected nodes and zero-weight edges.',
      'Capture output screenshots and complexity proof for lab record.',
    ],
    createdAt: new Date().toISOString(),
  },
  {
    id: 'task-seed-2',
    title: 'DBMS Unit 3: BCNF & Conflict Serializability Revision',
    category: 'Exam Prep',
    status: 'Pending',
    priority: 'High',
    steps: [
      'Review functional dependency closure and candidate key derivation.',
      'Solve 5 precedence-graph conflict serializability numericals.',
      'Write quick cheat-sheet comparing 3NF vs BCNF decomposition.',
    ],
    createdAt: new Date().toISOString(),
  },
  {
    id: 'task-seed-3',
    title: 'AI & ML Mini Project: Clean Feature Pipeline & Baseline Model',
    category: 'Project',
    status: 'Pending',
    priority: 'Medium',
    steps: [
      'Handle missing values and standardize numerical features in scikit-learn.',
      'Train baseline Random Forest and log F1-score & confusion matrix.',
      'Document model metrics in project progress slide deck.',
    ],
    createdAt: new Date().toISOString(),
  },
];

const DEFAULT_VOICE_SETTINGS: VoiceSettings = {
  voiceEnabled: true,
  handsFree: false,
  rate: 1.04,
  voiceURI: '',
};

const DEFAULT_TIMER: TimerState = {
  durationSeconds: 25 * 60,
  remainingSeconds: 25 * 60,
  isRunning: false,
  label: '25m Focus',
};

function formatTimeStamp(): string {
  return new Date().toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'});
}

function playFocusChime() {
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as {webkitAudioContext: typeof AudioContext}).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const notes = [523.25, 659.25, 783.99];
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const start = ctx.currentTime + idx * 0.14;
      gain.gain.setValueAtTime(0.001, start);
      gain.gain.exponentialRampToValueAtTime(0.14, start + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.42);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.45);
    });
  } catch {
    // Ignore audio context restriction errors
  }
}

export default function App() {
  // Load persisted state
  const [tasks, setTasks] = useState<CollegeTask[]>(() => {
    try {
      const initialized = localStorage.getItem(STORAGE_KEYS.INITIALIZED);
      const saved = localStorage.getItem(STORAGE_KEYS.TASKS);
      if (saved) return JSON.parse(saved) as CollegeTask[];
      if (!initialized) {
        localStorage.setItem(STORAGE_KEYS.INITIALIZED, 'true');
        return DEFAULT_TASKS;
      }
      return [];
    } catch {
      return DEFAULT_TASKS;
    }
  });

  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.CHAT);
      if (saved) return JSON.parse(saved) as ChatMessage[];
    } catch {
      // Ignore parse errors
    }
    return [
      {
        id: 'welcome-1',
        role: 'assistant',
        content:
          "Systems online, Daddy. I'm **AURA** — ready to tackle your B.E. CSE / AI & ML coursework, debug code, automate your task checklist, or run a 25-minute focus sprint. Tap my neural core or type below whenever you're ready.",
        timestamp: formatTimeStamp(),
      },
    ];
  });

  const [voiceSettings, setVoiceSettings] = useState<VoiceSettings>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.VOICE);
      if (saved) return {...DEFAULT_VOICE_SETTINGS, ...(JSON.parse(saved) as Partial<VoiceSettings>)};
    } catch {
      // Ignore
    }
    return DEFAULT_VOICE_SETTINGS;
  });

  const [timer, setTimer] = useState<TimerState>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.TIMER);
      if (saved) {
        const parsed = JSON.parse(saved) as TimerState;
        return {...parsed, isRunning: false};
      }
    } catch {
      // Ignore
    }
    return DEFAULT_TIMER;
  });

  const [isThinking, setIsThinking] = useState(false);
  const [planningTaskId, setPlanningTaskId] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [mobileTab, setMobileTab] = useState<'chat' | 'tasks' | 'timer'>('chat');
  const [desktopRightTab, setDesktopRightTab] = useState<'chat' | 'tasks'>('chat');

  const tasksRef = useRef(tasks);
  const timerRef = useRef(timer);
  const messagesRef = useRef(messages);
  const voiceSettingsRef = useRef(voiceSettings);

  useEffect(() => {
    tasksRef.current = tasks;
    try {
      localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(tasks));
      localStorage.setItem(STORAGE_KEYS.INITIALIZED, 'true');
    } catch {
      // Ignore quota errors
    }
  }, [tasks]);

  useEffect(() => {
    messagesRef.current = messages;
    try {
      localStorage.setItem(STORAGE_KEYS.CHAT, JSON.stringify(messages.slice(-50)));
    } catch {
      // Ignore quota errors
    }
  }, [messages]);

  useEffect(() => {
    voiceSettingsRef.current = voiceSettings;
    try {
      localStorage.setItem(STORAGE_KEYS.VOICE, JSON.stringify(voiceSettings));
    } catch {
      // Ignore quota errors
    }
  }, [voiceSettings]);

  useEffect(() => {
    timerRef.current = timer;
    try {
      localStorage.setItem(STORAGE_KEYS.TIMER, JSON.stringify(timer));
    } catch {
      // Ignore quota errors
    }
  }, [timer]);

  // Ref bridge so voice transcript callback always invokes latest sendToAura
  const sendToAuraRef = useRef<(text: string, mode?: 'chat' | 'briefing') => Promise<void>>(
    async () => {}
  );

  const {
    isListening,
    isSpeaking,
    interimTranscript,
    voiceEnergy,
    voices,
    voiceError,
    setVoiceError,
    startListening,
    stopListening,
    toggleListening,
    speak,
    stopSpeaking,
  } = useVoiceAssistant({
    settings: voiceSettings,
    onFinalTranscript: (transcript) => {
      void sendToAuraRef.current(transcript, 'chat');
    },
  });

  // Compute current Neural Brain state
  const neuralState: NeuralState = useMemo(() => {
    if (isThinking) return 'THINKING';
    if (isListening) return 'LISTENING';
    if (isSpeaking) return 'SPEAKING';
    return 'IDLE';
  }, [isThinking, isListening, isSpeaking]);

  // Focus timer countdown + completion alert
  useEffect(() => {
    if (!timer.isRunning) return;
    const interval = window.setInterval(() => {
      setTimer((prev) => {
        if (!prev.isRunning) return prev;
        if (prev.remainingSeconds <= 1) {
          playFocusChime();
          const doneMsg = `Daddy, your ${Math.round(prev.durationSeconds / 60)}-minute focus session is complete. Take a quick breather or tell me what's next.`;
          setMessages((m) => [
            ...m,
            {
              id: `timer-done-${Date.now()}`,
              role: 'assistant',
              content: doneMsg,
              timestamp: formatTimeStamp(),
              appliedActions: ['Focus session completed'],
            },
          ]);
          if (voiceSettingsRef.current.voiceEnabled) {
            speak(doneMsg);
          }
          return {
            ...prev,
            remainingSeconds: 0,
            isRunning: false,
          };
        }
        return {...prev, remainingSeconds: prev.remainingSeconds - 1};
      });
    }, 1000);

    return () => window.clearInterval(interval);
  }, [timer.isRunning, speak]);

  // Apply structured actions emitted by Gemini
  const applyAuraActions = useCallback((actions: AuraAction[]): string[] => {
    const summaries: string[] = [];

    const matchTaskIndex = (list: CollegeTask[], taskId?: string, titleMatch?: string): number => {
      if (taskId) {
        const byId = list.findIndex((t) => t.id === taskId);
        if (byId !== -1) return byId;
      }
      if (titleMatch) {
        const needle = titleMatch.toLowerCase().trim();
        const exact = list.findIndex((t) => t.title.toLowerCase() === needle);
        if (exact !== -1) return exact;
        const partial = list.findIndex((t) => t.title.toLowerCase().includes(needle));
        if (partial !== -1) return partial;
      }
      return -1;
    };

    for (const action of actions) {
      if (!action || typeof action !== 'object') continue;

      if (action.type === 'ADD_TASK' && action.title) {
        const validCategories: TaskCategory[] = [
          'Lab / Assignment',
          'Exam Prep',
          'Project',
          'College Admin',
        ];
        const validPriorities: TaskPriority[] = ['High', 'Medium', 'Low'];
        const category = validCategories.includes(action.category)
          ? action.category
          : 'Lab / Assignment';
        const priority = validPriorities.includes(action.priority) ? action.priority : 'Medium';
        const steps = Array.isArray(action.steps) ? action.steps.slice(0, 3) : [];

        const newTask: CollegeTask = {
          id: `task-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          title: action.title,
          category,
          status: 'Pending',
          priority,
          steps,
          createdAt: new Date().toISOString(),
        };

        setTasks((prev) => [newTask, ...prev]);
        summaries.push(`Added task: ${action.title}`);
      } else if (action.type === 'UPDATE_TASK_STATUS') {
        const validStatuses: TaskStatus[] = ['Pending', 'In Progress', 'Completed'];
        const status = validStatuses.includes(action.status) ? action.status : 'Completed';
        let matchedTitle = '';
        setTasks((prev) => {
          const idx = matchTaskIndex(prev, action.taskId, action.taskTitleMatch);
          if (idx === -1) return prev;
          matchedTitle = prev[idx].title;
          const next = [...prev];
          next[idx] = {...next[idx], status};
          return next;
        });
        if (matchedTitle || action.taskTitleMatch) {
          summaries.push(`Updated "${matchedTitle || action.taskTitleMatch}" → ${status}`);
        }
      } else if (action.type === 'GENERATE_TASK_PLAN' && Array.isArray(action.steps)) {
        let matchedTitle = '';
        setTasks((prev) => {
          const idx = matchTaskIndex(prev, action.taskId, action.taskTitleMatch);
          if (idx === -1) return prev;
          matchedTitle = prev[idx].title;
          const next = [...prev];
          next[idx] = {...next[idx], steps: action.steps.slice(0, 3)};
          return next;
        });
        if (matchedTitle || action.taskTitleMatch) {
          summaries.push(`Updated 3-step plan for "${matchedTitle || action.taskTitleMatch}"`);
        }
      } else if (action.type === 'DELETE_TASK') {
        let matchedTitle = '';
        setTasks((prev) => {
          const idx = matchTaskIndex(prev, action.taskId, action.taskTitleMatch);
          if (idx === -1) return prev;
          matchedTitle = prev[idx].title;
          return prev.filter((_, i) => i !== idx);
        });
        if (matchedTitle || action.taskTitleMatch) {
          summaries.push(`Removed task: ${matchedTitle || action.taskTitleMatch}`);
        }
      } else if (action.type === 'TIMER_CONTROL') {
        if (action.command === 'SET_MINUTES' && typeof action.minutes === 'number' && action.minutes > 0) {
          const secs = Math.min(180, Math.max(1, Math.round(action.minutes))) * 60;
          setTimer((prev) => ({
            ...prev,
            durationSeconds: secs,
            remainingSeconds: secs,
            label: `${Math.round(secs / 60)}m Focus`,
          }));
          summaries.push(`Timer set to ${Math.round(secs / 60)}m`);
        } else if (action.command === 'START') {
          setTimer((prev) => ({
            ...prev,
            remainingSeconds: prev.remainingSeconds === 0 ? prev.durationSeconds : prev.remainingSeconds,
            isRunning: true,
          }));
          summaries.push('Focus timer started');
        } else if (action.command === 'PAUSE') {
          setTimer((prev) => ({...prev, isRunning: false}));
          summaries.push('Focus timer paused');
        } else if (action.command === 'RESET') {
          setTimer((prev) => ({
            ...prev,
            remainingSeconds: prev.durationSeconds,
            isRunning: false,
          }));
          summaries.push('Focus timer reset');
        }
      }
    }

    return summaries;
  }, []);

  const sendToAura = useCallback(
    async (text: string, mode: 'chat' | 'briefing' = 'chat') => {
      const trimmed = text.trim();
      if (!trimmed && mode !== 'briefing') return;

      if (isSpeaking) {
        stopSpeaking();
      }
      if (isListening) {
        stopListening();
      }

      const userLabel =
        mode === 'briefing' ? '⚡ Give me my college briefing, AURA.' : trimmed;

      const userMsg: ChatMessage = {
        id: `user-${Date.now()}`,
        role: 'user',
        content: userLabel,
        timestamp: formatTimeStamp(),
      };

      const historySnapshot = messagesRef.current
        .filter((m) => !m.isError)
        .slice(-14)
        .map((m) => ({role: m.role, content: m.content}));

      setMessages((prev) => [...prev, userMsg]);
      setIsThinking(true);

      try {
        const res = await fetch('/api/aura/chat', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({
            message: trimmed,
            history: historySnapshot,
            tasks: tasksRef.current,
            timerState: timerRef.current,
            mode,
            clientTime: new Date().toLocaleString(),
          }),
        });

        const data = (await res.json()) as {
          reply?: string;
          actions?: AuraAction[];
          error?: string;
        };

        if (!res.ok || data.error) {
          throw new Error(data.error || `Server error (${res.status})`);
        }

        const reply = data.reply || "I'm ready, Daddy.";
        const actions = Array.isArray(data.actions) ? data.actions : [];
        const appliedActions = applyAuraActions(actions);

        const assistantMsg: ChatMessage = {
          id: `aura-${Date.now()}`,
          role: 'assistant',
          content: reply,
          timestamp: formatTimeStamp(),
          appliedActions,
        };

        setMessages((prev) => [...prev, assistantMsg]);
        setIsThinking(false);

        const continueHandsFree = () => {
          if (voiceSettingsRef.current.handsFree) {
            window.setTimeout(() => {
              if (voiceSettingsRef.current.handsFree) {
                startListening();
              }
            }, 350);
          }
        };

        if (voiceSettingsRef.current.voiceEnabled) {
          speak(reply, continueHandsFree);
        } else {
          continueHandsFree();
        }
      } catch (err) {
        setIsThinking(false);
        const msg =
          err instanceof Error ? err.message : 'Unable to reach AURA neural backend.';
        setMessages((prev) => [
          ...prev,
          {
            id: `err-${Date.now()}`,
            role: 'assistant',
            content: msg,
            timestamp: formatTimeStamp(),
            isError: true,
          },
        ]);
      }
    },
    [
      applyAuraActions,
      isListening,
      isSpeaking,
      speak,
      startListening,
      stopListening,
      stopSpeaking,
    ]
  );

  useEffect(() => {
    sendToAuraRef.current = sendToAura;
  }, [sendToAura]);

  // Brain core tap handler
  const handleBrainActivate = useCallback(() => {
    if (isSpeaking) {
      stopSpeaking();
      return;
    }
    if (isThinking) return;
    toggleListening();
  }, [isSpeaking, isThinking, stopSpeaking, toggleListening]);

  // Hands-free quick toggle
  const handleToggleHandsFree = useCallback(() => {
    setVoiceSettings((prev) => {
      const nextVal = !prev.handsFree;
      if (nextVal && !isListening && !isSpeaking && !isThinking) {
        window.setTimeout(() => startListening(), 100);
      } else if (!nextVal && isListening) {
        stopListening();
      }
      return {...prev, handsFree: nextVal};
    });
  }, [isListening, isSpeaking, isThinking, startListening, stopListening]);

  // Manual Task handlers
  const handleAddTask = useCallback(
    async ({
      title,
      category,
      priority,
      autoPlan,
    }: {
      title: string;
      category: TaskCategory;
      priority: TaskPriority;
      autoPlan: boolean;
    }) => {
      let steps: string[] = [];
      if (autoPlan) {
        try {
          const res = await fetch('/api/aura/plan-task', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({title, category, priority}),
          });
          if (res.ok) {
            const data = (await res.json()) as {steps?: string[]};
            if (Array.isArray(data.steps)) steps = data.steps;
          }
        } catch {
          // Allow task creation even if offline
        }
      }

      const newTask: CollegeTask = {
        id: `task-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        title,
        category,
        status: 'Pending',
        priority,
        steps,
        createdAt: new Date().toISOString(),
      };
      setTasks((prev) => [newTask, ...prev]);
    },
    []
  );

  const handleGeneratePlan = useCallback(async (id: string) => {
    const target = tasksRef.current.find((t) => t.id === id);
    if (!target) return;
    setPlanningTaskId(id);
    try {
      const res = await fetch('/api/aura/plan-task', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          title: target.title,
          category: target.category,
          priority: target.priority,
        }),
      });
      if (res.ok) {
        const data = (await res.json()) as {steps?: string[]};
        if (Array.isArray(data.steps) && data.steps.length > 0) {
          setTasks((prev) =>
            prev.map((t) => (t.id === id ? {...t, steps: data.steps!} : t))
          );
        }
      }
    } finally {
      setPlanningTaskId(null);
    }
  }, []);

  const handleUpdateTaskStatus = useCallback((id: string, status: TaskStatus) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? {...t, status} : t)));
  }, []);

  const handleDeleteTask = useCallback((id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const handleClearChat = useCallback(() => {
    stopSpeaking();
    setMessages([
      {
        id: `reset-${Date.now()}`,
        role: 'assistant',
        content: 'Conversation memory cleared, Daddy. What are we working on next?',
        timestamp: formatTimeStamp(),
      },
    ]);
  }, [stopSpeaking]);

  const activeTaskCount = tasks.filter((t) => t.status !== 'Completed').length;

  return (
    <div className="bg-hud-grid min-h-screen lg:h-screen lg:overflow-hidden flex flex-col text-slate-100">
      {/* Top HUD Header */}
      <header className="sticky top-0 z-30 border-b border-cyan-500/15 bg-[#030712]/90 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-[1600px] items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex items-center gap-3 min-w-0">
            <span className="font-display text-lg font-bold tracking-[0.18em] text-cyan-300 whitespace-nowrap shrink-0">
              AURA
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <PWAInstallButton />

            <button
              type="button"
              onClick={() => {
                if (isSpeaking) stopSpeaking();
                setVoiceSettings((prev) => ({...prev, voiceEnabled: !prev.voiceEnabled}));
              }}
              aria-label={voiceSettings.voiceEnabled ? 'Mute AURA voice' : 'Unmute AURA voice'}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-2 text-xs font-medium transition-colors min-h-[40px] whitespace-nowrap shrink-0 ${
                voiceSettings.voiceEnabled
                  ? 'border-cyan-500/30 bg-cyan-500/10 text-cyan-200 hover:bg-cyan-500/20'
                  : 'border-slate-700 bg-slate-900 text-slate-400 hover:text-slate-200'
              }`}
            >
              {voiceSettings.voiceEnabled ? (
                <Volume2 className="h-4 w-4" aria-hidden="true" />
              ) : (
                <VolumeX className="h-4 w-4" aria-hidden="true" />
              )}
              <span className="hidden sm:inline">
                {voiceSettings.voiceEnabled ? 'Voice On' : 'Muted'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setSettingsOpen(true)}
              aria-label="Open voice settings"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700/80 bg-slate-900/80 px-2.5 py-2 text-xs font-medium text-slate-300 transition-colors hover:border-cyan-500/40 hover:text-cyan-200 min-h-[40px] whitespace-nowrap shrink-0"
            >
              <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
              <span className="hidden md:inline">Voice Settings</span>
            </button>
          </div>
        </div>
      </header>

      {/* Voice Error Notice */}
      {voiceError && (
        <div className="mx-auto w-full max-w-[1600px] px-4 pt-3 sm:px-6">
          <div className="flex items-center justify-between gap-3 rounded-xl border border-amber-500/40 bg-amber-950/50 px-3.5 py-2.5 text-xs text-amber-200">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-amber-400 shrink-0" aria-hidden="true" />
              <span>{voiceError}</span>
            </div>
            <button
              type="button"
              onClick={() => setVoiceError(null)}
              aria-label="Dismiss voice notice"
              className="p-1 text-amber-300 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Main Responsive Workspace */}
      <main className="mx-auto flex w-full max-w-[1600px] flex-1 flex-col gap-4 p-3 sm:p-5 lg:flex-row lg:overflow-hidden">
        {/* LEFT PANEL (Desktop: Fixed-width Neural Core + Status + Focus Timer; Mobile: Compact Top Core) */}
        <aside className="flex flex-col gap-4 lg:w-[360px] xl:w-[390px] lg:shrink-0 lg:overflow-y-auto">
          {/* Neural Brain HUD Card */}
          <div className="hud-panel rounded-2xl p-4">
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="text-xs text-slate-400">
                <span className="font-medium text-slate-200">AI Status:</span>{' '}
                <span className="text-emerald-400 font-medium">
                  {isThinking ? 'Thinking' : 'Active'}
                </span>
                <span aria-hidden="true" className="mx-1.5 text-slate-600">·</span>
                <span className="text-cyan-300">Neural Sync</span>
              </div>

              <button
                type="button"
                onClick={handleToggleHandsFree}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 min-h-[36px] ${
                  voiceSettings.handsFree
                    ? 'border-emerald-400/60 bg-emerald-500/20 text-emerald-200'
                    : 'border-slate-700 bg-slate-900/90 text-slate-300 hover:border-cyan-500/40'
                }`}
              >
                <Radio className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Hands-Free {voiceSettings.handsFree ? 'ON' : 'OFF'}</span>
              </button>
            </div>

            {/* Desktop Neural Brain */}
            <div className="hidden lg:block">
              <NeuralBrainCanvas
                state={neuralState}
                energy={voiceEnergy}
                onActivate={handleBrainActivate}
              />
            </div>

            {/* Mobile Compact Neural Brain */}
            <div className="lg:hidden">
              <NeuralBrainCanvas
                state={neuralState}
                energy={voiceEnergy}
                compact
                onActivate={handleBrainActivate}
              />
            </div>

            {/* Mobile Quick Segmented View Switcher + Brief Me */}
            <div className="mt-3 flex items-center justify-between gap-2 lg:hidden">
              <div className="flex flex-1 items-center gap-1 rounded-xl bg-slate-900/90 p-1 border border-slate-800">
                <button
                  type="button"
                  onClick={() => setMobileTab('chat')}
                  className={`flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-medium transition-colors min-h-[38px] ${
                    mobileTab === 'chat'
                      ? 'bg-cyan-500/20 text-cyan-200'
                      : 'text-slate-400'
                  }`}
                >
                  <MessageSquare className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Chat</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMobileTab('tasks')}
                  className={`flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-medium transition-colors min-h-[38px] ${
                    mobileTab === 'tasks'
                      ? 'bg-cyan-500/20 text-cyan-200'
                      : 'text-slate-400'
                  }`}
                >
                  <ListChecks className="h-3.5 w-3.5" aria-hidden="true" />
                  <span className="tabular-nums">Tasks ({activeTaskCount})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMobileTab('timer')}
                  className={`flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-medium transition-colors min-h-[38px] ${
                    mobileTab === 'timer'
                      ? 'bg-cyan-500/20 text-cyan-200'
                      : 'text-slate-400'
                  }`}
                >
                  <TimerIcon className="h-3.5 w-3.5" aria-hidden="true" />
                  <span className="font-mono tabular-nums">
                    {String(Math.floor(timer.remainingSeconds / 60)).padStart(2, '0')}:
                    {String(timer.remainingSeconds % 60).padStart(2, '0')}
                  </span>
                </button>
              </div>
            </div>
          </div>

          {/* Desktop Focus Timer */}
          <div className="hidden lg:block">
            <FocusTimer
              timer={timer}
              onToggle={() =>
                setTimer((prev) => ({
                  ...prev,
                  remainingSeconds:
                    prev.remainingSeconds === 0 ? prev.durationSeconds : prev.remainingSeconds,
                  isRunning: !prev.isRunning,
                }))
              }
              onReset={() =>
                setTimer((prev) => ({
                  ...prev,
                  remainingSeconds: prev.durationSeconds,
                  isRunning: false,
                }))
              }
              onSelectPreset={(minutes, label) =>
                setTimer({
                  durationSeconds: minutes * 60,
                  remainingSeconds: minutes * 60,
                  isRunning: false,
                  label,
                })
              }
            />
          </div>
        </aside>

        {/* RIGHT WORKSPACE: Desktop xl shows Chat + Tasks side-by-side; lg uses switcher; mobile uses mobileTab */}
        <div className="flex flex-1 flex-col min-h-0 lg:overflow-hidden">
          {/* Tablet/Small-Laptop (lg to xl) switcher bar */}
          <div className="mb-3 hidden lg:flex xl:hidden items-center justify-between gap-2">
            <div className="inline-flex items-center gap-1 rounded-xl bg-slate-900/90 p-1 border border-slate-800">
              <button
                type="button"
                onClick={() => setDesktopRightTab('chat')}
                className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-medium transition-colors ${
                  desktopRightTab === 'chat'
                    ? 'bg-cyan-500/20 text-cyan-200'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <MessageSquare className="h-3.5 w-3.5" aria-hidden="true" />
                <span>AI Chat</span>
              </button>
              <button
                type="button"
                onClick={() => setDesktopRightTab('tasks')}
                className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-medium transition-colors ${
                  desktopRightTab === 'tasks'
                    ? 'bg-cyan-500/20 text-cyan-200'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <ListChecks className="h-3.5 w-3.5" aria-hidden="true" />
                <span className="tabular-nums">College Tasks ({activeTaskCount})</span>
              </button>
            </div>
          </div>

          {/* Mobile Quick Task Peek Strip when on Chat tab */}
          {mobileTab === 'chat' && activeTaskCount > 0 && (
            <div className="mb-3 flex items-center gap-2 overflow-x-auto pb-1 lg:hidden">
              <button
                type="button"
                onClick={() => void sendToAura('', 'briefing')}
                disabled={isThinking}
                className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-500/40 bg-emerald-500/15 px-3 py-2 text-xs font-semibold text-emerald-200 whitespace-nowrap shrink-0 min-h-[40px]"
              >
                <Zap className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Brief Me</span>
              </button>
              {tasks
                .filter((t) => t.status !== 'Completed')
                .slice(0, 3)
                .map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setMobileTab('tasks')}
                    className="rounded-xl border border-slate-800 bg-slate-900/80 px-3 py-2 text-left text-xs text-slate-200 whitespace-nowrap shrink-0 max-w-[210px] truncate min-h-[40px]"
                  >
                    <span className="text-cyan-400 mr-1.5">·</span>
                    {t.title}
                  </button>
                ))}
            </div>
          )}

          {/* Mobile Timer View */}
          {mobileTab === 'timer' && (
            <div className="lg:hidden">
              <FocusTimer
                timer={timer}
                onToggle={() =>
                  setTimer((prev) => ({
                    ...prev,
                    remainingSeconds:
                      prev.remainingSeconds === 0 ? prev.durationSeconds : prev.remainingSeconds,
                    isRunning: !prev.isRunning,
                  }))
                }
                onReset={() =>
                  setTimer((prev) => ({
                    ...prev,
                    remainingSeconds: prev.durationSeconds,
                    isRunning: false,
                  }))
                }
                onSelectPreset={(minutes, label) =>
                  setTimer({
                    durationSeconds: minutes * 60,
                    remainingSeconds: minutes * 60,
                    isRunning: false,
                    label,
                  })
                }
              />
            </div>
          )}

          {/* Desktop 12-col grid (xl: side-by-side Chat + Tasks; lg: tab-controlled; mobile: tab-controlled) */}
          <div className="grid flex-1 min-h-0 grid-cols-1 gap-4 xl:grid-cols-12">
            {/* Chat Column */}
            <div
              className={`min-h-[460px] lg:min-h-0 xl:col-span-7 ${
                mobileTab === 'chat' ? 'flex flex-col' : 'hidden'
              } ${desktopRightTab === 'chat' ? 'lg:flex lg:flex-col' : 'lg:hidden xl:flex xl:flex-col'}`}
            >
              <ChatPanel
                messages={messages}
                neuralState={neuralState}
                interimTranscript={interimTranscript}
                isListening={isListening}
                onSendMessage={(txt) => void sendToAura(txt, 'chat')}
                onToggleListening={toggleListening}
                onReplaySpeech={(txt) => speak(txt)}
                onBriefMe={() => void sendToAura('', 'briefing')}
                onClearChat={handleClearChat}
              />
            </div>

            {/* College Tasks Column */}
            <div
              className={`min-h-[460px] lg:min-h-0 xl:col-span-5 ${
                mobileTab === 'tasks' ? 'flex flex-col' : 'hidden'
              } ${desktopRightTab === 'tasks' ? 'lg:flex lg:flex-col' : 'lg:hidden xl:flex xl:flex-col'}`}
            >
              <TaskPanel
                tasks={tasks}
                onAddTask={handleAddTask}
                onUpdateStatus={handleUpdateTaskStatus}
                onDeleteTask={handleDeleteTask}
                onGeneratePlan={handleGeneratePlan}
                planningTaskId={planningTaskId}
              />
            </div>
          </div>
        </div>
      </main>

      <VoiceSettingsModal
        open={settingsOpen}
        settings={voiceSettings}
        voices={voices}
        onClose={() => setSettingsOpen(false)}
        onChange={setVoiceSettings}
      />

      <OfflineIndicator />
    </div>
  );
}
