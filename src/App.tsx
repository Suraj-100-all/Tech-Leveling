import { useCallback, useEffect, useRef, useState } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut, type User } from 'firebase/auth';
import type {
  AppSection,
  GroundingSource,
  MatchHistoryRecord,
  MatchPhase,
  MatchVerdict,
  MentorChatMessage,
  MentorInitialFeedback,
  PartNumber,
  PlayerPresence,
  PlayerProfileData,
  ProblemStatement,
  ProgrammingLanguage,
  QuickNotesData,
} from './types/arena';
import { LANGUAGE_CONFIG } from './data/problems';
import { getPartMeta, getProgressionProblem } from './data/progression';
import { validateProfileUpdate } from './utils/profileRules';
import { auth, googleProvider } from './lib/firebase';
import {
  ensureFirestoreProfile,
  persistMatchOutcomeToFirestore,
  subscribeUserMatches,
  subscribeUserProfile,
  updateFirestoreProfileIdentity,
} from './lib/firestoreStore';
import { TopBar } from './components/TopBar';
import { LobbyView } from './components/LobbyView';
import { MatchmakingOverlay } from './components/MatchmakingOverlay';
import { PreMatchBriefing } from './components/PreMatchBriefing';
import { BattleArena } from './components/BattleArena';
import { VictoryScreen } from './components/VictoryScreen';
import { MentorChatbot } from './components/MentorChatbot';
import { StandingsView } from './components/StandingsView';
import { LanguageLogo } from './components/BrandVisuals';

