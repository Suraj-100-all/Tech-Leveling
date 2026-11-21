import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { PartNumber, ProgrammingLanguage } from '../types/arena';
import {
  PROGRESSION_PARTS,
  getLevelsForLanguageAndPart,
  getProgressionProblem,
} from './progression';
import { getProblemById } from './problems';

const LANGUAGES: ProgrammingLanguage[] = ['c', 'cpp', 'java', 'python'];
const PARTS: PartNumber[] = [1, 2, 3, 4, 5];

describe('Gamified Progression System (5 Parts x 10 Levels per Language)', () => {
  it('defines all 5 distinct difficulty parts with language-specific focus', () => {
    assert.equal(PROGRESSION_PARTS.length, 5);
    assert.equal(PROGRESSION_PARTS[0].title, 'Absolute Basics');
    assert.equal(PROGRESSION_PARTS[1].title, 'Control Flow');
    assert.equal(PROGRESSION_PARTS[2].title, 'Functions, Arrays & Strings');
    assert.equal(PROGRESSION_PARTS[3].title, 'Intermediate Logic');
    assert.equal(PROGRESSION_PARTS[4].title, 'Advanced & Big-O Optimization');

    for (const part of PROGRESSION_PARTS) {
      for (const lang of LANGUAGES) {
        assert.ok(part.languageSpecificFocus[lang].length > 10);
      }
    }
  });

  it('provides 10 distinct levels per part and 50 total unique levels per language', () => {
    for (const lang of LANGUAGES) {
      const seenIds = new Set<string>();
      for (const part of PARTS) {
        const levels = getLevelsForLanguageAndPart(lang, part);
        assert.equal(levels.length, 10, `Expected 10 levels for ${lang} Part ${part}`);
        for (let i = 0; i < 10; i++) {
          const problem = levels[i];
          assert.equal(problem.partNumber, part);
          assert.equal(problem.levelNumber, i + 1);
          assert.equal(problem.languageFocus, lang);
          assert.ok(!seenIds.has(problem.id), `Duplicate id ${problem.id}`);
          seenIds.add(problem.id);

          // Verify round-trip resolution via getProblemById (used by REST & WebSocket server)
          const resolved = getProblemById(problem.id);
          assert.ok(resolved, `getProblemById failed for ${problem.id}`);
          assert.equal(resolved.title, problem.title);
        }
      }
      assert.equal(seenIds.size, 50, `Expected 50 unique levels for ${lang}`);
    }
  });

  it('includes 10 extremely basic questions in Part 1 with per-language I/O hints', () => {
    const cPart1 = getLevelsForLanguageAndPart('c', 1);
    const pyPart1 = getLevelsForLanguageAndPart('python', 1);

    assert.equal(cPart1.length, 10);
    assert.equal(cPart1[0].title, 'Print Player Welcome Banner');
    assert.equal(cPart1[1].title, 'Sum of Two Telemetry Readings');
    assert.equal(cPart1[9].title, 'Exact Average of Three Match Scores');
    assert.ok(cPart1[0].inputOutputNote.includes('printf'));
    assert.ok(pyPart1[0].inputOutputNote.includes('print'));

    const specific = getProgressionProblem('java', 1, 4);
    assert.ok(specific.id.startsWith('java-p1-l4-'));
    assert.equal(specific.partNumber, 1);
    assert.equal(specific.levelNumber, 4);
  });
});
