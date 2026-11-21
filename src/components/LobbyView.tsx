import { useState } from 'react';
import { ArrowRight, Code2, Cpu, Link2, Target, Users } from 'lucide-react';
import type { PartNumber, ProblemStatement, ProgrammingLanguage } from '../types/arena';
import { LANGUAGE_CONFIG } from '../data/problems';
import {
  PROGRESSION_PARTS,
  getLevelsForLanguageAndPart,
  getPartMeta,
} from '../data/progression';
import {
  GeminiSparkIcon,
  HERO_STAGE_IMAGE,
  LanguageLogo,
  PART_ARTWORK,
  PartIcon,
} from './BrandVisuals';

interface LobbyViewProps {
  selectedLanguage: ProgrammingLanguage;
  onSelectLanguage: (lang: ProgrammingLanguage) => void;
  selectedPart: PartNumber;
  onSelectPart: (part: PartNumber) => void;
  selectedLevel: number;
  onSelectLevel: (level: number) => void;
  selectedProblem: ProblemStatement;
  playerHandle: string;
  onChangeHandle: (handle: string) => void;
  roomCodeInput: string;
  onChangeRoomCode: (code: string) => void;
  inviteRoomCode: string | null;
  wsConnected: boolean;
  errorMessage: string | null;
  onFindMatch: () => void;
}

const LANGUAGES: ProgrammingLanguage[] = ['c', 'cpp', 'java', 'python'];

