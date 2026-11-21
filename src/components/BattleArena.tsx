import { useEffect, useState } from 'react';
import {
  AlertCircle,
  BookOpen,
  Check,
  Clock,
  Copy,
  HelpCircle,
  Link2,
  Loader2,
  Radio,
  Send,
  Users,
} from 'lucide-react';
import type {
  PlayerPresence,
  ProblemStatement,
  ProgrammingLanguage,
  QuickNotesData,
} from '../types/arena';
import { LANGUAGE_CONFIG, TIER_CONFIG } from '../data/problems';
import { formatDurationMs } from '../utils/matchRules';
import { CodeEditor } from './CodeEditor';
import { LanguageLogo, PartIcon } from './BrandVisuals';

interface BattleArenaProps {
  roomId: string;
  problem: ProblemStatement;
  quickNotes: QuickNotesData | null;
  players: PlayerPresence[];
  code: string;
  language: ProgrammingLanguage;
  elapsedMs: number;
  isJudging: boolean;
  judgingStatusMessage: string | null;
  waitingOnOpponents: string[];
  validationError: string | null;
  judgeError: string | null;
  onCodeChange: (code: string) => void;
  onLanguageChange: (lang: ProgrammingLanguage) => void;
  onSubmitCode: () => void;
  onFinalizeNow: () => void;
  onOpenMentorStuck: () => void;
}

const LANGUAGE_OPTIONS: Array<{ value: ProgrammingLanguage; label: string }> = [
  { value: 'c', label: 'C11' },
  { value: 'cpp', label: 'C++20' },
  { value: 'java', label: 'Java 21' },
  { value: 'python', label: 'Python 3' },
];

