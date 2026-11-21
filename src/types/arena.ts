export type DifficultyTier = 'rookie' | 'challenger' | 'pro';

export type ProgrammingLanguage = 'c' | 'cpp' | 'java' | 'python';

export type PartNumber = 1 | 2 | 3 | 4 | 5;

export type MatchPhase =
  | 'lobby'
  | 'matchmaking'
  | 'briefing'
  | 'arena'
  | 'judging'
  | 'victory'
  | 'mentor';

export type AppSection = 'lobby' | 'arena' | 'standings';

export interface GroundingSource {
  title: string;
  uri: string;
}

export interface ProgressionPartMeta {
  part: PartNumber;
  title: string;
  subtitle: string;
  tier: DifficultyTier;
  coinBase: number;
  timeMinutes: number;
  languageSpecificFocus: Record<ProgrammingLanguage, string>;
}

export interface ProblemExample {
  input: string;
  output: string;
  explanation?: string;
}

export interface ProblemStatement {
  id: string;
  title: string;
  tier: DifficultyTier;
  partNumber?: PartNumber;
  levelNumber?: number;
  languageFocus: ProgrammingLanguage;
  topic: string;
  focusArea: string;
  dataStructure: string;
  targetTimeComplexity: string;
  targetSpaceComplexity: string;
  timeLimitSeconds: number;
  coinReward: number;
  summary: string;
  description: string[];
  constraints: string[];
  examples: ProblemExample[];
  inputOutputNote: string;
}

export interface QuickNotesData {
  topicTitle: string;
  languageReminder: string;
  corePattern: string;
  targetComplexity: string;
  keyConcepts: string[];
  mentalChecklist: string[];
  watchOut: string;
  sources?: GroundingSource[];
}

export interface PlayerPresence {
  id: string;
  handle: string;
  connected: boolean;
  isTyping: boolean;
  submitted: boolean;
  isSelf?: boolean;
}

export interface BigOEvaluation {
  isCorrect: boolean;
  timeComplexity: string;
  spaceComplexity: string;
  correctnessSummary: string;
  complexityReasoning: string;
  edgeCaseNotes: string;
  detectedIssues: string[];
}

export interface RankedParticipantResult {
  playerId: string;
  handle: string;
  language: ProgrammingLanguage | 'benchmark';
  isBenchmark?: boolean;
  isSelf?: boolean;
  isCorrect: boolean;
  timeComplexity: string;
  spaceComplexity: string;
  elapsedMs: number;
  rank: number;
  evaluation: BigOEvaluation;
}

export interface MatchVerdict {
  roomId: string;
  mode: 'multiplayer' | 'benchmark';
  winnerPlayerId: string | null;
  didWin: boolean;
  tieBreakerUsed: boolean;
  decidingFactor:
    | 'correctness'
    | 'time_complexity'
    | 'space_complexity'
    | 'speed_tiebreaker'
    | 'benchmark_comparison';
  coinsAwarded: number;
  summary: string;
  participants: RankedParticipantResult[];
}

export interface MentorInitialFeedback {
  conceptNudge: string;
  pitfallAlert: string;
  focusQuestions: string[];
}

export interface MentorChatMessage {
  id: string;
  role: 'mentor' | 'user';
  content: string;
  conceptNudge?: string;
  pitfallAlert?: string;
  sources?: GroundingSource[];
  timestamp: string;
}

export interface MatchHistoryRecord {
  id: string;
  handle: string;
  tier: DifficultyTier;
  problemTitle: string;
  language: ProgrammingLanguage;
  timeComplexity: string;
  spaceComplexity: string;
  outcome: 'victory' | 'defeat' | 'mentor';
  coinsDelta: number;
  elapsedMs: number;
  completedAt: string;
}

export type RankTier = 'bronze' | 'silver' | 'gold' | 'platinum' | 'grandmaster';

export interface PlayerProfileData {
  id: string;
  username: string;
  avatarUrl: string;
  preferredLanguage: ProgrammingLanguage;
  winCount: number;
  lossCount: number;
  totalGamesPlayed: number;
  winRate: number;
  highestRankAchieved: RankTier;
  coins: number;
  eloRating: number;
  updatedAt: string;
}

export interface DjangoFileItem {
  name: string;
  path: string;
  role: string;
  content: string;
}
