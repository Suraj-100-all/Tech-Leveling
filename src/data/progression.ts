import type {
  DifficultyTier,
  PartNumber,
  ProblemExample,
  ProblemStatement,
  ProgrammingLanguage,
  ProgressionPartMeta,
} from '../types/arena';

export const PROGRESSION_PARTS: ProgressionPartMeta[] = [
  {
    part: 1,
    title: 'Absolute Basics',
    subtitle: 'I/O, Variables, Data Types',
    tier: 'rookie',
    coinBase: 80,
    timeMinutes: 10,
    languageSpecificFocus: {
      c: 'printf / scanf, int, double, char, format specifiers & casting',
      cpp: 'std::cin / std::cout, fundamental types, auto & arithmetic',
      java: 'Scanner / System.out, primitive types (int, double, char) & casting',
      python: 'input() / print(), dynamic types, f-strings & numeric operators',
    },
  },
  {
    part: 2,
    title: 'Control Flow',
    subtitle: 'Conditionals, Basic & Nested Loops',
    tier: 'rookie',
    coinBase: 140,
    timeMinutes: 15,
    languageSpecificFocus: {
      c: 'if/else, switch, for/while loops & nested pattern iteration',
      cpp: 'Branching, range-for loops, nested loops & early break/continue',
      java: 'Conditionals, switch expressions, nested for loops & loop invariants',
      python: 'if/elif/else, for-range loops, while conditions & nested iteration',
    },
  },
  {
    part: 3,
    title: 'Functions, Arrays & Strings',
    subtitle: 'Modular Helpers, Indexing & Text Processing',
    tier: 'challenger',
    coinBase: 240,
    timeMinutes: 20,
    languageSpecificFocus: {
      c: 'Functions, static arrays, <string.h> & null-terminated char buffers',
      cpp: 'Const-ref parameters, std::vector & std::string manipulation',
      java: 'Static methods, primitive arrays & StringBuilder immutability',
      python: 'Pure functions, list slicing, strings & "".join() builders',
    },
  },
  {
    part: 4,
    title: 'Intermediate Logic',
    subtitle: 'Pointers, OOPs, Memory Management',
    tier: 'challenger',
    coinBase: 360,
    timeMinutes: 25,
    languageSpecificFocus: {
      c: 'Pointers, pointer arithmetic, structs & checked malloc/free memory',
      cpp: 'OOP classes, virtual interfaces, RAII & std::unique_ptr ownership',
      java: 'OOP classes, interfaces, encapsulation & reference memory hygiene',
      python: 'OOP classes, encapsulation, stateful parsers & object references',
    },
  },
  {
    part: 5,
    title: 'Advanced & Big-O Optimization',
    subtitle: 'Efficiency, Time/Space Constraints',
    tier: 'pro',
    coinBase: 550,
    timeMinutes: 35,
    languageSpecificFocus: {
      c: 'Zero-copy buffers, circular index deques, strict O(n) & O(k) memory',
      cpp: 'Cache-friendly flat structs, vector::reserve & O(n log n) DP',
      java: 'GC-free primitive int[] stacks, avoiding boxed Integer MLE & O(n)',
      python: 'Lazy generator streams, O(k) heapq bounds & asymptotic efficiency',
    },
  },
];

interface LevelBlueprint {
  level: number;
  slug: string;
  title: string;
  shortConcept: string;
  targetTime: string;
  targetSpace: string;
  summary: string;
  description: string[];
  constraints: string[];
  examples: ProblemExample[];
  ioHint: Record<ProgrammingLanguage, string>;
}

