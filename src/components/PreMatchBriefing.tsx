import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  Code2,
  ExternalLink,
  Globe,
  RefreshCw,
} from 'lucide-react';
import type {
  PlayerPresence,
  ProblemStatement,
  ProgrammingLanguage,
  QuickNotesData,
} from '../types/arena';
import { LANGUAGE_CONFIG, TIER_CONFIG } from '../data/problems';
import { GeminiMentorAvatar, LanguageLogo } from './BrandVisuals';

interface PreMatchBriefingProps {
  roomId: string;
  problem: ProblemStatement;
  language: ProgrammingLanguage;
  players: PlayerPresence[];
  secondsLeft: number;
  totalSeconds: number;
  quickNotes: QuickNotesData | null;
  loadingNotes: boolean;
  loadingSources: boolean;
  notesError: string | null;
  onRetryNotes: () => void;
  onEnterArenaNow: () => void;
}

export function PreMatchBriefing({
  roomId,
  problem,
  language,
  players,
  secondsLeft,
  totalSeconds,
  quickNotes,
  loadingNotes,
  loadingSources,
  notesError,
  onRetryNotes,
  onEnterArenaNow,
}: PreMatchBriefingProps) {
  const progressPct = Math.max(0, Math.min(100, (secondsLeft / Math.max(totalSeconds, 1)) * 100));
  const langConfig = LANGUAGE_CONFIG[language];

  return (
    <main className="mx-auto max-w-[1200px] px-4 py-8 sm:px-6 lg:px-8">
      {/* Top 10-Second Countdown Banner */}
      <section className="rounded-xl border border-[#2A2A32] bg-[#18181B] p-6 sm:p-8">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div className="flex items-start gap-4">
            <div className="hidden items-center gap-2 sm:flex">
              <LanguageLogo language={language} className="h-10 w-10" />
              <GeminiMentorAvatar size="md" />
            </div>
            <div>
              <p className="text-xs font-medium text-[#A1A1AA]">
                Pre-Match Briefing · Room {roomId} · {langConfig.shortLabel}
                {problem.partNumber && problem.levelNumber
                  ? ` · Part ${problem.partNumber} · Level ${problem.levelNumber}`
                  : ` · ${TIER_CONFIG[problem.tier].label} Tier`}{' '}
                · {players.filter((p) => p.connected).length} Connected
              </p>
              <h1 className="mt-1.5 text-2xl font-bold text-[#F4F4F5] sm:text-3xl">
                AI Quick Notes: {problem.title}
              </h1>
              <p className="mt-1 text-xs text-[#A1A1AA]">{problem.focusArea}</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-xs text-[#A1A1AA]">Editor unlocks in</div>
              <div
                aria-live="polite"
                className="font-mono text-3xl font-bold tabular-nums text-[#FACC15]"
              >
                {secondsLeft}s
              </div>
            </div>
            <button
              type="button"
              onClick={onEnterArenaNow}
              className="inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-lg bg-[#FACC15] px-4 py-2.5 text-sm font-semibold text-[#0A0A0C] transition-colors hover:bg-[#FDE047] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FACC15]"
            >
              <span>Enter Arena</span>
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Countdown Progress Bar */}
        <div className="mt-6 h-1.5 w-full overflow-hidden rounded-full bg-[#26262E]">
          <div
            className="h-full bg-[#FACC15] transition-all duration-500"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </section>

      {/* AI-Generated Language-Specific Quick Notes Content */}
      <section className="mt-6 rounded-xl border border-[#2A2A32] bg-[#18181B] p-6 sm:p-8">
        {loadingNotes && (
          <div className="space-y-4" aria-busy="true" aria-label="Loading AI Quick Notes">
            <div className="flex items-center gap-2.5 text-sm font-medium text-[#FACC15]">
              <BookOpen className="h-4 w-4" aria-hidden="true" />
              <span>
                Generating {langConfig.label} syntax reminders & Search-grounded Quick Notes...
              </span>
            </div>
            <div className="h-14 w-full animate-pulse rounded bg-[#26262E]" />
            <div className="h-5 w-1/3 animate-pulse rounded bg-[#26262E]" />
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="h-32 animate-pulse rounded bg-[#26262E]" />
              <div className="h-32 animate-pulse rounded bg-[#26262E]" />
            </div>
          </div>
        )}

        {!loadingNotes && notesError && (
          <div role="alert" className="space-y-4">
            <div className="flex items-start gap-3 text-[#FCA5A5]">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
              <div>
                <h2 className="text-base font-semibold text-[#F4F4F5]">
                  Could not fetch AI Quick Notes
                </h2>
                <p className="mt-1 text-sm text-[#D4D4D8]">{notesError}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={onRetryNotes}
                className="inline-flex items-center gap-2 whitespace-nowrap rounded-lg border border-[#2E2E38] bg-[#121212] px-4 py-2 text-sm font-medium text-[#F4F4F5] hover:border-[#FACC15]"
              >
                <RefreshCw className="h-4 w-4" aria-hidden="true" />
                <span>Retry Quick Notes</span>
              </button>
              <button
                type="button"
                onClick={onEnterArenaNow}
                className="inline-flex items-center gap-2 whitespace-nowrap rounded-lg bg-[#FACC15] px-4 py-2 text-sm font-semibold text-[#0A0A0C]"
              >
                <span>Continue to Battle Arena</span>
              </button>
            </div>
          </div>
        )}

        {!loadingNotes && quickNotes && (
          <div className="space-y-6">
            {/* Highlighted Language-Specific Syntax Reminder */}
            {quickNotes.languageReminder && (
              <div className="rounded-lg border border-[#4ADE80]/40 bg-[#131F18] p-4">
                <div className="flex items-center gap-2 text-xs font-semibold text-[#4ADE80]">
                  <Code2 className="h-4 w-4" aria-hidden="true" />
                  <span>{langConfig.label} Syntax & Runtime Reminder</span>
                </div>
                <p className="mt-1.5 font-mono text-sm leading-relaxed text-[#F4F4F5]">
                  {quickNotes.languageReminder}
                </p>
              </div>
            )}

            <div className="flex flex-col justify-between gap-4 border-b border-[#26262E] pb-6 md:flex-row md:items-start">
              <div className="max-w-2xl space-y-2">
                <h2 className="text-xl font-semibold text-[#F4F4F5]">{quickNotes.topicTitle}</h2>
                <p className="text-base leading-relaxed text-[#D4D4D8]">{quickNotes.corePattern}</p>
              </div>
              <div className="shrink-0 text-left md:text-right">
                <div className="text-xs text-[#A1A1AA]">Target Complexity</div>
                <div className="mt-1 font-mono text-base font-semibold text-[#4ADE80]">
                  {quickNotes.targetComplexity}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-[#FACC15]">
                  Key {langConfig.label} Concepts
                </h3>
                <ul className="space-y-2.5 text-sm leading-relaxed text-[#E4E4E7]">
                  {quickNotes.keyConcepts.map((concept, idx) => (
                    <li key={idx} className="flex gap-3">
                      <span className="font-mono text-xs text-[#A1A1AA]">0{idx + 1}.</span>
                      <span>{concept}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-[#4ADE80]">Pre-Coding Checklist</h3>
                <ul className="space-y-2.5 text-sm leading-relaxed text-[#E4E4E7]">
                  {quickNotes.mentalChecklist.map((item, idx) => (
                    <li key={idx} className="flex gap-3">
                      <span className="font-mono text-xs text-[#A1A1AA]">0{idx + 1}.</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="border-t border-[#26262E] pt-5">
              <div className="text-xs font-semibold text-[#FCA5A5]">
                Language Pitfall & Complexity Trap
              </div>
              <p className="mt-1.5 text-sm leading-relaxed text-[#D4D4D8]">{quickNotes.watchOut}</p>
            </div>

            {/* Grounded Official Reference Sources (Non-blocking Google Search Grounding) */}
            {(loadingSources || (quickNotes.sources && quickNotes.sources.length > 0)) && (
              <div className="border-t border-[#26262E] pt-5">
                <div className="flex items-center justify-between gap-2 text-xs font-semibold text-[#A1A1AA]">
                  <span className="inline-flex items-center gap-2">
                    <Globe className="h-3.5 w-3.5 text-[#4ADE80]" aria-hidden="true" />
                    <span>Verified Documentation References (Google Search)</span>
                  </span>
                  {loadingSources && (
                    <span className="font-mono text-[11px] font-normal text-[#71717A]">
                      Fetching links in background...
                    </span>
                  )}
                </div>
                {quickNotes.sources && quickNotes.sources.length > 0 ? (
                  <div className="mt-2.5 flex flex-wrap gap-2.5">
                    {quickNotes.sources.map((src, idx) => (
                      <a
                        key={`${src.uri}-${idx}`}
                        href={src.uri}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-md border border-[#2A2A32] bg-[#121212] px-3 py-1.5 text-xs text-[#D4D4D8] transition-colors hover:border-[#4ADE80]/60 hover:text-[#F4F4F5]"
                      >
                        <span className="max-w-[260px] truncate">{src.title}</span>
                        <ExternalLink className="h-3 w-3 shrink-0 text-[#4ADE80]" aria-hidden="true" />
                      </a>
                    ))}
                  </div>
                ) : (
                  <div className="mt-2.5 flex gap-2.5">
                    <div className="h-7 w-44 animate-pulse rounded-md bg-[#26262E]" />
                    <div className="h-7 w-36 animate-pulse rounded-md bg-[#26262E]" />
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </section>
    </main>
  );
}
