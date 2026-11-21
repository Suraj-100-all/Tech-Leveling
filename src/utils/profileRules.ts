import type { DifficultyTier, PlayerProfileData, RankTier } from '../types/arena';

const USERNAME_REGEX = /^[A-Za-z0-9_-]{3,32}$/;

export const RANK_WEIGHT: Record<RankTier, number> = {
  bronze: 1,
  silver: 2,
  gold: 3,
  platinum: 4,
  grandmaster: 5,
};

export interface RankBadgeMeta {
  rank: RankTier;
  label: string;
  shortCode: string;
  accentHex: string;
  borderClass: string;
  textClass: string;
  surfaceClass: string;
  unlockRequirement: string;
  nextRankLabel: string | null;
}

export const RANK_BADGE_META: Record<RankTier, RankBadgeMeta> = {
  bronze: {
    rank: 'bronze',
    label: 'Bronze',
    shortCode: 'BRZ',
    accentHex: '#D97742',
    borderClass: 'border-[#D97742]/50',
    textClass: 'text-[#E69868]',
    surfaceClass: 'bg-[#261912]',
    unlockRequirement: 'Starting competitive division · Win Rookie matches',
    nextRankLabel: 'Silver (Win a Challenger match)',
  },
  silver: {
    rank: 'silver',
    label: 'Silver',
    shortCode: 'SLV',
    accentHex: '#CBD5E1',
    borderClass: 'border-[#CBD5E1]/50',
    textClass: 'text-[#E2E8F0]',
    surfaceClass: 'bg-[#1C2026]',
    unlockRequirement: 'Unlocked on Challenger tier victory',
    nextRankLabel: 'Gold (Win a Pro match)',
  },
  gold: {
    rank: 'gold',
    label: 'Gold',
    shortCode: 'GLD',
    accentHex: '#FACC15',
    borderClass: 'border-[#FACC15]/60',
    textClass: 'text-[#FACC15]',
    surfaceClass: 'bg-[#262210]',
    unlockRequirement: 'Unlocked on Pro tier victory',
    nextRankLabel: 'Platinum (Reach 3+ wins with a Pro victory)',
  },
  platinum: {
    rank: 'platinum',
    label: 'Platinum',
    shortCode: 'PLT',
    accentHex: '#67E8F9',
    borderClass: 'border-[#67E8F9]/60',
    textClass: 'text-[#67E8F9]',
    surfaceClass: 'bg-[#102429]',
    unlockRequirement: 'Unlocked at 3+ wins including Pro tier mastery',
    nextRankLabel: 'Grandmaster (Reach 5+ wins with Pro mastery)',
  },
  grandmaster: {
    rank: 'grandmaster',
    label: 'Grandmaster',
    shortCode: 'GM',
    accentHex: '#4ADE80',
    borderClass: 'border-[#4ADE80]/60',
    textClass: 'text-[#4ADE80]',
    surfaceClass: 'bg-[#112418]',
    unlockRequirement: 'Apex division · 5+ wins with Pro tier Big-O mastery',
    nextRankLabel: null,
  },
};

export function normalizeRankTier(raw: string | undefined | null): RankTier {
  const val = (raw || '').trim().toLowerCase();
  if (val === 'grandmaster') return 'grandmaster';
  if (val === 'platinum') return 'platinum';
  if (val === 'gold' || val === 'pro') return 'gold';
  if (val === 'silver' || val === 'challenger') return 'silver';
  return 'bronze';
}

export function getRankBadgeMeta(rank: string | RankTier): RankBadgeMeta {
  return RANK_BADGE_META[normalizeRankTier(rank)];
}

export function sanitizeUsernameForSchema(raw: string): string {
  const cleaned = raw
    .trim()
    .replace(/\s+/g, '_')
    .replace(/[^A-Za-z0-9_-]/g, '')
    .slice(0, 32);
  if (cleaned.length >= 3) {
    return cleaned;
  }
  return `Dev_${cleaned.padEnd(3, '0')}`.slice(0, 32);
}

export function validateProfileUpdate(input: {
  username?: string;
  avatarUrl?: string;
}): string | null {
  if (typeof input.username === 'string') {
    const cleaned = input.username.trim();
    if (!USERNAME_REGEX.test(cleaned)) {
      return 'Username must be 3–32 characters using letters, numbers, hyphens, or underscores.';
    }
  }
  if (typeof input.avatarUrl === 'string' && input.avatarUrl.trim().length > 0) {
    const url = input.avatarUrl.trim();
    if (url.length > 500) {
      return 'Avatar URL must be 500 characters or fewer.';
    }
    if (!url.startsWith('https://') && !url.startsWith('http://')) {
      return 'Avatar URL must begin with https:// or http://.';
    }
  }
  return null;
}

export function promoteRank(
  current: RankTier,
  wonTier: DifficultyTier,
  nextWinCount: number,
): RankTier {
  let candidate: RankTier = 'bronze';
  if (wonTier === 'pro' && nextWinCount >= 5) {
    candidate = 'grandmaster';
  } else if (wonTier === 'pro' && nextWinCount >= 3) {
    candidate = 'platinum';
  } else if (wonTier === 'pro') {
    candidate = 'gold';
  } else if (wonTier === 'challenger') {
    candidate = 'silver';
  } else {
    candidate = 'bronze';
  }
  return RANK_WEIGHT[candidate] > RANK_WEIGHT[current] ? candidate : current;
}

export function applyMatchOutcomeToProfile(
  profile: PlayerProfileData,
  params: { won: boolean; tier: DifficultyTier; coinsAwarded: number },
): PlayerProfileData {
  const nextWins = profile.winCount + (params.won ? 1 : 0);
  const nextLosses = profile.lossCount + (params.won ? 0 : 1);
  const nextGames = profile.totalGamesPlayed + 1;
  const currentNorm = normalizeRankTier(profile.highestRankAchieved);
  const nextHighestRank = params.won
    ? promoteRank(currentNorm, params.tier, nextWins)
    : currentNorm;

  return {
    ...profile,
    winCount: nextWins,
    lossCount: nextLosses,
    totalGamesPlayed: nextGames,
    winRate: nextGames === 0 ? 0 : Number(((nextWins / nextGames) * 100).toFixed(1)),
    highestRankAchieved: nextHighestRank,
    coins: profile.coins + (params.won ? params.coinsAwarded : 0),
    eloRating: Math.max(0, profile.eloRating + (params.won ? 25 : -10)),
    updatedAt: new Date().toISOString(),
  };
}
