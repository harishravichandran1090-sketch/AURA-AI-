import {useCallback, useEffect, useRef, useState} from 'react';
import type {VoiceSettings} from '../types/aura';
import {splitIntoSpeechChunks, stripMarkdownForSpeech} from '../utils/speechText';

interface SpeechRecognitionAlternativeLike {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionResultLike {
  isFinal: boolean;
  length: number;
  [index: number]: SpeechRecognitionAlternativeLike;
}

interface SpeechRecognitionEventLike extends Event {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: SpeechRecognitionResultLike;
  };
}

interface SpeechRecognitionErrorEventLike extends Event {
  error: string;
  message?: string;
}

interface SpeechRecognitionLike extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

function getSpeechRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

interface UseVoiceAssistantOptions {
  settings: VoiceSettings;
  onFinalTranscript: (transcript: string) => void;
}

export function useVoiceAssistant({settings, onFinalTranscript}: UseVoiceAssistantOptions) {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [voiceEnergy, setVoiceEnergy] = useState(0);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [voiceError, setVoiceError] = useState<string | null>(null);

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const isListeningRef = useRef(false);
  const isSpeakingRef = useRef(false);
  const speakSessionRef = useRef(0);
  const settingsRef = useRef(settings);
  const onFinalTranscriptRef = useRef(onFinalTranscript);
  const decayTimerRef = useRef<number | null>(null);

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  useEffect(() => {
    onFinalTranscriptRef.current = onFinalTranscript;
  }, [onFinalTranscript]);

  const speechSupported = typeof window !== 'undefined' && getSpeechRecognitionCtor() !== null;
  const ttsSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;

  // Load available browser TTS voices
  useEffect(() => {
    if (!ttsSupported) return;

    const loadVoices = () => {
      const list = window.speechSynthesis.getVoices();
      if (list.length > 0) {
        const englishFirst = [...list].sort((a, b) => {
          const aEn = a.lang.toLowerCase().startsWith('en') ? 0 : 1;
          const bEn = b.lang.toLowerCase().startsWith('en') ? 0 : 1;
          if (aEn !== bEn) return aEn - bEn;
          return a.name.localeCompare(b.name);
        });
        setVoices(englishFirst);
      }
    };

    loadVoices();
    window.speechSynthesis.addEventListener('voiceschanged', loadVoices);
    return () => {
      window.speechSynthesis.removeEventListener('voiceschanged', loadVoices);
    };
  }, [ttsSupported]);

  // Smooth decay for voiceEnergy pulse
  const pulseEnergy = useCallback((strength: number) => {
    setVoiceEnergy(Math.min(1, Math.max(0.15, strength)));
    if (decayTimerRef.current) {
      window.clearTimeout(decayTimerRef.current);
    }
    decayTimerRef.current = window.setTimeout(() => {
      setVoiceEnergy((prev) => prev * 0.45);
    }, 140);
  }, []);

  const stopListening = useCallback(() => {
    const rec = recognitionRef.current;
    isListeningRef.current = false;
    setIsListening(false);
    setInterimTranscript('');
    if (rec) {
      try {
        rec.onresult = null;
        rec.onend = null;
        rec.onerror = null;
        rec.stop();
      } catch {
        // Ignore already-stopped errors
      }
      recognitionRef.current = null;
    }
  }, []);

  const stopSpeaking = useCallback(() => {
    speakSessionRef.current += 1;
    isSpeakingRef.current = false;
    setIsSpeaking(false);
    setVoiceEnergy(0);
    if (ttsSupported) {
      window.speechSynthesis.cancel();
    }
  }, [ttsSupported]);

  const startListening = useCallback(() => {
    setVoiceError(null);
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) {
      setVoiceError('Voice input is not supported in this browser. Use Chrome, Edge, or Safari.');
      return;
    }

    // Stop any active speech before listening so AURA doesn't hear herself
    if (isSpeakingRef.current) {
      stopSpeaking();
    }

    if (isListeningRef.current && recognitionRef.current) {
      return;
    }

    try {
      const rec = new Ctor();
      rec.continuous = false;
      rec.interimResults = true;
      rec.lang = 'en-US';

      let finalBuffer = '';

      rec.onstart = () => {
        isListeningRef.current = true;
        setIsListening(true);
        setInterimTranscript('');
        setVoiceError(null);
      };

      rec.onresult = (event) => {
        let interim = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          const text = result[0]?.transcript ?? '';
          if (result.isFinal) {
            finalBuffer += (finalBuffer ? ' ' : '') + text.trim();
          } else {
            interim += text;
          }
        }
        const combined = (finalBuffer + (interim ? ' ' + interim : '')).trim();
        setInterimTranscript(combined);
        if (combined) {
          pulseEnergy(0.75 + Math.random() * 0.25);
        }

        if (finalBuffer.trim()) {
          const captured = finalBuffer.trim();
          finalBuffer = '';
          stopListening();
          onFinalTranscriptRef.current(captured);
        }
      };

      rec.onerror = (event) => {
        isListeningRef.current = false;
        setIsListening(false);
        setInterimTranscript('');
        recognitionRef.current = null;

        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          setVoiceError('Microphone access was denied. Enable mic permissions to talk with AURA.');
        } else if (event.error === 'no-speech') {
          // If hands-free is on and nothing was captured, quietly allow retry on manual tap
          setVoiceError(null);
        } else if (event.error !== 'aborted') {
          setVoiceError(`Voice capture error: ${event.error}`);
        }
      };

      rec.onend = () => {
        isListeningRef.current = false;
        setIsListening(false);
        setInterimTranscript('');
        recognitionRef.current = null;
      };

      recognitionRef.current = rec;
      rec.start();
    } catch {
      isListeningRef.current = false;
      setIsListening(false);
      setVoiceError('Unable to start microphone capture.');
    }
  }, [pulseEnergy, stopListening, stopSpeaking]);

  const toggleListening = useCallback(() => {
    if (isListeningRef.current) {
      stopListening();
    } else {
      startListening();
    }
  }, [startListening, stopListening]);

  const speak = useCallback(
    (rawText: string, onComplete?: () => void) => {
      const currentSettings = settingsRef.current;
      if (!ttsSupported || !currentSettings.voiceEnabled) {
        onComplete?.();
        return;
      }

      const cleanText = stripMarkdownForSpeech(rawText);
      if (!cleanText) {
        onComplete?.();
        return;
      }

      if (isListeningRef.current) {
        stopListening();
      }

      window.speechSynthesis.cancel();
      const sessionId = ++speakSessionRef.current;
      const chunks = splitIntoSpeechChunks(cleanText, 190);

      if (chunks.length === 0) {
        onComplete?.();
        return;
      }

      isSpeakingRef.current = true;
      setIsSpeaking(true);

      const availableVoices = window.speechSynthesis.getVoices();
      const selectedVoice =
        availableVoices.find((v) => v.voiceURI === currentSettings.voiceURI) ||
        availableVoices.find(
          (v) =>
            v.lang.toLowerCase().startsWith('en') &&
            /natural|google|daniel|samantha|aria|guy|jenny/i.test(v.name)
        ) ||
        availableVoices.find((v) => v.lang.toLowerCase().startsWith('en'));

      let index = 0;

      const speakNext = () => {
        if (sessionId !== speakSessionRef.current) return;
        if (index >= chunks.length) {
          isSpeakingRef.current = false;
          setIsSpeaking(false);
          setVoiceEnergy(0);
          onComplete?.();
          return;
        }

        const utterance = new SpeechSynthesisUtterance(chunks[index]);
        if (selectedVoice) utterance.voice = selectedVoice;
        utterance.rate = currentSettings.rate || 1.04;
        utterance.pitch = 1.0;

        utterance.onboundary = () => {
          if (sessionId === speakSessionRef.current) {
            pulseEnergy(0.65 + Math.random() * 0.35);
          }
        };

        utterance.onend = () => {
          if (sessionId !== speakSessionRef.current) return;
          index += 1;
          speakNext();
        };

        utterance.onerror = () => {
          if (sessionId !== speakSessionRef.current) return;
          isSpeakingRef.current = false;
          setIsSpeaking(false);
          setVoiceEnergy(0);
          onComplete?.();
        };

        window.speechSynthesis.speak(utterance);
      };

      speakNext();
    },
    [pulseEnergy, stopListening, ttsSupported]
  );

  useEffect(() => {
    return () => {
      if (decayTimerRef.current) {
        window.clearTimeout(decayTimerRef.current);
      }
      stopListening();
      stopSpeaking();
    };
  }, [stopListening, stopSpeaking]);

  return {
    isListening,
    isSpeaking,
    interimTranscript,
    voiceEnergy,
    voices,
    voiceError,
    setVoiceError,
    speechSupported,
    ttsSupported,
    startListening,
    stopListening,
    toggleListening,
    speak,
    stopSpeaking,
  };
}
