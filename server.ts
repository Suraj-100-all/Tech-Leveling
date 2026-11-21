import 'dotenv/config';
import express from 'express';
import http from 'http';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { WebSocketServer, WebSocket } from 'ws';
import type {
  DifficultyTier,
  DjangoFileItem,
  MatchHistoryRecord,
  MentorChatMessage,
  PartNumber,
  PlayerPresence,
  PlayerProfileData,
  ProblemStatement,
  ProgrammingLanguage,
} from './src/types/arena.ts';
import { getProblemById, pickProblemForTierAndLanguage } from './src/data/problems.ts';
import { getProgressionProblem } from './src/data/progression.ts';
import {
  MAX_ROOM_PLAYERS,
  canJoinRoom,
  evaluateMultiplayerVerdict,
  evaluateSoloAgainstBenchmark,
  type SubmissionForRanking,
} from './src/utils/matchRules.ts';
import {
  applyMatchOutcomeToProfile,
  validateProfileUpdate,
} from './src/utils/profileRules.ts';
import {
  chatWithMentor,
  extractFriendlyAiError,
  fetchQuickNotesSources,
  generateMentorInitialGuidance,
  generateQuickNotes,
  generateVoiceMentorTurn,
  judgeSubmissionBigO,
  prewarmQuickNotes,
} from './server/aiService.ts';

const PORT = Number(process.env.PORT) || 3000;
const MATCHMAKING_DELAY_MS = 3000;
const BRIEFING_DURATION_SECONDS = 10;

interface ConnectedClient {
  id: string;
  ws: WebSocket;
  isAlive: boolean;
  handle: string;
  roomId: string | null;
  tier: DifficultyTier | null;
  language: ProgrammingLanguage;
}

interface RoomPlayerState {
  id: string;
  handle: string;
  connected: boolean;
  isTyping: boolean;
  submitted: boolean;
  submission?: SubmissionForRanking;
}

interface BattleRoom {
  id: string;
  tier: DifficultyTier;
  language: ProgrammingLanguage;
  problem: ProblemStatement;
  status: 'waiting' | 'briefing' | 'active' | 'judging' | 'finished';
  createdAt: number;
  players: Map<string, RoomPlayerState>;
  judgingStarted: boolean;
}

interface QueueTicket {
  clientId: string;
  queueKey: string;
  tier: DifficultyTier;
  language: ProgrammingLanguage;
  handle: string;
  roomCode?: string;
  problemId?: string;
  enqueuedAt: number;
  timer?: NodeJS.Timeout;
}

const clients = new Map<string, ConnectedClient>();
const rooms = new Map<string, BattleRoom>();
// Dynamic queue map keyed by exact problemId (e.g. "python-p1-l2-two-number-sum") so real players
// selecting the same Language + Part + Level after deployment always pair into the exact same room
const matchmakingQueues = new Map<string, QueueTicket[]>();
const matchHistory: MatchHistoryRecord[] = [];
const playerProfiles = new Map<string, PlayerProfileData>();

function getOrCreateProfile(username: string): PlayerProfileData {
  const key = username.trim().toLowerCase() || 'dev-alex';
  const existing = playerProfiles.get(key);
  if (existing) return existing;
  const created: PlayerProfileData = {
    id: crypto.randomUUID(),
    username: username.trim() || 'Dev-Alex',
    avatarUrl: '',
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
  playerProfiles.set(key, created);
  return created;
}

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = 'TL-';
  for (let i = 0; i < 4; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

function sendJson(ws: WebSocket, payload: Record<string, unknown>) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(payload));
  }
}

function getRoomRoster(room: BattleRoom, viewerId?: string): PlayerPresence[] {
  return Array.from(room.players.values()).map((p) => ({
    id: p.id,
    handle: p.handle,
    connected: p.connected,
    isTyping: p.isTyping,
    submitted: p.submitted,
    isSelf: viewerId ? p.id === viewerId : false,
  }));
}

