/**
 * Cross-platform Speech Recognition Hook
 * Uses Web Speech API on browsers, placeholder for native (expo-speech / @react-native-voice)
 *
 * Safari compatibility:
 *  - Falls back to interim transcript if no isFinal results emitted before onend
 *  - Uses shorter silence timer (1.5s) for faster auto-submit
 *  - Handles Safari's aggressive onend behavior
 */
import { useState, useRef, useCallback, useEffect } from 'react';
import { Platform } from 'react-native';

interface UseSpeechRecognitionReturn {
  isListening: boolean;
  transcript: string;
  interimTranscript: string;
  isSupported: boolean;
  error: string | null;
  startListening: () => void;
  stopListening: () => void;
  resetTranscript: () => void;
}

interface SpeechRecognitionEvent {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionInstance {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: { error: string; message?: string }) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

function getWebSpeechRecognition(): (new () => SpeechRecognitionInstance) | null {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return null;
  const win = window as any;
  return win.SpeechRecognition || win.webkitSpeechRecognition || null;
}

function isSafari(): boolean {
  if (Platform.OS !== 'web' || typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  return /Safari/.test(ua) && !/Chrome/.test(ua) && !/Chromium/.test(ua);
}

export function useSpeechRecognition(): UseSpeechRecognitionReturn {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isSupported = Platform.OS === 'web' && getWebSpeechRecognition() !== null;

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch (_e) { /* ignore */ }
      }
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
      }
    };
  }, []);

  const startListening = useCallback(() => {
    setError(null);

    if (Platform.OS === 'web') {
      const SpeechRecognitionClass = getWebSpeechRecognition();
      if (!SpeechRecognitionClass) {
        setError('Speech recognition is not supported in this browser. Try Chrome or Edge.');
        return;
      }

      try {
        if (recognitionRef.current) {
          try { recognitionRef.current.abort(); } catch (_e) { /* ignore */ }
        }

        const recognition = new SpeechRecognitionClass();
        const safari = isSafari();

        recognition.continuous = !safari;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        let finalTranscript = '';
        let lastInterimTranscript = '';
        const SILENCE_TIMEOUT = safari ? 1500 : 2000;

        const resetSilenceTimer = () => {
          if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
          silenceTimerRef.current = setTimeout(() => {
            const hasContent = finalTranscript.trim() || lastInterimTranscript.trim();
            if (recognitionRef.current && hasContent) {
              try { recognitionRef.current.stop(); } catch (_e) { /*