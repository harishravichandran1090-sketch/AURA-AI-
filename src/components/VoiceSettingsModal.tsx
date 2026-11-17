import React from 'react';
import {X, Volume2, VolumeX, Radio} from 'lucide-react';
import type {VoiceSettings} from '../types/aura';

interface VoiceSettingsModalProps {
  open: boolean;
  settings: VoiceSettings;
  voices: SpeechSynthesisVoice[];
  onClose: () => void;
  onChange: (next: VoiceSettings) => void;
}

export const VoiceSettingsModal: React.FC<VoiceSettingsModalProps> = ({
  open,
  settings,
  voices,
  onClose,
  onChange,
}) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="voice-settings-title"
        className="hud-panel w-full max-w-md rounded-2xl p-5 shadow-2xl space-y-5"
      >
        <div className="flex items-center justify-between">
          <div>
            <h3 id="voice-settings-title" className="font-display text-sm font-semibold text-cyan-100 uppercase">
              Voice & Neural Audio Settings
            </h3>
            <p className="mt-0.5 text-xs text-slate-400">
              Configure AURA&apos;s speech synthesis and hands-free conversation loop.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close voice settings"
            className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-800/80 hover:text-slate-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Voice Output Toggle */}
        <div className="flex items-center justify-between gap-4 border-t border-slate-800/80 pt-4">
          <div className="flex items-center gap-3">
            {settings.voiceEnabled ? (
              <Volume2 className="h-4 w-4 text-cyan-400" aria-hidden="true" />
            ) : (
              <VolumeX className="h-4 w-4 text-slate-500" aria-hidden="true" />
            )}
            <div>
              <div className="text-sm font-medium text-slate-100">Voice Output</div>
              <div className="text-xs text-slate-400">Speak AURA&apos;s replies aloud</div>
            </div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={settings.voiceEnabled}
            onClick={() => onChange({...settings, voiceEnabled: !settings.voiceEnabled})}
            className={`relative h-7 w-12 rounded-full transition-colors ${
              settings.voiceEnabled ? 'bg-cyan-500' : 'bg-slate-700'
            }`}
          >
            <span
              className={`block h-5 w-5 rounded-full bg-white transition-transform ${
                settings.voiceEnabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {/* Hands-Free Loop Toggle */}
        <div className="flex items-center justify-between gap-4 border-t border-slate-800/80 pt-4">
          <div className="flex items-center gap-3">
            <Radio
              className={`h-4 w-4 ${settings.handsFree ? 'text-emerald-400' : 'text-slate-500'}`}
              aria-hidden="true"
            />
            <div>
              <div className="text-sm font-medium text-slate-100">Hands-Free Voice</div>
              <div className="text-xs text-slate-400">
                Automatically listen again after AURA finishes speaking
              </div>
            </div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={settings.handsFree}
            onClick={() => onChange({...settings, handsFree: !settings.handsFree})}
            className={`relative h-7 w-12 rounded-full transition-colors ${
              settings.handsFree ? 'bg-emerald-500' : 'bg-slate-700'
            }`}
          >
            <span
              className={`block h-5 w-5 rounded-full bg-white transition-transform ${
                settings.handsFree ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {/* Voice Speed Slider */}
        <div className="border-t border-slate-800/80 pt-4">
          <div className="flex items-center justify-between text-xs mb-2">
            <label htmlFor="voice-rate-slider" className="font-medium text-slate-200">
              Speech Rate
            </label>
            <span className="font-mono tabular-nums text-cyan-300">
              {settings.rate.toFixed(2)}x
            </span>
          </div>
          <input
            id="voice-rate-slider"
            type="range"
            min={0.75}
            max={1.5}
            step={0.05}
            value={settings.rate}
            onChange={(e) => onChange({...settings, rate: parseFloat(e.target.value)})}
            className="w-full accent-cyan-400 cursor-pointer"
          />
        </div>

        {/* Voice Profile Selector */}
        <div className="border-t border-slate-800/80 pt-4">
          <label htmlFor="voice-profile-select" className="block text-xs font-medium text-slate-200 mb-2">
            Voice Profile
          </label>
          <select
            id="voice-profile-select"
            value={settings.voiceURI}
            onChange={(e) => onChange({...settings, voiceURI: e.target.value})}
            className="w-full rounded-xl border border-slate-700/80 bg-slate-900 px-3 py-2.5 text-xs text-slate-100 focus:border-cyan-500 focus:outline-none min-h-[42px]"
          >
            <option value="">Auto (Best English Jarvis Voice)</option>
            {voices.map((v) => (
              <option key={v.voiceURI} value={v.voiceURI}>
                {v.name} ({v.lang})
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="w-full rounded-xl bg-cyan-500/20 border border-cyan-500/40 py-2.5 text-xs font-semibold text-cyan-100 hover:bg-cyan-500/30 transition-colors min-h-[42px]"
        >
          Done
        </button>
      </div>
    </div>
  );
};