function broadcastRoomPresence(room: BattleRoom) {
  for (const player of room.players.values()) {
    const client = clients.get(player.id);
    if (client) {
      sendJson(client.ws, {
        type: 'room:presence',
        roomId: room.id,
        players: getRoomRoster(room, player.id),
      });
    }
  }
}

function broadcastRoomEvent(room: BattleRoom, payload: Record<string, unknown>) {
  for (const player of room.players.values()) {
    const client = clients.get(player.id);
    if (client) {
      sendJson(client.ws, payload);
    }
  }
}

function removeFromQueues(clientId: string) {
  for (const [key, queue] of matchmakingQueues.entries()) {
    const idx = queue.findIndex((t) => t.clientId === clientId);
    if (idx !== -1) {
      const [removed] = queue.splice(idx, 1);
      if (removed.timer) {
        clearTimeout(removed.timer);
      }
      if (queue.length === 0) {
        matchmakingQueues.delete(key);
      }
    }
  }
}

function createBattleRoom(
  tier: DifficultyTier,
  language: ProgrammingLanguage,
  forcedRoomId?: string,
  forcedProblem?: ProblemStatement,
): BattleRoom {
  const roomId = forcedRoomId || generateRoomCode();
  const problem = forcedProblem ?? pickProblemForTierAndLanguage(tier, language);
  const room: BattleRoom = {
    id: roomId,
    tier: problem.tier,
    language,
    problem,
    status: 'briefing',
    createdAt: Date.now(),
    players: new Map(),
    judgingStarted: false,
  };
  rooms.set(roomId, room);
  prewarmQuickNotes(problem, language);
  return room;
}

function attachClientToRoom(client: ConnectedClient, room: BattleRoom) {
  client.roomId = room.id;
  client.tier = room.tier;
  room.players.set(client.id, {
    id: client.id,
    handle: client.handle,
    connected: true,
    isTyping: false,
    submitted: false,
  });

  sendJson(client.ws, {
    type: 'match:found',
    roomId: room.id,
    tier: room.tier,
    language: room.language,
    problem: room.problem,
    briefingSeconds: BRIEFING_DURATION_SECONDS,
    playerId: client.id,
    players: getRoomRoster(room, client.id),
  });

  broadcastRoomPresence(room);
}

function attachBatchToRoom(activeClients: ConnectedClient[], room: BattleRoom) {
  // Register every matched player FIRST so every client's match:found includes the full 2-3 player roster
  for (const client of activeClients) {
    client.roomId = room.id;
    client.tier = room.tier;
    room.players.set(client.id, {
      id: client.id,
      handle: client.handle,
      connected: true,
      isTyping: false,
      submitted: false,
    });
  }

  for (const client of activeClients) {
    sendJson(client.ws, {
      type: 'match:found',
      roomId: room.id,
      tier: room.tier,
      language: room.language,
      problem: room.problem,
      briefingSeconds: BRIEFING_DURATION_SECONDS,
      playerId: client.id,
      players: getRoomRoster(room, client.id),
    });
  }

  broadcastRoomPresence(room);
}

function flushQueueForKey(queueKey: string) {
  const queue = matchmakingQueues.get(queueKey);
  if (!queue || queue.length === 0) return;

  const batch = queue.splice(0, MAX_ROOM_PLAYERS);
  if (queue.length === 0) {
    matchmakingQueues.delete(queueKey);
  }
  for (const ticket of batch) {
    if (ticket.timer) clearTimeout(ticket.timer);
  }

  const activeClients = batch
    .map((t) => clients.get(t.clientId))
    .filter((c): c is ConnectedClient => Boolean(c && c.ws.readyState === WebSocket.OPEN));

  if (activeClients.length === 0) return;

  const lead = batch[0];
  const leadLang = lead?.language || 'python';
  const leadTier = lead?.tier || 'rookie';
  const leadProblem = lead?.problemId ? getProblemById(lead.problemId) : undefined;
  const forcedRoomId = lead?.roomCode || undefined;

  if (forcedRoomId) {
    const existing = rooms.get(forcedRoomId);
    if (existing && existing.status !== 'finished') {
      const joinable = activeClients.slice(0, Math.max(0, MAX_ROOM_PLAYERS - existing.players.size));
      const overflow = activeClients.slice(joinable.length);
      if (joinable.length > 0) {
        attachBatchToRoom(joinable, existing);
      }
      for (const extra of overflow) {
        sendJson(extra.ws, {
          type: 'ws:error',
          error: `Room ${forcedRoomId} is already full (3 players max).`,
        });
      }
      return;
    }
  }

  const room = createBattleRoom(leadTier, leadLang, forcedRoomId, leadProblem);
  attachBatchToRoom(activeClients, room);
}

