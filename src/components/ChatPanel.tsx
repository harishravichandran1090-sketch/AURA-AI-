import React, {useEffect, useRef, useState} from 'react';
import {
  Send,
  Mic,
  MicOff,
  Volume2,
  Copy,
  Check,
  Trash2,
  Zap,
  Loader2,
} from 'lucide-react';
import type {ChatMessage, NeuralState} from '../types/aura';

interface ChatPanelProps {
  messages: ChatMessage[];
  neuralState: NeuralState;
  interimTranscript: string;
  isListening: boolean;
  onSendMessage: (text: string) => void;
  onToggleListening: () => void;
  onReplaySpeech: (text: string) => void;
  onBriefMe: () => void;
  onClearChat: () => void;
  hideBottomBarOnMobile?: boolean;
}

const STARTER_PROMPTS = [
  'Explain Dijkstra algorithm with Python code',
  'Add OS Deadlock Lab record as high priority',
  'Start a 25-minute focus timer',
  'Quiz me on DBMS normalization for viva',
];

function renderFormattedContent(
  content: string,
  copiedKey: string | null,
  onCopy: (text: string, key: string) => void,
  messageId: string
) {
  const parts = content.split(/(```[\s\S]*?```)/g);

  return parts.map((part, idx) => {
    if (part.startsWith('```') && part.endsWith('```')) {
      const inner = part.slice(3, -3);
      const firstNewline = inner.indexOf('\n');
      const lang = firstNewline !== -1 ? inner.slice(0, firstNewline).trim() : 'code';
      const code = firstNewline !== -1 ? inner.slice(firstNewline + 1) : inner;
      const key = `${messageId}-${idx}`;
      const isCopied = copiedKey === key;

      return (
        <div
          key={key}
          className="my-2.5 overflow-hidden rounded-xl border border-slate-700/80 bg-[#050b18]"
        >
          <div className="flex items-center justify-between border-b border-slate-800 px-3 py-1.5 text-[11px] font-mono text-slate-400">
            <span>{lang || 'code'}</span>
            <button
              type="button"
              onClick={() => onCopy(code.trim(), key)}
              className="inline-flex items-center gap-1 text-slate-400 hover:text-cyan-300 transition-colors"
            >
              {isCopied ? (
                <>
                  <Check className="h-3 w-3 text-emerald-400" />
                  <span className="text-emerald-400">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="h-3 w-3" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>
          <pre className="overflow-x-auto p-3 text-xs font-mono leading-relaxed text-cyan-100">
            <code>{code.trim()}</code>
          </pre>
        </div>
      );
    }

    // Format paragraphs, bold, and inline code cleanly
    const lines = part.split('\n');
    return (
      <div key={`${messageId}-${idx}`} className="space-y-1.5">
        {lines.map((line, lIdx) => {
          if (!line.trim()) return <div key={lIdx} className="h-1" />;

          const tokens = line.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
          return (
            <p key={lIdx} className="leading-relaxed">
              {tokens.map((tok, tIdx) => {
                if (tok.startsWith('**') && tok.endsWith('**')) {
                  return (
                    <strong key={tIdx} className="font-semibold text-white">
                      {tok.slice(2, -2)}
                    </strong>
                  );
                }
                if (tok.startsWith('`') && tok.endsWith('`')) {
                  return (
                    <code
                      key={tIdx}
                      className="rounded bg-slate-800/90 px-1.5 py-0.5 font-mono text-xs text-cyan-200"
                    >
                      {tok.slice(1, -1)}
                    </code>
                  );
                }
                return <React.Fragment key={tIdx}>{tok}</React.Fragment>;
              })}
            </p>
          );
        })}
      </div>
    );
  });
}

export const ChatPanel: React.FC<ChatPanelProps> = ({
  messages,
  neuralState,
  interimTranscript,
  isListening,
  onSendMessage,
  onToggleListening,
  onReplaySpeech,
  onBriefMe,
  onClearChat,
}) => {
  const [input, setInput] = useState('');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const scrollEndRef = useRef<HTMLDivElement | null>(null);

  const isThinking = neuralState === 'THINKING';

  useEffect(() => {
    scrollEndRef.current?.scrollIntoView({behavior: 'smooth'});
  }, [messages, isThinking, interimTranscript]);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedKey(key);
    window.setTimeout(() => setCopiedKey(null), 1800);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isThinking) return;
    onSendMessage(input.trim());
    setInput('');
  };

  return (
    <section
      aria-label="AURA Conversation"
      className="hud-panel flex h-full flex-col rounded-2xl overflow-hidden"
    >
      {/* Panel Header */}
      <div className="flex items-center justify-between gap-2 border-b border-slate-800/80 px-4 py-3">
        <div className="min-w-0">
          <h2 className="font-display text-xs font-semibold tracking-wider text-slate-100 uppercase">
            AURA Intelligence Feed
          </h2>
          <p className="mt-0.5 text-xs text-slate-400 truncate">
            B.E. CSE / AI & ML Reasoning · Voice & Task Autopilot
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onBriefMe}
            disabled={isThinking}
            className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-500/40 bg-emerald-500/15 px-3 py-2 text-xs font-semibold text-emerald-200 transition-colors hover:bg-emerald-500/25 disabled:opacity-50 min-h-[40px] whitespace-nowrap shrink-0"
          >
            <Zap className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Brief Me</span>
          </button>

          {messages.length > 0 && (
            <button
              type="button"
              onClick={onClearChat}
              aria-label="Clear conversation history"
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-800 text-slate-400 transition-colors hover:border-rose-500/40 hover:text-rose-300"
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
        </div>
      </div>

      {/* Messages Viewport */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center py-6 text-center">
            <p className="font-display text-sm font-semibold text-cyan-200">
              At your service, Daddy.
            </p>
            <p className="mt-1.5 max-w-md text-xs leading-relaxed text-slate-400">
              Ask me to debug code, break down CSE/AI-ML concepts, manage your college checklist, or run a 25-minute focus sprint.
            </p>
            <div className="mt-5 grid w-full max-w-lg grid-cols-1 gap-2 sm:grid-cols-2">
              {STARTER_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => onSendMessage(prompt)}
                  className="rounded-xl border border-slate-800 bg-slate-900/70 px-3.5 py-2.5 text-left text-xs text-slate-300 transition-colors hover:border-cyan-500/40 hover:bg-cyan-500/10 hover:text-cyan-100 min-h-[44px]"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg) => {
            const isUser = msg.role === 'user';
            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[92%] sm:max-w-[85%] rounded-2xl px-4 py-3 text-sm ${
                    isUser
                      ? 'bg-cyan-500/18 border border-cyan-500/30 text-cyan-50'
                      : msg.isError
                        ? 'bg-rose-950/50 border border-rose-500/40 text-rose-200'
                        : 'bg-slate-900/85 border border-slate-800 text-slate-200'
                  }`}
                >
                  <div className="mb-1 flex items-center justify-between gap-4 text-[11px] text-slate-400">
                    <span className={isUser ? 'text-cyan-300 font-medium' : 'font-display text-emerald-300 font-semibold'}>
                      {isUser ? 'Daddy' : 'AURA'}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] tabular-nums">{msg.timestamp}</span>
                      {!isUser && !msg.isError && (
                        <button
                          type="button"
                          onClick={() => onReplaySpeech(msg.content)}
                          aria-label="Speak this response aloud"
                          className="inline-flex h-6 w-6 items-center justify-center rounded-md text-slate-400 hover:bg-slate-800 hover:text-cyan-300"
                        >
                          <Volume2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="text-sm leading-relaxed">
                    {renderFormattedContent(msg.content, copiedKey, handleCopy, msg.id)}
                  </div>

                  {msg.appliedActions && msg.appliedActions.length > 0 && (
                    <div className="mt-2.5 pt-2 border-t border-slate-800/80 space-y-1">
                      {msg.appliedActions.map((act, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-300"
                        >
                          <Check className="h-3 w-3 shrink-0" aria-hidden="true" />
                          <span>{act}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}

        {/* Live Voice Interim Transcript Bubble */}
        {isListening && (
          <div className="flex justify-end">
            <div className="max-w-[85%] rounded-2xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-2.5 text-xs text-emerald-200">
              <span className="font-medium text-emerald-300">Listening: </span>
              <span>{interimTranscript || 'Speak now, Daddy...'}</span>
            </div>
          </div>
        )}

        {/* Thinking State Indicator */}
        {isThinking && (
          <div className="flex justify-start">
            <div className="inline-flex items-center gap-2 rounded-2xl border border-violet-500/35 bg-violet-500/10 px-4 py-2.5 text-xs text-violet-200">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-violet-400" aria-hidden="true" />
              <span>AURA is synthesizing a response...</span>
            </div>
          </div>
        )}

        <div ref={scrollEndRef} />
      </div>

      {/* Bottom Input Bar */}
      <form
        onSubmit={handleSubmit}
        className="border-t border-slate-800/80 bg-slate-950/70 p-3 flex items-center gap-2"
      >
        <button
          type="button"
          onClick={onToggleListening}
          aria-label={isListening ? 'Stop voice input' : 'Start voice input'}
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border transition-colors ${
            isListening
              ? 'border-emerald-400 bg-emerald-500/25 text-emerald-200'
              : 'border-slate-700/80 bg-slate-900/90 text-slate-300 hover:border-cyan-500/50 hover:text-cyan-200'
          }`}
        >
          {isListening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
        </button>

        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask AURA anything, Daddy..."
          className="h-11 flex-1 min-w-0 rounded-xl border border-slate-700/80 bg-slate-900/90 px-3.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-cyan-500 focus:outline-none"
        />

        <button
          type="submit"
          disabled={!input.trim() || isThinking}
          aria-label="Send message"
          className="inline-flex h-11 items-center justify-center gap-1.5 rounded-xl bg-cyan-500 px-4 text-xs font-semibold text-slate-950 transition-colors hover:bg-cyan-400 disabled:opacity-45 shrink-0"
        >
          <Send className="h-4 w-4" aria-hidden="true" />
          <span className="hidden sm:inline">Send</span>
        </button>
      </form>
    </section>
  );
};