const PART_1_LEVELS: LevelBlueprint[] = [
  {
    level: 1,
    slug: 'hello-arena-badge',
    title: 'Print Player Welcome Banner',
    shortConcept: 'Standard Output',
    targetTime: 'O(1)',
    targetSpace: 'O(1)',
    summary: 'Print a formatted welcome greeting containing a player tag string to standard output.',
    description: [
      'Given a single-word player handle name, output the exact line: "Welcome to Tech-Leveling, <name>!"',
      'Focus on clean standard I/O syntax without extra trailing spaces or formatting typos.',
    ],
    constraints: ['1 <= length(name) <= 32', 'name contains only letters, digits, or hyphens.'],
    examples: [{ input: 'name = "Kira"', output: 'Welcome to Tech-Leveling, Kira!' }],
    ioHint: {
      c: 'Use #include <stdio.h> with printf("Welcome to Tech-Leveling, %s!\\n", name).',
      cpp: 'Use #include <iostream> and std::cout << "Welcome to Tech-Leveling, " << name << "!\\n".',
      java: 'Use System.out.println("Welcome to Tech-Leveling, " + name + "!"); inside a Java method or main.',
      python: 'Use print(f"Welcome to Tech-Leveling, {name}!") or return the exact formatted string.',
    },
  },
  {
    level: 2,
    slug: 'two-number-sum',
    title: 'Sum of Two Telemetry Readings',
    shortConcept: 'Integer Variables & Addition',
    targetTime: 'O(1)',
    targetSpace: 'O(1)',
    summary: 'Read two 32-bit integers a and b and output their exact 64-bit sum.',
    description: [
      'Given two integers a and b representing sensor counts, compute and return or print a + b.',
      'Be mindful of integer overflow when both values are near 2 * 10^9.',
    ],
    constraints: ['-2 * 10^9 <= a, b <= 2 * 10^9'],
    examples: [
      { input: 'a = 15, b = 27', output: '42' },
      { input: 'a = 2000000000, b = 2000000000', output: '4000000000' },
    ],
    ioHint: {
      c: 'Use long long to avoid 32-bit signed int overflow, and %lld in printf/scanf.',
      cpp: 'Use long long (or int64_t from <cstdint>) for the sum.',
      java: 'Cast to long before adding: (long) a + b.',
      python: 'Python ints have arbitrary precision; convert inputs with int() before adding.',
    },
  },
  {
    level: 3,
    slug: 'swap-two-values',
    title: 'Swap Two Score Registers',
    shortConcept: 'Variable Assignment & Temp Storage',
    targetTime: 'O(1)',
    targetSpace: 'O(1)',
    summary: 'Swap the values stored in variables x and y and output them in swapped order.',
    description: [
      'Given two integer values x and y, exchange their contents so x holds y’s original value and y holds x’s original value, then output "x y".',
      'Keep the swap clear, overflow-safe, and O(1) space.',
    ],
    constraints: ['-10^9 <= x, y <= 10^9'],
    examples: [{ input: 'x = 7, y = 19', output: '19 7' }],
    ioHint: {
      c: 'Use a temporary int temp = x; x = y; y = temp; (avoid unsafe arithmetic swap overflow).',
      cpp: 'Use std::swap(x, y) from <utility> or a temporary variable.',
      java: 'Swap using a local int temp variable and print or return both values.',
      python: 'Use idiomatic tuple unpacking: x, y = y, x.',
    },
  },
  {
    level: 4,
    slug: 'celsius-to-fahrenheit',
    title: 'Celsius to Fahrenheit Converter',
    shortConcept: 'Floating-Point Arithmetic',
    targetTime: 'O(1)',
    targetSpace: 'O(1)',
    summary: 'Convert a temperature in Celsius to Fahrenheit using exact floating-point math.',
    description: [
      'Given a temperature C (real number), convert it to Fahrenheit using F = (C * 9.0 / 5.0) + 32.0 and format or return the value accurately.',
      'Watch out for integer division (9 / 5 evaluates to 1 in C, C++, and Java!).',
    ],
    constraints: ['-273.15 <= C <= 1000.0'],
    examples: [
      { input: 'C = 0', output: '32.00' },
      { input: 'C = 25', output: '77.00' },
    ],
    ioHint: {
      c: 'Use double and write 9.0 / 5.0 instead of 9 / 5; print with %.2f.',
      cpp: 'Use double with 9.0 / 5.0 and std::fixed << std::setprecision(2).',
      java: 'Use double with 9.0 / 5.0 and String.format("%.2f", f).',
      python: 'Use float arithmetic (c * 9 / 5) + 32 and format with f"{f:.2f}".',
    },
  },
  {
    level: 5,
    slug: 'rectangle-geometry',
    title: 'Rectangle Area & Perimeter',
    shortConcept: 'Basic Formulas & Data Types',
    targetTime: 'O(1)',
    targetSpace: 'O(1)',
    summary: 'Compute both the area and perimeter of a rectangle given its integer length and width.',
    description: [
      'Given positive integers length L and width W of a grid arena, compute area = L * W and perimeter = 2 * (L + W).',
      'Return or print both values clearly without overflow.',
    ],
    constraints: ['1 <= L, W <= 10^6'],
    examples: [{ input: 'L = 8, W = 5', output: 'area = 40, perimeter = 26' }],
    ioHint: {
      c: 'Store area in long long since 10^6 * 10^6 exceeds 32-bit int.',
      cpp: 'Use long long for L * W so large dimensions never wrap around.',
      java: 'Use long area = (long) L * W; and long perimeter = 2L * (L + W);.',
      python: 'Compute area = l * w and perimeter = 2 * (l + w).',
    },
  },
  {
    level: 6,
    slug: 'ascii-code-inspector',
    title: 'Character to ASCII Code',
    shortConcept: 'Character Data Type',
    targetTime: 'O(1)',
    targetSpace: 'O(1)',
    summary: 'Convert a single printable ASCII character into its integer code and next character.',
    description: [
      'Given a single ASCII character ch (between "A" and "Y" or "a" and "y"), output its numeric ASCII value and the immediately following character in the alphabet.',
    ],
    constraints: ['ch is a single ASCII letter from A..Y or a..y.'],
    examples: [{ input: 'ch = "A"', output: '65 B' }],
    ioHint: {
      c: 'In C, char is an integer type: (int)ch gives the ASCII code and (char)(ch + 1) gives the next letter.',
      cpp: 'Use static_cast<int>(ch) and static_cast<char>(ch + 1).',
      java: 'Cast (int) ch for ASCII value and (char) (ch + 1) for the next character.',
      python: 'Use ord(ch) for the ASCII value and chr(ord(ch) + 1) for the next character.',
    },
  },
  {
    level: 7,
    slug: 'quotient-and-remainder',
    title: 'Packet Batch Quotient & Remainder',
    shortConcept: 'Integer Division & Modulo',
    targetTime: 'O(1)',
    targetSpace: 'O(1)',
    summary: 'Divide total packets by batch size to compute full batches and leftover packets.',
    description: [
      'Given non-negative integer totalPackets and positive integer batchSize, calculate how many complete batches can be formed (quotient) and how many packets remain (remainder).',
    ],
    constraints: ['0 <= totalPackets <= 10^9', '1 <= batchSize <= 10^9'],
    examples: [{ input: 'totalPackets = 23, batchSize = 5', output: 'batches = 4, leftover = 3' }],
    ioHint: {
      c: 'Use / for integer quotient and % for remainder.',
      cpp: 'Use totalPackets / batchSize and totalPackets % batchSize.',
      java: 'Use / and % on int/long operands.',
      python: 'Use // (floor integer division) and % (or divmod(total, batch)).',
    },
  },
  {
    level: 8,
    slug: 'simple-interest-calc',
    title: 'Simple Interest Calculator',
    shortConcept: 'Precision Double Arithmetic',
    targetTime: 'O(1)',
    targetSpace: 'O(1)',
    summary: 'Compute simple interest SI = (P * R * T) / 100.0 from principal, rate, and years.',
    description: [
      'Given principal P, annual interest rate R (percentage), and duration T in years, compute the simple interest and total final amount P + SI.',
      'Use double-precision floating-point arithmetic so fractional rates remain accurate.',
    ],
    constraints: ['0 <= P <= 10^7', '0 <= R <= 100', '0 <= T <= 50'],
    examples: [{ input: 'P = 1000, R = 5.5, T = 2', output: 'interest = 110.00, total = 1110.00' }],
    ioHint: {
      c: 'Use double variables and divide by 100.0.',
      cpp: 'Use double for P, R, T and format to 2 decimal places.',
      java: 'Use double (not int) for (P * R * T) / 100.0.',
      python: 'Use float values and compute si = (p * r * t) / 100.0.',
    },
  },
  {
    level: 9,
    slug: 'seconds-to-hms',
    title: 'Match Timer Seconds to HH:MM:SS',
    shortConcept: 'Chained Division & Modulo',
    targetTime: 'O(1)',
    targetSpace: 'O(1)',
    summary: 'Convert a total number of seconds into hours, minutes, and remaining seconds.',
    description: [
      'Given a non-negative integer totalSeconds, decompose it into hours, minutes (0..59), and seconds (0..59) and format as HH:MM:SS with two-digit zero padding.',
    ],
    constraints: ['0 <= totalSeconds <= 359999'],
    examples: [{ input: 'totalSeconds = 3665', output: '01:01:05' }],
    ioHint: {
      c: 'Compute h = s / 3600, m = (s % 3600) / 60, sec = s % 60; format with printf("%02d:%02d:%02d", h, m, sec).',
      cpp: 'Use / and % with std::setw(2) << std::setfill(\'0\') or std::format.',
      java: 'Use String.format("%02d:%02d:%02d", h, m, sec).',
      python: 'Use // and % with f"{h:02d}:{m:02d}:{sec:02d}".',
    },
  },
  {
    level: 10,
    slug: 'three-score-average',
    title: 'Exact Average of Three Match Scores',
    shortConcept: 'Type Casting & Formatted Output',
    targetTime: 'O(1)',
    targetSpace: 'O(1)',
    summary: 'Compute the exact floating-point average of three integer scores without truncation.',
    description: [
      'Given three integer match scores s1, s2, and s3, compute their exact arithmetic average rounded to 2 decimal places.',
      'Ensure you do not accidentally perform integer division before converting to floating-point.',
    ],
    constraints: ['0 <= s1, s2, s3 <= 100000'],
    examples: [{ input: 's1 = 10, s2 = 11, s3 = 12', output: '11.00' }, { input: 's1 = 1, s2 = 2, s3 = 2', output: '1.67' }],
    ioHint: {
      c: 'Divide by 3.0 or cast (double)(s1 + s2 + s3) / 3.0.',
      cpp: 'Cast static_cast<double>(s1 + s2 + s3) / 3.0.',
      java: 'Use (s1 + s2 + s3) / 3.0 and format with "%.2f".',
      python: 'Use (s1 + s2 + s3) / 3 and format with f"{avg:.2f}".',
    },
  },
];