async function finalizeRoomJudging(room: BattleRoom) {
  if (room.judgingStarted) return;
  room.judgingStarted = true;
  room.status = 'judging';

  const submittedPlayers = Array.from(room.players.values()).filter(
    (p): p is RoomPlayerState & { submission: SubmissionForRanking } => Boolean(p.submission),
  );

  if (submittedPlayers.length === 0) {
    room.judgingStarted = false;
    room.status = 'active';
    return;
  }

  const submissions = submittedPlayers.map((p) => p.submission);
  const totalConnected = Array.from(room.players.values()).filter((p) => p.connected).length;
  const isMultiplayer = submissions.length >= 2 || totalConnected >= 2;

  for (const player of room.players.values()) {
    const client = clients.get(player.id);
    if (!client) continue;

    const verdict =
      isMultiplayer && submissions.length >= 2
        ? evaluateMultiplayerVerdict({
            roomId: room.id,
            tier: room.tier,
            submissions,
            viewerPlayerId: player.id,
          })
        : player.submission
          ? evaluateSoloAgainstBenchmark({
              roomId: room.id,
              tier: room.tier,
              submission: player.submission,
              targetTimeComplexity: room.problem.targetTimeComplexity,
              targetSpaceComplexity: room.problem.targetSpaceComplexity,
            })
          : evaluateMultiplayerVerdict({
              roomId: room.id,
              tier: room.tier,
              submissions,
              viewerPlayerId: player.id,
            });

    if (player.submission) {
      const currentProfile = getOrCreateProfile(player.handle);
      const updatedProfile = applyMatchOutcomeToProfile(currentProfile, {
        won: verdict.didWin,
        tier: room.tier,
        coinsAwarded: verdict.coinsAwarded,
      });
      playerProfiles.set(player.handle.trim().toLowerCase(), updatedProfile);

      matchHistory.unshift({
        id: crypto.randomUUID(),
        handle: player.handle,
        tier: room.tier,
        problemTitle: room.problem.title,
        language: player.submission.language,
        timeComplexity: player.submission.evaluation.timeComplexity,
        spaceComplexity: player.submission.evaluation.spaceComplexity,
        outcome: verdict.didWin ? 'victory' : 'defeat',
        coinsDelta: verdict.coinsAwarded,
        elapsedMs: player.submission.elapsedMs,
        completedAt: new Date().toISOString(),
      });
      if (matchHistory.length > 50) {
        matchHistory.pop();
      }
    }

    sendJson(client.ws, {
      type: 'match:verdict',
      verdict,
    });
  }

  room.status = 'finished';
}

