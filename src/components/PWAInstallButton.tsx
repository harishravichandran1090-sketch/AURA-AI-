import React, {useState} from 'react';
import {Download, X, Share} from 'lucide-react';
import {usePWAInstall} from '../hooks/usePWAInstall';

export const PWAInstallButton: React.FC = () => {
  const {isInstallable, isInstalled, isIOS, install} = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={install}
        className="inline-flex items-center gap-2 rounded-lg border border-cyan-500/40 bg-cyan-500/15 px-3 py-2 text-xs font-medium text-cyan-200 transition-colors hover:bg-cyan-500/25 focus-visible:outline-2 focus-visible:outline-cyan-400 whitespace-nowrap shrink-0 min-h-[40px]"
      >
        <Download className="h-3.5 w-3.5" aria-hidden="true" />
        <span>Install App</span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          className="inline-flex items-center gap-2 rounded-lg border border-cyan-500/40 bg-cyan-500/15 px-3 py-2 text-xs font-medium text-cyan-200 transition-colors hover:bg-cyan-500/25 focus-visible:outline-2 focus-visible:outline-cyan-400 whitespace-nowrap shrink-0 min-h-[40px]"
        >
          <Download className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Install</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
            <div className="hud-panel w-full max-w-sm rounded-2xl p-6 shadow-2xl">
              <div className="flex items-center justify-between">
                <h3 className="font-display text-base font-semibold text-cyan-100">
                  Install AURA on iOS
                </h3>
                <button
                  type="button"
                  onClick={() => setShowIOSGuide(false)}
                  aria-label="Close installation guide"
                  className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-800/70 hover:text-slate-100"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <ol className="mt-4 space-y-3 text-sm text-slate-300">
                <li className="flex items-start gap-2.5">
                  <span className="font-mono text-xs text-cyan-400 mt-0.5">01.</span>
                  <span>
                    Tap the <strong className="text-slate-100 inline-flex items-center gap-1">Share <Share className="h-3.5 w-3.5 inline" /></strong> button in the Safari toolbar.
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="font-mono text-xs text-cyan-400 mt-0.5">02.</span>
                  <span>
                    Scroll down and select <strong className="text-slate-100">Add to Home Screen</strong>.
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="font-mono text-xs text-cyan-400 mt-0.5">03.</span>
                  <span>Tap <strong className="text-slate-100">Add</strong> to launch AURA as a standalone app.</span>
                </li>
              </ol>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="mt-5 w-full rounded-lg bg-cyan-500/20 border border-cyan-500/40 py-2.5 text-sm font-medium text-cyan-100 hover:bg-cyan-500/30 transition-colors"
              >
                Got it
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