export function BattleArena({
  roomId,
  problem,
  quickNotes,
  players,
  code,
  language,
  elapsedMs,
  isJudging,
  judgingStatusMessage,
  waitingOnOpponents,
  validationError,
  judgeError,
  onCodeChange,
  onLanguageChange,
  onSubmitCode,
  onFinalizeNow,
  onOpenMentorStuck,
}: BattleArenaProps) {
  const [showNotesDrawer, setShowNotesDrawer] = useState(false);
  const [copiedRoom, setCopiedRoom] = useState(false);
  const [copiedInvite, setCopiedInvite] = useState(false);
  const [judgingElapsedMs, setJudgingElapsedMs] = useState(0);

  useEffect(() => {
    if (!isJudging) {
      setJudgingElapsedMs(0);
      return;
    }
    const start = Date.now();
    setJudgingElapsedMs(0);
    const id = window.setInterval(() => {
      setJudgingElapsedMs(Date.now() - start);
    }, 100);
    return () => window.clearInterval(id);
  }, [isJudging]);

  const handleCopyRoomCode = async () => {
    try {
      await navigator.clipboard.writeText(roomId);
      setCopiedRoom(true);
      setTimeout(() => setCopiedRoom(false), 1800);
    } catch {
      setCopiedRoom(false);
    }
  };

  const handleCopyInviteLink = async () => {
    try {
      const inviteUrl = `${window.location.origin}/?room=${encodeURIComponent(roomId)}`;
      await navigator.clipboard.writeText(inviteUrl);
      setCopiedInvite(true);
      setTimeout(() => setCopiedInvite(false), 2000);
    } catch {
      setCopiedInvite(false);
    }
  };

  const opponents = players.filter((p) => !p.isSelf);
  const opponentTyping = opponents.some((p) => p.connected && p.isTyping);
  const opponentConnected = opponents.some((p) => p.connected);
  const opponentSubmitted = opponents.some((p) => p.connected && p.submitted);

  const wsBannerText =
    opponents.length === 0
      ? 'WebSocket Live · Awaiting Opponent (or Solo Big-O Benchmark)'
      : opponentTyping
        ? 'Opponent Typing...'
        : opponentSubmitted
          ? 'Opponent Submitted Solution'
          : opponentConnected
            ? 'Opponent Connected...'
            : 'Opponent Disconnected';

  const wsBannerColor = opponentTyping
    ? 'text-[#FACC15]'
    : opponentConnected
      ? 'text-[#4ADE80]'
      : 'text-[#A1A1AA]';

  return (
    <main className="mx-auto max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8">
      {/* Match Strip Header */}
      <section className="flex flex-wrap items-center justify-between gap-4 border-b border-[#26262E] pb-4">
        <div className="flex items-center gap-3.5">
          <LanguageLogo language={language} className="h-10 w-10" />
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2 text-xs text-[#A1A1AA]">
              <span className="inline-flex items-center gap-1.5">
                {problem.partNumber ? (
                  <PartIcon part={problem.partNumber} className="h-3.5 w-3.5 text-[#FACC15]" />
                ) : null}
                <span>
                  {problem.partNumber && problem.levelNumber
                    ? `Part ${problem.partNumber} · Level ${problem.levelNumber}`
                    : `${TIER_CONFIG[problem.tier].label} Tier`}
                </span>
              </span>
              <span aria-hidden="true">·</span>
              <span className="font-mono text-[#FACC15]">{LANGUAGE_CONFIG[language].shortLabel}</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono text-[#4ADE80]">
                Target {problem.targetTimeComplexity} Time / {problem.targetSpaceComplexity} Space
              </span>
            </div>
            <h1 className="text-xl font-bold text-[#F4F4F5] sm:text-2xl">{problem.title}</h1>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={handleCopyRoomCode}
            aria-label={`Copy room code ${roomId}`}
            className="inline-flex items-center gap-2 whitespace-nowrap rounded-lg border border-[#2A2A32] bg-[#18181B] px-3 py-2 font-mono text-xs text-[#D4D4D8] transition-colors hover:border-[#FACC15]/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FACC15]"
          >
            <span>Room {roomId}</span>
            {copiedRoom ? (
              <Check className="h-3.5 w-3.5 text-[#4ADE80]" aria-hidden="true" />
            ) : (
              <Copy className="h-3.5 w-3.5 text-[#A1A1AA]" aria-hidden="true" />
            )}
          </button>

          <button
            type="button"
            onClick={handleCopyInviteLink}
            aria-label="Copy multiplayer invite link"
            className="inline-flex items-center gap-2 whitespace-nowrap rounded-lg border border-[#4ADE80]/35 bg-[#132018] px-3 py-2 text-xs font-medium text-[#4ADE80] transition-colors hover:bg-[#4ADE80] hover:text-[#0A0A0C] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FACC15]"
          >
            {copiedInvite ? (
              <Check className="h-3.5 w-3.5" aria-hidden="true" />
            ) : (
              <Link2 className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            <span>{copiedInvite ? 'Invite Copied' : 'Invite Player'}</span>
          </button>

          {quickNotes && (
            <button
              type="button"
              onClick={() => setShowNotesDrawer((prev) => !prev)}
              aria-expanded={showNotesDrawer}
              className="inline-flex items-center gap-2 whitespace-nowrap rounded-lg border border-[#2A2A32] bg-[#18181B] px-3 py-2 text-xs font-medium text-[#D4D4D8] transition-colors hover:border-[#FACC15]/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FACC15]"
            >
              <BookOpen className="h-3.5 w-3.5 text-[#FACC15]" aria-hidden="true" />
              <span>{showNotesDrawer ? 'Hide Quick Notes' : 'Quick Notes'}</span>
            </button>
          )}

          <div
            aria-label="Match elapsed time"
            className="inline-flex items-center gap-2 rounded-lg border border-[#2A2A32] bg-[#18181B] px-3.5 py-2 font-mono text-sm font-semibold tabular-nums text-[#FACC15]"
          >
            <Clock className="h-4 w-4" aria-hidden="true" />
            <span>{formatDurationMs(elapsedMs)}</span>
          </div>
        </div>
      </section>

      {/* Collapsible Quick Notes Reminder */}
      {showNotesDrawer && quickNotes && (
        <section className="mt-4 space-y-2 rounded-xl border border-[#2A2A32] bg-[#18181B] p-5">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-sm font-semibold text-[#FACC15]">{quickNotes.topicTitle}</h2>
            <span className="font-mono text-xs text-[#4ADE80]">{quickNotes.targetComplexity}</span>
          </div>
          {quickNotes.languageReminder && (
            <p className="font-mono text-xs text-[#4ADE80]">{quickNotes.languageReminder}</p>
          )}
          <p className="text-sm text-[#D4D4D8]">{quickNotes.corePattern}</p>
          <p className="text-xs text-[#FCA5A5]">Watch out: {quickNotes.watchOut}</p>
        </section>
      )}

      {/* Main Two-Column Esports Split */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Column: WebSocket Status Roster + Problem Statement */}
        <div className="space-y-6 lg:col-span-5">
          {/* Live WebSocket Status (Boolean Typing Telemetry Only — NEVER Opponent Code) */}
          <section
            aria-label="WebSocket Status"
            className="rounded-xl border border-[#2A2A32] bg-[#18181B] p-5"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-[#F4F4F5]">
                <Radio className="h-4 w-4 text-[#4ADE80]" aria-hidden="true" />
                <span>WebSocket Status</span>
              </div>
              <span className="inline-flex items-center gap-1.5 font-mono text-xs tabular-nums text-[#A1A1AA]">
                <Users className="h-3.5 w-3.5" aria-hidden="true" />
                {players.filter((p) => p.connected).length} / 3 players
              </span>
            </div>

            <div
              aria-live="polite"
              className={`mt-3 rounded-lg border border-[#26262E] bg-[#121212] px-3.5 py-2 font-mono text-xs font-medium ${wsBannerColor}`}
            >
              {wsBannerText}
            </div>

            <ul className="mt-3 divide-y divide-[#26262E]">
              {players.map((p) => {
                const statusLabel = !p.connected
                  ? 'Disconnected'
                  : p.submitted
                    ? 'Submitted'
                    : p.isTyping
                      ? p.isSelf
                        ? 'Typing...'
                        : 'Opponent Typing...'
                      : p.isSelf
                        ? 'Connected'
                        : 'Opponent Connected...';

                const statusColor = !p.connected
                  ? 'text-[#71717A]'
                  : p.submitted
                    ? 'text-[#FACC15]'
                    : p.isTyping
                      ? 'text-[#FACC15]'
                      : 'text-[#4ADE80]';

                const dotColor = !p.connected
                  ? 'bg-[#52525B]'
                  : p.submitted
                    ? 'bg-[#FACC15]'
                    : p.isTyping
                      ? 'bg-[#FACC15]'
                      : 'bg-[#4ADE80]';

                return (
                  <li
                    key={p.id}
                    className="flex items-center justify-between gap-3 py-2.5 text-sm"
                  >
                    <span className="truncate font-medium text-[#F4F4F5]">
                      {p.handle}
                      {p.isSelf ? ' (You)' : ''}
                    </span>
                    <span
                      className={`inline-flex shrink-0 items-center gap-2 font-mono text-xs ${statusColor}`}
                    >
                      <span aria-hidden="true" className={`h-2 w-2 rounded-full ${dotColor}`} />
                      <span>{statusLabel}</span>
                    </span>
                  </li>
                );
              })}
            </ul>

            {players.length === 1 && (
              <p className="mt-3 border-t border-[#26262E] pt-3 text-xs leading-relaxed text-[#A1A1AA]">
                Share room code <span className="font-mono text-[#FACC15]">{roomId}</span> in a
                second tab to battle 2–3 players live, or submit now to be judged strictly against
                the {problem.targetTimeComplexity} optimal Big-O benchmark.
              </p>
            )}
          </section>

          {/* Problem Statement */}
          <section className="rounded-xl border border-[#2A2A32] bg-[#18181B] p-6">
            <h2 className="text-base font-semibold text-[#F4F4F5]">Problem Statement</h2>

            <div className="mt-3 space-y-3 text-sm leading-relaxed text-[#D4D4D8]">
              {problem.description.map((para, i) => (
                <p key={i}>{para}</p>
              ))}
            </div>

            <div className="mt-6 space-y-3">
              <h3 className="text-xs font-semibold text-[#FACC15]">Examples</h3>
              {problem.examples.map((ex, idx) => (
                <div
                  key={idx}
                  className="rounded-lg border border-[#26262E] bg-[#121212] p-3.5 font-mono text-xs leading-relaxed"
                >
                  <div className="text-[#A1A1AA]">
                    Input: <span className="text-[#F4F4F5]">{ex.input}</span>
                  </div>
                  <div className="mt-1 text-[#A1A1AA]">
                    Output: <span className="text-[#4ADE80]">{ex.output}</span>
                  </div>
                  {ex.explanation && (
                    <div className="mt-1.5 font-sans text-[#A1A1AA]">{ex.explanation}</div>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-6 space-y-2 border-t border-[#26262E] pt-4">
              <h3 className="text-xs font-semibold text-[#F4F4F5]">Constraints</h3>
              <ul className="space-y-1 font-mono text-xs text-[#A1A1AA]">
                {problem.constraints.map((c, idx) => (
                  <li key={idx}>• {c}</li>
                ))}
              </ul>
              <p className="pt-2 text-xs text-[#A1A1AA]">{problem.inputOutputNote}</p>
            </div>
          </section>
        </div>

        {/* Right Column: Language Controls, Empty Syntax-Highlighted Editor, Submit & Stuck Actions */}
        <div className="space-y-4 lg:col-span-7">
          <div className="rounded-xl border border-[#2A2A32] bg-[#18181B] p-5">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-4">
              <div className="flex items-center gap-3">
                <label htmlFor="language-selector" className="text-xs font-medium text-[#A1A1AA]">
                  Language
                </label>
                <select
                  id="language-selector"
                  value={language}
                  disabled={isJudging}
                  onChange={(e) => onLanguageChange(e.target.value as ProgrammingLanguage)}
                  className="rounded-lg border border-[#2E2E38] bg-[#121212] px-3 py-1.5 font-mono text-xs font-medium text-[#F4F4F5] focus:border-[#FACC15] focus:outline-none disabled:opacity-50"
                >
                  {LANGUAGE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <span className="font-mono text-xs tabular-nums text-[#A1A1AA]">
                {code.length} chars · {code ? code.split('\n').length : 0} lines
              </span>
            </div>

            <CodeEditor
              value={code}
              language={language}
              disabled={isJudging}
              onChange={onCodeChange}
            />

            {/* Validation or Judge Error Alert */}
            {(validationError || judgeError) && (
              <div
                role="alert"
                className="mt-4 flex items-start gap-2.5 rounded-lg border border-[#F87171]/40 bg-[#F87171]/10 px-4 py-3 text-sm text-[#FCA5A5]"
              >
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                <span>{validationError || judgeError}</span>
              </div>
            )}

            {/* Live WebSocket Judging / Waiting Banner */}
            {isJudging && (
              <div
                aria-live="polite"
                className="mt-4 flex flex-col justify-between gap-3 rounded-lg border border-[#FACC15]/40 bg-[#121212] px-4 py-3.5 sm:flex-row sm:items-center"
              >
                <div className="flex items-center gap-3 text-sm text-[#F4F4F5]">
                  <Loader2
                    className="h-4 w-4 shrink-0 animate-spin text-[#FACC15]"
                    aria-hidden="true"
                  />
                  <div>
                    <div className="flex items-center gap-2.5 font-medium">
                      <span>
                        {waitingOnOpponents.length > 0
                          ? `Waiting for ${waitingOnOpponents.join(', ')} to submit via WebSocket...`
                          : judgingStatusMessage || 'Evaluating Big-O complexity via WebSocket...'}
                      </span>
                      <span className="font-mono text-xs tabular-nums text-[#FACC15]">
                        {(judgingElapsedMs / 1000).toFixed(1)}s
                      </span>
                    </div>
                    <div className="text-xs text-[#A1A1AA]">
                      Gemini Big-O Judge scores O(Time) first, then O(Space), with speed as
                      tie-breaker only.
                    </div>
                  </div>
                </div>

                {waitingOnOpponents.length > 0 && (
                  <button
                    type="button"
                    onClick={onFinalizeNow}
                    className="shrink-0 whitespace-nowrap rounded-lg border border-[#2E2E38] bg-[#18181B] px-3.5 py-2 text-xs font-medium text-[#FACC15] hover:border-[#FACC15]"
                  >
                    Judge Against Benchmark Now
                  </button>
                )}
              </div>
            )}

            {/* Primary & Secondary Action Bar */}
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-[#26262E] pt-4">
              <button
                type="button"
                disabled={isJudging}
                onClick={onOpenMentorStuck}
                className="inline-flex items-center gap-2 whitespace-nowrap rounded-lg border border-[#2E2E38] bg-[#121212] px-4 py-2.5 text-sm font-medium text-[#D4D4D8] transition-colors hover:border-[#4ADE80]/60 hover:text-[#F4F4F5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FACC15] disabled:opacity-50"
              >
                <HelpCircle className="h-4 w-4 text-[#4ADE80]" aria-hidden="true" />
                <span>Stuck? Open AI Mentor</span>
              </button>

              <button
                type="button"
                disabled={isJudging}
                onClick={onSubmitCode}
                className="inline-flex items-center gap-2 whitespace-nowrap rounded-lg bg-[#FACC15] px-6 py-2.5 text-sm font-semibold text-[#0A0A0C] transition-colors hover:bg-[#FDE047] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FACC15] disabled:opacity-50"
              >
                <Send className="h-4 w-4" aria-hidden="true" />
                <span>{isJudging ? 'Judging Big-O...' : 'Submit Code'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
