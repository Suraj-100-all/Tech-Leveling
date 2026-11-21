import type { DifficultyTier, ProblemStatement, ProgrammingLanguage } from '../types/arena.ts';
import { getProgressionProblemById } from './progression.ts';

export const LANGUAGE_CONFIG: Record<
  ProgrammingLanguage,
  {
    label: string;
    shortLabel: string;
    runtimeLabel: string;
    masteryFocus: string;
  }
> = {
  c: {
    label: 'C',
    shortLabel: 'C11',
    runtimeLabel: 'GCC C11',
    masteryFocus: 'Pointers, manual memory safety, string.h & zero-overhead loops',
  },
  cpp: {
    label: 'C++',
    shortLabel: 'C++20',
    runtimeLabel: 'G++ C++20',
    masteryFocus: 'OOP & RAII, STL containers, references, move semantics',
  },
  java: {
    label: 'Java',
    shortLabel: 'Java 21',
    runtimeLabel: 'OpenJDK 21',
    masteryFocus: 'Classes & interfaces, StringBuilder immutability, primitive arrays',
  },
  python: {
    label: 'Python',
    shortLabel: 'Python 3',
    runtimeLabel: 'CPython 3.12',
    masteryFocus: 'Idiomatic functions, OOP classes, slicing, generators & memory bounds',
  },
};

export const TIER_CONFIG: Record<
  DifficultyTier,
  {
    label: string;
    difficultyLabel: string;
    subtitle: string;
    targetTopics: string;
    coinReward: number;
    timeMinutes: number;
  }
> = {
  rookie: {
    label: 'Rookie',
    difficultyLabel: 'Easy',
    subtitle: 'Core language syntax, loops, conditionals, and basic functions.',
    targetTopics: 'Syntax Fundamentals · Control Flow · Loops & Functions',
    coinReward: 150,
    timeMinutes: 15,
  },
  challenger: {
    label: 'Challenger',
    difficultyLabel: 'Medium',
    subtitle: 'Object-Oriented Programming (Java/C++), string manipulation, and intermediate logic.',
    targetTopics: 'OOP & Encapsulation · String Parsing · Intermediate State Logic',
    coinReward: 320,
    timeMinutes: 25,
  },
  pro: {
    label: 'Pro',
    difficultyLabel: 'Hard',
    subtitle: 'Memory optimization, complex logic, and Big-O efficiency.',
    targetTopics: 'Memory Optimization · Zero-Allocation Logic · Big-O Efficiency',
    coinReward: 600,
    timeMinutes: 35,
  },
};

