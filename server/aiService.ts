import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';
import type {
  BigOEvaluation,
  GroundingSource,
  MentorChatMessage,
  MentorInitialFeedback,
  ProblemStatement,
  ProgrammingLanguage,
  QuickNotesData,
} from '../src/types/arena.ts';

// Low-latency routing:
// - gemini-3.1-flash-lite for fast Quick Notes, Big-O Judging (~1.5-2s), and Mentor coaching
// - gemini-3.5-transcribe + gemini-3.8-flash-lite-tts for Voice Mentor audio pipeline
// - gemini-4-hydrogen (ThinkingLevel.LOW) exclusively for background/on-demand Google Search grounding
const FAST_MODEL = 'gemini-3.1-flash-lite';
const SEARCH_MODEL = 'gemini-4-hydrogen';
const TRANSCRIBE_MODEL = 'gemini-3.5-transcribe';
const TTS_MODEL = 'gemini-3.8-flash-lite-tts';

const CACHE_TTL_MS = 30 * 60 * 1000;
const MAX_CACHE_ENTRIES = 64;

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

const quickNotesCache = new Map<string, CacheEntry<QuickNotesData>>();
const searchDocsCache = new Map<string, CacheEntry<GroundingSource[]>>();
const inFlightQuickNotes = new Map<string, Promise<QuickNotesData>>();
const inFlightSearchDocs = new Map<string, Promise<GroundingSource[]>>();

function getCached<T>(cache: Map<string, CacheEntry<T>>, key: string): T | null {
  const hit = cache.get(key);
  if (!hit) return null;
  if (Date.now() > hit.expiresAt) {
    cache.delete(key);
    return null;
  }
  return hit.value;
}

function setCached<T>(cache: Map<string, CacheEntry<T>>, key: string, value: T): void {
  if (cache.size >= MAX_CACHE_ENTRIES) {
    const oldestKey = cache.keys().next().value;
    if (oldestKey) cache.delete(oldestKey);
  }
  cache.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS });
}

export function getAiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    throw new Error(
      'GEMINI_API_KEY is not configured. Add a valid key in Cloud Run Environment Variables or Settings > Secrets to run Gemini AI evaluation.',
    );
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

export function extractFriendlyAiError(err: unknown, fallback: string): string {
  if (!(err instanceof Error)) return fallback;
  const raw = err.message || '';
  try {
    const parsed = JSON.parse(raw) as { error?: { message?: string } };
    if (parsed?.error?.message) {
      return parsed.error.message;
    }
  } catch {
    // Not raw JSON
  }
  return raw || fallback;
}

async function withTransientRetry<T>(fn: () => Promise<T>, maxRetries = 2): Promise<T> {
  let lastError: unknown;
  const backoffMs = [400, 900];
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      const msg = err instanceof Error ? err.message : String(err);
      const isTransient =
        msg.includes('503') ||
        msg.includes('UNAVAILABLE') ||
        msg.includes('high demand') ||
        msg.includes('429') ||
        msg.includes('RESOURCE_EXHAUSTED');
      if (!isTransient || attempt === maxRetries) {
        throw err;
      }
      await new Promise((resolve) => setTimeout(resolve, backoffMs[attempt] ?? 900));
    }
  }
  throw lastError;
}

function parseJsonStrict<T>(rawText: string | undefined, context: string): T {
  const cleaned = (rawText ?? '').trim().replace(/^```json\s*/i, '').replace(/```\s*$/, '');
  if (!cleaned) {
    throw new Error(`Empty response received from Gemini during ${context}.`);
  }
  return JSON.parse(cleaned) as T;
}

function extractGroundingSources(
  response: {
    candidates?: Array<{
      groundingMetadata?: {
        groundingChunks?: Array<{ web?: { uri?: string; title?: string } }>;
      };
    }>;
  },
): GroundingSource[] {
  const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [];
  const seen = new Set<string>();
  const sources: GroundingSource[] = [];
  for (const chunk of chunks) {
    const uri = chunk.web?.uri;
    const title = chunk.web?.title;
    if (uri && !seen.has(uri)) {
      seen.add(uri);
      sources.push({
        uri,
        title: title || uri,
      });
    }
  }
  return sources.slice(0, 4);
}

function langDisplayName(language: ProgrammingLanguage): string {
  return language === 'cpp' ? 'C++20' : language === 'c' ? 'C11' : language === 'java' ? 'Java 21' : 'Python 3';
}

/**
 * Google Search Grounding helper using gemini-4-hydrogen (ThinkingLevel.LOW) + { googleSearch: {} }.
 * Fetches up-to-date language documentation notes and clickable reference URLs.
 */