function loadDjangoBlueprintFiles(): DjangoFileItem[] {
  const root = process.cwd();
  const specs: Array<{ name: string; relPath: string; role: string }> = [
    {
      name: 'models.py',
      relPath: 'backend/battle/models.py',
      role: 'Django ORM schemas for Player, PlayerProfile (Bronze/Silver/Gold/Platinum/Grandmaster), Match, and Big-O Submission records.',
    },
    {
      name: 'serializers.py',
      relPath: 'backend/battle/serializers.py',
      role: 'DRF serializers for PlayerProfile and linked Player validation & atomic profile updates.',
    },
    {
      name: 'views.py',
      relPath: 'backend/battle/views.py',
      role: 'DRF RetrieveUpdateAPIView and ListAPIView endpoints with owner-only write permissions.',
    },
    {
      name: 'urls.py',
      relPath: 'backend/battle/urls.py',
      role: 'Django REST URL routing for /api/profiles/, /api/profiles/me/, and /api/profiles/<username>/.',
    },
    {
      name: 'consumers.py',
      relPath: 'backend/battle/consumers.py',
      role: 'Django Channels AsyncWebsocketConsumer for 2–3 player rooms, boolean typing indicators, and Big-O adjudication.',
    },
    {
      name: 'ai_service.py',
      relPath: 'backend/battle/ai_service.py',
      role: 'Google GenAI prompts for Quick Notes, Big-O Judge, and Socratic AI Mentor.',
    },
    {
      name: 'asgi.py',
      relPath: 'backend/tech_leveling/asgi.py',
      role: 'Cloud Run ASGI/Daphne protocol router wiring HTTP and Channels WebSockets.',
    },
    {
      name: 'routing.py',
      relPath: 'backend/battle/routing.py',
      role: 'Django Channels URL patterns for matchmaking and battle rooms.',
    },
    {
      name: 'Dockerfile',
      relPath: 'backend/Dockerfile',
      role: 'Production Google Cloud Run container running Daphne ASGI server on $PORT.',
    },
  ];

  return specs.map((spec) => {
    const absPath = path.resolve(root, spec.relPath);
    let content = '';
    try {
      content = fs.readFileSync(absPath, 'utf-8');
    } catch {
      content = `# File ${spec.relPath} not found`;
    }
    return {
      name: spec.name,
      path: spec.relPath,
      role: spec.role,
      content,
    };
  });
}

