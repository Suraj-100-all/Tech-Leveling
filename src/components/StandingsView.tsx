import { useEffect, useState } from 'react';
import { ArrowRight, Check, Cloud, LogIn, Save, Trophy, User } from 'lucide-react';
import type {
  MatchHistoryRecord,
  PlayerProfileData,
  ProgrammingLanguage,
  RankTier,
} from '../types/arena';
import { TIER_CONFIG } from '../data/problems';
import { formatDurationMs } from '../utils/matchRules';
import { getRankBadgeMeta, RANK_BADGE_META, RANK_WEIGHT } from '../utils/profileRules';
import { LanguageLogo } from './BrandVisuals';

interface StandingsViewProps {
  records: MatchHistoryRecord[];
  loading: boolean;
  profile: PlayerProfileData | null;
  loadingProfile: boolean;
  isSignedIn: boolean;
  authEmail: string | null;
  authBusy: boolean;
  onSignIn: () => void;
  onUpdateProfile: (payload: {
    username: string;
    avatarUrl: string;
    preferredLanguage: ProgrammingLanguage;
  }) => Promise<string | null>;
  onStartMatch: () => void;
}

const RANK_ORDER: RankTier[] = ['bronze', 'silver', 'gold', 'platinum', 'grandmaster'];

function RankBadgeCrest({ rank, size = 'lg' }: { rank: RankTier; size?: 'sm' | 'lg' }) {
  const meta = getRankBadgeMeta(rank);
  const dim = size === 'lg' ? 'h-14 w-14' : 'h-7 w-7';

  return (
    <div
      className={`relative flex shrink-0 items-center justify-center rounded-xl border ${meta.borderClass} ${meta.surfaceClass} ${dim}`}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 48 48"
        fill="none"
        className={size === 'lg' ? 'h-10 w-10' : 'h-5 w-5'}
      >
        <polygon
          points="24,4 42,14 42,34 24,44 6,34 6,14"
          stroke={meta.accentHex}
          strokeWidth="2.2"
          fill={`${meta.accentHex}1A`}
        />
        <polygon
          points="24,11 35,17.5 35,30.5 24,37 13,30.5 13,17.5"
          stroke={meta.accentHex}
          strokeWidth="1.5"
          fill={`${meta.accentHex}29`}
        />
        {rank === 'grandmaster' || rank === 'platinum' ? (
          <path
            d="M24 15L27 21.5L34 22.5L29 27.3L30.2 34L24 30.7L17.8 34L19 27.3L14 22.5L21 21.5L24 15Z"
            fill={meta.accentHex}
          />
        ) : rank === 'gold' ? (
          <path d="M16 30L19 18L24 24L29 18L32 30H16Z" fill={meta.accentHex} />
        ) : rank === 'silver' ? (
          <path
            d="M24 16L31 24L24 32L17 24L24 16Z"
            fill={meta.accentHex}
          />
        ) : (
          <path
            d="M17 20L24 27L31 20M17 26L24 33L31 26"
            stroke={meta.accentHex}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
      </svg>
    </div>
  );
}

export function StandingsView({
  records,
  loading,
  profile,
  loadingProfile,
  isSignedIn,
  authEmail,
  authBusy,
  onSignIn,
  onUpdateProfile,
  onStartMatch,
}: StandingsViewProps) {
  const [usernameDraft, setUsernameDraft] = useState(profile?.username ?? '');
  const [avatarDraft, setAvatarDraft] = useState(profile?.avatarUrl ?? '');
  const [langDraft, setLangDraft] = useState<ProgrammingLanguage>(
    profile?.preferredLanguage ?? 'python',
  );
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedNotice, setSavedNotice] = useState(false);
  const [avatarFailed, setAvatarFailed] = useState(false);

  useEffect(() => {
    if (profile) {
      setUsernameDraft(profile.username);
      setAvatarDraft(profile.avatarUrl);
      setLangDraft(profile.preferredLanguage);
      setAvatarFailed(false);
    }
  }, [profile]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveError(null);
    setSavedNotice(false);
    const err = await onUpdateProfile({
      username: usernameDraft,
      avatarUrl: avatarDraft,
      preferredLanguage: langDraft,
    });
    setSaving(false);
    if (err) {
      setSaveError(err);
    } else {
      setSavedNotice(true);
      setTimeout(() => setSavedNotice(false), 2400);
    }
  };

  const activeBadge = getRankBadgeMeta(profile?.highestRankAchieved ?? 'bronze');
  const activeWeight = RANK_WEIGHT[activeBadge.rank];

  return (
    <main className="mx-auto max-w-[1280px] px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[#26262E] pb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#F4F4F5] sm:text-3xl">
            Player Profile & Match Standings
          </h1>
          <p className="mt-1 text-sm text-[#A1A1AA]">
            Track your dynamic competitive rank badge, lifetime win ledger, and verified Big-O
            match history.
          </p>
        </div>

        <button
          type="button"
          onClick={onStartMatch}
          className="inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-lg bg-[#FACC15] px-5 py-2.5 text-sm font-semibold text-[#0A0A0C] transition-colors hover:bg-[#FDE047]"
        >
          <span>Enter Battle Arena</span>
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      {/* Cloud Persistence Banner */}
      <section className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-[#2A2A32] bg-[#18181B] px-5 py-4">
        <div className="flex items-center gap-3 text-sm">
          <Cloud
            className={`h-4 w-4 shrink-0 ${isSignedIn ? 'text-[#4ADE80]' : 'text-[#A1A1AA]'}`}
            aria-hidden="true"
          />
          <div>
            {isSignedIn ? (
              <span className="text-[#E4E4E7]">
                Cloud profile synced with Firestore{' '}
                {authEmail ? <span className="font-mono text-xs text-[#A1A1AA]">({authEmail})</span> : null}
              </span>
            ) : (
              <span className="text-[#D4D4D8]">
                Playing in local guest session. Sign in with Google to save your rank badge and
                match history to Firestore.
              </span>
            )}
          </div>
        </div>

        {!isSignedIn && (
          <button
            type="button"
            disabled={authBusy}
            onClick={onSignIn}
            className="inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-lg border border-[#FACC15]/50 bg-[#121212] px-4 py-2 text-xs font-semibold text-[#FACC15] transition-colors hover:bg-[#FACC15] hover:text-[#0A0A0C] disabled:opacity-50"
          >
            <LogIn className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{authBusy ? 'Signing In...' : 'Sign in with Google'}</span>
          </button>
        )}
      </section>

      {/* Live Player Profile Card with Dynamic Rank Badge */}
      <section
        aria-label="Player Profile"
        className="mt-6 rounded-xl border border-[#2A2A32] bg-[#18181B] p-6"
      >
        {loadingProfile || !profile ? (
          <div className="h-36 animate-pulse rounded bg-[#26262E]" />
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
              {/* Left: Identity + Dynamic Rank Badge + Lifetime Stats */}
              <div className="space-y-6 lg:col-span-5">
                <div className="flex items-center gap-4">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-[#2E2E38] bg-[#121212]">
                    {profile.avatarUrl && !avatarFailed ? (
                      <img
                        src={profile.avatarUrl}
                        alt={`${profile.username} avatar`}
                        referrerPolicy="no-referrer"
                        onError={() => setAvatarFailed(true)}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <User className="h-7 w-7 text-[#FACC15]" aria-hidden="true" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <h2 className="truncate text-xl font-bold text-[#F4F4F5]">{profile.username}</h2>
                    <p className="mt-0.5 text-xs text-[#A1A1AA]">
                      ELO{' '}
                      <span className="font-mono font-semibold tabular-nums text-[#4ADE80]">
                        {profile.eloRating}
                      </span>{' '}
                      · Coins{' '}
                      <span className="font-mono font-semibold tabular-nums text-[#FACC15]">
                        {profile.coins}
                      </span>
                    </p>
                  </div>
                </div>

                {/* Dynamic Highest Rank Achieved Badge Card */}
                <div
                  data-rank-badge={activeBadge.rank}
                  className={`flex items-center gap-4 rounded-xl border p-4 ${activeBadge.borderClass} ${activeBadge.surfaceClass}`}
                >
                  <RankBadgeCrest rank={activeBadge.rank} size="lg" />
                  <div className="min-w-0">
                    <div className="text-xs font-medium text-[#A1A1AA]">Highest Rank Achieved</div>
                    <div className={`mt-0.5 font-['Outfit'] text-xl font-bold ${activeBadge.textClass}`}>
                      {activeBadge.label} Division
                    </div>
                    <p className="mt-1 text-xs leading-relaxed text-[#D4D4D8]">
                      {activeBadge.nextRankLabel
                        ? `Next promotion: ${activeBadge.nextRankLabel}`
                        : activeBadge.unlockRequirement}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 border-t border-[#26262E] pt-5 sm:grid-cols-4 lg:grid-cols-2">
                  <div>
                    <div className="text-xs text-[#A1A1AA]">Wins</div>
                    <div className="mt-1 font-mono text-xl font-semibold tabular-nums text-[#4ADE80]">
                      {profile.winCount}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-[#A1A1AA]">Losses</div>
                    <div className="mt-1 font-mono text-xl font-semibold tabular-nums text-[#F87171]">
                      {profile.lossCount}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-[#A1A1AA]">Total Games</div>
                    <div className="mt-1 font-mono text-xl font-semibold tabular-nums text-[#F4F4F5]">
                      {profile.totalGamesPlayed}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-[#A1A1AA]">Win Rate</div>
                    <div className="mt-1 font-mono text-xl font-semibold tabular-nums text-[#FACC15]">
                      {profile.winRate}%
                    </div>
                  </div>
                </div>
              </div>

              {/* Right: Profile Edit Form */}
              <form
                onSubmit={handleSaveProfile}
                className="space-y-4 border-t border-[#26262E] pt-6 lg:col-span-7 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-8"
              >
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold text-[#F4F4F5]">Edit Player Profile</h3>
                  <span className="font-mono text-xs text-[#A1A1AA]">
                    {isSignedIn ? 'Firestore Cloud Sync' : `PATCH /api/profiles/${profile.username}`}
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="profile-username"
                      className="block text-xs font-medium text-[#D4D4D8]"
                    >
                      Username
                    </label>
                    <input
                      id="profile-username"
                      type="text"
                      value={usernameDraft}
                      onChange={(e) => setUsernameDraft(e.target.value)}
                      className="mt-1.5 w-full rounded-lg border border-[#2E2E38] bg-[#121212] px-3.5 py-2 text-sm text-[#F4F4F5] focus:border-[#FACC15] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="profile-language"
                      className="block text-xs font-medium text-[#D4D4D8]"
                    >
                      Preferred Language
                    </label>
                    <select
                      id="profile-language"
                      value={langDraft}
                      onChange={(e) => setLangDraft(e.target.value as ProgrammingLanguage)}
                      className="mt-1.5 w-full rounded-lg border border-[#2E2E38] bg-[#121212] px-3.5 py-2 font-mono text-sm text-[#F4F4F5] focus:border-[#FACC15] focus:outline-none"
                    >
                      <option value="c">C11</option>
                      <option value="cpp">C++20</option>
                      <option value="java">Java 21</option>
                      <option value="python">Python 3</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="profile-avatar-url"
                    className="block text-xs font-medium text-[#D4D4D8]"
                  >
                    Avatar URL
                  </label>
                  <input
                    id="profile-avatar-url"
                    type="url"
                    value={avatarDraft}
                    onChange={(e) => setAvatarDraft(e.target.value)}
                    placeholder="https://example.com/avatar.png"
                    className="mt-1.5 w-full rounded-lg border border-[#2E2E38] bg-[#121212] px-3.5 py-2 text-sm text-[#F4F4F5] placeholder-[#71717A] focus:border-[#FACC15] focus:outline-none"
                  />
                </div>

                {saveError && (
                  <div role="alert" className="text-xs text-[#FCA5A5]">
                    {saveError}
                  </div>
                )}

                <div className="flex items-center justify-between gap-3 pt-1">
                  <span className="text-xs text-[#4ADE80]">
                    {savedNotice ? (
                      <span className="inline-flex items-center gap-1.5">
                        <Check className="h-3.5 w-3.5" aria-hidden="true" />
                        Profile updated
                      </span>
                    ) : null}
                  </span>
                  <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-lg bg-[#FACC15] px-4 py-2 text-xs font-semibold text-[#0A0A0C] transition-colors hover:bg-[#FDE047] disabled:opacity-50"
                  >
                    <Save className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>{saving ? 'Saving...' : 'Save Profile'}</span>
                  </button>
                </div>
              </form>
            </div>

            {/* Dynamic Rank Badge Progression Ladder */}
            <div className="border-t border-[#26262E] pt-5">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-xs font-semibold text-[#A1A1AA]">
                  Competitive Rank Badge Ladder
                </h3>
                <span className="font-mono text-xs text-[#A1A1AA]">
                  Current: {activeBadge.label}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                {RANK_ORDER.map((r) => {
                  const meta = RANK_BADGE_META[r];
                  const unlocked = RANK_WEIGHT[r] <= activeWeight;
                  const isCurrent = r === activeBadge.rank;
                  return (
                    <div
                      key={r}
                      className={`flex items-center gap-2.5 rounded-lg border px-3 py-2.5 transition-colors ${
                        isCurrent
                          ? `${meta.borderClass} ${meta.surfaceClass}`
                          : unlocked
                            ? 'border-[#2E2E38] bg-[#141418]'
                            : 'border-[#222229] bg-[#121212] opacity-55'
                      }`}
                    >
                      <RankBadgeCrest rank={r} size="sm" />
                      <div className="min-w-0">
                        <div
                          className={`truncate text-xs font-semibold ${
                            unlocked ? meta.textClass : 'text-[#A1A1AA]'
                          }`}
                        >
                          {meta.label}
                        </div>
                        <div className="font-mono text-[10px] text-[#71717A]">
                          {isCurrent ? 'Active' : unlocked ? 'Unlocked' : 'Locked'}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Adjudicated Match Ledger */}
      <section className="mt-6 rounded-xl border border-[#2A2A32] bg-[#18181B] p-6">
        <h2 className="mb-4 text-base font-semibold text-[#F4F4F5]">Recent Big-O Matches</h2>
        {loading ? (
          <div className="space-y-3" aria-busy="true">
            <div className="h-10 animate-pulse rounded bg-[#26262E]" />
            <div className="h-10 animate-pulse rounded bg-[#26262E]" />
            <div className="h-10 animate-pulse rounded bg-[#26262E]" />
          </div>
        ) : records.length === 0 ? (
          <div className="py-10 text-center">
            <Trophy className="mx-auto h-8 w-8 text-[#52525B]" aria-hidden="true" />
            <h3 className="mt-4 text-lg font-semibold text-[#F4F4F5]">
              No matches adjudicated yet
            </h3>
            <p className="mx-auto mt-1.5 max-w-md text-sm text-[#A1A1AA]">
              Complete a live WebSocket battle and submit your code to record verified O(Time),
              O(Space), and rank badge promotions here.
            </p>
            <button
              type="button"
              onClick={onStartMatch}
              className="mt-6 inline-flex items-center gap-2 whitespace-nowrap rounded-lg bg-[#FACC15] px-5 py-2.5 text-sm font-semibold text-[#0A0A0C] hover:bg-[#FDE047]"
            >
              <span>Queue First Match</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-[#26262E] text-xs text-[#A1A1AA]">
                  <th className="py-3 pr-4 font-medium">Competitor</th>
                  <th className="py-3 pr-4 font-medium">Tier</th>
                  <th className="py-3 pr-4 font-medium">Problem</th>
                  <th className="py-3 pr-4 font-medium">Lang</th>
                  <th className="py-3 pr-4 font-medium">O(Time)</th>
                  <th className="py-3 pr-4 font-medium">O(Space)</th>
                  <th className="py-3 pr-4 font-medium">Outcome</th>
                  <th className="py-3 pr-4 text-right font-medium">Duration</th>
                  <th className="py-3 text-right font-medium">Coins</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#26262E]">
                {records.map((rec) => (
                  <tr key={rec.id} className="hover:bg-[#1E1E24]/60">
                    <td className="py-3.5 pr-4 font-medium text-[#F4F4F5]">{rec.handle}</td>
                    <td className="py-3.5 pr-4 text-xs text-[#D4D4D8]">
                      {TIER_CONFIG[rec.tier].label}
                    </td>
                    <td className="py-3.5 pr-4 text-[#D4D4D8]">{rec.problemTitle}</td>
                    <td className="py-3.5 pr-4 font-mono text-xs uppercase text-[#D4D4D8]">
                      <span className="inline-flex items-center gap-1.5">
                        <LanguageLogo language={rec.language} className="h-4 w-4" />
                        <span>{rec.language}</span>
                      </span>
                    </td>
                    <td className="py-3.5 pr-4 font-mono text-xs text-[#4ADE80]">
                      {rec.timeComplexity}
                    </td>
                    <td className="py-3.5 pr-4 font-mono text-xs text-[#FACC15]">
                      {rec.spaceComplexity}
                    </td>
                    <td className="py-3.5 pr-4 text-xs font-medium">
                      <span
                        className={
                          rec.outcome === 'victory'
                            ? 'text-[#4ADE80]'
                            : rec.outcome === 'mentor'
                              ? 'text-[#FACC15]'
                              : 'text-[#F87171]'
                        }
                      >
                        {rec.outcome === 'victory'
                          ? 'Victory'
                          : rec.outcome === 'mentor'
                            ? 'Mentor Review'
                            : 'Defeat'}
                      </span>
                    </td>
                    <td className="py-3.5 pr-4 text-right font-mono text-xs tabular-nums text-[#A1A1AA]">
                      {formatDurationMs(rec.elapsedMs)}
                    </td>
                    <td className="py-3.5 text-right font-mono text-xs font-semibold tabular-nums text-[#FACC15]">
                      {rec.coinsDelta > 0 ? `+${rec.coinsDelta}` : '0'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