export async function searchLanguageReference(params: {
  language: ProgrammingLanguage;
  topic: string;
  question?: string;
}): Promise<{ summary: string; sources: GroundingSource[] }> {
  const ai = getAiClient();
  const { language, topic, question } = params;
  const langLabel = langDisplayName(language);

  const queryText = question
    ? `Using official ${langLabel} documentation, answer concisely in 3-4 sentences WITHOUT writing solution code: ${question} (Context: ${topic}).`
    : `List 2 crisp ${langLabel} standard-library facts relevant to "${topic}" (headers, mutability, or memory rules). No code solutions.`;

  const response = await withTransientRetry(() =>
    ai.models.generateContent({
      model: SEARCH_MODEL,
      contents: queryText,
      config: {
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        systemInstruction:
          'You are a concise programming coach grounded in official docs. Never output copy-pasteable problem solutions.',
        tools: [{ googleSearch: {} }],
      },
    }),
  );

  return {
    summary: (response.text ?? '').trim(),
    sources: extractGroundingSources(response),
  };
}

/**
 * Non-blocking cached fetcher for Google Search documentation citations used in Pre-Match Briefing.
 */
export async function fetchQuickNotesSources(
  problem: ProblemStatement,
  language: ProgrammingLanguage,
): Promise<GroundingSource[]> {
  const key = `${problem.id}:${language}`;
  const cached = getCached(searchDocsCache, key);
  if (cached) return cached;

  const existing = inFlightSearchDocs.get(key);
  if (existing) return existing;

  const task = searchLanguageReference({
    language,
    topic: `${problem.topic} ${problem.focusArea}`,
  })
    .then((res) => {
      setCached(searchDocsCache, key, res.sources);
      return res.sources;
    })
    .catch(() => [] as GroundingSource[])
    .finally(() => {
      inFlightSearchDocs.delete(key);
    });

  inFlightSearchDocs.set(key, task);
  return task;
}

/**
 * (a) Fast Pre-Match Quick Notes using gemini-3.1-flash-lite with caching & in-flight deduplication.
 * Returns core notes immediately without blocking on live Google Search.
 */
export async function generateQuickNotes(
  problem: ProblemStatement,
  language: ProgrammingLanguage,
): Promise<QuickNotesData> {
  const key = `${problem.id}:${language}`;
  const cachedNotes = getCached(quickNotesCache, key);
  const cachedSources = getCached(searchDocsCache, key) ?? [];
  if (cachedNotes) {
    return {
      ...cachedNotes,
      sources: cachedSources.length > 0 ? cachedSources : cachedNotes.sources ?? [],
    };
  }

  const existing = inFlightQuickNotes.get(key);
  if (existing) return existing;

  const task = (async () => {
    const ai = getAiClient();
    const langLabel = langDisplayName(language);

    const prompt = [
      `Write ultra-concise 10-second Pre-Match Quick Notes for Tech-Leveling.`,
      `Language: ${langLabel} | Tier: ${problem.tier.toUpperCase()} (${problem.focusArea})`,
      `Problem: ${problem.title} — ${problem.topic}`,
      `Target: Time ${problem.targetTimeComplexity}, Space ${problem.targetSpaceComplexity}`,
      `Summary: ${problem.summary}`,
      `Rules: Include 1 punchy ${langLabel} syntax/runtime reminder (e.g. header includes, String immutability, const&, or ''.join()). Zero solution code. Keep every bullet under 16 words.`,
    ].join('\n');

    const response = await withTransientRetry(() =>
      ai.models.generateContent({
        model: FAST_MODEL,
        contents: prompt,
        config: {
          systemInstruction:
            'Concise competitive programming coach. Return tight JSON quick notes with zero solution code.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              topicTitle: { type: Type.STRING },
              languageReminder: { type: Type.STRING },
              corePattern: { type: Type.STRING },
              targetComplexity: { type: Type.STRING },
              keyConcepts: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              mentalChecklist: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              watchOut: { type: Type.STRING },
            },
            required: [
              'topicTitle',
              'languageReminder',
              'corePattern',
              'targetComplexity',
              'keyConcepts',
              'mentalChecklist',
              'watchOut',
            ],
          },
        },
      }),
    );

    const parsed = parseJsonStrict<QuickNotesData>(response.text, 'quick notes generation');
    const latestSources = getCached(searchDocsCache, key) ?? [];
    const result: QuickNotesData = {
      ...parsed,
      sources: latestSources,
    };
    setCached(quickNotesCache, key, result);
    return result;
  })().finally(() => {
    inFlightQuickNotes.delete(key);
  });

  inFlightQuickNotes.set(key, task);
  return task;
}

