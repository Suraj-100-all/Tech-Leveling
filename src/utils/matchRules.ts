import type {
  BigOEvaluation,
  DifficultyTier,
  MatchVerdict,
  ProgrammingLanguage,
  RankedParticipantResult,
} from '../types/arena.ts';
import { TIER_CONFIG } from '../data/problems.ts';

export const MAX_ROOM_PLAYERS = 3;
export const MIN_MULTIPLAYER_PLAYERS = 2;

/**
 * Maps a Big-O complexity notation string to a strictly ordered numeric rank.
 * Lower number = asymptotically faster / more space-efficient.
 */
export function parseBigORank(notation: string): number {
  if (!notation || typeof notation !== 'string') {
    return 999;
  }

  const normalized = notation
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/^o\(/, '')
    .replace(/\)$/, '')
    .replace(/·|\*/g, '');

  if (normalized === '1' || normalized === 'constant' || normalized === 'k' || normalized === 'c') {
    return 10;
  }
  if (normalized.includes('loglogn') || normalized.includes('α(n)') || normalized.includes('alpha(n)')) {
    return 15;
  }
  if (normalized === 'logn' || normalized === 'log(n)' || normalized === 'logv' || normalized === 'loge') {
    return 20;
  }
  if (normalized.includes('sqrtn') || normalized.includes('sqrt(n)') || normalized.includes('n^0.5')) {
    return 25;
  }
  if (
    normalized === 'n' ||
    normalized === 'v+e' ||
    normalized === 'n+m' ||
    normalized === 'n+k' ||
    normalized === 'm+n'
  ) {
    return 30;
  }
  if (
    normalized.includes('nlogn') ||
    normalized.includes('nlog(n)') ||
    normalized.includes('(v+e)logv') ||
    normalized.includes('(v+e)log(v)') ||
    normalized.includes('elogv') ||
    normalized.includes('elog(v)') ||
    normalized.includes('nlogk') ||
    normalized.includes('mlogm')
  ) {
    return 40;
  }
  if (normalized.includes('n^1.5') || normalized.includes('nsqrtn')) {
    return 45;
  }
  if (
    normalized.includes('n^2') ||
    normalized.includes('n²') ||
    normalized.includes('n*n') ||
    normalized.includes('v^2') ||
    normalized.includes('v*e') ||
    normalized.includes('ve') ||
    normalized.includes('nm')
  ) {
    return 50;
  }
  if (normalized.includes('n^2logn')) {
    return 55;
  }
  if (normalized.includes('n^3') || normalized.includes('n³') || normalized.includes('v^3')) {
    return 60;
  }
  if (normalized.includes('2^n') || normalized.includes('3^n') || normalized.includes('k^n')) {
    return 70;
  }
  if (normalized.includes('n!')) {
    return 80;
  }

  return 90;
}

export interface SubmissionForRanking {
  playerId: string;
  handle: string;
  language: ProgrammingLanguage;
  elapsedMs: number;
  evaluation: BigOEvaluation;
}

/**
 * Strictly compares two code submissions:
 * 1. Correctness (valid solution beats invalid/incomplete code)
 * 2. Primary: O(Time) complexity rank (lower is better)
 * 3. Secondary: O(Space) complexity rank (lower is better)
 * 4. Tie-breaker ONLY: elapsedMs (faster submission wins strictly when Big-O matches)
 */
export function compareSubmissions(a: SubmissionForRanking, b: SubmissionForRanking): {
  order: number;
  reason: 'correctness' | 'time_complexity' | 'space_complexity' | 'speed_tiebreaker';
} {
  if (a.evaluation.isCorrect !== b.evaluation.isCorrect) {
    return {
      order: a.evaluation.isCorrect ? -1 : 1,
      reason: 'correctness',
    };
  }

  const timeA = parseBigORank(a.evaluation.timeComplexity);
  const timeB = parseBigORank(b.evaluation.timeComplexity);
  if (timeA !== timeB) {
    return {
      order: timeA - timeB,
      reason: 'time_complexity',
    };
  }

  const spaceA = parseBigORank(a.evaluation.spaceComplexity);
  const spaceB = parseBigORank(b.evaluation.spaceComplexity);
  if (spaceA !== spaceB) {
    return {
      order: spaceA - spaceB,
      reason: 'space_complexity',
    };
  }

  return {
    order: a.elapsedMs - b.elapsedMs,
    reason: 'speed_tiebreaker',
  };
}