export default function App() {
  const [activeSection, setActiveSection] = useState<AppSection>('lobby');
  const [phase, setPhase] = useState<MatchPhase>('lobby');

  // Firebase Auth state
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [authBusy, setAuthBusy] = useState<boolean>(false);

  // Player identity & 5-Part x 10-Level progression selections
  const [playerHandle, setPlayerHandle] = useState<string>('Dev-Alex');
  const [playerId, setPlayerId] = useState<string>('');
  const [coins, setCoins] = useState<number>(0);
  const [language, setLanguage] = useState<ProgrammingLanguage>('c');
  const [selectedPart, setSelectedPart] = useState<PartNumber>(1);
  const [selectedLevel, setSelectedLevel] = useState<number>(1);
  const [roomCodeInput, setRoomCodeInput] = useState<string>('');
  const [inviteRoomCode, setInviteRoomCode] = useState<string | null>(null);
  const [lobbyError, setLobbyError] = useState<string | null>(null);

  const selectedProblem = getProgressionProblem(language, selectedPart, selectedLevel);
  const selectedPartMeta = getPartMeta(selectedPart);
  const selectedTier = selectedPartMeta.tier;

  // WebSocket live connection state
  const wsRef = useRef<WebSocket | null>(null);
  const [wsConnected, setWsConnected] = useState(false);

  // Matchmaking state
  const [queueElapsedSeconds, setQueueElapsedSeconds] = useState(0);

  // Active Match & Briefing state
  const [roomId, setRoomId] = useState<string>('');
  const [problem, setProblem] = useState<ProblemStatement | null>(null);
  const [players, setPlayers] = useState<PlayerPresence[]>([]);
  const [briefingSecondsLeft, setBriefingSecondsLeft] = useState<number>(10);
  const [briefingTotalSeconds, setBriefingTotalSeconds] = useState<number>(10);
  const [quickNotes, setQuickNotes] = useState<QuickNotesData | null>(null);
  const [loadingNotes, setLoadingNotes] = useState<boolean>(false);
  const [loadingSources, setLoadingSources] = useState<boolean>(false);
  const [notesError, setNotesError] = useState<string | null>(null);
  const notesRequestSeqRef = useRef<number>(0);

  // Battle Arena state — code MUST start completely empty
  const [code, setCode] = useState<string>('');
  const [arenaStartTs, setArenaStartTs] = useState<number | null>(null);
  const [elapsedMs, setElapsedMs] = useState<number>(0);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [judgeError, setJudgeError] = useState<string | null>(null);
  const [judgingStatusMessage, setJudgingStatusMessage] = useState<string | null>(null);
  const [waitingOnOpponents, setWaitingOnOpponents] = useState<string[]>([]);

  // Post-Match Verdict & AI Mentor state
  const [verdict, setVerdict] = useState<MatchVerdict | null>(null);
  const [mentorInitial, setMentorInitial] = useState<MentorInitialFeedback | null>(null);
  const [loadingMentorInitial, setLoadingMentorInitial] = useState<boolean>(false);
  const [mentorInitialError, setMentorInitialError] = useState<string | null>(null);
  const [mentorMessages, setMentorMessages] = useState<MentorChatMessage[]>([]);
  const [sendingMentorMsg, setSendingMentorMsg] = useState<boolean>(false);
  const [mentorChatError, setMentorChatError] = useState<string | null>(null);

  // Standings & Profile state
  const [standings, setStandings] = useState<MatchHistoryRecord[]>([]);
  const [loadingStandings, setLoadingStandings] = useState<boolean>(false);
  const [playerProfile, setPlayerProfile] = useState<PlayerProfileData | null>(null);
  const [loadingProfile, setLoadingProfile] = useState<boolean>(false);

  const typingTimeoutRef = useRef<number | null>(null);
  const isTypingSentRef = useRef<boolean>(false);

  // Firebase Auth listener + real-time Firestore profile & match subscriptions
  useEffect(() => {
    let unsubProfile: (() => void) | null = null;
    let unsubMatches: (() => void) | null = null;

    const unsubAuth = onAuthStateChanged(auth, async (user) => {
      unsubProfile?.();
      unsubMatches?.();
      unsubProfile = null;
      unsubMatches = null;

      setAuthUser(user);

      if (!user) {
        return;
      }

      setLoadingProfile(true);
      setLoadingStandings(true);
      try {
        const ensured = await ensureFirestoreProfile(user);
        setPlayerProfile(ensured);
        setPlayerHandle(ensured.username);
        setLanguage(ensured.preferredLanguage);
        setCoins(ensured.coins);

        unsubProfile = subscribeUserProfile(user.uid, (prof) => {
          setPlayerProfile(prof);
          setPlayerHandle(prof.username);
          setCoins(prof.coins);
          setLoadingProfile(false);
        });

        unsubMatches = subscribeUserMatches(user.uid, (records) => {
          setStandings(records);
          setLoadingStandings(false);
        });
      } catch (err) {
        console.error('Firestore profile bootstrap failed:', err);
        setLoadingProfile(false);
        setLoadingStandings(false);
      }
    });

    return () => {
      unsubAuth();
      unsubProfile?.();
      unsubMatches?.();
    };
  }, []);

  const handleSignIn = async () => {
    setAuthBusy(true);
    setLobbyError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Google sign-in was cancelled.';
      if (!msg.includes('popup-closed-by-user')) {
        setLobbyError(msg);
      }
    } finally {
      setAuthBusy(false);
    }
  };

  const handleSignOut = async () => {
    setAuthBusy(true);
    try {
      await signOut(auth);
      setPlayerProfile(null);
      setStandings([]);
      setPlayerHandle('Dev-Alex');
      setCoins(0);
    } finally {
      setAuthBusy(false);
    }
  };

  const sendWs = useCallback((payload: Record<string, unknown>) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(payload));
      return true;
    }
    return false;
  }, []);

  const fetchQuickNotes = useCallback(
    async (problemId: string, targetLanguage: ProgrammingLanguage) => {
      const reqId = ++notesRequestSeqRef.current;
      setLoadingNotes(true);
      setLoadingSources(true);
      setNotesError(null);
      setQuickNotes(null);

      // Fire background Google Search documentation fetch in parallel without blocking core notes
      const sourcesPromise = fetch('/api/quick-notes/sources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ problemId, language: targetLanguage }),
      })
        .then((r) => (r.ok ? r.json() : { sources: [] }))
        .then((d) => (Array.isArray(d.sources) ? (d.sources as GroundingSource[]) : []))
        .catch(() => [] as GroundingSource[]);

      try {
        const res = await fetch('/api/quick-notes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ problemId, language: targetLanguage }),
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Failed to generate Quick Notes.');
        }
        if (notesRequestSeqRef.current !== reqId) return;
        const coreNotes = data.notes as QuickNotesData;
        setQuickNotes(coreNotes);
        setLoadingNotes(false);

        if (coreNotes.sources && coreNotes.sources.length > 0) {
          setLoadingSources(false);
        } else {
          const sources = await sourcesPromise;
          if (notesRequestSeqRef.current !== reqId) return;
          if (sources.length > 0) {
            setQuickNotes((prev) => (prev ? { ...prev, sources } : prev));
          }
          setLoadingSources(false);
        }
      } catch (err) {
        if (notesRequestSeqRef.current !== reqId) return;
        setNotesError(err instanceof Error ? err.message : 'Unable to fetch Quick Notes.');
        setLoadingNotes(false);
        setLoadingSources(false);
      }
    },
    [],
  );

  const loadMentorInitial = useCallback(
    async (
      targetProblem: ProblemStatement,
      targetLang: ProgrammingLanguage,
      submittedCode: string,
      matchVerdict: MatchVerdict | null,
    ) => {
      setLoadingMentorInitial(true);
      setMentorInitialError(null);
      setMentorInitial(null);
      setMentorMessages([]);
      setMentorChatError(null);

      const selfEval = matchVerdict?.participants.find((p) => p.isSelf)?.evaluation ?? null;

      try {
        const res = await fetch('/api/mentor/init', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            problemId: targetProblem.id,
            language: targetLang,
            userCode: submittedCode,
            evaluation: selfEval,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Failed to load AI Mentor guidance.');
        }
        setMentorInitial(data.guidance as MentorInitialFeedback);
      } catch (err) {
        setMentorInitialError(err instanceof Error ? err.message : 'Unable to reach AI Mentor.');
      } finally {
        setLoadingMentorInitial(false);
      }
    },
    [],
  );

  // Refs so WebSocket handlers always see latest state cleanly
  const latestStateRef = useRef({
    problem,
    language,
    code,
    authUser,
    playerProfile,
    playerHandle,
    elapsedMs,
  });
  useEffect(() => {
    latestStateRef.current = {
      problem,
      language,
      code,
      authUser,
      playerProfile,
      playerHandle,
      elapsedMs,
    };
  }, [problem, language, code, authUser, playerProfile, playerHandle, elapsedMs]);

  // Persistent real WebSocket connection to /ws on Port 3000 with auto-reconnect
  useEffect(() => {
    let closedByUnmount = false;
    let reconnectTimer: number | null = null;

    const connect = () => {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const ws = new WebSocket(`${protocol}//${window.location.host}/ws`);
      wsRef.current = ws;

      ws.onopen = () => {
        setWsConnected(true);
        setLobbyError(null);
      };

      ws.onmessage = (event) => {
        let msg: Record<string, unknown>;
        try {
          msg = JSON.parse(event.data);
        } catch {
          return;
        }

        const type = String(msg.type || '');

        if (type === 'ws:connected') {
          setPlayerId(String(msg.playerId || ''));
        } else if (type === 'queue:status') {
          setActiveSection('arena');
          setPhase('matchmaking');
          setQueueElapsedSeconds(0);
          setLobbyError(null);
        } else if (type === 'queue:cancelled') {
          setPhase('lobby');
          setActiveSection('lobby');
        } else if (type === 'match:found') {
          const matchedProblem = msg.problem as ProblemStatement;
          const matchedLanguage =
            (msg.language as ProgrammingLanguage) || latestStateRef.current.language || 'c';
          const seconds = Number(msg.briefingSeconds) || 10;
          setActiveSection('arena');
          setRoomId(String(msg.roomId || ''));
          setProblem(matchedProblem);
          setLanguage(matchedLanguage);
          setPlayers((msg.players as PlayerPresence[]) || []);
          setBriefingSecondsLeft(seconds);
          setBriefingTotalSeconds(seconds);
          // CRITICAL: Code editor ALWAYS starts completely empty
          setCode('');
          setValidationError(null);
          setJudgeError(null);
          setJudgingStatusMessage(null);
          setWaitingOnOpponents([]);
          setVerdict(null);
          setPhase('briefing');
          void fetchQuickNotes(matchedProblem.id, matchedLanguage);
        } else if (type === 'room:presence') {
          setPlayers((msg.players as PlayerPresence[]) || []);
        } else if (type === 'room:judging_status') {
          setPhase('judging');
          setJudgingStatusMessage(String(msg.message || 'Evaluating Big-O complexity...'));
        } else if (type === 'room:waiting_opponents') {
          setPhase('judging');
          setWaitingOnOpponents((msg.pendingHandles as string[]) || []);
        } else if (type === 'room:judge_error') {
          setPhase('arena');
          setJudgeError(String(msg.error || 'Big-O Judge failed to evaluate your code.'));
          setJudgingStatusMessage(null);
          setWaitingOnOpponents([]);
        } else if (type === 'match:verdict') {
          const nextVerdict = msg.verdict as MatchVerdict;
          setVerdict(nextVerdict);
          setJudgingStatusMessage(null);
          setWaitingOnOpponents([]);

          const snap = latestStateRef.current;
          const selfRes = nextVerdict.participants.find((p) => p.isSelf);

          if (snap.authUser && snap.playerProfile && snap.problem) {
            void persistMatchOutcomeToFirestore(snap.authUser.uid, snap.playerProfile, {
              handle: snap.playerHandle,
              tier: snap.problem.tier,
              problemTitle: snap.problem.title,
              language: snap.language,
              timeComplexity: selfRes?.timeComplexity ?? '—',
              spaceComplexity: selfRes?.spaceComplexity ?? '—',
              outcome: nextVerdict.didWin ? 'victory' : 'defeat',
              coinsDelta: nextVerdict.didWin ? nextVerdict.coinsAwarded : 0,
              elapsedMs: selfRes?.elapsedMs ?? snap.elapsedMs,
            }).catch((err) => {
              console.error('Failed to persist match verdict to Firestore:', err);
            });
          } else if (nextVerdict.didWin) {
            setCoins((prev) => prev + nextVerdict.coinsAwarded);
          }

          if (nextVerdict.didWin) {
            setPhase('victory');
          } else {
            setPhase('mentor');
            if (snap.problem) {
              void loadMentorInitial(snap.problem, snap.language, snap.code, nextVerdict);
            }
          }
        } else if (type === 'ws:error') {
          const errText = String(msg.error || 'WebSocket error occurred.');
          setLobbyError(errText);
          setValidationError(errText);
        }
      };

      ws.onclose = () => {
        setWsConnected(false);
        if (!closedByUnmount) {
          reconnectTimer = window.setTimeout(connect, 1800);
        }
      };
    };

    connect();

    return () => {
      closedByUnmount = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      wsRef.current?.close();
    };
  }, [fetchQuickNotes, loadMentorInitial]);

  // Optional ?room=TL-XXXX invite link & ?autostart=1 support
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const inviteRoom = params.get('room')?.trim().toUpperCase();
    if (inviteRoom && /^[A-Z0-9-]{3,12}$/.test(inviteRoom)) {
      setRoomCodeInput(inviteRoom);
      setInviteRoomCode(inviteRoom);
      setActiveSection('lobby');
    }
    if (params.get('autostart') === '1') {
      const langParam = (params.get('lang') as ProgrammingLanguage) || 'c';
      const validLang: ProgrammingLanguage = ['c', 'cpp', 'java', 'python'].includes(langParam)
        ? langParam
        : 'c';
      const partParam = Number(params.get('part')) || 1;
      const validPart = (partParam >= 1 && partParam <= 5 ? partParam : 1) as PartNumber;
      const lvlParam = Number(params.get('level')) || 1;
      const validLvl = lvlParam >= 1 && lvlParam <= 10 ? lvlParam : 1;
      const p = getProgressionProblem(validLang, validPart, validLvl);
      setLanguage(validLang);
      setSelectedPart(validPart);
      setSelectedLevel(validLvl);
      setProblem(p);
      setRoomId('TL-LIVE');
      setPlayers([
        {
          id: 'local-player',
          handle: playerHandle,
          connected: true,
          isTyping: false,
          submitted: false,
          isSelf: true,
        },
      ]);
      setCode('');
      setArenaStartTs(Date.now());
      setActiveSection('arena');
      setPhase('arena');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Matchmaking elapsed counter
  useEffect(() => {
    if (phase !== 'matchmaking') return;
    const id = window.setInterval(() => {
      setQueueElapsedSeconds((s) => s + 1);
    }, 1000);
    return () => clearInterval(id);
  }, [phase]);

  // 10-second Pre-Match Briefing countdown -> transitions automatically to Live Battle Arena
  const enterArenaNow = useCallback(() => {
    setArenaStartTs(Date.now());
    setElapsedMs(0);
    setPhase('arena');
    sendWs({ type: 'room:ready' });
  }, [sendWs]);

  useEffect(() => {
    if (phase !== 'briefing') return;
    if (briefingSecondsLeft <= 0) {
      enterArenaNow();
      return;
    }
    const timer = window.setTimeout(() => {
      setBriefingSecondsLeft((s) => s - 1);
    }, 1000);
    return () => clearTimeout(timer);
  }, [phase, briefingSecondsLeft, enterArenaNow]);

  // Live Battle Arena elapsed timer
  useEffect(() => {
    if (phase !== 'arena' || !arenaStartTs) return;
    const id = window.setInterval(() => {
      setElapsedMs(Date.now() - arenaStartTs);
    }, 500);
    return () => clearInterval(id);
  }, [phase, arenaStartTs]);

  // Fetch guest Standings & PlayerProfile when navigating to Standings
  useEffect(() => {
    if (activeSection === 'standings' && !authUser) {
      setLoadingStandings(true);
      fetch('/api/standings')
        .then((r) => r.json())
        .then((d) => setStandings(Array.isArray(d.records) ? d.records : []))
        .catch(() => setStandings([]))
        .finally(() => setLoadingStandings(false));

      setLoadingProfile(true);
      fetch(`/api/profiles/${encodeURIComponent(playerHandle || 'Dev-Alex')}`)
        .then((r) => r.json())
        .then((d) => {
          if (d.profile) {
            setPlayerProfile(d.profile as PlayerProfileData);
          }
        })
        .catch(() => {})
        .finally(() => setLoadingProfile(false));
    }
  }, [activeSection, authUser, playerHandle]);

  const handleUpdateProfile = async (payload: {
    username: string;
    avatarUrl: string;
    preferredLanguage: ProgrammingLanguage;
  }): Promise<string | null> => {
    const clientErr = validateProfileUpdate({
      username: payload.username,
      avatarUrl: payload.avatarUrl,
    });
    if (clientErr) {
      return clientErr;
    }

    if (authUser) {
      try {
        await updateFirestoreProfileIdentity(authUser.uid, payload);
        setPlayerHandle(payload.username.trim());
        setLanguage(payload.preferredLanguage);
        return null;
      } catch (err) {
        return err instanceof Error ? err.message : 'Could not update Firestore profile.';
      }
    }

    try {
      const res = await fetch(`/api/profiles/${encodeURIComponent(playerHandle || 'Dev-Alex')}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        return String(data.error || 'Could not update profile.');
      }
      if (data.profile) {
        const updated = data.profile as PlayerProfileData;
        setPlayerProfile(updated);
        setPlayerHandle(updated.username);
        setLanguage(updated.preferredLanguage);
      }
      return null;
    } catch {
      return 'Network error while saving profile.';
    }
  };

  const handleSelectPart = (part: PartNumber) => {
    setSelectedPart(part);
    setSelectedLevel(1);
  };

  const handleFindMatch = () => {
    setLobbyError(null);
    const cleanedHandle = playerHandle.trim() || `Dev-${playerId.slice(0, 4) || '01'}`;
    setPlayerHandle(cleanedHandle);
    const ok = sendWs({
      type: 'queue:join',
      tier: selectedTier,
      language,
      partNumber: selectedPart,
      levelNumber: selectedLevel,
      problemId: selectedProblem.id,
      handle: cleanedHandle,
      roomCode: roomCodeInput.trim().toUpperCase() || undefined,
    });
    if (!ok) {
      setLobbyError('WebSocket connection is still establishing. Please retry in a moment.');
    }
  };

  const handleCancelMatchmaking = () => {
    sendWs({ type: 'queue:cancel' });
    setPhase('lobby');
    setActiveSection('lobby');
  };

  const handleCodeChange = (nextCode: string) => {
    setCode(nextCode);
    setValidationError(null);
    setJudgeError(null);

    // Broadcast ONLY boolean typing flag over WebSocket — NEVER code contents
    if (!isTypingSentRef.current) {
      isTypingSentRef.current = true;
      sendWs({ type: 'room:typing', isTyping: true });
    }
    if (typingTimeoutRef.current) {
      window.clearTimeout(typingTimeoutRef.current);
    }
    typingTimeoutRef.current = window.setTimeout(() => {
      isTypingSentRef.current = false;
      sendWs({ type: 'room:typing', isTyping: false });
    }, 1400);
  };

  const handleSubmitCode = () => {
    setValidationError(null);
    setJudgeError(null);

    if (!code.trim()) {
      setValidationError(
        'Your code editor is empty. Write your solution before submitting for Big-O evaluation.',
      );
      return;
    }

    if (typingTimeoutRef.current) {
      window.clearTimeout(typingTimeoutRef.current);
    }
    isTypingSentRef.current = false;

    const currentElapsed = arenaStartTs ? Date.now() - arenaStartTs : elapsedMs;
    setPhase('judging');
    setJudgingStatusMessage('Sending submission over WebSocket to Gemini Big-O Judge...');

    const sent = sendWs({
      type: 'room:submit',
      code,
      language,
      elapsedMs: currentElapsed,
    });

    if (!sent) {
      setPhase('arena');
      setJudgeError('Lost WebSocket connection to judge server. Reconnecting...');
    }
  };

  const handleOpenMentorStuck = () => {
    if (!problem) return;
    const currentElapsed = arenaStartTs ? Date.now() - arenaStartTs : elapsedMs;
    sendWs({ type: 'room:forfeit', language, elapsedMs: currentElapsed });

    if (authUser && playerProfile) {
      void persistMatchOutcomeToFirestore(authUser.uid, playerProfile, {
        handle: playerHandle,
        tier: problem.tier,
        problemTitle: problem.title,
        language,
        timeComplexity: '—',
        spaceComplexity: '—',
        outcome: 'mentor',
        coinsDelta: 0,
        elapsedMs: currentElapsed,
      }).catch((err) => {
        console.error('Failed to record mentor review in Firestore:', err);
      });
    }

    setPhase('mentor');
    void loadMentorInitial(problem, language, code, verdict);
  };

  const handleSendMentorQuestion = async (question: string, useSearchGrounding: boolean) => {
    if (!problem || !question.trim()) return;
    const userMsg: MentorChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: question.trim(),
      timestamp: new Date().toISOString(),
    };
    const nextHistory = [...mentorMessages, userMsg];
    setMentorMessages(nextHistory);
    setSendingMentorMsg(true);
    setMentorChatError(null);

    const selfEval = verdict?.participants.find((p) => p.isSelf)?.evaluation ?? null;

    try {
      const res = await fetch('/api/mentor/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          problemId: problem.id,
          language,
          userCode: code,
          evaluation: selfEval,
          history: nextHistory,
          userMessage: question.trim(),
          useSearchGrounding,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'AI Mentor could not reply right now.');
      }
      const replyMsg: MentorChatMessage = {
        id: `m-${Date.now()}`,
        role: 'mentor',
        content: String(data.reply || ''),
        conceptNudge: data.conceptNudge ? String(data.conceptNudge) : undefined,
        pitfallAlert: data.pitfallAlert ? String(data.pitfallAlert) : undefined,
        sources: Array.isArray(data.sources) ? (data.sources as GroundingSource[]) : undefined,
        timestamp: new Date().toISOString(),
      };
      setMentorMessages((prev) => [...prev, replyMsg]);
    } catch (err) {
      setMentorChatError(
        err instanceof Error ? err.message : 'Unable to send follow-up question.',
      );
    } finally {
      setSendingMentorMsg(false);
    }
  };

  const handleReturnToLobby = () => {
    setPhase('lobby');
    setActiveSection('lobby');
    setCode('');
    setVerdict(null);
    setValidationError(null);
    setJudgeError(null);
    setMentorMessages([]);
    setMentorInitial(null);
  };

  const inActiveMatch = phase === 'briefing' || phase === 'arena' || phase === 'judging';

  return (
    <div className="min-h-screen bg-[#121212] text-[#F4F4F5]" data-phase={phase}>
      <TopBar
        activeSection={activeSection}
        onNavigate={setActiveSection}
        playerHandle={playerHandle}
        coins={coins}
        inActiveMatch={inActiveMatch}
        isSignedIn={Boolean(authUser)}
        authBusy={authBusy}
        onSignIn={() => void handleSignIn()}
        onSignOut={() => void handleSignOut()}
      />

      {activeSection === 'standings' && (
        <StandingsView
          records={standings}
          loading={loadingStandings}
          profile={playerProfile}
          loadingProfile={loadingProfile}
          isSignedIn={Boolean(authUser)}
          authEmail={authUser?.email ?? null}
          authBusy={authBusy}
          onSignIn={() => void handleSignIn()}
          onUpdateProfile={handleUpdateProfile}
          onStartMatch={() => setActiveSection('lobby')}
        />
      )}

      {activeSection === 'lobby' && (
        <LobbyView
          selectedLanguage={language}
          onSelectLanguage={setLanguage}
          selectedPart={selectedPart}
          onSelectPart={handleSelectPart}
          selectedLevel={selectedLevel}
          onSelectLevel={setSelectedLevel}
          selectedProblem={selectedProblem}
          playerHandle={playerHandle}
          onChangeHandle={setPlayerHandle}
          roomCodeInput={roomCodeInput}
          onChangeRoomCode={(codeVal) => {
            setRoomCodeInput(codeVal);
            if (!codeVal.trim()) setInviteRoomCode(null);
          }}
          inviteRoomCode={inviteRoomCode}
          wsConnected={wsConnected}
          errorMessage={lobbyError}
          onFindMatch={handleFindMatch}
        />
      )}

      {activeSection === 'arena' && (
        <>
          {phase === 'lobby' && (
            <main className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-[1440px] items-center justify-center px-4 py-12 sm:px-6">
              <section className="w-full max-w-lg rounded-xl border border-[#2A2A32] bg-[#18181B] p-8 text-center">
                <div className="mx-auto mb-4 flex justify-center">
                  <LanguageLogo language={language} className="h-12 w-12" />
                </div>
                <p className="font-mono text-xs text-[#4ADE80]">
                  Ready to Launch · {LANGUAGE_CONFIG[language].label} · Part {selectedPart} · Level{' '}
                  {selectedLevel}
                </p>
                <h1 className="mt-2 text-2xl font-bold text-[#F4F4F5]">{selectedProblem.title}</h1>
                <p className="mt-2 text-sm leading-relaxed text-[#A1A1AA]">
                  {selectedProblem.summary}
                </p>
                <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={handleFindMatch}
                    className="inline-flex items-center gap-2 whitespace-nowrap rounded-lg bg-[#FACC15] px-5 py-2.5 text-sm font-semibold text-[#0A0A0C] transition-colors hover:bg-[#FDE047] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FACC15]"
                  >
                    <span>Find Match Now</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveSection('lobby')}
                    className="inline-flex items-center gap-2 whitespace-nowrap rounded-lg border border-[#2E2E38] bg-[#121212] px-5 py-2.5 text-sm font-medium text-[#D4D4D8] transition-colors hover:border-[#FACC15] hover:text-[#F4F4F5]"
                  >
                    <span>Change Level in Lobby</span>
                  </button>
                </div>
              </section>
            </main>
          )}

          {phase === 'matchmaking' && (
            <MatchmakingOverlay
              language={language}
              selectedPart={selectedPart}
              selectedLevel={selectedLevel}
              selectedProblem={selectedProblem}
              roomCode={roomCodeInput.trim().toUpperCase() || undefined}
              elapsedSeconds={queueElapsedSeconds}
              onCancel={handleCancelMatchmaking}
            />
          )}

          {phase === 'briefing' && problem && (
            <PreMatchBriefing
              roomId={roomId}
              problem={problem}
              language={language}
              players={players}
              secondsLeft={briefingSecondsLeft}
              totalSeconds={briefingTotalSeconds}
              quickNotes={quickNotes}
              loadingNotes={loadingNotes}
              loadingSources={loadingSources}
              notesError={notesError}
              onRetryNotes={() => void fetchQuickNotes(problem.id, language)}
              onEnterArenaNow={enterArenaNow}
            />
          )}

          {(phase === 'arena' || phase === 'judging') && problem && (
            <BattleArena
              roomId={roomId}
              problem={problem}
              quickNotes={quickNotes}
              players={players}
              code={code}
              language={language}
              elapsedMs={elapsedMs}
              isJudging={phase === 'judging'}
              judgingStatusMessage={judgingStatusMessage}
              waitingOnOpponents={waitingOnOpponents}
              validationError={validationError}
              judgeError={judgeError}
              onCodeChange={handleCodeChange}
              onLanguageChange={setLanguage}
              onSubmitCode={handleSubmitCode}
              onFinalizeNow={() => sendWs({ type: 'room:finalize_now' })}
              onOpenMentorStuck={handleOpenMentorStuck}
            />
          )}

          {phase === 'victory' && problem && verdict && (
            <VictoryScreen
              problem={problem}
              verdict={verdict}
              totalCoins={coins}
              onPlayAgain={handleReturnToLobby}
              onOpenMentorReview={() => {
                setPhase('mentor');
                void loadMentorInitial(problem, language, code, verdict);
              }}
            />
          )}

          {phase === 'mentor' && problem && (
            <MentorChatbot
              problem={problem}
              language={language}
              userCode={code}
              verdict={verdict}
              initialGuidance={mentorInitial}
              loadingInitial={loadingMentorInitial}
              initialError={mentorInitialError}
              messages={mentorMessages}
              sendingMessage={sendingMentorMsg}
              chatError={mentorChatError}
              onRetryInitial={() => void loadMentorInitial(problem, language, code, verdict)}
              onSendMessage={handleSendMentorQuestion}
              onReturnToLobby={handleReturnToLobby}
            />
          )}
        </>
      )}
    </div>
  );
}