/**
 * Background pre-warmer called during matchmaking handshake so Quick Notes & docs are ready
 * before the 10-second Pre-Match Briefing even mounts.
 */
export function prewarmQuickNotes(
  problem: ProblemStatement,
  language: ProgrammingLanguage,
): void {
  if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'MY_GEMINI_API_KEY') {
    return;
  }
  void generateQuickNotes(problem, language).catch(() => {});
  void fetchQuickNotesSources(problem, language).catch(() => {});
}

/**
 * (b) Fast & Strict Big-O & Language Mastery Code Judge using gemini-3.1-flash-lite (~1.5-2s).
 * Evaluates correctness, language pitfalls, and worst-case O(Time) / O(Space) rapidly.
 */
export async function judgeSubmissionBigO(params: {
  problem: ProblemStatement;
  language: ProgrammingLanguage;
  code: string;
}): Promise<BigOEvaluation> {
  const { problem, language, code } = params;
  const trimmed = code.trim();
  if (!trimmed) {
    return {
      isCorrect: false,
      timeComplexity: 'O(n!)',
      spaceComplexity: 'O(n!)',
      correctnessSummary: 'Empty submission cannot satisfy the problem.',
      complexityReasoning: 'No executable logic was provided.',
      edgeCaseNotes: 'Write a complete function or program before submitting.',
      detectedIssues: ['Submission body is empty.'],
    };
  }

  const ai = getAiClient();

  const prompt = [
    `Judge this ${language.toUpperCase()} submission strictly on correctness, language safety, and worst-case Big-O.`,
    `Problem: ${problem.title} (${problem.tier.toUpperCase()} · ${problem.focusArea})`,
    `Spec: ${problem.description.join(' ')}`,
    `Constraints: ${problem.constraints.join('; ')}`,
    `Target Optimal: Time ${problem.targetTimeComplexity}, Space ${problem.targetSpaceComplexity}`,
    `Code (${language.toUpperCase()}):\n${trimmed}`,
    `Rules: Set isCorrect=true ONLY if the code accurately solves the specification with valid ${language.toUpperCase()} syntax and no critical edge-case/UB bugs. Keep each text field to 1 concise sentence. Never include corrected code.`,
  ].join('\n');

  const response = await withTransientRetry(() =>
    ai.models.generateContent({
      model: FAST_MODEL,
      contents: prompt,
      config: {
        systemInstruction:
          'Strict competitive programming and Big-O judge. Never approve incomplete, dummy, or buggy code. Keep feedback concise and return strictly valid JSON.',
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            isCorrect: { type: Type.BOOLEAN },
            timeComplexity: { type: Type.STRING },
            spaceComplexity: { type: Type.STRING },
            correctnessSummary: { type: Type.STRING },
            complexityReasoning: { type: Type.STRING },
            edgeCaseNotes: { type: Type.STRING },
            detectedIssues: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
          },
          required: [
            'isCorrect',
            'timeComplexity',
            'spaceComplexity',
            'correctnessSummary',
            'complexityReasoning',
            'edgeCaseNotes',
            'detectedIssues',
          ],
        },
      },
    }),
  );

  return parseJsonStrict<BigOEvaluation>(response.text, 'Big-O evaluation');
}

/**
 * (c-1) Fast Initial Post-Match AI Mentor Guidance using gemini-3.1-flash-lite.
 * STRICT GUARDRAIL: NEVER outputs direct code solutions.
 */
export async function generateMentorInitialGuidance(params: {
  problem: ProblemStatement;
  language: ProgrammingLanguage;
  userCode: string;
  evaluation?: BigOEvaluation | null;
}): Promise<MentorInitialFeedback> {
  const ai = getAiClient();
  const { problem, language, userCode, evaluation } = params;

  const prompt = [
    `Student needs coaching on ${problem.title} (${problem.tier.toUpperCase()}, target ${problem.targetTimeComplexity} Time / ${problem.targetSpaceComplexity} Space).`,
    `Language: ${language.toUpperCase()} | Focus: ${problem.focusArea}`,
    `Constraints: ${problem.constraints.join('; ')}`,
    `Code Attempt:\n${userCode.trim() ? userCode : '(empty — student got stuck)'}`,
    evaluation
      ? `Judge: correct=${evaluation.isCorrect}, Time=${evaluation.timeComplexity}, Space=${evaluation.spaceComplexity}, summary=${evaluation.correctnessSummary}`
      : `Status: Student opened mentor before submitting.`,
    `Return concise JSON: conceptNudge (2-3 sentences, NO code), pitfallAlert (1-2 sentences specific to ${language.toUpperCase()} pitfalls like C segfaults/pointers, C++ copies/RAII, Java String immutability/MLE, Python slicing/memory), and 3 short focusQuestions.`,
  ].join('\n');

  const response = await withTransientRetry(() =>
    ai.models.generateContent({
      model: FAST_MODEL,
      contents: prompt,
      config: {
        systemInstruction:
          'Socratic CS Mentor for Tech-Leveling. CRITICAL RULE: NEVER write solution code or complete functions. Guide concisely via Concept Nudge and Language Pitfall Alert.',
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            conceptNudge: { type: Type.STRING },
            pitfallAlert: { type: Type.STRING },
            focusQuestions: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
          },
          required: ['conceptNudge', 'pitfallAlert', 'focusQuestions'],
        },
      },
    }),
  );

  return parseJsonStrict<MentorInitialFeedback>(response.text, 'mentor initial guidance');
}