export function LobbyView({
  selectedLanguage,
  onSelectLanguage,
  selectedPart,
  onSelectPart,
  selectedLevel,
  onSelectLevel,
  selectedProblem,
  playerHandle,
  onChangeHandle,
  roomCodeInput,
  onChangeRoomCode,
  inviteRoomCode,
  wsConnected,
  errorMessage,
  onFindMatch,
}: LobbyViewProps) {
  const [heroFailed, setHeroFailed] = useState(false);
  const [failedParts, setFailedParts] = useState<Record<number, boolean>>({});

  const activeLangConfig = LANGUAGE_CONFIG[selectedLanguage];
  const activePartMeta = getPartMeta(selectedPart);
  const partLevels = getLevelsForLanguageAndPart(selectedLanguage, selectedPart);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onFindMatch();
  };

  return (
    <main className="mx-auto max-w-[1440px] px-4 py-4 sm:px-6 lg:px-8">
      {/* Compact Esports Arena Hero Banner */}
      <section className="relative overflow-hidden rounded-xl border border-[#26262E] bg-[#18181B]">
        <div className="relative min-h-[144px]">
          {!heroFailed ? (
            <img
              src={HERO_STAGE_IMAGE}
              alt="Minimalist obsidian esports coding arena stage illuminated with electric yellow and acid green floor strips"
              referrerPolicy="no-referrer"
              onError={() => setHeroFailed(true)}
              className="absolute inset-0 h-full w-full object-cover object-center opacity-50"
            />
          ) : (
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-gradient-to-br from-[#18181B] via-[#121212] to-[#1A1F16]"
            />
          )}
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-r from-[#121212] via-[#121212]/88 to-[#121212]/40"
          />

          <div className="relative z-10 flex flex-col justify-between gap-4 p-5 sm:p-6 lg:flex-row lg:items-end">
            <div className="max-w-2xl space-y-1.5">
              <p className="font-mono text-xs font-medium text-[#A1A1AA]">
                Gamified Progression Lobby · 5 Parts × 10 Levels · 50 Challenges per Language
              </p>
              <h1 className="text-2xl font-bold tracking-tight text-[#F4F4F5] sm:text-3xl lg:leading-[1.12]">
                Level up across C, C++, Java &amp; Python—from Basics to Big-O.
              </h1>
              <p className="max-w-xl text-sm leading-relaxed text-[#D4D4D8]">
                Select your language, pick a mastery part and level from 1 to 10, and launch into a
                live WebSocket battle with a blank editor and Gemini Big-O evaluation.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-6 border-t border-[#26262E] pt-3 text-xs text-[#A1A1AA] lg:border-t-0 lg:pt-0">
              <div>
                <div className="font-mono text-base font-semibold tabular-nums text-[#FACC15]">
                  50 Levels / Lang
                </div>
                <div className="mt-0.5 text-[#A1A1AA]">5 Parts × 10 Levels</div>
              </div>
              <div className="h-8 w-px bg-[#2A2A32]" aria-hidden="true" />
              <div>
                <div className="font-mono text-base font-semibold tabular-nums text-[#4ADE80]">
                  {wsConnected ? 'Connected' : 'Connecting'}
                </div>
                <div className="mt-0.5 text-[#A1A1AA]">Live Matchmaking Socket</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Invite Link Detected Banner (Post-Deployment 2nd/3rd Player Flow) */}
      {inviteRoomCode && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#4ADE80]/40 bg-[#132018] px-4 py-3 text-xs">
          <div className="flex items-center gap-2.5 text-[#E4E4E7]">
            <Link2 className="h-4 w-4 shrink-0 text-[#4ADE80]" aria-hidden="true" />
            <span>
              Multiplayer invite detected for Room{' '}
              <span className="font-mono font-semibold text-[#FACC15]">{inviteRoomCode}</span>.
              Confirm your handle below and click{' '}
              <span className="font-semibold text-[#F4F4F5]">Find Match</span> to join live.
            </span>
          </div>
        </div>
      )}

      {/* 3-Step Progression Flow: Language -> Part (1-5) -> Level (1-10) -> Find Match */}
      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        {/* STEP 1: Select Language (with Custom C, C++, Java, Python Brand Logos) */}
        <section className="rounded-xl border border-[#26262E] bg-[#18181B] p-4 sm:p-5">
          <div className="flex flex-col justify-between gap-1.5 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-sm font-semibold text-[#F4F4F5]">
                Step 1 · Select Programming Language
              </h2>
              <p className="mt-0.5 text-xs text-[#A1A1AA]">
                Choose your track first. Every part, level, syntax reminder, and pitfall alert adapts
                to this language.
              </p>
            </div>
            <div className="inline-flex items-center gap-2 font-mono text-xs text-[#4ADE80]">
              <LanguageLogo language={selectedLanguage} className="h-5 w-5" />
              <span>Runtime: {activeLangConfig.runtimeLabel}</span>
            </div>
          </div>

          <div
            role="radiogroup"
            aria-label="Programming Language"
            className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4"
          >
            {LANGUAGES.map((lang) => {
              const cfg = LANGUAGE_CONFIG[lang];
              const isSelected = selectedLanguage === lang;
              return (
                <button
                  key={lang}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  onClick={() => onSelectLanguage(lang)}
                  className={`group flex flex-col justify-between rounded-lg border px-3.5 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FACC15] ${
                    isSelected
                      ? 'border-[#4ADE80] bg-[#152019]'
                      : 'border-[#26262E] bg-[#121212] hover:border-[#3F3F4A]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <LanguageLogo language={lang} className="h-9 w-9" />
                      <div>
                        <div className="font-['Outfit'] text-base font-semibold leading-tight text-[#F4F4F5]">
                          {cfg.label}
                        </div>
                        <div className="font-mono text-[11px] text-[#A1A1AA]">{cfg.shortLabel}</div>
                      </div>
                    </div>
                    <span
                      className={`font-mono text-xs font-medium ${
                        isSelected ? 'text-[#4ADE80]' : 'text-[#A1A1AA]'
                      }`}
                    >
                      50 Levels
                    </span>
                  </div>
                  <p className="mt-2.5 text-xs leading-relaxed text-[#A1A1AA]">
                    {cfg.masteryFocus}
                  </p>
                </button>
              );
            })}
          </div>
        </section>

        {/* STEP 2: Select Part (1 to 5) with Bespoke Isometric Artwork & Unique Part Icons */}
        <section className="rounded-xl border border-[#26262E] bg-[#18181B] p-4 sm:p-5">
          <div className="flex flex-col justify-between gap-1.5 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-sm font-semibold text-[#F4F4F5]">
                Step 2 · Select Mastery Part (1 to 5)
              </h2>
              <p className="mt-0.5 text-xs text-[#A1A1AA]">
                Progress from absolute language basics through control flow, strings, OOP/pointers,
                and Big-O optimization.
              </p>
            </div>
            <span className="inline-flex items-center gap-1.5 font-mono text-xs text-[#FACC15]">
              <PartIcon part={activePartMeta.part} className="h-3.5 w-3.5" />
              <span>
                {activeLangConfig.label} · Part {activePartMeta.part}: {activePartMeta.title}
              </span>
            </span>
          </div>

          <div
            role="radiogroup"
            aria-label="Progression Part"
            className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5"
          >
            {PROGRESSION_PARTS.map((partMeta) => {
              const isSelected = selectedPart === partMeta.part;
              const art = PART_ARTWORK[partMeta.part];
              const imgBroken = Boolean(failedParts[partMeta.part]);

              return (
                <button
                  key={partMeta.part}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  onClick={() => onSelectPart(partMeta.part)}
                  className={`group flex flex-col justify-between overflow-hidden rounded-lg border text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FACC15] ${
                    isSelected
                      ? 'border-[#FACC15] bg-[#1E1D15]'
                      : 'border-[#26262E] bg-[#121212] hover:border-[#3F3F4A]'
                  }`}
                >
                  <div>
                    {/* Visual Banner per Part */}
                    <div className="relative h-24 w-full overflow-hidden border-b border-[#26262E] bg-[#0E0E12]">
                      {!imgBroken ? (
                        <img
                          src={art.src}
                          alt={art.alt}
                          referrerPolicy="no-referrer"
                          onError={() =>
                            setFailedParts((prev) => ({ ...prev, [partMeta.part]: true }))
                          }
                          className={`h-full w-full object-cover transition-transform duration-300 group-hover:scale-105 ${
                            isSelected ? 'opacity-90' : 'opacity-65 group-hover:opacity-85'
                          }`}
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#18181B] to-[#0E0E12]">
                          <PartIcon
                            part={partMeta.part}
                            className="h-8 w-8 text-[#FACC15]/70"
                          />
                        </div>
                      )}
                      <div
                        aria-hidden="true"
                        className="absolute inset-0 bg-gradient-to-t from-[#121212] via-[#121212]/25 to-transparent"
                      />
                      <div className="absolute right-2.5 bottom-2 left-2.5 flex items-center justify-between">
                        <span
                          className={`inline-flex items-center gap-1.5 font-mono text-xs font-bold ${
                            isSelected ? 'text-[#FACC15]' : 'text-[#F4F4F5]'
                          }`}
                        >
                          <PartIcon
                            part={partMeta.part}
                            className={`h-3.5 w-3.5 ${
                              isSelected ? 'text-[#FACC15]' : 'text-[#4ADE80]'
                            }`}
                          />
                          <span>PART {partMeta.part}</span>
                        </span>
                        <span className="font-mono text-[11px] font-medium text-[#4ADE80]">
                          10 Levels
                        </span>
                      </div>
                    </div>

                    {/* Part Copy */}
                    <div className="space-y-1 p-3.5 pb-2.5">
                      <div className="font-['Outfit'] text-base font-semibold leading-snug text-[#F4F4F5]">
                        {partMeta.title}
                      </div>
                      <p className="text-xs font-medium text-[#D4D4D8]">{partMeta.subtitle}</p>
                    </div>
                  </div>

                  <p className="border-t border-[#26262E] px-3.5 py-2.5 text-[11px] leading-relaxed text-[#A1A1AA]">
                    {partMeta.languageSpecificFocus[selectedLanguage]}
                  </p>
                </button>
              );
            })}
          </div>
        </section>

        {/* STEP 3: Select Level (1 to 10) inside the chosen Part */}
        <section className="rounded-xl border border-[#26262E] bg-[#18181B] p-4 sm:p-5">
          <div className="flex flex-col justify-between gap-1.5 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-sm font-semibold text-[#F4F4F5]">
                Step 3 · Select Level (1 to 10) — Part {activePartMeta.part}: {activePartMeta.title}
              </h2>
              <p className="mt-0.5 text-xs text-[#A1A1AA]">
                Pick any of the 10 challenges in this part to enter a live matchmaking queue for that
                exact level.
              </p>
            </div>
            <span className="inline-flex items-center gap-1.5 font-mono text-xs text-[#4ADE80]">
              <Target className="h-3.5 w-3.5" aria-hidden="true" />
              <span>
                Level {selectedLevel} / 10 · Target {selectedProblem.targetTimeComplexity}
              </span>
            </span>
          </div>

          <div
            role="radiogroup"
            aria-label="Level Selector"
            className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-5"
          >
            {partLevels.map((lvlProblem) => {
              const lvlNum = lvlProblem.levelNumber ?? 1;
              const isSelected = selectedLevel === lvlNum;
              return (
                <button
                  key={lvlProblem.id}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  onClick={() => onSelectLevel(lvlNum)}
                  className={`flex flex-col justify-between rounded-lg border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FACC15] ${
                    isSelected
                      ? 'border-[#4ADE80] bg-[#132018]'
                      : 'border-[#26262E] bg-[#121212] hover:border-[#3F3F4A]'
                  }`}
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <span
                      className={`font-mono text-xs font-bold tabular-nums ${
                        isSelected ? 'text-[#4ADE80]' : 'text-[#FACC15]'
                      }`}
                    >
                      LVL {lvlNum}
                    </span>
                    <span className="font-mono text-[11px] tabular-nums text-[#A1A1AA]">
                      +{lvlProblem.coinReward}c
                    </span>
                  </div>
                  <div className="mt-1.5 line-clamp-2 text-xs font-semibold leading-snug text-[#F4F4F5]">
                    {lvlProblem.title}
                  </div>
                  <div className="mt-2 truncate font-mono text-[11px] text-[#A1A1AA]">
                    {lvlProblem.dataStructure}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Selected Level Preview Strip */}
          <div className="mt-4 flex flex-col justify-between gap-3 rounded-lg border border-[#26262E] bg-[#121212] p-3.5 lg:flex-row lg:items-center">
            <div className="flex items-start gap-3">
              <LanguageLogo language={selectedLanguage} className="mt-0.5 h-9 w-9" />
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
                  <span className="font-semibold text-[#FACC15]">
                    {activeLangConfig.label} · Part {selectedPart} · Level {selectedLevel}
                  </span>
                  <span className="text-[#52525B]" aria-hidden="true">
                    /
                  </span>
                  <span className="text-[#4ADE80]">
                    Target {selectedProblem.targetTimeComplexity} Time ·{' '}
                    {selectedProblem.targetSpaceComplexity} Space
                  </span>
                </div>
                <div className="text-sm font-semibold text-[#F4F4F5]">{selectedProblem.title}</div>
                <p className="text-xs leading-relaxed text-[#D4D4D8]">{selectedProblem.summary}</p>
              </div>
            </div>

            {selectedProblem.examples[0] && (
              <div className="shrink-0 rounded-md border border-[#26262E] bg-[#18181B] px-3 py-2 font-mono text-[11px] lg:max-w-sm">
                <div className="truncate text-[#A1A1AA]">
                  In: <span className="text-[#F4F4F5]">{selectedProblem.examples[0].input}</span>
                </div>
                <div className="mt-0.5 truncate text-[#A1A1AA]">
                  Out:{' '}
                  <span className="text-[#4ADE80]">{selectedProblem.examples[0].output}</span>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Competitor Handle, Optional Private Room Code, and Primary Find Match CTA */}
        <div className="grid grid-cols-1 items-end gap-4 rounded-xl border border-[#26262E] bg-[#18181B] p-4 sm:p-5 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <label
              htmlFor="player-handle-input"
              className="block text-xs font-medium text-[#D4D4D8]"
            >
              Competitor Handle
            </label>
            <input
              id="player-handle-input"
              type="text"
              maxLength={24}
              value={playerHandle}
              onChange={(e) => onChangeHandle(e.target.value)}
              placeholder="Enter handle (e.g. Dev-Kira)"
              className="mt-1.5 w-full rounded-lg border border-[#2E2E38] bg-[#121212] px-3.5 py-2.5 text-sm text-[#F4F4F5] placeholder-[#71717A] transition-colors focus:border-[#FACC15] focus:outline-none"
            />
          </div>

          <div className="lg:col-span-4">
            <label
              htmlFor="room-code-input"
              className="block text-xs font-medium text-[#D4D4D8]"
            >
              Private Room Code (Optional · 2–3 Players)
            </label>
            <input
              id="room-code-input"
              type="text"
              maxLength={12}
              value={roomCodeInput}
              onChange={(e) => onChangeRoomCode(e.target.value.toUpperCase())}
              placeholder="Leave blank for open queue or enter TL-XXXX"
              className="mt-1.5 w-full rounded-lg border border-[#2E2E38] bg-[#121212] px-3.5 py-2.5 font-mono text-sm uppercase text-[#F4F4F5] placeholder:font-sans placeholder:normal-case placeholder-[#71717A] transition-colors focus:border-[#FACC15] focus:outline-none"
            />
          </div>

          <div className="lg:col-span-4">
            <button
              type="submit"
              className="flex w-full items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-[#FACC15] px-5 py-2.5 text-sm font-semibold text-[#0A0A0C] transition-colors hover:bg-[#FDE047] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FACC15] focus-visible:ring-offset-2 focus-visible:ring-offset-[#18181B]"
            >
              <span>
                {roomCodeInput.trim()
                  ? `Join Room ${roomCodeInput.trim()}`
                  : `Find Match · ${activeLangConfig.label} P${selectedPart} L${selectedLevel}`}
              </span>
              <ArrowRight className="h-4 w-4 shrink-0" aria-hidden="true" />
            </button>
          </div>
        </div>

        {errorMessage && (
          <div
            role="alert"
            className="rounded-lg border border-[#F87171]/40 bg-[#F87171]/10 px-4 py-3 text-sm text-[#FCA5A5]"
          >
            {errorMessage}
          </div>
        )}
      </form>

      {/* Four-Stage Arena Protocol Overview */}
      <section className="mt-8 border-t border-[#26262E] pt-6">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-sm font-semibold text-[#F4F4F5]">
              <Users className="h-4 w-4 text-[#FACC15]" aria-hidden="true" />
              <span>01. Real WebSocket Queue</span>
            </div>
            <p className="text-xs leading-relaxed text-[#A1A1AA]">
              Pairs 2–3 players on the exact same Language, Part &amp; Level or via shareable room
              invite links. Zero fake opponents.
            </p>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-sm font-semibold text-[#F4F4F5]">
              <Cpu className="h-4 w-4 text-[#4ADE80]" aria-hidden="true" />
              <span>02. 10s Language Quick Notes</span>
            </div>
            <p className="text-xs leading-relaxed text-[#A1A1AA]">
              Before the coding clock starts, review language-specific syntax reminders and
              Search-grounded references for your level.
            </p>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-sm font-semibold text-[#F4F4F5]">
              <Code2 className="h-4 w-4 text-[#FACC15]" aria-hidden="true" />
              <span>03. Blank Arena Editor</span>
            </div>
            <p className="text-xs leading-relaxed text-[#A1A1AA]">
              Starts completely empty with syntax highlighting for C, C++, Java, and Python plus
              boolean opponent typing status.
            </p>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-sm font-semibold text-[#F4F4F5]">
              <GeminiSparkIcon className="h-4 w-4" />
              <span>04. Gemini Big-O Judge &amp; Mentor</span>
            </div>
            <p className="text-xs leading-relaxed text-[#A1A1AA]">
              Fast Big-O scoring awards coins and rank badges. Losses open the interactive Gemini
              text &amp; voice AI Mentor with zero spoilers.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
