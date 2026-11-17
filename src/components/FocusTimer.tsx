import React from 'react';
import {Play, Pause, RotateCcw} from 'lucide-react';
import type {TimerState} from '../types/aura';

interface FocusTimerProps {
  timer: TimerState;
  onToggle: () => void;
  onReset: () => void;
  onSelectPreset: (minutes: number, label: string) => void;
}

const PRESETS = [
  {minutes: 25, label: '25m Focus'},
  {minutes: 50, label: '50m Deep'},
  {minutes: 5, label: '5m Break'},
];

export const FocusTimer: React.FC<FocusTimerProps> = ({
  timer,
  onToggle,
  onReset,
  onSelectPreset,
}) => {
  const mins = Math.floor(timer.remainingSeconds / 60);
  const secs = timer.remainingSeconds % 60;
  const formatted = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

  const progress =
    timer.durationSeconds > 0
      ? (timer.durationSeconds - timer.remainingSeconds) / timer.durationSeconds
      : 0;
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - Math.min(1, Math.max(0, progress)));

  return (
    <section aria-label="Study Focus Timer" className="hud-panel rounded-2xl p-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="font-display text-xs font-semibold tracking-wider text-slate-200 uppercase">
            Focus Timer
          </h2>
          <p className="mt-0.5 text-xs text-slate-400">{timer.label}</p>
        </div>

        <div className="flex items-center gap-1 rounded-lg bg-slate-900/90 p-1 border border-slate-800">
          {PRESETS.map((preset) => {
            const isActive =
              timer.durationSeconds === preset.minutes * 60 && timer.label === preset.label;
            return (
              <button
                key={preset.label}
                type="button"
                onClick={() => onSelectPreset(preset.minutes, preset.label)}
                className={`rounded-md px-2 py-1 text-[11px] font-medium transition-colors whitespace-nowrap shrink-0 ${
                  isActive
                    ? 'bg-cyan-500/20 text-cyan-200'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {preset.minutes}m
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="relative h-20 w-20 shrink-0 flex items-center justify-center">
            <svg className="h-20 w-20 -rotate-90" viewBox="0 0 88 88" aria-hidden="true">
              <circle
                cx="44"
                cy="44"
                r={radius}
                fill="none"
                stroke="rgba(148, 163, 184, 0.14)"
                strokeWidth="5"
              />
              <circle
                cx="44"
                cy="44"
                r={radius}
                fill="none"
                stroke={timer.isRunning ? '#10b981' : '#06b6d4'}
                strokeWidth="5"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                className="transition-all duration-300"
              />
            </svg>
            <span className="absolute font-mono text-sm font-semibold tabular-nums text-slate-100">
              {formatted}
            </span>
          </div>

          <div className="min-w-0">
            <div className="font-display text-2xl font-bold tabular-nums tracking-wider text-slate-50">
              {formatted}
            </div>
            <div className="mt-0.5 text-xs text-slate-400">
              {timer.isRunning ? 'Session in progress' : 'Ready for study sprint'}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onToggle}
            className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2.5 text-xs font-semibold transition-colors min-h-[42px] whitespace-nowrap shrink-0 ${
              timer.isRunning
                ? 'border border-amber-500/40 bg-amber-500/15 text-amber-200 hover:bg-amber-500/25'
                : 'border border-emerald-500/40 bg-emerald-500/20 text-emerald-200 hover:bg-emerald-500/30'
            }`}
          >
            {timer.isRunning ? (
              <>
                <Pause className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Pause</span>
              </>
            ) : (
              <>
                <Play className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Start</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={onReset}
            aria-label="Reset focus timer"
            className="inline-flex items-center justify-center rounded-xl border border-slate-700/80 bg-slate-900/70 p-2.5 text-slate-300 transition-colors hover:border-cyan-500/40 hover:text-cyan-200 min-h-[42px] min-w-[42px]"
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </section>
  );
};