/**
 * (c-2) Interactive Multi-Turn AI Mentor Chat.
 * - Default (useSearchGrounding=false): ultra-fast gemini-3.1-flash-lite (~1-2s).
 * - On-demand (useSearchGrounding=true): gemini-4-hydrogen (ThinkingLevel.LOW) + Google Search citations.
 * STRICT GUARDRAIL: NEVER outputs direct code solutions.
 */
export async function chatWithMentor(params: {
  problem: ProblemStatement;
  language: ProgrammingLanguage;
  userCode: string;
  evaluation?: BigOEvaluation | null;
  history: MentorChatMessage[];
  userMessage: string;
  useSearchGrounding?: boolean;
}): Promise<{
  reply: string;
  conceptNudge: string;
  pitfallAlert: string;
  sources?: GroundingSource[];
}> {
  const ai = getAiClient();
  const { problem, language, userCode, evaluation, history, userMessage, useSearchGrounding } = params;

  const conversationLog = history
    .slice(-8)
    .map((m) => `${m.role === 'user' ? 'Student' : 'Mentor'}: ${m.content}`)
    .join('\n');

  if (useSearchGrounding) {
    const grounded = await searchLanguageReference({
      language,
      topic: `${problem.title} (${problem.topic})`,
      question: `${conversationLog ? `Prior context:\n${conversationLog}\n\n` : ''}Student question: ${userMessage}`,
    });
    return {
      reply: grounded.summary || 'Review the grounded language reference links below.',
      conceptNudge: `Ground your ${language.toUpperCase()} fix in official standard-library behavior rather than guessing memory or mutability semantics.`,
      pitfallAlert: `Verify edge cases for ${problem.constraints[0] ?? 'large inputs'} and avoid hidden allocations or undefined behavior in ${language.toUpperCase()}.`,
      sources: grounded.sources,
    };
  }

  const prompt = [
    `Problem: ${problem.title} (${problem.tier.toUpperCase()}, target ${problem.targetTimeComplexity} / ${problem.targetSpaceComplexity})`,
    `Language: ${language.toUpperCase()} | Constraints: ${problem.constraints.join('; ')}`,
    `Student Code:\n${userCode.trim() || '(empty)'}`,
    evaluation
      ? `Judge: Time ${evaluation.timeComplexity}, Space ${evaluation.spaceComplexity}, Correct=${evaluation.isCorrect}`
      : `Judge: Not yet submitted`,
    conversationLog ? `Recent Chat:\n${conversationLog}` : '',
    `Question: ${userMessage}`,
    `Return concise JSON with reply (2-3 crisp sentences, ZERO code solution), conceptNudge (1 sentence), and pitfallAlert (1 ${language.toUpperCase()}-specific warning).`,
  ]
    .filter(Boolean)
    .join('\n\n');

  const response = await withTransientRetry(() =>
    ai.models.generateContent({
      model: FAST_MODEL,
      contents: prompt,
      config: {
        systemInstruction:
          'Tech-Leveling Socratic AI Mentor. CRITICAL GUARDRAIL: Never provide direct code solutions or copy-pasteable implementations. Explain why bugs happen concisely and nudge the student.',
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            reply: { type: Type.STRING },
            conceptNudge: { type: Type.STRING },
            pitfallAlert: { type: Type.STRING },
          },
          required: ['reply', 'conceptNudge', 'pitfallAlert'],
        },
      },
    }),
  );

  return parseJsonStrict<{ reply: string; conceptNudge: string; pitfallAlert: string }>(
    response.text,
    'mentor follow-up chat',
  );
}

