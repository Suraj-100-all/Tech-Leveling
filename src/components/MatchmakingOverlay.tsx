import { useState } from 'react';
import { Check, Copy, Link2, Loader2, Play, UserCheck, Users, X } from 'lucide-react';
import type { PartNumber, ProblemStatement, ProgrammingLanguage } from '../types/arena';
import { LANGUAGE_CONFIG } from '../data/problems';
import { getPartMeta } from '../data/progression';
import { GeminiSparkIcon, LanguageLogo, PartIcon } from './BrandVisuals';

export interface QueuedPlayerItem {
  id: string;
  handle: string;
  isSelf: boolean;
}

interface MatchmakingOverlayProps {
  language: ProgrammingLanguage;
  selectedPart: PartNumber;
  selectedLevel: number;
  selectedProblem: ProblemStatement;
  roomCode?: string;
  playersInQueue: QueuedPlayerItem[];
  launchCountdownSeconds: number;
  elapsedSeconds: number;
  onStartSolo: () => void;
  onCancel: () => void;
}

function formatQueueClock(totalSeconds: number): string {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export function MatchmakingOverlay({
  language,
  selectedPart,
  selectedLevel,
  selectedProblem,
  roomCode,
  playersInQueue,
  launchCountdownSeconds,
  elapsedSeconds,
  onStartSolo,
  onCancel,
}: MatchmakingOverlayProps) {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  const langInfo = LANGUAGE_CONFIG[language];
  const partMeta = getPartMeta(selectedPart);
  const matched = playersInQueue.length >= 2;

  const handleCopyInviteLink = () => {
    if (!roomCode) return;
    const url = `${window.location.origin}/?room=${encodeURIComponent(roomCode)}`;
    navigator.clipboard?.writeText(url).catch(() => {});
    setCopiedLink(true);
    window.setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleCopyCode = () => {
    if (!roomCode) return;
    navigator.clipboard?.writeText(roomCode).catch(() => {});
    setCopiedCode(true);
    window.setTimeout(() => setCopiedCode(false), 1800);
  };

  const slots = [0, 1, 2];

  return (
    <main className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-[1440px] items-center justify-center px-4 py-10 sm:px-6">
      <section
        aria-live="polite"
        className="w-full max-w-xl rounded-xl border border-[#2A2A32] bg-[#18181B] p-6 sm:p-8"
      >
        {/* Header Visuals */}
        <div className="flex flex-col items-center text-center">
          <div className="flex items-center justify-center gap-3">
            <LanguageLogo language={language} className="h-11 w-11" />
            <div
              className={`flex h-12 w-12 items-center justify-center rounded-full border bg-[#121212] ${
                matched ? 'border-[#4ADE80]/60' : 'border-[#FACC15]/40'
              }`}
            >
              {matched ? (
                <UserCheck className="h-6 w-6 text-[#4ADE80]" aria-hidden="true" />
              ) : (
                <Loader2 className="h-6 w-6 animate-spin text-[#FACC15]" aria-hidden="true" />
              )}
            </div>
          </div>

          <h1
            className={`mt-5 text-2xl font-bold ${
              matched ? 'text-[#4ADE80]' : 'text-[#F4F4F5]'
            }`}
          >
            {matched
              ? launchCountdownSeconds > 0
                ? `Opponent Connected! Launching in ${launchCountdownSeconds}s...`
                : 'Opponent Connected! Entering Briefing...'
              : 'Waiting for 2nd Player...'}
          </h1>

          <p className="mt-2 max-w-md text-sm leading-relaxed text-[#A1A1AA]">
            {matched ? (
              <>
                Live WebSocket room locked for{' '}
                <span className="font-medium text-[#F4F4F5]">
                  {langInfo.label} · Part {selectedPart} ({partMeta.title}) · Level {selectedLevel}
                </span>
                . Optional 3rd player can still join before countdown ends.
              </>
            ) : (
              <>
                Holding live room for{' '}
                <span className="font-medium text-[#F4F4F5]">
                  {langInfo.label} · Part {selectedPart} · Level {selectedLevel}
                </span>
                . No fake opponents — share the invite link or room code below so Player 2 joins
                instantly.
              </>
            )}
          </p>
        </div>

        {/* Live 2-3 Player Roster Slots */}
        <div className="mt-6 rounded-lg border border-[#26262E] bg-[#121212] p-4">
          <div className="flex items-center justify-between text-xs">
            <span className="inline-flex items-center gap-1.5 font-medium text-[#D4D4D8]">
              <Users className="h-3.5 w-3.5 text-[#FACC15]" aria-hidden="true" />
              Live Room Roster
            </span>
            <span className="font-mono text-[#4ADE80] tabular-nums">
              {playersInQueue.length} / 3 Ready · {formatQueueClock(elapsedSeconds)}
            </span>
          </div>

          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
            {slots.map((slotIndex) => {
              const player = playersInQueue[slotIndex];
              const isRequiredSlot = slotIndex < 2;
              return (
                <div
                  key={slotIndex}
                  className={`rounded-lg border px-3 py-2.5 text-left transition-colors ${
                    player
                      ? 'border-[#4ADE80]/40 bg-[#142019]'
                      : isRequiredSlot
                        ? 'border-dashed border-[#FACC15]/40 bg-[#18181B]'
                        : 'border-dashed border-[#2A2A32] bg-[#151518]'
                  }`}
                >
                  <div className="flex items-center justify-between font-mono text-[11px]">
                    <span className="text-[#A1A1AA]">P{slotIndex + 1}</span>
                    {player ? (
                      <span className="text-[#4ADE80]">Connected</span>
                    ) : (
                      <span className={isRequiredSlot ? 'text-[#FACC15]' : 'text-[#71717A]'}>
                        {isRequiredSlot ? 'Waiting...' : 'Optional'}
                      </span>
                    )}
                  </div>
                  <div className="mt-1 truncate text-xs font-semibold text-[#F4F4F5]">
                    {player
                      ? `${player.handle}${player.isSelf ? ' (You)' : ''}`
                      : isRequiredSlot
                        ? 'Awaiting Opponent'
                        : 'Open 3rd Slot'}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Room Code & Direct Invite Share Bar */}
        {roomCode && (
          <div className="mt-4 flex flex-col gap-3 rounded-lg border border-[#26262E] bg-[#121212] p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-left">
              <div className="text-[11px] font-medium text-[#A1A1AA]">
                Live Room Code (Player 2 auto-syncs to your exact track)
              </div>
              <div className="mt-1 flex items-center gap-2">
                <span className="font-mono text-base font-bold tracking-wider text-[#FACC15]">
                  {roomCode}
                </span>
                <button
                  type="button"
                  onClick={handleCopyCode}
                  className="inline-flex items-center gap-1 rounded border border-[#2E2E38] bg-[#18181B] px-2 py-0.5 font-mono text-[11px] text-[#D4D4D8] transition-colors hover:border-[#FACC15] hover:text-[#F4F4F5]"
                >
                  {copiedCode ? (
                    <Check className="h-3 w-3 text-[#4ADE80]" aria-hidden="true" />
                  ) : (
                    <Copy className="h-3 w-3" aria-hidden="true" />
                  )}
                  <span>{copiedCode ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={handleCopyInviteLink}
              className="inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border border-[#4ADE80]/50 bg-[#132018] px-4 py-2 text-xs font-semibold text-[#4ADE80] transition-colors hover:bg-[#192D21] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4ADE80]"
            >
              {copiedLink ? (
                <Check className="h-3.5 w-3.5" aria-hidden="true" />
              ) : (
                <Link2 className="h-3.5 w-3.5" aria-hidden="true" />
              )}
              <span>{copiedLink ? 'Invite Link Copied!' : 'Copy Invite Link'}</span>
            </button>
          </div>
        )}

        {/* Challenge & Gemini AI Pre-Warm Metadata */}
        <div className="mt-4 grid grid-cols-1 gap-3 border-y border-[#26262E] py-3.5 text-left text-xs sm:grid-cols-2">
          <div>
            <div className="text-[#A1A1AA]">Selected Challenge</div>
            <div className="mt-1 flex items-center gap-1.5 font-mono text-sm font-semibold text-[#FACC15]">
              <PartIcon part={selectedPart} className="h-3.5 w-3.5" />
              <span>
                {langInfo.shortLabel} · P{selectedPart} L{selectedLevel}
              </span>
            </div>
            <div className="mt-0.5 truncate text-[#D4D4D8]">{selectedProblem.title}</div>
          </div>
          <div>
            <div className="text-[#A1A1AA]">Gemini AI Engine</div>
            <div className="mt-1 flex items-center gap-1.5 font-mono text-sm font-semibold text-[#4ADE80]">
              <GeminiSparkIcon className="h-3.5 w-3.5" />
              <span>Quick Notes &amp; Big-O Ready</span>
            </div>
            <div className="mt-0.5 text-[#A1A1AA]">Pre-warmed for instant briefing &amp; judging</div>
          </div>
        </div>

        {/* Actions: Wait for 2nd Player by default, OR explicitly start Solo vs Gemini AI Benchmark */}
        <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
          {!matched && elapsedSeconds >= 3 && (
            <button
              type="button"
              onClick={onStartSolo}
              className="inline-flex items-center gap-2 whitespace-nowrap rounded-lg bg-[#FACC15] px-5 py-2.5 text-sm font-semibold text-[#0A0A0C] transition-colors hover:bg-[#FDE047] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FACC15]"
            >
              <Play className="h-4 w-4" aria-hidden="true" />
              <span>Practice Solo vs Gemini AI</span>
            </button>
          )}
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex items-center gap-2 whitespace-nowrap rounded-lg border border-[#2E2E38] bg-[#121212] px-5 py-2.5 text-sm font-medium text-[#D4D4D8] transition-colors hover:border-[#F87171]/60 hover:text-[#F4F4F5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FACC15]"
          >
            <X className="h-4 w-4" aria-hidden="true" />
            <span>Cancel Matchmaking</span>
          </button>
        </div>
      </section>
    </main>
  );
}
