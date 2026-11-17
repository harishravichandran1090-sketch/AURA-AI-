export type NeuralState = 'IDLE' | 'LISTENING' | 'THINKING' | 'SPEAKING';

export type TaskCategory =
  | 'Lab / Assignment'
  | 'Exam Prep'
  | 'Project'
  | 'College Admin';

export type TaskStatus = 'Pending' | 'In Progress' | 'Completed';

export type TaskPriority = 'High' | 'Medium' | 'Low';

export interface CollegeTask {
  id: string;
  title: string;
  category: TaskCategory;
  status: TaskStatus;
  priority: TaskPriority;
  steps: string[];
  createdAt: string;
}

export type AuraAction =
  | {
      type: 'ADD_TASK';
      title: string;
      category: TaskCategory;
      priority: TaskPriority;
      steps: string[];
    }
  | {
      type: 'UPDATE_TASK_STATUS';
      taskId?: string;
      taskTitleMatch?: string;
      status: TaskStatus;
    }
  | {
      type: 'GENERATE_TASK_PLAN';
      taskId?: string;
      taskTitleMatch?: string;
      steps: string[];
    }
  | {
      type: 'DELETE_TASK';
      taskId?: string;
      taskTitleMatch?: string;
    }
  | {
      type: 'TIMER_CONTROL';
      command: 'START' | 'PAUSE' | 'RESET' | 'SET_MINUTES';
      minutes?: number;
    };

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  appliedActions?: string[];
  isError?: boolean;
}

export interface VoiceSettings {
  voiceEnabled: boolean;
  handsFree: boolean;
  rate: number;
  voiceURI: string;
}

export interface TimerState {
  durationSeconds: number;
  remainingSeconds: number;
  isRunning: boolean;
  label: string;
}
