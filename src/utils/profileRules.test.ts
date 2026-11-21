import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applyMatchOutcomeToProfile,
  getRankBadgeMeta,
  normalizeRankTier,
  promoteRank,
  sanitizeUsernameForSchema,
  validateProfileUpdate,
} from './profileRules';
import type { PlayerProfileData } from '../types/arena';

const baseProfile: PlayerProfileData = {
  id: 'prof-1',
  username: 'Dev-Alex',
  avatarUrl: '',
  preferredLanguage: 'python',
  winCount: 0,
  lossCount: 0,
  totalGamesPlayed: 0,
  winRate: 0,
  highestRankAchieved: 'bronze',
  coins: 0,
  eloRating: 1200,
  updatedAt: '2026-11-20T00:00:00.000Z',
};

test('validateProfileUpdate enforces username pattern and HTTP(S) avatar URL', () => {
  assert.equal(
    validateProfileUpdate({ username: 'Dev-Kira_99', avatarUrl: 'https://example.com/a.png' }),
    null,
  );
  assert.equal(validateProfileUpdate({ username: 'ab' }) !== null, true);
  assert.equal(validateProfileUpdate({ avatarUrl: 'javascript:alert(1)' }) !== null, true);
});

test('applyMatchOutcomeToProfile promotes Bronze -> Silver -> Gold -> Platinum -> Grandmaster', () => {
  const afterChallengerWin = applyMatchOutcomeToProfile(baseProfile, {
    won: true,
    tier: 'challenger',
    coinsAwarded: 320,
  });
  assert.equal(afterChallengerWin.highestRankAchieved, 'silver');
  assert.equal(getRankBadgeMeta(afterChallengerWin.highestRankAchieved).label, 'Silver');

  const afterProWin = applyMatchOutcomeToProfile(afterChallengerWin, {
    won: true,
    tier: 'pro',
    coinsAwarded: 600,
  });
  assert.equal(afterProWin.highestRankAchieved, 'gold');

  const afterThirdWin = applyMatchOutcomeToProfile(afterProWin, {
    won: true,
    tier: 'pro',
    coinsAwarded: 600,
  });
  assert.equal(afterThirdWin.highestRankAchieved, 'platinum');
  assert.equal(getRankBadgeMeta(afterThirdWin.highestRankAchieved).shortCode, 'PLT');
});

test('promoteRank never demotes a higher rank and unlocks Grandmaster at 5+ Pro wins', () => {
  assert.equal(promoteRank('gold', 'rookie', 2), 'gold');
  assert.equal(promoteRank('platinum', 'pro', 5), 'grandmaster');
  assert.equal(normalizeRankTier('rookie'), 'bronze');
  assert.equal(normalizeRankTier('challenger'), 'silver');
  assert.equal(normalizeRankTier('pro'), 'gold');
});

test('sanitizeUsernameForSchema guarantees valid Firestore regex username', () => {
  assert.match(sanitizeUsernameForSchema('Suraj Jaiswal!'), /^[A-Za-z0-9_-]{3,32}$/);
  assert.match(sanitizeUsernameForSchema('a'), /^[A-Za-z0-9_-]{3,32}$/);
});
