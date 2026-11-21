import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  Compass,
  ExternalLink,
  Globe,
  Loader2,
  RefreshCw,
  RotateCcw,
  Send,
  ShieldAlert,
} from 'lucide-react';
import type {
  MatchVerdict,
  MentorChatMessage,
  MentorInitialFeedback,
  ProblemStatement,
  ProgrammingLanguage,
} from '../types/arena';
import { LANGUAGE_CONFIG, TIER_CONFIG } from '../data/problems';
import { VoiceMentorPanel } from './VoiceMentorPanel';
import { GeminiMentorAvatar, GeminiSparkIcon, LanguageLogo } from './BrandVisuals';

interface MentorChatbotProps {
  problem: ProblemStatement;
  language: ProgrammingLanguage;
  userCode: string;
  verdict: MatchVerdict | null;
  initialGuidance: MentorInitialFeedback | null;
  loadingInitial: boolean;
  initialError: string | null;
  messages: MentorChatMessage[];
  sendingMessage: boolean;
  chatError: string | null;
  onRetryInitial: () => void;
  onSendMessage: (question: string, useSearchGrounding: boolean) => void;
  onReturnToLobby: () => void;
}

export function MentorChatbot({
  problem,
  language,
  userCode,
  verdict,
  initialGuidance,
  loadingInitial,
  initialError,
  messages,
  sendingMessage,
  chatError,
  onRetryInitial,
  onSendMessage,
  onReturnToLobby,
}: MentorChatbotProps) {
  const [draft, setDraft] = useState('');
  const [useSearchGrounding, setUseSearchGrounding] = useState(false);
  const [analysisElapsedMs, setAnalysisElapsedMs] = useState(0);

  const isAnalyzing = loadingInitial || sendingMessage;
  useEffect(() => {
    if (!isAnalyzing) {
      setAnalysisElapsedMs(0);
      return;
    }
    const start = Date.now();
    setAnalysisElapsedMs(0);
    const id = window.setInterval(() => {
      setAnalysisElapsedMs(Date.now() - start);
    }, 100);
    return () => window.clearInterval(id);
  }, [isAnalyzing]);

  const selfResult = verdict?.participants.find((p) => p.isSelf);
  const langLabel = LANGUAGE_CONFIG[language].label;

  const languagePitfallExample: Record<ProgrammingLanguage, string> = {
    c: 'Why did my C code cause a segmentation fault on pointer indexing?',
    cpp: 'How do I prevent unnecessary std::string copies or memory leaks in C++?',
    java: 'Why did my Java code get Memory Limit Exceeded or O(n^2) String overhead?',
    python: 'Why is my Python loop or list materialization hitting high memory usage?',
  };

  const defaultPrompts = [
    languagePitfallExample[language],
    `How do I reach ${problem.targetTimeComplexity} time and ${problem.targetSpaceComplexity} space conceptually?`,
    `What ${langLabel} edge case could break my loop or boundary conditions here?`,
  ];

  const suggestedQuestions =
    initialGuidance?.focusQuestions && initialGuidance.focusQuestions.length > 0
      ? initialGuidance.focusQuestions
      : defaultPrompts;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = draft.trim();
    if (!cleaned || sendingMessage) return;
    onSendMessage(cleaned, useSearchGrounding);
    setDraft('');
  };

  return (
    <main className="mx-auto max-w-[1320px] px-4 py-8 sm:px-6 lg:px-8">
      {/* Header Summary */}
      <section className="flex flex-col justify-between gap-4 border-b border-[#26262E] pb-6 md:flex-row md:items-end">
        <div className="flex items-start gap-4">
          <div className="hidden items-center gap-2 sm:flex">
            <GeminiMentorAvatar size="lg" />
            <LanguageLogo language={language} className="h-10 w-10" />
          </div>
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-[#A1A1AA]">
              Gemini AI Mentor ·{' '}
              {problem.partNumber && problem.levelNumber
                ? `Part ${problem.partNumber} · Level ${problem.levelNumber}`
                : `${TIER_CONFIG[problem.tier].label} Tier`}{' '}
              · {LANGUAGE_CONFIG[language].shortLabel} · Zero Direct Code Spoilers
            </p>
            <h1 className="text-2xl font-bold text-[#F4F4F5] sm:text-3xl">
              {verdict && !verdict.didWin
                ? `Big-O & Language Review: ${problem.title}`
                : `Guided ${langLabel} Coaching: ${problem.title}`}
            </h1>
            <p className="max-w-2xl text-sm text-[#D4D4D8]">
              {verdict
                ? verdict.summary
                : 'Your Gemini mentor guides you strictly through Concept Nudges and Language Pitfall Alerts—never direct code solutions.'}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onReturnToLobby}
          className="inline-flex shrink-0 items-center gap-2 self-start whitespace-nowrap rounded-lg border border-[#2E2E38] bg-[#18181B] px-4 py-2.5 text-sm font-medium text-[#F4F4F5] transition-colors hover:border-[#FACC15] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FACC15] md:self-auto"
        >
          <RotateCcw className="h-4 w-4 text-[#FACC15]" aria-hidden="true" />
          <span>New Match</span>
        </button>
      </section>

      {/* Match Evaluation Snapshot (if submitted) */}
      {selfResult && (
        <section className="mt-6 grid grid-cols-1 gap-4 rounded-xl border border-[#2A2A32] bg-[#18181B] p-5 sm:grid-cols-3">
          <div>
            <div className="text-xs text-[#A1A1AA]">Your Evaluated Time</div>
            <div className="mt-1 font-mono text-lg font-semibold text-[#FACC15]">
              {selfResult.timeComplexity}
            </div>
            <div className="mt-0.5 font-mono text-xs text-[#A1A1AA]">
              Target: {problem.targetTimeComplexity}
            </div>
          </div>
          <div>
            <div className="text-xs text-[#A1A1AA]">Your Evaluated Space</div>
            <div className="mt-1 font-mono text-lg font-semibold text-[#FACC15]">
              {selfResult.spaceComplexity}
            </div>
            <div className="mt-0.5 font-mono text-xs text-[#A1A1AA]">
              Target: {problem.targetSpaceComplexity}
            </div>
          </div>
          <div>
            <div className="text-xs text-[#A1A1AA]">Judge Verdict</div>
            <div
              className={`mt-1 text-sm font-semibold ${
                selfResult.isCorrect ? 'text-[#4ADE80]' : 'text-[#F87171]'
              }`}
            >
              {selfResult.isCorrect
                ? 'Correct Logic · Suboptimal Big-O'
                : 'Logic / Language Pitfall Failure'}
            </div>
            <div className="mt-0.5 text-xs text-[#D4D4D8]">
              {selfResult.evaluation.correctnessSummary}
            </div>
          </div>
        </section>
      )}

      {/* Main Split: Concept Nudge + Pitfall Alert + Voice Mentor (Left) & Multi-Turn Chat (Right) */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left: Structured Concept Nudge, Language Pitfall Alert & Real-Time Voice Mentor */}
        <div className="space-y-4 lg:col-span-5">
          {loadingInitial && (
            <div
              aria-busy="true"
              className="space-y-4 rounded-xl border border-[#2A2A32] bg-[#18181B] p-6"
            >
              <div className="flex items-center justify-between gap-2 text-sm font-medium text-[#FACC15]">
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  <span>Preparing Concept Nudge and {langLabel} Pitfall Alert...</span>
                </span>
                <span className="font-mono text-xs tabular-nums text-[#FACC15]">
                  {(analysisElapsedMs / 1000).toFixed(1)}s
                </span>
              </div>
              <div className="h-24 animate-pulse rounded bg-[#26262E]" />
              <div className="h-24 animate-pulse rounded bg-[#26262E]" />
            </div>
          )}

          {!loadingInitial && initialError && (
            <div
              role="alert"
              className="space-y-3 rounded-xl border border-[#F87171]/40 bg-[#18181B] p-6"
            >
              <div className="flex items-start gap-2.5 text-sm text-[#FCA5A5]">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                <span>{initialError}</span>
              </div>
              <button
                type="button"
                onClick={onRetryInitial}
                className="inline-flex items-center gap-2 rounded-lg border border-[#2E2E38] bg-[#121212] px-4 py-2 text-xs font-medium text-[#F4F4F5] hover:border-[#FACC15]"
              >
                <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Retry Mentor Analysis</span>
              </button>
            </div>
          )}

          {!loadingInitial && initialGuidance && (
            <>
              <section className="rounded-xl border border-[#2A2A32] bg-[#18181B] p-6">
                <div className="flex items-center gap-2 text-sm font-semibold text-[#4ADE80]">
                  <Compass className="h-4 w-4" aria-hidden="true" />
                  <span>Concept Nudge</span>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-[#E4E4E7]">
                  {initialGuidance.conceptNudge}
                </p>
              </section>

              <section className="rounded-xl border border-[#2A2A32] bg-[#18181B] p-6">
                <div className="flex items-center gap-2 text-sm font-semibold text-[#FACC15]">
                  <ShieldAlert className="h-4 w-4" aria-hidden="true" />
                  <span>Language Pitfall Alert ({langLabel})</span>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-[#E4E4E7]">
                  {initialGuidance.pitfallAlert}
                </p>
              </section>
            </>
          )}

          {/* Gemini Voice AI Mentor */}
          <VoiceMentorPanel
            problemId={problem.id}
            language={language}
            userCode={userCode}
            evaluation={selfResult?.evaluation ?? null}
          />

          {/* Quick Follow-Up Prompts */}
          <section className="rounded-xl border border-[#2A2A32] bg-[#18181B] p-5">
            <h2 className="text-xs font-semibold text-[#A1A1AA]">Suggested Follow-Up Questions</h2>
            <div className="mt-3 flex flex-col gap-2">
              {suggestedQuestions.map((q, idx) => (
                <button
                  key={idx}
                  type="button"
                  disabled={sendingMessage}
                  onClick={() => onSendMessage(q, useSearchGrounding)}
                  className="rounded-lg border border-[#26262E] bg-[#121212] px-3.5 py-2.5 text-left text-xs leading-relaxed text-[#D4D4D8] transition-colors hover:border-[#FACC15]/60 hover:text-[#F4F4F5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FACC15] disabled:opacity-50"
                >
                  {q}
                </button>
              ))}
            </div>
          </section>
        </div>

        {/* Right: Multi-Turn Interactive AI Mentor Chatbot with Google Search Grounding */}
        <section
          aria-label="Interactive AI Mentor Chatbot"
          className="flex min-h-[480px] flex-col rounded-xl border border-[#2A2A32] bg-[#18181B] lg:sticky lg:top-20 lg:col-span-7 lg:h-[calc(100vh-16.5rem)] lg:min-h-[480px] lg:max-h-[630px] lg:self-start"
        >
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#26262E] px-5 py-4 sm:flex-nowrap">
            <div className="flex min-w-0 items-center gap-3">
              <GeminiMentorAvatar size="md" />
              <div className="min-w-0">
                <h2 className="flex items-center gap-1.5 text-base font-semibold text-[#F4F4F5]">
                  <span>Gemini AI Mentor</span>
                  <GeminiSparkIcon className="h-4 w-4 shrink-0" />
                </h2>
                <p className="truncate text-xs text-[#A1A1AA]">
                  Ask follow-up questions about pointers, memory limits, OOP patterns, or Big-O.
                </p>
              </div>
            </div>

            <button
              type="button"
              role="switch"
              aria-checked={useSearchGrounding}
              onClick={() => setUseSearchGrounding((prev) => !prev)}
              className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md border px-3 py-1.5 font-mono text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FACC15] ${
                useSearchGrounding
                  ? 'border-[#4ADE80]/50 bg-[#131F18] text-[#4ADE80]'
                  : 'border-[#2E2E38] bg-[#121212] text-[#A1A1AA]'
              }`}
            >
              <Globe className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Search Docs: {useSearchGrounding ? 'ON' : 'OFF'}</span>
            </button>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto p-6">
            {messages.length === 0 && (
              <div className="rounded-lg border border-[#26262E] bg-[#121212] p-5 text-sm leading-relaxed text-[#A1A1AA]">
                Ask a specific question below — for example,{' '}
                <span className="text-[#F4F4F5]">“{languagePitfallExample[language]}”</span> or{' '}
                <span className="text-[#F4F4F5]">
                  “Which data structure or language feature avoids the bottleneck?”
                </span>
              </div>
            )}

            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[92%] rounded-xl border px-4 py-3.5 text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'border-[#FACC15]/40 bg-[#1F1E16] text-[#F4F4F5]'
                      : 'border-[#26262E] bg-[#121212] text-[#E4E4E7]'
                  }`}
                >
                  <div className="mb-1.5 flex items-center gap-2 text-xs font-semibold text-[#A1A1AA]">
                    {msg.role === 'mentor' && <GeminiSparkIcon className="h-3.5 w-3.5" />}
                    <span>{msg.role === 'user' ? 'You' : 'Gemini AI Mentor'}</span>
                  </div>
                  <p className="whitespace-pre-wrap">{msg.content}</p>

                  {msg.role === 'mentor' && (msg.conceptNudge || msg.pitfallAlert) && (
                    <div className="mt-3 space-y-2 border-t border-[#26262E] pt-3 text-xs">
                      {msg.conceptNudge && (
                        <div>
                          <span className="font-semibold text-[#4ADE80]">Concept Nudge: </span>
                          <span className="text-[#D4D4D8]">{msg.conceptNudge}</span>
                        </div>
                      )}
                      {msg.pitfallAlert && (
                        <div>
                          <span className="font-semibold text-[#FACC15]">Pitfall Alert: </span>
                          <span className="text-[#D4D4D8]">{msg.pitfallAlert}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {msg.role === 'mentor' && msg.sources && msg.sources.length > 0 && (
                    <div className="mt-3 border-t border-[#26262E] pt-2.5">
                      <div className="mb-1.5 flex items-center gap-1.5 font-mono text-[11px] text-[#A1A1AA]">
                        <Globe className="h-3 w-3 text-[#4ADE80]" aria-hidden="true" />
                        <span>Google Search Sources</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {msg.sources.map((src, idx) => (
                          <a
                            key={`${src.uri}-${idx}`}
                            href={src.uri}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 rounded border border-[#2A2A32] bg-[#18181B] px-2.5 py-1 text-[11px] text-[#D4D4D8] transition-colors hover:border-[#4ADE80]/60 hover:text-[#F4F4F5]"
                          >
                            <span className="max-w-[210px] truncate">{src.title}</span>
                            <ExternalLink
                              className="h-3 w-3 shrink-0 text-[#4ADE80]"
                              aria-hidden="true"
                            />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {sendingMessage && (
              <div className="flex items-center gap-2 text-xs text-[#FACC15]">
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                <span>
                  {useSearchGrounding
                    ? 'AI Mentor is searching docs and analyzing your question...'
                    : 'AI Mentor is analyzing your question...'}
                </span>
                <span className="font-mono tabular-nums text-[#A1A1AA]">
                  {(analysisElapsedMs / 1000).toFixed(1)}s
                </span>
              </div>
            )}

            {chatError && (
              <div
                role="alert"
                className="rounded-lg border border-[#F87171]/40 bg-[#F87171]/10 px-4 py-2.5 text-xs text-[#FCA5A5]"
              >
                {chatError}
              </div>
            )}
          </div>

          <form
            onSubmit={handleSubmit}
            className="flex items-center gap-3 border-t border-[#26262E] p-4"
          >
            <label htmlFor="mentor-question-input" className="sr-only">
              Ask the AI Mentor a follow-up question
            </label>
            <input
              id="mentor-question-input"
              type="text"
              value={draft}
              disabled={sendingMessage}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={`Ask a follow-up question (e.g. ${languagePitfallExample[language]})`}
              className="flex-1 rounded-lg border border-[#2E2E38] bg-[#121212] px-4 py-2.5 text-sm text-[#F4F4F5] placeholder-[#71717A] focus:border-[#FACC15] focus:outline-none disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={sendingMessage || !draft.trim()}
              className="inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-lg bg-[#FACC15] px-5 py-2.5 text-sm font-semibold text-[#0A0A0C] transition-colors hover:bg-[#FDE047] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FACC15] disabled:opacity-50"
            >
              <Send className="h-4 w-4" aria-hidden="true" />
              <span>Ask Mentor</span>
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
