import { Coins, RotateCcw, Trophy } from 'lucide-react';
import type { MatchVerdict, ProblemStatement } from '../types/arena';
import { TIER_CONFIG } from '../data/problems';
import { formatDurationMs } from '../utils/matchRules';
import { GeminiSparkIcon, LanguageLogo } from './BrandVisuals';

interface VictoryScreenProps {
  problem: ProblemStatement;
  verdict: MatchVerdict;
  totalCoins: number;
  onPlayAgain: () => void;
  onOpenMentorReview: () => void;
}

export function VictoryScreen({
  problem,
  verdict,
  totalCoins,
  onPlayAgain,
  onOpenMentorReview,
}: VictoryScreenProps) {
  const selfResult = verdict.participants.find((p) => p.isSelf);

  const decidingLabel: Record<MatchVerdict['decidingFactor'], string> = {
    correctness: 'Functional Correctness',
    time_complexity: 'O(Time) Complexity',
    space_complexity: 'O(Space) Complexity',
    speed_tiebreaker: 'Submission Speed Tie-Breaker',
    benchmark_comparison: 'Optimal Big-O Target Met',
  };

  return (
    <main className="mx-auto max-w-[1100px] px-4 py-8 sm:px-6 lg:px-8">
      {/* Victory Hero Summary */}
      <section className="rounded-xl border border-[#4ADE80]/40 bg-[#18181B] p-6 sm:p-8">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
          <div className="flex items-start gap-4">
            <LanguageLogo
              language={
                selfResult && selfResult.language !== 'benchmark'
                  ? selfResult.language
                  : problem.languageFocus
              }
              className="mt-1 hidden h-11 w-11 sm:block"
            />
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-medium text-[#4ADE80]">
                <Trophy className="h-4 w-4" aria-hidden="true" />
                <span>
                  Victory ·{' '}
                  {problem.partNumber && problem.levelNumber
                    ? `Part ${problem.partNumber} · Level ${problem.levelNumber}`
                    : `${TIER_CONFIG[problem.tier].label} Tier`}{' '}
                  · Room {verdict.roomId}
                </span>
              </div>
              <h1 className="text-3xl font-bold text-[#F4F4F5] sm:text-4xl">
                Big-O Victory Verified
              </h1>
              <p className="max-w-2xl text-sm leading-relaxed text-[#D4D4D8]">{verdict.summary}</p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-6 border-t border-[#26262E] pt-4 md:border-t-0 md:pt-0">
            <div>
              <div className="text-xs text-[#A1A1AA]">Coins Awarded</div>
              <div className="mt-1 flex items-center gap-1.5 font-mono text-2xl font-bold tabular-nums text-[#FACC15]">
                <Coins className="h-5 w-5" aria-hidden="true" />
                <span>+{verdict.coinsAwarded}</span>
              </div>
              <div className="mt-0.5 font-mono text-xs tabular-nums text-[#A1A1AA]">
                Balance: {totalCoins}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Big-O Comparison Table */}
      <section className="mt-6 rounded-xl border border-[#2A2A32] bg-[#18181B] p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2 pb-4">
          <h2 className="text-base font-semibold text-[#F4F4F5]">
            Big-O Complexity Comparison — {problem.title}
          </h2>
          <span className="text-xs text-[#A1A1AA]">
            Deciding Factor:{' '}
            <span className="font-medium text-[#FACC15]">
              {decidingLabel[verdict.decidingFactor]}
            </span>
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-y border-[#26262E] text-xs text-[#A1A1AA]">
                <th className="py-3 pr-4 font-medium">Rank</th>
                <th className="py-3 pr-4 font-medium">Competitor</th>
                <th className="py-3 pr-4 font-medium">Language</th>
                <th className="py-3 pr-4 font-medium">O(Time)</th>
                <th className="py-3 pr-4 font-medium">O(Space)</th>
                <th className="py-3 pr-4 font-medium">Correctness</th>
                <th className="py-3 text-right font-medium">Tie-Breaker Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#26262E]">
              {verdict.participants.map((row) => (
                <tr
                  key={row.playerId}
                  className={row.isSelf ? 'bg-[#1F241D]/50' : ''}
                >
                  <td className="py-3.5 pr-4 font-mono font-semibold tabular-nums text-[#FACC15]">
                    #{row.rank}
                  </td>
                  <td className="py-3.5 pr-4 font-medium text-[#F4F4F5]">
                    {row.handle}
                    {row.isSelf ? ' (You)' : ''}
                  </td>
                  <td className="py-3.5 pr-4 font-mono text-xs uppercase text-[#A1A1AA]">
                    {row.language}
                  </td>
                  <td className="py-3.5 pr-4 font-mono font-semibold text-[#4ADE80]">
                    {row.timeComplexity}
                  </td>
                  <td className="py-3.5 pr-4 font-mono font-semibold text-[#FACC15]">
                    {row.spaceComplexity}
                  </td>
                  <td className="py-3.5 pr-4 text-xs">
                    <span className={row.isCorrect ? 'text-[#4ADE80]' : 'text-[#F87171]'}>
                      {row.isCorrect ? 'Valid' : 'Failed'}
                    </span>
                  </td>
                  <td className="py-3.5 text-right font-mono text-xs tabular-nums text-[#D4D4D8]">
                    {row.isBenchmark ? '—' : formatDurationMs(row.elapsedMs)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Judge Technical Breakdown */}
        {selfResult && (
          <div className="mt-6 grid grid-cols-1 gap-6 border-t border-[#26262E] pt-6 md:grid-cols-2">
            <div>
              <h3 className="text-xs font-semibold text-[#FACC15]">Complexity Analysis</h3>
              <p className="mt-2 text-sm leading-relaxed text-[#D4D4D8]">
                {selfResult.evaluation.complexityReasoning}
              </p>
            </div>
            <div>
              <h3 className="text-xs font-semibold text-[#4ADE80]">Edge-Case Assessment</h3>
              <p className="mt-2 text-sm leading-relaxed text-[#D4D4D8]">
                {selfResult.evaluation.edgeCaseNotes}
              </p>
            </div>
          </div>
        )}
      </section>

      {/* Actions */}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={onOpenMentorReview}
          className="inline-flex items-center gap-2 whitespace-nowrap rounded-lg border border-[#2E2E38] bg-[#18181B] px-5 py-2.5 text-sm font-medium text-[#D4D4D8] transition-colors hover:border-[#4ADE80]/60 hover:text-[#F4F4F5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FACC15]"
        >
          <GeminiSparkIcon className="h-4 w-4" />
          <span>Discuss Optimization with Gemini Mentor</span>
        </button>

        <button
          type="button"
          onClick={onPlayAgain}
          className="inline-flex items-center gap-2 whitespace-nowrap rounded-lg bg-[#FACC15] px-6 py-2.5 text-sm font-semibold text-[#0A0A0C] transition-colors hover:bg-[#FDE047] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FACC15]"
        >
          <RotateCcw className="h-4 w-4" aria-hidden="true" />
          <span>Return to Lobby</span>
        </button>
      </div>
    </main>
  );
}