export function calculateCoinReward(tier: DifficultyTier, didWin: boolean): number {
  if (!didWin) {
    return 0;
  }
  return TIER_CONFIG[tier].coinReward;
}

/**
 * Evaluates a real 2–3 player match strictly on Big-O complexity,
 * using speed only when Time and Space complexities are identical.
 */
export function evaluateMultiplayerVerdict(params: {
  roomId: string;
  tier: DifficultyTier;
  submissions: SubmissionForRanking[];
  viewerPlayerId: string;
}): MatchVerdict {
  const { roomId, tier, submissions, viewerPlayerId } = params;

  const sorted = [...submissions].sort((a, b) => compareSubmissions(a, b).order);

  const anyCorrect = sorted.some((s) => s.evaluation.isCorrect);
  const top = sorted[0];
  const runnerUp = sorted[1];

  let decidingFactor: MatchVerdict['decidingFactor'] = 'time_complexity';
  let tieBreakerUsed = false;

  if (top && runnerUp) {
    const cmp = compareSubmissions(top, runnerUp);
    decidingFactor = cmp.reason;
    tieBreakerUsed = cmp.reason === 'speed_tiebreaker';
  } else if (top && !top.evaluation.isCorrect) {
    decidingFactor = 'correctness';
  }

  const winnerPlayerId = anyCorrect && top ? top.playerId : null;
  const didWin = winnerPlayerId !== null && winnerPlayerId === viewerPlayerId;
  const coinsAwarded = calculateCoinReward(tier, didWin);

  const participants: RankedParticipantResult[] = sorted.map((item, idx) => ({
    playerId: item.playerId,
    handle: item.handle,
    language: item.language,
    isSelf: item.playerId === viewerPlayerId,
    isCorrect: item.evaluation.isCorrect,
    timeComplexity: item.evaluation.timeComplexity,
    spaceComplexity: item.evaluation.spaceComplexity,
    elapsedMs: item.elapsedMs,
    rank: idx + 1,
    evaluation: item.evaluation,
  }));

  let summary = '';
  if (!anyCorrect) {
    summary = 'No submission satisfied the problem requirements. Opening the AI Mentor to refine your algorithmic approach.';
  } else if (didWin) {
    if (tieBreakerUsed) {
      summary = `Matched ${top.evaluation.timeComplexity} time and ${top.evaluation.spaceComplexity} space — you won on the submission speed tie-breaker.`;
    } else if (decidingFactor === 'space_complexity') {
      summary = `Your ${top.evaluation.spaceComplexity} space complexity outranked the room at identical ${top.evaluation.timeComplexity} time.`;
    } else if (decidingFactor === 'correctness') {
      summary = `Your valid ${top.evaluation.timeComplexity} solution was the strongest correct submission in the room.`;
    } else {
      summary = `Your ${top.evaluation.timeComplexity} time complexity decisively outperformed the room.`;
    }
  } else {
    summary = `${top?.handle ?? 'Opponent'} took first place with ${top?.evaluation.timeComplexity ?? 'optimal'} time and ${top?.evaluation.spaceComplexity ?? 'optimal'} space.`;
  }

  return {
    roomId,
    mode: 'multiplayer',
    winnerPlayerId,
    didWin,
    tieBreakerUsed,
    decidingFactor,
    coinsAwarded,
    summary,
    participants,
  };
}