async function startServer() {
  const app = express();
  app.set('trust proxy', 1);
  app.use(express.json({ limit: '8mb' }));

  // Cloud Run / Production health endpoint
  app.get('/api/health', (_req, res) => {
    res.json({
      ok: true,
      connectedPlayers: clients.size,
      activeRooms: Array.from(rooms.values()).filter((r) => r.status !== 'finished').length,
    });
  });

  // REST API: Generate Language-Specific Pre-Match Quick Notes + Google Search Grounding
  app.post('/api/quick-notes', async (req, res) => {
    try {
      const { problemId, language } = req.body as {
        problemId?: string;
        language?: ProgrammingLanguage;
      };
      const problem = problemId ? getProblemById(problemId) : undefined;
      if (!problem) {
        return res.status(400).json({ error: 'Invalid or missing problemId.' });
      }
      const targetLang: ProgrammingLanguage =
        language && ['c', 'cpp', 'java', 'python'].includes(language)
          ? language
          : problem.languageFocus;
      const notes = await generateQuickNotes(problem, targetLang);
      return res.json({ notes });
    } catch (error) {
      return res
        .status(502)
        .json({ error: extractFriendlyAiError(error, 'Failed to generate Quick Notes.') });
    }
  });

  // REST API: Non-blocking Google Search documentation citations for Pre-Match Briefing
  app.post('/api/quick-notes/sources', async (req, res) => {
    try {
      const { problemId, language } = req.body as {
        problemId?: string;
        language?: ProgrammingLanguage;
      };
      const problem = problemId ? getProblemById(problemId) : undefined;
      if (!problem) {
        return res.status(400).json({ error: 'Invalid or missing problemId.' });
      }
      const targetLang: ProgrammingLanguage =
        language && ['c', 'cpp', 'java', 'python'].includes(language)
          ? language
          : problem.languageFocus;
      const sources = await fetchQuickNotesSources(problem, targetLang);
      return res.json({ sources });
    } catch {
      return res.json({ sources: [] });
    }
  });

  // REST API: Initial AI Mentor Concept Nudge + Language Pitfall Alert
  app.post('/api/mentor/init', async (req, res) => {
    try {
      const { problemId, language, userCode, evaluation } = req.body as {
        problemId?: string;
        language?: ProgrammingLanguage;
        userCode?: string;
        evaluation?: SubmissionForRanking['evaluation'] | null;
      };
      const problem = problemId ? getProblemById(problemId) : undefined;
      if (!problem || !language) {
        return res.status(400).json({ error: 'Missing problemId or language.' });
      }
      const guidance = await generateMentorInitialGuidance({
        problem,
        language,
        userCode: userCode ?? '',
        evaluation: evaluation ?? null,
      });
      return res.json({ guidance });
    } catch (error) {
      return res
        .status(502)
        .json({ error: extractFriendlyAiError(error, 'Failed to load AI Mentor guidance.') });
    }
  });

  // REST API: Interactive AI Mentor Multi-Turn Chat (with optional Google Search Grounding)
  app.post('/api/mentor/chat', async (req, res) => {
    try {
      const {
        problemId,
        language,
        userCode,
        evaluation,
        history,
        userMessage,
        useSearchGrounding,
      } = req.body as {
        problemId?: string;
        language?: ProgrammingLanguage;
        userCode?: string;
        evaluation?: SubmissionForRanking['evaluation'] | null;
        history?: MentorChatMessage[];
        userMessage?: string;
        useSearchGrounding?: boolean;
      };

      const problem = problemId ? getProblemById(problemId) : undefined;
      if (!problem || !language || !userMessage?.trim()) {
        return res.status(400).json({ error: 'Question, problemId, and language are required.' });
      }

      const reply = await chatWithMentor({
        problem,
        language,
        userCode: userCode ?? '',
        evaluation: evaluation ?? null,
        history: Array.isArray(history) ? history : [],
        userMessage: userMessage.trim(),
        useSearchGrounding: Boolean(useSearchGrounding),
      });

      return res.json(reply);
    } catch (error) {
      return res
        .status(502)
        .json({ error: extractFriendlyAiError(error, 'AI Mentor could not respond.') });
    }
  });

  // REST API: Voice AI Mentor (gemini-3.5-transcribe + gemini-3.1-flash-lite + gemini-3.8-flash-lite-tts)
  app.post('/api/mentor/voice', async (req, res) => {
    try {
      const {
        problemId,
        language,
        userCode,
        evaluation,
        audioBase64,
        audioMimeType,
        textPrompt,
      } = req.body as {
        problemId?: string;
        language?: ProgrammingLanguage;
        userCode?: string;
        evaluation?: SubmissionForRanking['evaluation'] | null;
        audioBase64?: string;
        audioMimeType?: string;
        textPrompt?: string;
      };

      const problem = problemId ? getProblemById(problemId) : undefined;
      if (!problem || !language) {
        return res.status(400).json({ error: 'problemId and language are required.' });
      }

      const result = await generateVoiceMentorTurn({
        problem,
        language,
        userCode: userCode ?? '',
        evaluation: evaluation ?? null,
        audioBase64,
        audioMimeType,
        textPrompt,
      });

      return res.json(result);
    } catch (error) {
      return res
        .status(502)
        .json({ error: extractFriendlyAiError(error, 'Voice Mentor audio turn failed.') });
    }
  });

  // REST API: Session match standings
  app.get('/api/standings', (_req, res) => {
    res.json({ records: matchHistory });
  });

  // REST API: PlayerProfile retrieve & update (mirrors Django DRF /api/profiles/<username>/)
  app.get('/api/profiles', (_req, res) => {
    const profiles = Array.from(playerProfiles.values()).sort(
      (a, b) => b.winCount - a.winCount || b.eloRating - a.eloRating,
    );
    res.json({ profiles });
  });

  app.get('/api/profiles/:username', (req, res) => {
    const profile = getOrCreateProfile(req.params.username);
    res.json({ profile });
  });

  app.patch('/api/profiles/:username', (req, res) => {
    const currentKey = req.params.username.trim().toLowerCase();
    const current = getOrCreateProfile(req.params.username);
    const { username, avatarUrl, preferredLanguage } = req.body as {
      username?: string;
      avatarUrl?: string;
      preferredLanguage?: ProgrammingLanguage;
    };

    const validationError = validateProfileUpdate({ username, avatarUrl });
    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    const nextUsername = username ? username.trim() : current.username;
    const nextKey = nextUsername.toLowerCase();
    if (nextKey !== currentKey && playerProfiles.has(nextKey)) {
      return res.status(400).json({ error: 'This username is already taken.' });
    }

    const updated: PlayerProfileData = {
      ...current,
      username: nextUsername,
      avatarUrl: typeof avatarUrl === 'string' ? avatarUrl.trim() : current.avatarUrl,
      preferredLanguage:
        preferredLanguage && ['python', 'java', 'cpp', 'c'].includes(preferredLanguage)
          ? preferredLanguage
          : current.preferredLanguage,
      updatedAt: new Date().toISOString(),
    };

    if (nextKey !== currentKey) {
      playerProfiles.delete(currentKey);
    }
    playerProfiles.set(nextKey, updated);

    return res.json({ profile: updated });
  });

  // REST API: Production Django + Channels Cloud Run deliverables
  app.get('/api/django-blueprint', (_req, res) => {
    res.json({ files: loadDjangoBlueprintFiles() });
  });

  const server = http.createServer(app);

  // Battle Room WebSocket server routed cleanly on Port 3000 via HTTP upgrade
  const battleWss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (request, socket, head) => {
    const pathname = new URL(request.url || '/', `http://${request.headers.host || 'localhost'}`)
      .pathname;
    if (pathname === '/ws') {
      battleWss.handleUpgrade(request, socket, head, (ws) => {
        battleWss.emit('connection', ws, request);
      });
    } else {
      socket.destroy();
    }
  });

  // Cloud Run WebSocket keepalive (25s ping/pong) + stale room cleanup every 5 minutes
  const wsHeartbeat = setInterval(() => {
    for (const [id, client] of clients.entries()) {
      if (!client.isAlive) {
        client.ws.terminate();
        clients.delete(id);
        continue;
      }
      client.isAlive = false;
      try {
        client.ws.ping();
      } catch {
        client.ws.terminate();
      }
    }
  }, 25000);

  const roomCleanupTimer = setInterval(() => {
    const cutoff = Date.now() - 45 * 60 * 1000;
    for (const [id, room] of rooms.entries()) {
      const anyConnected = Array.from(room.players.values()).some((p) => p.connected);
      if ((room.status === 'finished' || !anyConnected) && room.createdAt < cutoff) {
        rooms.delete(id);
      }
    }
  }, 5 * 60 * 1000);

  server.on('close', () => {
    clearInterval(wsHeartbeat);
    clearInterval(roomCleanupTimer);
  });

  // --- 1. Real-Time Multiplayer Battle Room WebSocket (/ws) ---
  battleWss.on('connection', (ws) => {
    const clientId = crypto.randomUUID();
    const client: ConnectedClient = {
      id: clientId,
      ws,
      isAlive: true,
      handle: `Dev-${clientId.slice(0, 4).toUpperCase()}`,
      roomId: null,
      tier: null,
      language: 'python',
    };
    clients.set(clientId, client);

    ws.on('pong', () => {
      client.isAlive = true;
    });

    sendJson(ws, {
      type: 'ws:connected',
      playerId: clientId,
      handle: client.handle,
    });

    ws.on('message', async (raw) => {
      let msg: Record<string, unknown>;
      try {
        msg = JSON.parse(String(raw));
      } catch {
        return;
      }

      const type = String(msg.type || '');

      if (type === 'queue:join') {
        const tier = (msg.tier as DifficultyTier) || 'rookie';
        if (!['rookie', 'challenger', 'pro'].includes(tier)) {
          sendJson(ws, { type: 'ws:error', error: 'Invalid difficulty tier.' });
          return;
        }

        const reqLang = msg.language as ProgrammingLanguage;
        const language: ProgrammingLanguage = ['c', 'cpp', 'java', 'python'].includes(reqLang)
          ? reqLang
          : 'python';
        client.language = language;

        const customHandle = typeof msg.handle === 'string' ? msg.handle.trim().slice(0, 24) : '';
        if (customHandle) {
          client.handle = customHandle;
        }

        removeFromQueues(client.id);

        if (client.roomId) {
          const oldRoom = rooms.get(client.roomId);
          if (oldRoom) {
            const p = oldRoom.players.get(client.id);
            if (p) {
              p.connected = false;
              p.isTyping = false;
            }
            broadcastRoomPresence(oldRoom);
          }
          client.roomId = null;
        }

        const requestedRoomCode =
          typeof msg.roomCode === 'string' ? msg.roomCode.trim().toUpperCase() : '';

        if (requestedRoomCode) {
          const existingRoom = rooms.get(requestedRoomCode);
          if (existingRoom && existingRoom.status !== 'finished') {
            if (!canJoinRoom(existingRoom.players.size)) {
              sendJson(ws, {
                type: 'ws:error',
                error: `Room ${requestedRoomCode} is already at maximum capacity (3 players).`,
              });
              return;
            }
            sendJson(ws, {
              type: 'queue:status',
              tier: existingRoom.tier,
              language: existingRoom.language,
              roomCode: requestedRoomCode,
              waitMs: MATCHMAKING_DELAY_MS,
            });
            setTimeout(() => {
              if (ws.readyState === WebSocket.OPEN) {
                attachClientToRoom(client, existingRoom);
              }
            }, MATCHMAKING_DELAY_MS);
            return;
          }
        }

        // Resolve exact Part x Level problem if requested
        const reqProblemId = typeof msg.problemId === 'string' ? msg.problemId.trim() : '';
        const reqPart = Number(msg.partNumber ?? msg.part);
        const reqLevel = Number(msg.levelNumber ?? msg.level);
        const selectedProblem =
          (reqProblemId ? getProblemById(reqProblemId) : undefined) ??
          (reqPart >= 1 && reqPart <= 5 && reqLevel >= 1 && reqLevel <= 10
            ? getProgressionProblem(language, reqPart as PartNumber, reqLevel)
            : pickProblemForTierAndLanguage(tier, language));

        const effectiveTier = selectedProblem.tier;

        // Overlap Quick Notes pre-warming with the 3-second matchmaking handshake
        prewarmQuickNotes(selectedProblem, language);

        sendJson(ws, {
          type: 'queue:status',
          tier: effectiveTier,
          language,
          problemId: selectedProblem.id,
          partNumber: selectedProblem.partNumber,
          levelNumber: selectedProblem.levelNumber,
          roomCode: requestedRoomCode || undefined,
          waitMs: MATCHMAKING_DELAY_MS,
        });

        const queueKey = requestedRoomCode
          ? `room:${requestedRoomCode}`
          : `${language}:${selectedProblem.id}`;

        const ticket: QueueTicket = {
          clientId: client.id,
          queueKey,
          tier: effectiveTier,
          language,
          handle: client.handle,
          roomCode: requestedRoomCode || undefined,
          problemId: selectedProblem.id,
          enqueuedAt: Date.now(),
        };

        const bucket = matchmakingQueues.get(queueKey) ?? [];
        matchmakingQueues.set(queueKey, bucket);
        bucket.push(ticket);

        if (bucket.length >= MAX_ROOM_PLAYERS) {
          flushQueueForKey(queueKey);
        } else if (bucket.length === 2) {
          // 2 real players matched on the exact same Room Code or Language + Part + Level:
          // brief 1200ms window to allow an optional 3rd player before launching live battle
          for (const t of bucket) {
            if (t.timer) clearTimeout(t.timer);
          }
          ticket.timer = setTimeout(() => {
            flushQueueForKey(queueKey);
          }, 1200);
        } else {
          ticket.timer = setTimeout(() => {
            flushQueueForKey(queueKey);
          }, MATCHMAKING_DELAY_MS);
        }
        return;
      }

      if (type === 'queue:cancel') {
        removeFromQueues(client.id);
        sendJson(ws, { type: 'queue:cancelled' });
        return;
      }

      if (type === 'room:ready') {
        if (!client.roomId) return;
        const room = rooms.get(client.roomId);
        if (!room) return;
        if (room.status === 'briefing') {
          room.status = 'active';
        }
        broadcastRoomPresence(room);
        return;
      }

      if (type === 'room:typing') {
        if (!client.roomId) return;
        const room = rooms.get(client.roomId);
        if (!room) return;
        const player = room.players.get(client.id);
        if (!player) return;

        // STRICT PRIVACY: Boolean typing flag only — NEVER opponent code
        player.isTyping = Boolean(msg.isTyping);
        broadcastRoomPresence(room);
        return;
      }

      if (type === 'room:submit') {
        if (!client.roomId) {
          sendJson(ws, {
            type: 'ws:error',
            error: 'You are not connected to an active battle room.',
          });
          return;
        }
        const room = rooms.get(client.roomId);
        if (!room) {
          sendJson(ws, { type: 'ws:error', error: 'Battle room no longer exists.' });
          return;
        }
        const player = room.players.get(client.id);
        if (!player) return;

        const code = typeof msg.code === 'string' ? msg.code : '';
        const language = (msg.language as ProgrammingLanguage) || room.language || 'python';
        const elapsedMs = typeof msg.elapsedMs === 'number' && msg.elapsedMs >= 0 ? msg.elapsedMs : 0;

        if (!code.trim()) {
          sendJson(ws, {
            type: 'ws:error',
            error: 'Cannot submit empty code. Write your algorithmic solution first.',
          });
          return;
        }

        player.isTyping = false;
        player.submitted = true;
        broadcastRoomPresence(room);

        broadcastRoomEvent(room, {
          type: 'room:judging_status',
          roomId: room.id,
          message: `Analyzing ${player.handle}'s ${language.toUpperCase()} submission for correctness, O(Time), and O(Space)...`,
          submittedCount: Array.from(room.players.values()).filter((p) => p.submitted).length,
          connectedCount: Array.from(room.players.values()).filter((p) => p.connected).length,
        });

        try {
          const evaluation = await judgeSubmissionBigO({
            problem: room.problem,
            language,
            code,
          });

          player.submission = {
            playerId: player.id,
            handle: player.handle,
            language,
            elapsedMs,
            evaluation,
          };

          const connectedPlayers = Array.from(room.players.values()).filter((p) => p.connected);
          const allSubmitted = connectedPlayers.every((p) => Boolean(p.submission));

          if (allSubmitted) {
            await finalizeRoomJudging(room);
          } else {
            const pendingHandles = connectedPlayers
              .filter((p) => !p.submission)
              .map((p) => p.handle);
            sendJson(client.ws, {
              type: 'room:waiting_opponents',
              roomId: room.id,
              pendingHandles,
              myEvaluation: evaluation,
            });
          }
        } catch (error) {
          player.submitted = false;
          broadcastRoomPresence(room);
          sendJson(client.ws, {
            type: 'room:judge_error',
            error: extractFriendlyAiError(error, 'Big-O Judge failed to evaluate submission.'),
          });
        }
        return;
      }

      if (type === 'room:finalize_now') {
        if (!client.roomId) return;
        const room = rooms.get(client.roomId);
        if (!room) return;
        await finalizeRoomJudging(room);
        return;
      }

      if (type === 'room:forfeit') {
        if (!client.roomId) return;
        const room = rooms.get(client.roomId);
        if (!room) return;
        const player = room.players.get(client.id);
        if (player) {
          player.isTyping = false;
          matchHistory.unshift({
            id: crypto.randomUUID(),
            handle: player.handle,
            tier: room.tier,
            problemTitle: room.problem.title,
            language: (msg.language as ProgrammingLanguage) || room.language || 'python',
            timeComplexity: '—',
            spaceComplexity: '—',
            outcome: 'mentor',
            coinsDelta: 0,
            elapsedMs: typeof msg.elapsedMs === 'number' ? msg.elapsedMs : 0,
            completedAt: new Date().toISOString(),
          });
        }
        broadcastRoomPresence(room);
      }
    });

    ws.on('close', () => {
      removeFromQueues(clientId);
      if (client.roomId) {
        const room = rooms.get(client.roomId);
        if (room) {
          const p = room.players.get(clientId);
          if (p) {
            p.connected = false;
            p.isTyping = false;
          }
          broadcastRoomPresence(room);
        }
      }
      clients.delete(clientId);
    });
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Tech-Leveling full-stack server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start Tech-Leveling server:', err);
  process.exit(1);
});
