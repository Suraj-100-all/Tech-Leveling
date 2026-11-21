import { Loader2, X } from 'lucide-react';
import type { PartNumber, ProblemStatement, ProgrammingLanguage } from '../types/arena';
import { LANGUAGE_CONFIG } from '../data/problems';
import { getPartMeta } from '../data/progression';
import { LanguageLogo, PartIcon } from './BrandVisuals';

interface MatchmakingOverlayProps {
  language: ProgrammingLanguage;
  selectedPart: PartNumber;
  selectedLevel: number;
  selectedProblem: ProblemStatement;
  roomCode?: string;
  elapsedSeconds: number;
  onCancel: () => void;
}

export function MatchmakingOverlay({
  language,
  selectedPart,
  selectedLevel,
  selectedProblem,
  roomCode,
  elapsedSeconds,
  onCancel,
}: MatchmakingOverlayProps) {
  const langInfo = LANGUAGE_CONFIG[language];
  const partMeta = getPartMeta(selectedPart);

  return (
    <main className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-[1440px] items-center justify-center px-4 py-12 sm:px-6">
      <section
        aria-live="polite"
        className="w-full max-w-lg rounded-xl border border-[#2A2A32] bg-[#18181B] p-8 text-center"
      >
        <div className="mx-auto flex items-center justify-center gap-3">
          <LanguageLogo language={language} className="h-11 w-11" />
          <div className="flex h-12 w-12 items-center justify-center rounded-full border border-[#FACC15]/30 bg-[#121212]">
            <Loader2 className="h-6 w-6 animate-spin text-[#FACC15]" aria-hidden="true" />
          </div>
        </div>

        <h1 className="mt-6 text-2xl font-bold text-[#F4F4F5]">Waiting for Opponent...</h1>
        <p className="mt-2 text-sm leading-relaxed text-[#A1A1AA]">
          Negotiating a live WebSocket battle room for{' '}
          <span className="font-medium text-[#F4F4F5]">{langInfo.label}</span> —{' '}
          <span className="font-medium text-[#F4F4F5]">
            Part {selectedPart} ({partMeta.title}) · Level {selectedLevel}
          </span>
          . No fake opponents are injected; other players joining this track or room code connect
          live.
        </p>

        <div className="mt-6 grid grid-cols-2 gap-4 border-y border-[#26262E] py-4 text-left text-xs">
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
            <div className="text-[#A1A1AA]">Queue Handshake</div>
            <div className="mt-1 font-mono text-sm font-semibold tabular-nums text-[#4ADE80]">
              {roomCode ? `Room ${roomCode}` : `00:0${Math.min(elapsedSeconds, 9)}`}
            </div>
            <div className="mt-0.5 text-[#A1A1AA]">Pre-warming Quick Notes...</div>
          </div>
        </div>

        <div className="mt-6 flex justify-center">
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