const PART_2_TOPICS: Array<[string, string, string, string, string, string]> = [
  ['Even or Odd Classifier', 'if/else Modulo', 'Check whether integer n is even or odd in O(1) time.', 'n = 14', '"EVEN"', 'O(1)'],
  ['Maximum of Three Scores', 'Nested Conditionals', 'Return the largest of three integers a, b, c cleanly without sorting.', 'a = 9, b = 21, c = 15', '21', 'O(1)'],
  ['Leap Year Verifier', 'Compound Boolean Logic', 'Determine if a Gregorian calendar year is a leap year (divisible by 400 or by 4 and not 100).', 'year = 2024', 'true', 'O(1)'],
  ['Letter Grade Bucketer', 'Multi-Branch Ladder', 'Map numeric score 0..100 into A, B, C, D, or F using clean ordered thresholds.', 'score = 84', '"B"', 'O(1)'],
  ['Sum of First N Naturals', 'For Loop Accumulator', 'Loop from 1 to N and accumulate the sum safely using a 64-bit counter.', 'N = 5', '15', 'O(n)'],
  ['Factorial Without Overflow', 'While / For Loop', 'Compute N! iteratively for 0 <= N <= 20 using 64-bit integer arithmetic.', 'N = 5', '120', 'O(n)'],
  ['Digit Counter & Reverser', 'While Loop Extraction', 'Reverse the decimal digits of a positive integer using modulo 10 and division by 10.', 'n = 1204', '4021', 'O(log n)'],
  ['Prime Number Checker', 'Sqrt Loop Bound', 'Check whether integer n >= 2 is prime by testing divisors only up to sqrt(n).', 'n = 29', 'true', 'O(sqrt(n))'],
  ['FizzBuzz Sequence Builder', 'Divisibility Branching', 'Generate 1..N replacing multiples of 3, 5, and 15 with Fizz, Buzz, and FizzBuzz.', 'N = 5', '1 2 Fizz 4 Buzz', 'O(n)'],
  ['Right-Aligned Star Pyramid', 'Nested Loops', 'Print an N-row right-aligned triangle using outer row and inner space/star loops.', 'N = 3', '  * /  ** / ***', 'O(n^2)'],
];