export const PROBLEM_BANK: ProblemStatement[] = [
  // ==================== ROOKIE (EASY): CORE SYNTAX, LOOPS, CONDITIONALS, BASIC FUNCTIONS ====================
  {
    id: 'rookie-c-sensor-normalizer',
    title: 'Sensor Spike Filter & Mean Calculator',
    tier: 'rookie',
    languageFocus: 'c',
    topic: 'C Loops, Conditionals & Helper Functions',
    focusArea: 'Core C Syntax · stdio.h · Loops & Conditionals',
    dataStructure: 'Static Array & Scalar Accumulators',
    targetTimeComplexity: 'O(n)',
    targetSpaceComplexity: 'O(1)',
    timeLimitSeconds: 900,
    coinReward: 150,
    summary: 'Write a clean C function using loops and conditionals to filter out-of-range readings and compute the exact floating-point average.',
    description: [
      'Given an integer array readings of length n and inclusive bounds [low, high], write a C function that ignores corrupted readings outside [low, high] and returns the arithmetic mean of all valid readings as a double.',
      'If zero readings fall within [low, high], return 0.0 safely without dividing by zero.',
      'Focus on clean C syntax: explicit loop bounds, avoiding integer division truncation, and preventing 32-bit sum overflow using long long.',
    ],
    constraints: [
      '1 <= n <= 2 * 10^5',
      '-10^6 <= readings[i] <= 10^6',
      'Return 0.0 when no valid readings exist.',
    ],
    examples: [
      {
        input: 'readings = [10, -5, 20, 105, 30], low = 0, high = 100',
        output: '20.00',
        explanation: 'Valid values are 10, 20, 30 -> sum 60 / 3 = 20.0.',
      },
      {
        input: 'readings = [-10, 200], low = 0, high = 50',
        output: '0.00',
      },
    ],
    inputOutputNote:
      'Implement a complete C function (e.g., double filtered_mean(const int *readings, int n, int low, int high)). Include necessary standard headers.',
  },
  {
    id: 'rookie-cpp-threshold-counter',
    title: 'Telemetry Band Classifier',
    tier: 'rookie',
    languageFocus: 'cpp',
    topic: 'C++ Functions, Const References & Control Flow',
    focusArea: 'Core C++ Syntax · Range-Based Loops · Conditionals',
    dataStructure: 'std::vector & Fixed Counter Struct/Array',
    targetTimeComplexity: 'O(n)',
    targetSpaceComplexity: 'O(1)',
    timeLimitSeconds: 900,
    coinReward: 150,
    summary: 'Classify temperature logs into Cold, Optimal, and Overheat bands in a single pass using idiomatic C++ loops and const references.',
    description: [
      'Given a const std::vector<int>& temps, write a C++ function that classifies every value into three bands: Cold (< 20), Optimal (20..75 inclusive), and Overheat (> 75), returning the three counts.',
      'Pass the input vector by const reference to avoid an unnecessary O(n) copy, and use clear conditional branches inside a single range-based for loop.',
    ],
    constraints: [
      '0 <= temps.size() <= 5 * 10^5',
      '-100 <= temps[i] <= 200',
    ],
    examples: [
      {
        input: 'temps = [12, 20, 45, 75, 92, 101]',
        output: '{cold: 1, optimal: 3, overheat: 2}',
      },
      {
        input: 'temps = []',
        output: '{cold: 0, optimal: 0, overheat: 0}',
      },
    ],
    inputOutputNote:
      'Write a complete C++ function or program returning a struct, std::array<int, 3>, or printing the three counts.',
  },
  {
    id: 'rookie-java-grade-evaluator',
    title: 'Weighted Exam Pass & Honors Evaluator',
    tier: 'rookie',
    languageFocus: 'java',
    topic: 'Java Static Methods, Loops & Conditionals',
    focusArea: 'Core Java Syntax · Primitive Loops · Branch Logic',
    dataStructure: 'Primitive int[] Array',
    targetTimeComplexity: 'O(n)',
    targetSpaceComplexity: 'O(1)',
    timeLimitSeconds: 900,
    coinReward: 150,
    summary: 'Write a Java method that loops through student scores, drops the single lowest score, and classifies the remaining average.',
    description: [
      'Given an int[] scores array with at least 2 exam scores (0 to 100), drop the single lowest score and compute the average of the remaining n - 1 scores.',
      'Return "HONORS" if the adjusted average >= 90.0, "PASS" if >= 60.0, or "FAIL" otherwise.',
      'Compute the total and minimum in one O(n) loop with O(1) space—no sorting required.',
    ],
    constraints: [
      '2 <= scores.length <= 10^5',
      '0 <= scores[i] <= 100',
    ],
    examples: [
      {
        input: 'scores = [40, 92, 95, 88]',
        output: '"HONORS"',
        explanation: 'Drop 40 -> average of [92, 95, 88] is 91.67 >= 90.0.',
      },
      {
        input: 'scores = [55, 62, 60]',
        output: '"PASS"',
      },
    ],
    inputOutputNote:
      'Implement a clean Java class and method (e.g., public static String evaluate(int[] scores)). Watch floating-point casting in Java.',
  },
  {
    id: 'rookie-python-batch-cleaner',
    title: 'Log Severity Counter & Cleaner',
    tier: 'rookie',
    languageFocus: 'python',
    topic: 'Python Functions, Loops & Conditionals',
    focusArea: 'Core Python Syntax · Loops · Conditionals & Dicts',
    dataStructure: 'List & Dictionary Counters',
    targetTimeComplexity: 'O(n)',
    targetSpaceComplexity: 'O(1)',
    timeLimitSeconds: 900,
    coinReward: 150,
    summary: 'Write a Python function to normalize raw log lines and tally INFO, WARN, and ERROR events cleanly.',
    description: [
      'Given a list of strings logs, each optionally surrounded by whitespace and mixed-case prefixes like "  warn: disk full", write a Python function count_severities(logs) returning a dictionary {"INFO": x, "WARN": y, "ERROR": z}.',
      'Ignore blank lines or lines that do not start with INFO:, WARN:, or ERROR: after stripping whitespace and uppercasing the prefix.',
    ],
    constraints: [
      '0 <= len(logs) <= 2 * 10^5',
      'Each line has length <= 200.',
    ],
    examples: [
      {
        input: 'logs = ["  info: boot", "WARN: high cpu", "error: timeout", "debug: skip"]',
        output: '{"INFO": 1, "WARN": 1, "ERROR": 1}',
      },
    ],
    inputOutputNote:
      'Write a clean Python function count_severities(logs: list[str]) -> dict[str, int] running in a single O(n) pass.',
  },

  // ==================== CHALLENGER (MEDIUM): OOP, STRING MANIPULATION, INTERMEDIATE LOGIC ====================
  {
    id: 'challenger-c-token-normalizer',
    title: 'Safe In-Place CSV Path & Token Normalizer',
    tier: 'challenger',
    languageFocus: 'c',
    topic: 'C String Manipulation & Pointer Discipline',
    focusArea: 'string.h · Null-Terminated char* Buffers · Intermediate Logic',
    dataStructure: 'In-Place Character Buffer (Two Pointers)',
    targetTimeComplexity: 'O(n)',
    targetSpaceComplexity: 'O(1)',
    timeLimitSeconds: 1500,
    coinReward: 320,
    summary: 'Collapse repeated delimiters, trim leading/trailing spaces, and preserve quoted segments in a C char buffer without buffer overflows.',
    description: [
      'Given a mutable null-terminated C string s, write a function normalize_command(char *s) that collapses consecutive spaces into a single space, removes leading and trailing spaces, and keeps any spaces inside double quotes ("...") untouched.',
      'Perform the transformation in-place in O(n) time and O(1) extra memory, ensuring the final buffer is properly null-terminated with \'\\0\'.',
    ],
    constraints: [
      '0 <= strlen(s) <= 2 * 10^5',
      'Double quotes are balanced.',
      'Must remain O(n) time and O(1) auxiliary space.',
    ],
    examples: [
      {
        input: '"   gcc   -o   \\"my  app\\"   main.c   "',
        output: '"gcc -o \\"my  app\\" main.c"',
      },
    ],
    inputOutputNote:
      'Include <string.h> / <ctype.h> as needed. Never allocate O(n^2) temporary copies or dereference past the null terminator.',
  },
  {
    id: 'challenger-cpp-oop-log-pipeline',
    title: 'Polymorphic Event Filter & String Redactor',
    tier: 'challenger',
    languageFocus: 'cpp',
    topic: 'C++ OOP (Virtual Interfaces) & String Manipulation',
    focusArea: 'OOP Classes · Virtual Dispatch · std::string Parsing',
    dataStructure: 'Class Hierarchy & Single-Pass String Builder',
    targetTimeComplexity: 'O(n)',
    targetSpaceComplexity: 'O(n)',
    timeLimitSeconds: 1500,
    coinReward: 320,
    summary: 'Design an extensible C++ OOP TextRule interface with concrete redaction rules that sanitize sensitive key=value fields in one linear pass.',
    description: [
      'Design a C++ base class TextRule with a pure virtual method std::string apply(const std::string& input) const and virtual destructor.',
      'Implement two concrete rules: SecretMaskRule (masks the value of any token starting with "token=" or "key=" with "***") and WhitespaceCollapseRule (collapses runs of whitespace into single spaces).',
      'Implement a Pipeline class holding rules via std::unique_ptr<TextRule> (RAII) and executing them sequentially in O(n) total string time without quadratic string concatenation.',
    ],
    constraints: [
      'Total input string length <= 2 * 10^5',
      'Must demonstrate proper virtual destructor and RAII ownership.',
    ],
    examples: [
      {
        input: '"user=ada   token=xyz991   role=eng"',
        output: '"user=ada token=*** role=eng"',
      },
    ],
    inputOutputNote:
      'Write clean C++20 OOP classes with std::string::reserve() or linear parsing. Avoid raw owning new/delete leaks.',
  },
  {
    id: 'challenger-java-oop-template-engine',
    title: 'OOP String Formatter & Immutable Template Engine',
    tier: 'challenger',
    languageFocus: 'java',
    topic: 'Java OOP Design & StringBuilder Manipulation',
    focusArea: 'OOP Interfaces · String Immutability · Token Parsing',
    dataStructure: 'Java Interface/Classes + StringBuilder + Map',
    targetTimeComplexity: 'O(n)',
    targetSpaceComplexity: 'O(n)',
    timeLimitSeconds: 1500,
    coinReward: 320,
    summary: 'Build an OOP Java Formatter class that expands {{key}} placeholders and applies casing policies in O(n) time using StringBuilder.',
    description: [
      'Design a Java interface ValueTransform and a class TemplateRenderer that accepts a template string and a Map<String, String> variables.',
      'Replace every {{key}} placeholder with the transformed map value (or keep "{{key}}" unchanged if missing). Support escaped braces "\\{{" cleanly.',
      'Because Java String is immutable, repeated string concatenation inside loops degrades to O(n^2). Use StringBuilder in a single linear scan for O(n) time.',
    ],
    constraints: [
      '1 <= template.length() <= 2 * 10^5',
      '0 <= variables.size() <= 5 * 10^4',
    ],
    examples: [
      {
        input: 'template = "Hello {{name}}, tier={{tier}}!", vars = {name: "maya", tier: "challenger"} (UppercaseTransform)',
        output: '"Hello MAYA, tier=CHALLENGER!"',
      },
    ],
    inputOutputNote:
      'Implement clean Java OOP classes with encapsulation and StringBuilder. Avoid Regex ReDoS or String += inside loops.',
  },
  {
    id: 'challenger-python-oop-markdown-parser',
    title: 'OOP Session Transcript Parser & Mention Extractor',
    tier: 'challenger',
    languageFocus: 'python',
    topic: 'Python OOP Classes & String Manipulation',
    focusArea: 'Classes & Encapsulation · String Parsing · Intermediate Logic',
    dataStructure: 'Python Class State + List Join',
    targetTimeComplexity: 'O(n)',
    targetSpaceComplexity: 'O(n)',
    timeLimitSeconds: 1500,
    coinReward: 320,
    summary: 'Create a Python OOP TranscriptAnalyzer class that parses chat lines, normalizes @mentions, and tracks unique participant stats cleanly.',
    description: [
      'Implement a Python class TranscriptAnalyzer with methods ingest(line: str), unique_mentions() -> list[str], and render_clean() -> str.',
      'Each line follows "[timestamp] @sender: message". Ignore malformed lines, extract valid @mentions (alphanumeric + underscore, ignoring mentions inside backticks `...`), and build the cleaned output with "".join(...) rather than O(n^2) string += accumulation.',
    ],
    constraints: [
      'Total characters across all lines <= 2 * 10^5',
      'Preserve first-seen order for unique mentions.',
    ],
    examples: [
      {
        input: '["[10:01] @ada: check `@ignored` and ping @linus", "[10:02] @linus: on it @ada"]',
        output: 'unique_mentions -> ["linus", "ada"]',
      },
    ],
    inputOutputNote:
      'Implement a clean Python class using O(n) string scanning and O(1) set lookups.',
  },

  // ==================== PRO (HARD): MEMORY OPTIMIZATION, COMPLEX LOGIC, BIG-O EFFICIENCY ====================
  {
    id: 'pro-c-zero-copy-sliding-max',
    title: 'Zero-Copy Sliding Window Peak Detector',
    tier: 'pro',
    languageFocus: 'c',
    topic: 'C Memory Optimization, Pointer Bounds & O(n) Monotonic Deque',
    focusArea: 'Manual Memory Management · Zero-Leak Allocation · O(n) Efficiency',
    dataStructure: 'Fixed-Size Primitive Circular Array Deque',
    targetTimeComplexity: 'O(n)',
    targetSpaceComplexity: 'O(k)',
    timeLimitSeconds: 2100,
    coinReward: 600,
    summary: 'Compute the maximum value in every sliding window of size k using a manually managed circular index buffer in strict O(n) time and O(k) space.',
    description: [
      'Given an integer array nums of length n and window size k (1 <= k <= n), write a C function that writes the maximum of every contiguous subarray of length k into a caller-provided output buffer out of length n - k + 1.',
      'Allocate at most one temporary int array of size k (circular monotonic deque of indices), verify malloc != NULL, avoid out-of-bounds pointer arithmetic, and free your temporary buffer before returning.',
      'An O(n * k) nested scan fails on Big-O efficiency; an unfreed heap allocation fails memory hygiene.',
    ],
    constraints: [
      '1 <= k <= n <= 5 * 10^5',
      '-10^9 <= nums[i] <= 10^9',
      'Strict O(n) time and O(k) auxiliary memory with zero leaks.',
    ],
    examples: [
      {
        input: 'nums = [1, 3, -1, -3, 5, 3, 6, 7], k = 3',
        output: '[3, 3, 5, 5, 6, 7]',
      },
    ],
    inputOutputNote:
      'Write complete, memory-safe C11 code with checked malloc/free and circular index arithmetic.',
  },
  {
    id: 'pro-cpp-cache-friendly-scheduler',
    title: 'Cache-Friendly Weighted Job Scheduler',
    tier: 'pro',
    languageFocus: 'cpp',
    topic: 'C++ Memory Optimization, Move Semantics & O(n log n) DP',
    focusArea: 'Struct Packing · Vector Reserve · O(n log n) Efficiency',
    dataStructure: 'Contiguous std::vector + std::upper_bound DP',
    targetTimeComplexity: 'O(n log n)',
    targetSpaceComplexity: 'O(n)',
    timeLimitSeconds: 2100,
    coinReward: 600,
    summary: 'Maximize total payout across non-overlapping compute jobs using contiguous memory layout, pre-reserved vectors, and O(n log n) DP + binary search.',
    description: [
      'You are given n compute jobs (start, end, profit). Two jobs are compatible when end[a] <= start[b]. Return the maximum 64-bit profit achievable.',
      'Pack jobs in a contiguous flat struct vector (pre-reserved to prevent reallocations), sort by end time, and compute the optimal DP table using std::upper_bound in O(n log n) time and O(n) space.',
      'Watch 64-bit integer accumulation (int64_t) and avoid heap-fragmenting pointer structures like std::list or std::map.',
    ],
    constraints: [
      '1 <= n <= 10^5',
      '1 <= start[i] < end[i] <= 10^9',
      '1 <= profit[i] <= 10^6',
    ],
    examples: [
      {
        input: 'start = [1, 2, 3, 3], end = [3, 4, 5, 6], profit = [50, 10, 40, 70]',
        output: '120',
      },
    ],
    inputOutputNote:
      'Use int64_t, contiguous std::vector with reserve(), and O(n log n) binary search.',
  },
  {
    id: 'pro-java-primitive-ring-window',
    title: 'GC-Free High-Throughput Load Spike Analyzer',
    tier: 'pro',
    languageFocus: 'java',
    topic: 'Java Memory Optimization & Primitive Monotonic Stack',
    focusArea: 'Avoiding Boxed Integer MLE · Primitive Arrays · O(n) Efficiency',
    dataStructure: 'Primitive int[] Stack (Zero Autoboxing)',
    targetTimeComplexity: 'O(n)',
    targetSpaceComplexity: 'O(n)',
    timeLimitSeconds: 2100,
    coinReward: 600,
    summary: 'For each minute in a high-frequency CPU load stream, compute minutes until a strictly higher spike while avoiding boxed Integer / LinkedList GC overhead.',
    description: [
      'Given an int[] loads of length up to 5 * 10^5, return an int[] wait where wait[i] is the number of minutes after index i until a strictly greater load occurs (0 if none).',
      'Using Stack<Integer> or ArrayDeque<Integer> incurs millions of boxed Integer allocations and risks Memory Limit Exceeded (MLE) or GC pauses under tight memory budgets. Implement a manual primitive int[] index stack with a top pointer for strict O(n) time and minimal memory footprint.',
    ],
    constraints: [
      '1 <= loads.length <= 5 * 10^5',
      '0 <= loads[i] <= 10^6',
      'Zero autoboxing inside the hot loop.',
    ],
    examples: [
      {
        input: 'loads = [42, 45, 41, 39, 50, 48]',
        output: '[1, 3, 2, 1, 0, 0]',
      },
    ],
    inputOutputNote:
      'Write a Java method using a primitive int[] stack rather than boxed generic collections.',
  },
  {
    id: 'pro-python-memory-bounded-topk',
    title: 'Streaming Memory-Bounded Top-K Telemetry',
    tier: 'pro',
    languageFocus: 'python',
    topic: 'Python Memory Optimization, Generators & O(n log k) Heap',
    focusArea: 'Streaming Iterators · O(k) Memory Bound · Big-O Efficiency',
    dataStructure: 'Generator Stream + Fixed-Size Min-Heap (heapq)',
    targetTimeComplexity: 'O(n log k)',
    targetSpaceComplexity: 'O(k)',
    timeLimitSeconds: 2100,
    coinReward: 600,
    summary: 'Extract the k highest-latency unique events from an unbounded iterator stream in O(n log k) time while keeping memory strictly bounded to O(k).',
    description: [
      'Given an iterator/iterable events yielding (latency_ms, event_id) pairs and an integer k, return the top k pairs sorted by highest latency_ms descending (tie-break by smaller event_id).',
      'Do NOT materialize the entire stream into a list via sorted(events) (which consumes O(n) memory and blows memory limits on multi-million streams). Maintain a size-k min-heap using heapq in O(n log k) time and O(k) space.',
    ],
    constraints: [
      '1 <= k <= 10^4',
      'Stream length n may exceed 10^7 items.',
      'Auxiliary memory must stay strictly O(k).',
    ],
    examples: [
      {
        input: 'events = iter([(12, "a"), (95, "b"), (40, "c"), (95, "a")]), k = 2',
        output: '[(95, "a"), (95, "b")]',
      },
    ],
    inputOutputNote:
      'Consume the iterable lazily in a single pass with heapq; never call list(events) or sorted(events).',
  },
];

export function getProblemsForTier(tier: DifficultyTier): ProblemStatement[] {
  return PROBLEM_BANK.filter((p) => p.tier === tier);
}

export function pickProblemForTierAndLanguage(
  tier: DifficultyTier,
  language: ProgrammingLanguage,
): ProblemStatement {
  const exact = PROBLEM_BANK.find((p) => p.tier === tier && p.languageFocus === language);
  if (exact) {
    return exact;
  }
  const byTier = getProblemsForTier(tier);
  return byTier[0] ?? PROBLEM_BANK[0];
}

export function pickProblemForTier(tier: DifficultyTier, seedIndex?: number): ProblemStatement {
  const candidates = getProblemsForTier(tier);
  if (candidates.length === 0) {
    return PROBLEM_BANK[0];
  }
  const idx =
    typeof seedIndex === 'number'
      ? Math.abs(seedIndex) % candidates.length
      : Math.floor(Math.random() * candidates.length);
  return candidates[idx];
}

export function getProblemById(problemId: string): ProblemStatement | undefined {
  return getProgressionProblemById(problemId) ?? PROBLEM_BANK.find((p) => p.id === problemId);
}
