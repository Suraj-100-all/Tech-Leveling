import type { User } from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  type Unsubscribe,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase';
import type {
  DifficultyTier,
  MatchHistoryRecord,
  PlayerProfileData,
  ProgrammingLanguage,
} from '../types/arena';
import {
  applyMatchOutcomeToProfile,
  normalizeRankTier,
  sanitizeUsernameForSchema,
} from '../utils/profileRules';

function timestampToIso(val: unknown): string {
  if (val instanceof Timestamp) {
    return val.toDate().toISOString();
  }
  if (typeof val === 'string') {
    return val;
  }
  return new Date().toISOString();
}

function mapDocToProfile(uid: string, data: Record<string, unknown>): PlayerProfileData {
  const winCount = Number(data.winCount ?? 0);
  const lossCount = Number(data.lossCount ?? 0);
  const totalGamesPlayed = Number(data.totalGamesPlayed ?? winCount + lossCount);
  const winRate =
    totalGamesPlayed === 0 ? 0 : Number(((winCount / totalGamesPlayed) * 100).toFixed(1));

  return {
    id: uid,
    username: String(data.username ?? 'Dev-User'),
    avatarUrl: String(data.avatarUrl ?? ''),
    preferredLanguage: (data.preferredLanguage as ProgrammingLanguage) || 'python',
    winCount,
    lossCount,
    totalGamesPlayed,
    winRate,
    highestRankAchieved: normalizeRankTier(String(data.highestRankAchieved ?? 'bronze')),
    coins: Number(data.coins ?? 0),
    eloRating: Number(data.eloRating ?? 1200),
    updatedAt: timestampToIso(data.updatedAt),
  };
}

export async function ensureFirestoreProfile(user: User): Promise<PlayerProfileData> {
  const path = `profiles/${user.uid}`;
  const ref = doc(db, 'profiles', user.uid);

  try {
    const snap = await getDoc(ref);
    if (snap.exists()) {
      return mapDocToProfile(user.uid, snap.data() as Record<string, unknown>);
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }

  const cleanUsername = sanitizeUsernameForSchema(
    user.displayName || user.email?.split('@')[0] || `Dev-${user.uid.slice(0, 6)}`,
  );
  const safeAvatar =
    user.photoURL && /^https?:\/\//.test(user.photoURL) ? user.photoURL.slice(0, 500) : '';

  const payload = {
    uid: user.uid,
    username: cleanUsername,
    avatarUrl: safeAvatar,
    preferredLanguage: 'python' as ProgrammingLanguage,
    winCount: 0,
    lossCount: 0,
    totalGamesPlayed: 0,
    highestRankAchieved: 'bronze',
    coins: 0,
    eloRating: 1200,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  try {
    await setDoc(ref, payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }

  return {
    id: user.uid,
    username: cleanUsername,
    avatarUrl: safeAvatar,
    preferredLanguage: 'python',
    winCount: 0,
    lossCount: 0,
    totalGamesPlayed: 0,
    winRate: 0,
    highestRankAchieved: 'bronze',
    coins: 0,
    eloRating: 1200,
    updatedAt: new Date().toISOString(),
  };
}

export async function updateFirestoreProfileIdentity(
  uid: string,
  updates: {
    username: string;
    avatarUrl: string;
    preferredLanguage: ProgrammingLanguage;
  },
): Promise<void> {
  const path = `profiles/${uid}`;
  const ref = doc(db, 'profiles', uid);

  try {
    await updateDoc(ref, {
      username: updates.username.trim().slice(0, 32),
      avatarUrl: updates.avatarUrl.trim().slice(0, 500),
      preferredLanguage: updates.preferredLanguage,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function persistMatchOutcomeToFirestore(
  uid: string,
  currentProfile: PlayerProfileData,
  record: {
    handle: string;
    tier: DifficultyTier;
    problemTitle: string;
    language: ProgrammingLanguage;
    timeComplexity: string;
    spaceComplexity: string;
    outcome: 'victory' | 'defeat' | 'mentor';
    coinsDelta: number;
    elapsedMs: number;
  },
): Promise<PlayerProfileData> {
  const matchId = `m_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const matchPath = `matches/${matchId}`;

  try {
    await setDoc(doc(db, 'matches', matchId), {
      uid,
      handle: record.handle.trim().slice(0, 32) || 'Player',
      tier: record.tier,
      problemTitle: record.problemTitle.slice(0, 160),
      language: record.language,
      timeComplexity: record.timeComplexity.slice(0, 48) || '—',
      spaceComplexity: record.spaceComplexity.slice(0, 48) || '—',
      outcome: record.outcome,
      coinsDelta: Math.max(0, Math.min(600, Math.floor(record.coinsDelta))),
      elapsedMs: Math.max(0, Math.min(86400000, Math.floor(record.elapsedMs))),
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, matchPath);
  }

  const nextProfile = applyMatchOutcomeToProfile(currentProfile, {
    won: record.outcome === 'victory',
    tier: record.tier,
    coinsAwarded: Math.max(0, Math.min(600, Math.floor(record.coinsDelta))),
  });

  const profilePath = `profiles/${uid}`;
  try {
    await updateDoc(doc(db, 'profiles', uid), {
      winCount: nextProfile.winCount,
      lossCount: nextProfile.lossCount,
      totalGamesPlayed: nextProfile.totalGamesPlayed,
      highestRankAchieved: nextProfile.highestRankAchieved,
      coins: nextProfile.coins,
      eloRating: nextProfile.eloRating,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, profilePath);
  }

  return nextProfile;
}

export function subscribeUserProfile(
  uid: string,
  onProfile: (profile: PlayerProfileData) => void,
): Unsubscribe {
  const path = `profiles/${uid}`;
  const ref = doc(db, 'profiles', uid);
  return onSnapshot(
    ref,
    (snap) => {
      if (snap.exists()) {
        onProfile(mapDocToProfile(uid, snap.data() as Record<string, unknown>));
      }
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    },
  );
}

export function subscribeUserMatches(
  uid: string,
  onMatches: (records: MatchHistoryRecord[]) => void,
): Unsubscribe {
  const path = 'matches';
  const q = query(collection(db, path), where('uid', '==', uid));

  return onSnapshot(
    q,
    (snapshot) => {
      const items: MatchHistoryRecord[] = snapshot.docs.map((docSnap) => {
        const d = docSnap.data();
        return {
          id: docSnap.id,
          handle: String(d.handle ?? 'Player'),
          tier: (d.tier as DifficultyTier) || 'rookie',
          problemTitle: String(d.problemTitle ?? 'Challenge'),
          language: (d.language as ProgrammingLanguage) || 'python',
          timeComplexity: String(d.timeComplexity ?? '—'),
          spaceComplexity: String(d.spaceComplexity ?? '—'),
          outcome: (d.outcome as 'victory' | 'defeat' | 'mentor') || 'defeat',
          coinsDelta: Number(d.coinsDelta ?? 0),
          elapsedMs: Number(d.elapsedMs ?? 0),
          completedAt: timestampToIso(d.createdAt),
        };
      });
      items.sort((a, b) => b.completedAt.localeCompare(a.completedAt));
      onMatches(items);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    },
  );
}