const PART_3_TOPICS: Array<[string, string, string, string, string, string]> = [
  ['Sensor Spike Filter & Mean', 'Helper Functions & Arrays', 'Filter out-of-range array readings outside [low, high] and compute exact floating-point mean.', '[10, -5, 20, 105, 30], [0, 100]', '20.00', 'O(n)'],
  ['Array Min, Max & Range', 'Single-Pass Scan', 'Find the minimum and maximum values in an array in one linear pass without sorting.', '[12, 4, 19, 7]', 'min=4, max=19', 'O(n)'],
  ['In-Place Array Reversal', 'Two-Index Swap', 'Reverse an array of length n in-place with O(1) extra space.', '[1, 2, 3, 4]', '[4, 3, 2, 1]', 'O(n)'],
  ['Second Largest Distinct Element', 'Stateful Linear Pass', 'Find the second largest strictly distinct integer in an array in one pass.', '[10, 20, 20, 8]', '10', 'O(n)'],
  ['Vowel & Consonant Tally', 'Character Loop & Strings', 'Count ASCII vowels and consonants in a string ignoring digits and punctuation.', '"Tech-Leveling"', 'vowels=4, consonants=8', 'O(n)'],
  ['Case-Insensitive Palindrome', 'Two-Pointer String Scan', 'Check if a string reads identically forwards and backwards ignoring non-alphanumeric chars.', '"Race car!"', 'true', 'O(n)'],
  ['Character Frequency Histogram', 'Fixed 26-Slot Array', 'Find the most frequent lowercase English letter in O(n) time and O(1) auxiliary space.', '"abracadabra"', '"a" (5)', 'O(n)'],
  ['Word Counter & Space Trimmer', 'Token State Machine', 'Count words separated by arbitrary runs of spaces without allocating split arrays.', '"  code   fast  "', '2', 'O(n)'],
  ['Anagram Verifier', 'Frequency Balance Array', 'Determine whether two lowercase strings are anagrams in O(n) time and O(1) space.', '"listen", "silent"', 'true', 'O(n)'],
  ['Run-Length String Compressor', 'Linear String Builder', 'Compress consecutive duplicate chars (e.g. "aaabbc" -> "a3b2c1") without O(n^2) concatenation.', '"aaabbc"', '"a3b2c1"', 'O(n)'],
];