/**
 * Evaluates a single connected player strictly against the problem's optimal Big-O target.
 * No auto-win: code must be functionally correct AND meet the optimal Time & Space targets.
 */
export function evaluateSoloAgainstBenchmark(params: {
  roomId: string;
  tier: DifficultyTier;
  submission: SubmissionForRanking;
  targetTimeComplexity: string;
  targetSpaceComplexity: string;
}): MatchVerdict {
  const { roomId, tier, submission, targetTimeComplexity, targetSpaceComplexity } = params;
  const { evaluation } = submission;

  const submittedTimeRank = parseBigORank(evaluation.timeComplexity);
  const targetTimeRank = parseBigORank(targetTimeComplexity);
  const submittedSpaceRank = parseBigORank(evaluation.spaceComplexity);
  const targetSpaceRank = parseBigORank(targetSpaceComplexity);

  const meetsTime = submittedTimeRank <= targetTimeRank;
  const meetsSpace = submittedSpaceRank <= targetSpaceRank;
  const didWin = evaluation.isCorrect && meetsTime && meetsSpace;

  const coinsAwarded = calculateCoinReward(tier, didWin);

  const benchmarkRow: RankedParticipantResult = {
    playerId: 'optimal-benchmark',
    handle: 'Optimal Target Benchmark',
    language: 'benchmark',
    isBenchmark: true,
    isCorrect: true,
    timeComplexity: targetTimeComplexity,
    spaceComplexity: targetSpaceComplexity,
    elapsedMs: 0,
    rank: didWin ? 2 : 1,
    evaluation: {
      isCorrect: true,
      timeComplexity: targetTimeComplexity,
      spaceComplexity: targetSpaceComplexity,
      correctnessSummary: 'Reference Big-O asymptotic threshold for this problem tier.',
      complexityReasoning: `Expected optimal bound: ${targetTimeComplexity} time and ${targetSpaceComplexity} space.`,
      edgeCaseNotes: 'No fake opponent code used — judged strictly against asymptotic bounds.',
      detectedIssues: [],
    },
  };

  const playerRow: RankedParticipantResult = {
    playerId: submission.playerId,
    handle: submission.handle,
    language: submission.language,
    isSelf: true,
    isCorrect: evaluation.isCorrect,
    timeComplexity: evaluation.timeComplexity,
    spaceComplexity: evaluation.spaceComplexity,
    elapsedMs: submission.elapsedMs,
    rank: didWin ? 1 : 2,
    evaluation,
  };

  const participants = didWin ? [playerRow, benchmarkRow] : [benchmarkRow, playerRow];

  let summary: string;
  if (!evaluation.isCorrect) {
    summary = 'Your submission did not satisfy the problem logic or edge cases. Entering AI Mentor review.';
  } else if (!meetsTime) {
    summary = `Functional logic passed, but ${evaluation.timeComplexity} time is slower than the optimal ${targetTimeComplexity} bound.`;
  } else if (!meetsSpace) {
    summary = `Time complexity ${evaluation.timeComplexity} matched target, but ${evaluation.spaceComplexity} space exceeded the optimal ${targetSpaceComplexity} bound.`;
  } else {
    summary = `Optimal ${evaluation.timeComplexity} time and ${evaluation.spaceComplexity} space verified by Big-O Judge.`;
  }

  return {
    roomId,
    mode: 'benchmark',
    winnerPlayerId: didWin ? submission.playerId : null,
    didWin,
    tieBreakerUsed: false,
    decidingFactor: !evaluation.isCorrect
      ? 'correctness'
      : !meetsTime
        ? 'time_complexity'
        : !meetsSpace
          ? 'space_complexity'
          : 'benchmark_comparison',
    coinsAwarded,
    summary,
    participants,
  };
}

export function canJoinRoom(currentPlayerCount: number): boolean {
  return currentPlayerCount < MAX_ROOM_PLAYERS;
}

export function formatDurationMs(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}
