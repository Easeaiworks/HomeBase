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

// Web Speech API types (not in default TS lib)
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
              try { recognitionRef.current.stop(); } catch (_e) { /* ignore */ }
            }
          }, SILENCE_TIMEOUT);
        };

        recognition.onstart = () => {
          setIsListening(true);
          setError(null);
        };

        recognition.onresult = (event: SpeechRecognitionEvent) => {
          let interim = '';
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const result = event.results[i];
            if (result.isFinal) {
              finalTranscript += result[0].transcript + ' ';
              setTranscript(finalTranscript.trim());
            } else {
              interim += result[0].transcript;
            }
          }
          if (interim) {
            lastInterimTranscript = interim;
          }
          setInterimTranscript(interim);
          resetSilenceTimer();
        };

        recognition.onerror = (event: { error: string; message?: string }) => {
          if (event.error === 'not-allowed') {
            setError('Microphone access denied. Please allow microphone access in your browser settings and try again.');
          } else if (event.error === 'no-speech') {
            if (!safari) {
              setError('No speech detected. Try again and speak clearly.');
            }
          } else if (event.error === 'network') {
            setError('Network error. Speech recognition requires an internet connection.');
          } else if (event.error === 'aborted') {
            // User aborted, not an error
          } else {
            setError('Speech recognition error: ' + event.error);
          }
          if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current);
            silenceTimerRef.current = null;
          }
          setIsListening(false);
        };

        recognition.onend = () => {
          if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current);
            silenceTimerRef.current = null;
          }

          // Safari fallback: if no isFinal results but we have interim, use interim
          if (!finalTranscript.trim() && lastInterimTranscript.trim()) {
            finalTranscript = lastInterimTranscript;
          }

          // Set transcript BEFORE isListening=false so the auto-submit effect sees it
          if (finalTranscript.trim()) {
            setTranscript(finalTranscript.trim());
          }
          setInterimTranscript('');

          // Small delay so React processes transcript state before isListening changes
          setTimeout(() => {
            setIsListening(false);
          }, 50);
        };

        recognitionRef.current = recognition;
        recognition.start();
      } catch (err: any) {
        setError(err.message || 'Failed to start speech recognition.');
        setIsListening(false);
      }
    } else {
      setError('Voice input is available on the web version. On mobile, type your message or use the quick actions.');
    }
  }, []);

  const stopListening = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (_e) { /* ignore */ }
    }
    // Let onend handle setting isListening=false to ensure transcript is finalized first
  }, []);

  const resetTranscript = useCallback(() => {
    setTranscript('');
    setInterimTranscript('');
    setError(null);
  }, []);

  return {
    isListening,
    transcript,
    interimTranscript,
    isSupported,
    error,
    startListening,
    stopListening,
    resetTranscript,
  };
}
