import test from 'node:test';
import assert from 'node:assert/strict';
import { tokenizeCode } from './syntaxHighlight';

test('tokenizeCode preserves exact raw source text across all 4 languages', () => {
  const samples = [
    {
      lang: 'python' as const,
      code: '# comment\ndef solve(nums):\n    seen = {}\n    return [0, 1] # "str"\n',
    },
    {
      lang: 'java' as const,
      code: '/* block */\npublic class Main {\n  public static int run(int[] a) {\n    return a.length;\n  }\n}',
    },
    {
      lang: 'cpp' as const,
      code: '#include <vector>\nint main() { std::vector<int> v; return 0; } // end',
    },
    {
      lang: 'c' as const,
      code: 'int sum(const int *arr, size_t n) { return (int)n; }',
    },
  ];

  for (const sample of samples) {
    const tokens = tokenizeCode(sample.code, sample.lang);
    const reconstructed = tokens.map((t) => t.value).join('');
    assert.equal(reconstructed, sample.code, `Failed exact reconstruction for ${sample.lang}`);
  }
});

test('tokenizeCode classifies keywords, types, strings, numbers, and comments', () => {
  const tokens = tokenizeCode('def f(x):\n  return "ok" # 42', 'python');
  assert.ok(tokens.some((t) => t.type === 'keyword' && t.value === 'def'));
  assert.ok(tokens.some((t) => t.type === 'keyword' && t.value === 'return'));
  assert.ok(tokens.some((t) => t.type === 'string' && t.value === '"ok"'));
  assert.ok(tokens.some((t) => t.type === 'comment' && t.value === '# 42'));
});

test('tokenizeCode returns empty array for empty editor state', () => {
  assert.deepEqual(tokenizeCode('', 'python'), []);
});