const PART_4_TOPICS: Array<[string, string, string, string, string, string]> = [
  ['Safe Reference / Pointer Swap', 'Memory Addresses & Refs', 'Modify caller state via pointers/references cleanly without null dereference.', 'a = 10, b = 25', 'a = 25, b = 10', 'O(1)'],
  ['In-Place Quoted Token Normalizer', 'In-Place Buffer Mutation', 'Collapse repeated spaces while preserving spaces inside double quotes in O(n) time.', '"  gcc  -o \\"my  app\\"  "', '"gcc -o \\"my  app\\""', 'O(n)'],
  ['Encapsulated Bank Ledger Class/Struct', 'OOP Encapsulation', 'Design a stateful Account with deposit, guarded withdraw, and read-only balance.', 'deposit(100), withdraw(40)', 'balance = 60', 'O(1)'],
  ['Polymorphic Log Redactor Pipeline', 'OOP Interfaces / Callbacks', 'Mask sensitive "token=" or "key=" segments via an extensible rule abstraction.', '"user=ada token=xyz"', '"user=ada token=***"', 'O(n)'],
  ['Immutable-Safe Template Expander', 'OOP + Linear Builder', 'Expand {{key}} placeholders from a key-value lookup in one O(n) pass.', '"Hi {{name}}", {name:"Ada"}', '"Hi Ada"', 'O(n)'],
  ['Dynamic Resizing Int Buffer', 'Manual / Managed Growth', 'Maintain an appendable buffer with doubling capacity so push is amortized O(1).', 'push 1, 2, 3, 4, 5', 'size=5, cap=8', 'O(1) amort'],
  ['Bounded Circular Queue', 'Ring Buffer Indexing', 'Implement O(1) enqueue and dequeue using modulo head/tail indices without shifting.', 'cap=3: enq 1,2, deq, enq 3,4', 'front=2, size=3', 'O(1)'],
  ['Session Transcript Mention Parser', 'Class State + Deduplication', 'Extract unique @mentions in first-seen order while skipping code inside backticks.', '"@ada ping `@skip` @linus"', '["ada", "linus"]', 'O(n)'],
  ['Balanced Bracket Validator', 'Stack State Hygiene', 'Verify nested (), [], and {} delimiters with clean O(n) push/pop lifecycle.', '"{[()]}"', 'true', 'O(n)'],
  ['Deep Copy vs Shallow Reference Guard', 'Ownership & Lifetime', 'Clone a nested configuration object/struct cleanly so mutating the copy never mutates the source.', 'clone.port = 8080', 'orig.port unchanged', 'O(n)'],
];

