import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseBigORank,
  compareSubmissions,
  evaluateMultiplayerVerdict,
  evaluateSoloAgainstBenchmark,
  canJoinRoom,
  formatDurationMs,
} from './matchRules';

test('parseBigORank strictly orders asymptotic classes from constant to factorial', () => {
  const ordered = [
    'O(1)',
    'O(log n)',
    'O(n)',
    'O(n log n)',
    'O(n^2)',
    'O(n^3)',
    'O(2^n)',
    'O(n!)',
  ];
  for (let i = 0; i < ordered.length - 1; i++) {
    assert.ok(
      parseBigORank(ordered[i]) < parseBigORank(ordered[i + 1]),
      `${ordered[i]} should rank strictly better than ${ordered[i + 1]}`,
    );
  }
});

test('Big-O time complexity beats faster submission speed', () => {
  const slowerOptimal = {
    playerId: 'p1',
    handle: 'Ada',
    language: 'python' as const,
    elapsedMs: 120_000,
    evaluation: {
      isCorrect: true,
      timeComplexity: 'O(n)',
      spaceComplexity: 'O(n)',
      correctnessSummary: 'Correct',
      complexityReasoning: 'Single pass',
      edgeCaseNotes: 'Handled',
      detectedIssues: [],
    },
  };
  const fasterBruteForce = {
    playerId: 'p2',
    handle: 'Linus',
    language: 'cpp' as const,
    elapsedMs: 15_000,
    evaluation: {
      isCorrect: true,
      timeComplexity: 'O(n^2)',
      spaceComplexity: 'O(1)',
      correctnessSummary: 'Correct',
      complexityReasoning: 'Nested loop',
      edgeCaseNotes: 'Handled',
      detectedIssues: [],
    },
  };

  const verdict = evaluateMultiplayerVerdict({
    roomId: 'RM-101',
    tier: 'challenger',
    submissions: [fasterBruteForce, slowerOptimal],
    viewerPlayerId: 'p1',
  });

  assert.equal(verdict.winnerPlayerId, 'p1');
  assert.equal(verdict.didWin, true);
  assert.equal(verdict.decidingFactor, 'time_complexity');
  assert.equal(verdict.tieBreakerUsed, false);
  assert.equal(verdict.coinsAwarded, 320);
});

test('Space complexity decides ties when O(Time) is equal, regardless of speed', () => {
  const rollingSpace = {
    playerId: 'p1',
    handle: 'Grace',
    language: 'java' as const,
    elapsedMs: 95_000,
    evaluation: {
      isCorrect: true,
      timeComplexity: 'O(n)',
      spaceComplexity: 'O(1)',
      correctnessSummary: 'Correct',
      complexityReasoning: 'Rolling variables',
      edgeCaseNotes: 'Handled',
      detectedIssues: [],
    },
  };
  const tableSpace = {
    playerId: 'p2',
    handle: 'Alan',
    language: 'python' as const,
    elapsedMs: 30_000,
    evaluation: {
      isCorrect: true,
      timeComplexity: 'O(n)',
      spaceComplexity: 'O(n)',
      correctnessSummary: 'Correct',
      complexityReasoning: 'Full DP array',
      edgeCaseNotes: 'Handled',
      detectedIssues: [],
    },
  };

  const cmp = compareSubmissions(rollingSpace, tableSpace);
  assert.ok(cmp.order < 0);
  assert.equal(cmp.reason, 'space_complexity');
});

test('Speed acts strictly as a tie-breaker when Time and Space complexities match', () => {
  const fastP = {
    playerId: 'p1',
    handle: 'Fast',
    language: 'cpp' as const,
    elapsedMs: 42_000,
    evaluation: {
      isCorrect: true,
      timeComplexity: 'O(n log n)',
      spaceComplexity: 'O(n)',
      correctnessSummary: 'Correct',
      complexityReasoning: 'Sort + binary search',
      edgeCaseNotes: 'Handled',
      detectedIssues: [],
    },
  };
  const slowP = {
    playerId: 'p2',
    handle: 'Slow',
    language: 'java' as const,
    elapsedMs: 78_000,
    evaluation: {
      isCorrect: true,
      timeComplexity: 'O(n log n)',
      spaceComplexity: 'O(n)',
      correctnessSummary: 'Correct',
      complexityReasoning: 'Sort + binary search',
      edgeCaseNotes: 'Handled',
      detectedIssues: [],
    },
  };

  const verdict = evaluateMultiplayerVerdict({
    roomId: 'RM-202',
    tier: 'pro',
    submissions: [slowP, fastP],
    viewerPlayerId: 'p1',
  });

  assert.equal(verdict.winnerPlayerId, 'p1');
  assert.equal(verdict.tieBreakerUsed, true);
  assert.equal(verdict.decidingFactor, 'speed_tiebreaker');
  assert.equal(verdict.coinsAwarded, 600);
});

test('Solo benchmark strictly rejects suboptimal O(n^2) code (no auto-win)', () => {
  const verdict = evaluateSoloAgainstBenchmark({
    roomId: 'RM-303',
    tier: 'rookie',
    targetTimeComplexity: 'O(n)',
    targetSpaceComplexity: 'O(n)',
    submission: {
      playerId: 'p1',
      handle: 'Student',
      language: 'python',
      elapsedMs: 25_000,
      evaluation: {
        isCorrect: true,
        timeComplexity: 'O(n^2)',
        spaceComplexity: 'O(1)',
        correctnessSummary: 'Correct logic',
        complexityReasoning: 'Nested loop scan',
        edgeCaseNotes: 'Slow on n=2e5',
        detectedIssues: ['Quadratic runtime'],
      },
    },
  });

  assert.equal(verdict.didWin, false);
  assert.equal(verdict.coinsAwarded, 0);
  assert.equal(verdict.decidingFactor, 'time_complexity');
});

test('Room capacity enforces 2-3 player ceiling and formats duration cleanly', () => {
  assert.equal(canJoinRoom(0), true);
  assert.equal(canJoinRoom(2), true);
  assert.equal(canJoinRoom(3), false);
  assert.equal(formatDurationMs(65_000), '01:05');
});