/**
 * (d) Reliable Voice Mentor Turn Pipeline (REST-native, zero WebSocket 404 risk):
 * 1. Optional audio transcription via gemini-3.5-transcribe
 * 2. Concise spoken Socratic coaching (zero code spoilers) via gemini-3.1-flash-lite
 * 3. Natural 24kHz WAV speech synthesis via gemini-3.8-flash-lite-tts
 */
export async function generateVoiceMentorTurn(params: {
  problem: ProblemStatement;
  language: ProgrammingLanguage;
  userCode?: string;
  evaluation?: BigOEvaluation | null;
  audioBase64?: string;
  audioMimeType?: string;
  textPrompt?: string;
}): Promise<{
  userTranscript: string;
  mentorText: string;
  audioBase64: string;
  mimeType: string;
}> {
  const ai = getAiClient();
  const { problem, language, userCode, evaluation, audioBase64, audioMimeType, textPrompt } = params;
  const langLabel = langDisplayName(language);

  let userTranscript = (textPrompt ?? '').trim();

  if (audioBase64 && audioBase64.length > 0) {
    const cleanMime =
      audioMimeType && audioMimeType.startsWith('audio/')
        ? audioMimeType.split(';')[0]
        : 'audio/webm';
    const audioParts = {
      parts: [
        {
          inlineData: {
            mimeType: cleanMime,
            data: audioBase64,
          },
        },
        { text: 'Transcribe this spoken student coding question verbatim. Return only the spoken words.' },
      ],
    };

    try {
      const transcribeRes = await withTransientRetry(() =>
        ai.models.generateContent({
          model: TRANSCRIBE_MODEL,
          contents: audioParts,
        }),
      );
      const heard = (transcribeRes.text ?? '').trim();
      if (heard) userTranscript = heard;
    } catch {
      try {
        const fallbackRes = await withTransientRetry(() =>
          ai.models.generateContent({
            model: FAST_MODEL,
            contents: audioParts,
          }),
        );
        const heard = (fallbackRes.text ?? '').trim();
        if (heard) userTranscript = heard;
      } catch {
        // Proceed with default coaching prompt if audio could not be decoded
      }
    }
  }

  if (!userTranscript) {
    userTranscript = `Give me a quick spoken Concept Nudge and ${langLabel} Pitfall Alert for ${problem.title}.`;
  }

  const coachPrompt = [
    `You are speaking aloud to a student in Tech-Leveling Voice Mentor.`,
    `Problem: ${problem.title} (${problem.topic}, target ${problem.targetTimeComplexity} time / ${problem.targetSpaceComplexity} space).`,
    `Language: ${langLabel}`,
    userCode?.trim() ? `Student Attempt:\n${userCode.trim().slice(0, 1200)}` : 'Student Attempt: (empty)',
    evaluation
      ? `Judge Result: correct=${evaluation.isCorrect}, time=${evaluation.timeComplexity}, space=${evaluation.spaceComplexity}, summary=${evaluation.correctnessSummary}`
      : 'Judge Result: Not yet submitted',
    `Student Asked: "${userTranscript}"`,
    `Rules: Reply in 2 to 3 clear spoken sentences (max 55 words). Include one Concept Nudge and one ${langLabel} Pitfall Alert. NEVER dictate or spell out a code solution. Plain natural speech only, no markdown or backticks.`,
  ].join('\n');

  const coachRes = await withTransientRetry(() =>
    ai.models.generateContent({
      model: FAST_MODEL,
      contents: coachPrompt,
      config: {
        systemInstruction:
          'Tech-Leveling Voice Mentor. Speak warmly and concisely in plain English without markdown. CRITICAL RULE: Never give direct code solutions.',
      },
    }),
  );

  const mentorText =
    (coachRes.text ?? '').trim().replace(/[`*_#]/g, '') ||
    `Focus on matching the ${problem.targetTimeComplexity} target for ${problem.title}, and double-check your ${langLabel} boundary conditions and types before submitting.`;

  let generatedAudio = '';
  try {
    const ttsRes = await ai.models.generateContent({
      model: TTS_MODEL,
      contents: [
        {
          role: 'user',
          parts: [{ text: mentorText }],
        },
      ],
      config: {
        responseModalities: ['AUDIO'],
      },
    });
    generatedAudio = ttsRes.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data ?? '';
  } catch {
    // Some API gateways omit AUDIO output modality; client will smoothly synthesize mentorText via Web Speech API
    generatedAudio = '';
  }

  return {
    userTranscript,
    mentorText,
    audioBase64: generatedAudio,
    mimeType: 'audio/wav',
  };
}