const PART_5_TOPICS: Array<[string, string, string, string, string, string]> = [
  ['Two-Sum in Single Pass', 'Hash Lookup Big-O', 'Find two indices summing to target in O(n) time instead of O(n^2) nested loops.', '[2, 7, 11, 15], target=9', '[0, 1]', 'O(n)'],
  ['Prefix Sum Range Queries', 'O(1) Query Precomputation', 'Precompute prefix sums so Q subarray sum queries answer in O(1) each.', 'nums=[3,1,4,2], range(1,3)', '7', 'O(n + q)'],
  ['Sliding Window Longest Unique Span', 'Two Pointers O(n)', 'Compute the longest substring without duplicate characters in strict O(n) time.', '"abcabcbb"', '3', 'O(n)'],
  ['Zero-Copy Sliding Window Peak', 'Monotonic Deque O(n)', 'Compute the max of every length-k window in O(n) time and O(k) auxiliary space.', '[1,3,-1,-3,5,3,6,7], k=3', '[3,3,5,5,6,7]', 'O(n)'],
  ['GC-Free Next Greater Spike', 'Primitive Monotonic Stack', 'Find distance to next strictly greater element in O(n) time avoiding boxed collections.', '[42,45,41,39,50,48]', '[1,3,2,1,0,0]', 'O(n)'],
  ['Streaming Memory-Bounded Top-K', 'Size-K Min-Heap O(n log k)', 'Extract the top k latencies from an unbounded stream while holding only O(k) memory.', 'stream=[12,95,40,88], k=2', '[95, 88]', 'O(n log k)'],
  ['Binary Search on Answer Capacity', 'Monotonic Feasibility', 'Find the minimum shipping capacity to deliver packages within D days in O(n log S).', 'weights=[1,2,3,4,5], D=2', '9', 'O(n log S)'],
  ['Merge Overlapping Time Intervals', 'Sort + Linear Sweep', 'Merge all overlapping [start, end] intervals in O(n log n) time.', '[[1,3],[2,6],[8,10]]', '[[1,6],[8,10]]', 'O(n log n)'],
  ['Cache-Friendly Weighted Job DP', 'Sort + Binary Search DP', 'Maximize non-overlapping job profit in O(n log n) time using contiguous flat storage.', 'jobs=[(1,3,50),(3,6,70)]', '120', 'O(n log n)'],
  ['O(1)-Space In-Place Cycle & Duplicate', 'Floyd Tortoise & Hare', 'Detect the duplicate number in 1..n without modifying input or allocating an O(n) set.', '[3,1,3,4,2]', '3', 'O(n)'],
];

