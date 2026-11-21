import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  Headphones,
  Loader2,
  Mic,
  Square,
  Volume2,
  VolumeX,
} from 'lucide-react';
import type { BigOEvaluation, ProgrammingLanguage } from '../types/arena';
import { LANGUAGE_CONFIG } from '../data/problems';
import { GeminiMentorAvatar } from './BrandVisuals';

interface VoiceMentorPanelProps {
  problemId: string;
  language: ProgrammingLanguage;
  userCode?: string;
  evaluation?: BigOEvaluation | null;
}

interface TranscriptLine {
  id: string;
  speaker: 'you' | 'mentor';
  text: string;
}

type VoiceStatus = 'idle' | 'recording' | 'processing' | 'speaking' | 'error';

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      const commaIdx = result.indexOf(',');
      resolve(commaIdx >= 0 ? result.slice(commaIdx + 1) : result);
    };
    reader.onerror = () => reject(new Error('Failed to read recorded audio.'));
    reader.readAsDataURL(blob);
  });
}

function base64ToAudioUrl(base64: string, mimeType: string): string {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  const blob = new Blob([bytes], { type: mimeType || 'audio/wav' });
  return URL.createObjectURL(blob);
}

export function VoiceMentorPanel({
  problemId,
  language,
  userCode,
  evaluation,
}: VoiceMentorPanelProps) {
  const [status, setStatus] = useState<VoiceStatus>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [transcripts, setTranscripts] = useState<TranscriptLine[]>([]);
  const [recordingSeconds, setRecordingSeconds] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioElRef = useRef<HTMLAudioElement | null>(null);
  const activeAudioUrlRef = useRef<string | null>(null);

  const stopPlayback = useCallback(() => {
    if (audioElRef.current) {
      audioElRef.current.pause();
      audioElRef.current.currentTime = 0;
      audioElRef.current = null;
    }
    if (activeAudioUrlRef.current) {
      URL.revokeObjectURL(activeAudioUrlRef.current);
      activeAudioUrlRef.current = null;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // Ignore speechSynthesis cancel errors
      }
    }
    setStatus((prev) => (prev === 'speaking' ? 'idle' : prev));
  }, []);

  const stopMicStream = useCallback(() => {
    if (mediaStreamRef.current) {
      for (const track of mediaStreamRef.current.getTracks()) {
        track.stop();
      }
      mediaStreamRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      stopPlayback();
      stopMicStream();
    };
  }, [stopPlayback, stopMicStream]);

  useEffect(() => {
    if (status !== 'recording') {
      setRecordingSeconds(0);
      return;
    }
    const id = window.setInterval(() => {
      setRecordingSeconds((s) => s + 1);
    }, 1000);
    return () => window.clearInterval(id);
  }, [status]);

  const sendVoiceTurn = useCallback(
    async (payload: { audioBase64?: string; audioMimeType?: string; textPrompt?: string }) => {
      stopPlayback();
      setErrorMsg(null);
      setStatus('processing');

      try {
        const res = await fetch('/api/mentor/voice', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            problemId,
            language,
            userCode: userCode ?? '',
            evaluation: evaluation ?? null,
            ...payload,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(String(data.error || 'Voice Mentor could not generate audio.'));
        }

        const userText = String(data.userTranscript || '').trim();
        const mentorText = String(data.mentorText || '').trim();
        const audioBase64 = String(data.audioBase64 || '');
        const mimeType = String(data.mimeType || 'audio/wav');

        setTranscripts((prev) => {
          const next = [...prev];
          if (userText) {
            next.push({
              id: `u-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
              speaker: 'you',
              text: userText,
            });
          }
          if (mentorText) {
            next.push({
              id: `m-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
              speaker: 'mentor',
              text: mentorText,
            });
          }
          return next.slice(-8);
        });

        if (audioBase64) {
          const url = base64ToAudioUrl(audioBase64, mimeType);
          activeAudioUrlRef.current = url;
          const audio = new Audio(url);
          audioElRef.current = audio;

          audio.onended = () => {
            if (activeAudioUrlRef.current === url) {
              URL.revokeObjectURL(url);
              activeAudioUrlRef.current = null;
            }
            audioElRef.current = null;
            setStatus('idle');
          };

          audio.onerror = () => {
            setStatus('idle');
          };

          setStatus('speaking');
          try {
            await audio.play();
          } catch {
            // Browser autoplay policy fallback — transcript is still shown cleanly
            setStatus('idle');
          }
        } else if (mentorText && typeof window !== 'undefined' && 'speechSynthesis' in window) {
          const utter = new SpeechSynthesisUtterance(mentorText);
          utter.rate = 1.02;
          utter.onend = () => setStatus('idle');
          utter.onerror = () => setStatus('idle');
          setStatus('speaking');
          window.speechSynthesis.cancel();
          window.speechSynthesis.speak(utter);
        } else {
          setStatus('idle');
        }
      } catch (err) {
        setStatus('error');
        setErrorMsg(err instanceof Error ? err.message : 'Voice Mentor audio request failed.');
      }
    },
    [evaluation, language, problemId, stopPlayback, userCode],
  );

  const handleStartRecording = async () => {
    stopPlayback();
    setErrorMsg(null);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || typeof MediaRecorder === 'undefined') {
      setStatus('error');
      setErrorMsg('Microphone recording is unavailable in this browser. Use "Hear Coaching Aloud" instead.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });
      mediaStreamRef.current = stream;
      chunksRef.current = [];

      const preferredMime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : '';

      const recorder = preferredMime
        ? new MediaRecorder(stream, { mimeType: preferredMime })
        : new MediaRecorder(stream);

      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (ev) => {
        if (ev.data && ev.data.size > 0) {
          chunksRef.current.push(ev.data);
        }
      };

      recorder.onstop = async () => {
        stopMicStream();
        const mime = recorder.mimeType || 'audio/webm';
        const blob = new Blob(chunksRef.current, { type: mime });
        chunksRef.current = [];
        if (blob.size < 200) {
          setStatus('idle');
          return;
        }
        try {
          const base64 = await blobToBase64(blob);
          await sendVoiceTurn({ audioBase64: base64, audioMimeType: mime });
        } catch {
          setStatus('error');
          setErrorMsg('Could not encode microphone recording.');
        }
      };

      recorder.start();
      setStatus('recording');
    } catch {
      stopMicStream();
      setStatus('error');
      setErrorMsg('Microphone permission was denied. Allow mic access or click "Hear Coaching Aloud".');
    }
  };

  const handleStopAndSend = () => {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== 'inactive') {
      recorder.stop();
    } else {
      stopMicStream();
      setStatus('idle');
    }
  };

  const handleSpeakCoachingAloud = () => {
    const langLabel = LANGUAGE_CONFIG[language].label;
    void sendVoiceTurn({
      textPrompt: `Give me a concise spoken Concept Nudge and ${langLabel} Pitfall Alert for my attempt without revealing code.`,
    });
  };

  return (
    <section
      aria-label="Voice AI Mentor"
      className="rounded-xl border border-[#2A2A32] bg-[#18181B] p-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <GeminiMentorAvatar size="md" />
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-[#F4F4F5]">
              <Volume2 className="h-4 w-4 text-[#4ADE80]" aria-hidden="true" />
              <span>Gemini Voice Mentor</span>
              <span className="font-mono text-xs font-normal text-[#A1A1AA]">
                · {LANGUAGE_CONFIG[language].label} Audio Coaching
              </span>
            </div>
            <p className="mt-1 text-xs text-[#A1A1AA]">
              Ask aloud with your mic or play a spoken Concept Nudge &amp; Pitfall Alert—zero code
              spoilers.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {status === 'recording' ? (
            <button
              type="button"
              onClick={handleStopAndSend}
              className="inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-lg border border-[#F87171]/60 bg-[#F87171]/15 px-3.5 py-2 text-xs font-semibold text-[#FCA5A5] transition-colors hover:bg-[#F87171]/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FACC15]"
            >
              <Square className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Stop &amp; Send ({recordingSeconds}s)</span>
            </button>
          ) : (
            <button
              type="button"
              disabled={status === 'processing'}
              onClick={() => void handleStartRecording()}
              className="inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-lg border border-[#4ADE80]/50 bg-[#121212] px-3.5 py-2 text-xs font-semibold text-[#4ADE80] transition-colors hover:bg-[#4ADE80] hover:text-[#0A0A0C] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FACC15] disabled:opacity-50"
            >
              <Mic className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Speak Question</span>
            </button>
          )}

          {status === 'speaking' ? (
            <button
              type="button"
              onClick={stopPlayback}
              className="inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-lg border border-[#FACC15]/50 bg-[#1F1E16] px-3.5 py-2 text-xs font-semibold text-[#FACC15] transition-colors hover:bg-[#FACC15] hover:text-[#0A0A0C] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FACC15]"
            >
              <VolumeX className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Stop Audio</span>
            </button>
          ) : (
            <button
              type="button"
              disabled={status === 'recording' || status === 'processing'}
              onClick={handleSpeakCoachingAloud}
              className="inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-lg border border-[#2E2E38] bg-[#121212] px-3.5 py-2 text-xs font-semibold text-[#F4F4F5] transition-colors hover:border-[#FACC15] hover:text-[#FACC15] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FACC15] disabled:opacity-50"
            >
              <Headphones className="h-3.5 w-3.5 text-[#FACC15]" aria-hidden="true" />
              <span>Hear Coaching Aloud</span>
            </button>
          )}
        </div>
      </div>

      {/* Live Status Strip */}
      {(status === 'recording' || status === 'processing' || status === 'speaking') && (
        <div
          aria-live="polite"
          className="mt-3.5 flex items-center justify-between gap-3 rounded-lg border border-[#26262E] bg-[#121212] px-3.5 py-2.5 text-xs"
        >
          <div className="flex items-center gap-2.5">
            {status === 'processing' ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-[#FACC15]" aria-hidden="true" />
            ) : (
              <span
                aria-hidden="true"
                className={`h-2 w-2 rounded-full animate-pulse ${
                  status === 'recording' ? 'bg-[#F87171]' : 'bg-[#4ADE80]'
                }`}
              />
            )}
            <span className="font-mono font-medium text-[#F4F4F5]">
              {status === 'recording'
                ? 'Listening on microphone... click Stop & Send when finished.'
                : status === 'processing'
                  ? 'Synthesizing Socratic voice coaching...'
                  : 'Voice Mentor speaking (24kHz audio)...'}
            </span>
          </div>
          <span className="font-mono text-[#A1A1AA]">Zero Spoilers</span>
        </div>
      )}

      {errorMsg && (
        <div
          role="alert"
          className="mt-3 flex items-start gap-2 rounded-lg border border-[#F87171]/40 bg-[#F87171]/10 px-3.5 py-2.5 text-xs text-[#FCA5A5]"
        >
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Voice Transcript Stream */}
      {transcripts.length > 0 && (
        <div className="mt-3.5 max-h-40 space-y-2 overflow-y-auto rounded-lg border border-[#26262E] bg-[#121212] p-3 text-xs">
          {transcripts.map((line) => (
            <div key={line.id} className="leading-relaxed">
              <span
                className={`font-mono font-semibold ${
                  line.speaker === 'you' ? 'text-[#FACC15]' : 'text-[#4ADE80]'
                }`}
              >
                {line.speaker === 'you' ? 'You: ' : 'Voice Mentor: '}
              </span>
              <span className="text-[#D4D4D8]">{line.text}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
