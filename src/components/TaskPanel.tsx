import React, {useState} from 'react';
import {
  CheckCircle2,
  Circle,
  Clock,
  ChevronDown,
  ChevronUp,
  Plus,
  Trash2,
  ListChecks,
  Loader2,
} from 'lucide-react';
import type {CollegeTask, TaskCategory, TaskPriority, TaskStatus} from '../types/aura';

interface TaskPanelProps {
  tasks: CollegeTask[];
  onAddTask: (input: {
    title: string;
    category: TaskCategory;
    priority: TaskPriority;
    autoPlan: boolean;
  }) => Promise<void>;
  onUpdateStatus: (id: string, status: TaskStatus) => void;
  onDeleteTask: (id: string) => void;
  onGeneratePlan: (id: string) => Promise<void>;
  planningTaskId: string | null;
}

const CATEGORIES: TaskCategory[] = [
  'Lab / Assignment',
  'Exam Prep',
  'Project',
  'College Admin',
];

const PRIORITIES: TaskPriority[] = ['High', 'Medium', 'Low'];

const STATUS_FILTERS: Array<'All' | TaskStatus> = ['All', 'Pending', 'In Progress', 'Completed'];

export const TaskPanel: React.FC<TaskPanelProps> = ({
  tasks,
  onAddTask,
  onUpdateStatus,
  onDeleteTask,
  onGeneratePlan,
  planningTaskId,
}) => {
  const [filter, setFilter] = useState<'All' | TaskStatus>('All');
  const [showAddForm, setShowAddForm] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<TaskCategory>('Lab / Assignment');
  const [priority, setPriority] = useState<TaskPriority>('High');
  const [autoPlan, setAutoPlan] = useState(true);
  const [isAdding, setIsAdding] = useState(false);

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => ({...prev, [id]: !prev[id]}));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || isAdding) return;
    setIsAdding(true);
    try {
      await onAddTask({
        title: title.trim(),
        category,
        priority,
        autoPlan,
      });
      setTitle('');
      setShowAddForm(false);
    } finally {
      setIsAdding(false);
    }
  };

  const filteredTasks = tasks.filter((t) => (filter === 'All' ? true : t.status === filter));
  const pendingCount = tasks.filter((t) => t.status !== 'Completed').length;
  const completedCount = tasks.filter((t) => t.status === 'Completed').length;

  const cycleStatus = (task: CollegeTask) => {
    const next: Record<TaskStatus, TaskStatus> = {
      Pending: 'In Progress',
      'In Progress': 'Completed',
      Completed: 'Pending',
    };
    onUpdateStatus(task.id, next[task.status]);
  };

  return (
    <section
      aria-label="College Tasks and Checklist"
      className="hud-panel flex h-full flex-col rounded-2xl overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-3 border-b border-slate-800/80 px-4 py-3.5">
        <div className="min-w-0">
          <h2 className="font-display text-xs font-semibold tracking-wider text-slate-100 uppercase">
            College Tasks Autopilot
          </h2>
          <p className="mt-0.5 font-mono text-[11px] tabular-nums text-slate-400">
            {pendingCount} active · {completedCount} completed
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowAddForm((v) => !v)}
          className="inline-flex items-center gap-1.5 rounded-xl border border-cyan-500/40 bg-cyan-500/15 px-3 py-2 text-xs font-medium text-cyan-200 transition-colors hover:bg-cyan-500/25 min-h-[40px] whitespace-nowrap shrink-0"
        >
          <Plus className="h-3.5 w-3.5" aria-hidden="true" />
          <span>{showAddForm ? 'Close' : 'Add Task'}</span>
        </button>
      </div>

      {/* Inline Add Task Form */}
      {showAddForm && (
        <form
          onSubmit={handleSubmit}
          className="border-b border-slate-800/80 bg-slate-950/60 p-4 space-y-3"
        >
          <div>
            <label htmlFor="new-task-title" className="block text-xs font-medium text-slate-300 mb-1">
              Task title
            </label>
            <input
              id="new-task-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Implement Deadlock Banker's Algorithm in C"
              className="w-full rounded-xl border border-slate-700/80 bg-slate-900/90 px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-cyan-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label htmlFor="new-task-cat" className="block text-xs font-medium text-slate-400 mb-1">
                Category
              </label>
              <select
                id="new-task-cat"
                value={category}
                onChange={(e) => setCategory(e.target.value as TaskCategory)}
                className="w-full rounded-xl border border-slate-700/80 bg-slate-900/90 px-2.5 py-2 text-xs text-slate-100 focus:border-cyan-500 focus:outline-none min-h-[40px]"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="new-task-prio" className="block text-xs font-medium text-slate-400 mb-1">
                Priority
              </label>
              <select
                id="new-task-prio"
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskPriority)}
                className="w-full rounded-xl border border-slate-700/80 bg-slate-900/90 px-2.5 py-2 text-xs text-slate-100 focus:border-cyan-500 focus:outline-none min-h-[40px]"
              >
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between gap-2 pt-1">
            <label className="inline-flex items-center gap-2 text-xs text-slate-300 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={autoPlan}
                onChange={(e) => setAutoPlan(e.target.checked)}
                className="h-4 w-4 rounded border-slate-600 bg-slate-900 text-cyan-500 focus:ring-cyan-500"
              />
              <span>Generate 3-step Gemini plan</span>
            </label>

            <button
              type="submit"
              disabled={!title.trim() || isAdding}
              className="inline-flex items-center gap-1.5 rounded-xl bg-cyan-500 px-4 py-2 text-xs font-semibold text-slate-950 transition-colors hover:bg-cyan-400 disabled:opacity-50 min-h-[40px]"
            >
              {isAdding ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                  <span>Planning...</span>
                </>
              ) : (
                <span>Save Task</span>
              )}
            </button>
          </div>
        </form>
      )}

      {/* Segmented Filter Bar */}
      <div className="flex items-center gap-1 border-b border-slate-800/70 px-3 py-2 overflow-x-auto">
        {STATUS_FILTERS.map((s) => {
          const active = filter === s;
          return (
            <button
              key={s}
              type="button"
              onClick={() => setFilter(s)}
              className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                active
                  ? 'bg-cyan-500/20 text-cyan-200'
                  : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
              }`}
            >
              {s}
            </button>
          );
        })}
      </div>

      {/* Task List */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-800/60">
        {filteredTasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
            <ListChecks className="h-8 w-8 text-slate-600 mb-3" aria-hidden="true" />
            <p className="text-sm font-medium text-slate-300">
              {filter === 'All' ? 'No college tasks logged yet' : `No ${filter.toLowerCase()} tasks`}
            </p>
            <p className="mt-1 text-xs text-slate-500 max-w-xs">
              Ask AURA by voice or chat to add a lab, exam prep item, or project milestone, or add one manually above.
            </p>
          </div>
        ) : (
          filteredTasks.map((task) => {
            const isExpanded = !!expandedIds[task.id];
            const isPlanning = planningTaskId === task.id;
            const priorityColor =
              task.priority === 'High'
                ? 'text-rose-400'
                : task.priority === 'Medium'
                  ? 'text-amber-300'
                  : 'text-emerald-400';

            return (
              <div key={task.id} className="px-4 py-3.5 transition-colors hover:bg-slate-900/40">
                <div className="flex items-start gap-3">
                  <button
                    type="button"
                    onClick={() => cycleStatus(task)}
                    aria-label={`Change status of ${task.title} (currently ${task.status})`}
                    className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-800/70 hover:text-cyan-300"
                  >
                    {task.status === 'Completed' ? (
                      <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                    ) : task.status === 'In Progress' ? (
                      <Clock className="h-5 w-5 text-cyan-400" />
                    ) : (
                      <Circle className="h-5 w-5 text-slate-500" />
                    )}
                  </button>

                  <div className="min-w-0 flex-1">
                    <button
                      type="button"
                      onClick={() => toggleExpand(task.id)}
                      className="w-full text-left focus-visible:outline-2 focus-visible:outline-cyan-400 rounded"
                    >
                      <div
                        className={`text-sm font-medium leading-snug ${
                          task.status === 'Completed'
                            ? 'line-through text-slate-500'
                            : 'text-slate-100'
                        }`}
                      >
                        {task.title}
                      </div>

                      {/* Clean unboxed metadata with typographic separators */}
                      <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-400">
                        <span>{task.category}</span>
                        <span aria-hidden="true">·</span>
                        <span className={priorityColor}>{task.priority} Priority</span>
                        <span aria-hidden="true">·</span>
                        <span>{task.status}</span>
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="mt-3 pt-2.5 border-t border-slate-800/70 space-y-2.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[11px] font-medium text-cyan-300">
                            3-Step Action Plan
                          </span>
                          <button
                            type="button"
                            onClick={() => onGeneratePlan(task.id)}
                            disabled={isPlanning}
                            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium text-cyan-300 hover:bg-cyan-500/15 transition-colors disabled:opacity-50"
                          >
                            {isPlanning ? (
                              <>
                                <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
                                <span>Generating...</span>
                              </>
                            ) : (
                              <span>{task.steps.length > 0 ? 'Regenerate Plan' : 'Auto-Plan'}</span>
                            )}
                          </button>
                        </div>

                        {task.steps.length > 0 ? (
                          <ol className="space-y-1.5 text-xs text-slate-300">
                            {task.steps.map((step, idx) => (
                              <li key={idx} className="flex items-start gap-2">
                                <span className="font-mono text-[11px] text-cyan-400 mt-0.5">
                                  0{idx + 1}.
                                </span>
                                <span className="leading-relaxed">{step}</span>
                              </li>
                            ))}
                          </ol>
                        ) : (
                          <p className="text-xs text-slate-500">
                            No steps yet. Click Auto-Plan to let AURA draft a 3-step strategy.
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => toggleExpand(task.id)}
                      aria-label={isExpanded ? 'Collapse plan' : 'Expand 3-step plan'}
                      className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-800/70 hover:text-slate-200"
                    >
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteTask(task.id)}
                      aria-label={`Delete ${task.title}`}
                      className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-rose-500/15 hover:text-rose-400"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
};