function buildPartProblem(
  language: ProgrammingLanguage,
  part: PartNumber,
  level: number,
): ProblemStatement {
  const partMeta = PROGRESSION_PARTS[part - 1];
  const langLabel =
    language === 'c' ? 'C' : language === 'cpp' ? 'C++' : language === 'java' ? 'Java' : 'Python';

  if (part === 1) {
    const bp = PART_1_LEVELS[Math.max(0, Math.min(9, level - 1))];
    return {
      id: `${language}-p1-l${bp.level}-${bp.slug}`,
      title: bp.title,
      tier: partMeta.tier,
      partNumber: 1,
      levelNumber: bp.level,
      languageFocus: language,
      topic: `Part 1 · Level ${bp.level}: ${bp.shortConcept}`,
      focusArea: `${langLabel} · Absolute Basics · ${bp.shortConcept}`,
      dataStructure: 'Primitive Variables & Standard I/O',
      targetTimeComplexity: bp.targetTime,
      targetSpaceComplexity: bp.targetSpace,
      timeLimitSeconds: partMeta.timeMinutes * 60,
      coinReward: partMeta.coinBase + (bp.level - 1) * 10,
      summary: bp.summary,
      description: bp.description,
      constraints: bp.constraints,
      examples: bp.examples,
      inputOutputNote: bp.ioHint[language],
    };
  }

  const bank =
    part === 2
      ? PART_2_TOPICS
      : part === 3
        ? PART_3_TOPICS
        : part === 4
          ? PART_4_TOPICS
          : PART_5_TOPICS;
  const idx = Math.max(0, Math.min(9, level - 1));
  const [title, shortConcept, summary, sampleIn, sampleOut, targetTime] = bank[idx];
  const targetSpace = part === 5 && idx === 5 ? 'O(k)' : part >= 4 && idx >= 4 ? 'O(n)' : 'O(1)';

  return {
    id: `${language}-p${part}-l${level}`,
    title,
    tier: partMeta.tier,
    partNumber: part,
    levelNumber: level,
    languageFocus: language,
    topic: `Part ${part} · Level ${level}: ${shortConcept}`,
    focusArea: `${langLabel} · ${partMeta.title} · ${shortConcept}`,
    dataStructure: shortConcept,
    targetTimeComplexity: targetTime,
    targetSpaceComplexity: targetSpace,
    timeLimitSeconds: partMeta.timeMinutes * 60,
    coinReward: partMeta.coinBase + (level - 1) * 15,
    summary,
    description: [
      summary,
      `Implement a clean, production-grade ${langLabel} solution focusing on ${partMeta.languageSpecificFocus[language]}.`,
      `Your submission is adjudicated strictly on correctness, ${langLabel} language hygiene, and achieving ${targetTime} Time / ${targetSpace} Space complexity.`,
    ],
    constraints: [
      part <= 2 ? '1 <= n <= 10^4' : '1 <= n <= 2 * 10^5',
      `Must satisfy ${targetTime} time and ${targetSpace} auxiliary space bounds.`,
    ],
    examples: [{ input: sampleIn, output: sampleOut }],
    inputOutputNote: `Write a complete ${langLabel} function or program matching the specification. Avoid hidden allocations or undefined behavior.`,
  };
}

const PROGRESSION_CACHE = new Map<string, ProblemStatement>();

export function getProgressionProblem(
  language: ProgrammingLanguage,
  part: PartNumber,
  level: number,
): ProblemStatement {
  const safePart = (Math.max(1, Math.min(5, Math.floor(part))) as PartNumber) || 1;
  const safeLevel = Math.max(1, Math.min(10, Math.floor(level))) || 1;
  const key = `${language}:${safePart}:${safeLevel}`;
  let existing = PROGRESSION_CACHE.get(key);
  if (!existing) {
    existing = buildPartProblem(language, safePart, safeLevel);
    PROGRESSION_CACHE.set(key, existing);
  }
  return existing;
}

export function getLevelsForLanguageAndPart(
  language: ProgrammingLanguage,
  part: PartNumber,
): ProblemStatement[] {
  const out: ProblemStatement[] = [];
  for (let lvl = 1; lvl <= 10; lvl++) {
    out.push(getProgressionProblem(language, part, lvl));
  }
  return out;
}

export function getProgressionProblemById(problemId: string): ProblemStatement | undefined {
  // Match pattern "<lang>-p<1..5>-l<1..10>..."
  const match = /^(c|cpp|java|python)-p([1-5])-l(10|[1-9])(?:-[a-z0-9-]+)?$/i.exec(problemId);
  if (!match) return undefined;
  const lang = match[1].toLowerCase() as ProgrammingLanguage;
  const part = Number(match[2]) as PartNumber;
  const level = Number(match[3]);
  return getProgressionProblem(lang, part, level);
}

export function getPartMeta(part: PartNumber): ProgressionPartMeta {
  return PROGRESSION_PARTS[part - 1] ?? PROGRESSION_PARTS[0];
}
