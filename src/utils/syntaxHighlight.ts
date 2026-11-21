import type { ProgrammingLanguage } from '../types/arena';

export type TokenType =
  | 'plain'
  | 'keyword'
  | 'type'
  | 'string'
  | 'number'
  | 'comment'
  | 'function';

export interface HighlightToken {
  type: TokenType;
  value: string;
}

const KEYWORDS: Record<ProgrammingLanguage, Set<string>> = {
  python: new Set([
    'def', 'return', 'if', 'elif', 'else', 'for', 'while', 'in', 'not', 'and', 'or',
    'import', 'from', 'as', 'class', 'pass', 'break', 'continue', 'try', 'except',
    'finally', 'with', 'lambda', 'yield', 'True', 'False', 'None', 'is', 'del', 'global',
  ]),
  java: new Set([
    'public', 'private', 'protected', 'static', 'final', 'class', 'interface', 'extends',
    'implements', 'return', 'if', 'else', 'for', 'while', 'do', 'switch', 'case', 'break',
    'continue', 'new', 'this', 'super', 'try', 'catch', 'finally', 'throw', 'throws',
    'import', 'package', 'true', 'false', 'null', 'void',
  ]),
  cpp: new Set([
    'include', 'using', 'namespace', 'std', 'return', 'if', 'else', 'for', 'while', 'do',
    'switch', 'case', 'break', 'continue', 'struct', 'class', 'public', 'private', 'const',
    'constexpr', 'auto', 'new', 'delete', 'nullptr', 'true', 'false', 'sizeof', 'template',
    'typename', 'typedef', 'static',
  ]),
  c: new Set([
    'include', 'define', 'return', 'if', 'else', 'for', 'while', 'do', 'switch', 'case',
    'break', 'continue', 'struct', 'typedef', 'const', 'static', 'sizeof', 'NULL', 'enum',
    'extern', 'volatile', 'default',
  ]),
};

const TYPES: Record<ProgrammingLanguage, Set<string>> = {
  python: new Set(['int', 'float', 'str', 'list', 'dict', 'set', 'tuple', 'bool', 'len', 'range', 'min', 'max', 'sum', 'sorted', 'enumerate', 'heapq']),
  java: new Set(['int', 'long', 'double', 'float', 'boolean', 'char', 'byte', 'short', 'String', 'Integer', 'Long', 'Map', 'HashMap', 'Set', 'HashSet', 'List', 'ArrayList', 'Deque', 'ArrayDeque', 'PriorityQueue', 'Arrays', 'Math']),
  cpp: new Set(['int', 'long', 'double', 'float', 'bool', 'char', 'void', 'size_t', 'int64_t', 'vector', 'unordered_map', 'map', 'unordered_set', 'set', 'stack', 'queue', 'priority_queue', 'pair', 'string', 'min', 'max', 'sort']),
  c: new Set(['int', 'long', 'double', 'float', 'char', 'void', 'size_t', 'uint64_t', 'int64_t', 'bool', 'unsigned', 'signed', 'short', 'malloc', 'calloc', 'free', 'printf', 'scanf', 'qsort']),
};

/**
 * Deterministic single-pass tokenizer for C, C++, Java, and Python.
 * Guarantees concatenated token values equal the original input string exactly.
 */
export function tokenizeCode(code: string, language: ProgrammingLanguage): HighlightToken[] {
  if (!code) {
    return [];
  }

  const tokens: HighlightToken[] = [];
  const kw = KEYWORDS[language];
  const ty = TYPES[language];
  const isPython = language === 'python';

  let i = 0;
  const len = code.length;

  const pushToken = (type: TokenType, value: string) => {
    if (!value) return;
    const prev = tokens[tokens.length - 1];
    if (prev && prev.type === type) {
      prev.value += value;
    } else {
      tokens.push({ type, value });
    }
  };

  while (i < len) {
    const ch = code[i];
    const next = code[i + 1];

    // Line comments
    if ((isPython && ch === '#') || (!isPython && ch === '/' && next === '/')) {
      let end = i;
      while (end < len && code[end] !== '\n') {
        end++;
      }
      pushToken('comment', code.slice(i, end));
      i = end;
      continue;
    }

    // Block comments (C, C++, Java)
    if (!isPython && ch === '/' && next === '*') {
      let end = i + 2;
      while (end < len - 1 && !(code[end] === '*' && code[end + 1] === '/')) {
        end++;
      }
      end = Math.min(len, end + 2);
      pushToken('comment', code.slice(i, end));
      i = end;
      continue;
    }

    // Strings ("..." or '...')
    if (ch === '"' || ch === "'") {
      const quote = ch;
      let end = i + 1;
      while (end < len) {
        if (code[end] === '\\' && end + 1 < len) {
          end += 2;
          continue;
        }
        if (code[end] === quote) {
          end++;
          break;
        }
        if (code[end] === '\n') {
          break;
        }
        end++;
      }
      pushToken('string', code.slice(i, end));
      i = end;
      continue;
    }

    // Numbers
    if (/[0-9]/.test(ch)) {
      let end = i + 1;
      while (end < len && /[0-9a-fA-FxX._eElLuU]/.test(code[end])) {
        end++;
      }
      pushToken('number', code.slice(i, end));
      i = end;
      continue;
    }

    // Identifiers / keywords / types
    if (/[A-Za-z_]/.test(ch)) {
      let end = i + 1;
      while (end < len && /[A-Za-z0-9_]/.test(code[end])) {
        end++;
      }
      const word = code.slice(i, end);
      if (kw.has(word)) {
        pushToken('keyword', word);
      } else if (ty.has(word)) {
        pushToken('type', word);
      } else if (code[end] === '(') {
        pushToken('function', word);
      } else {
        pushToken('plain', word);
      }
      i = end;
      continue;
    }

    // Everything else (whitespace, punctuation, operators)
    pushToken('plain', ch);
    i++;
  }

  return tokens;
}

export const TOKEN_CLASS_MAP: Record<TokenType, string> = {
  plain: 'text-[#F4F4F5]',
  keyword: 'text-[#FACC15] font-medium',
  type: 'text-[#4ADE80]',
  string: 'text-[#86EFAC]',
  number: 'text-[#FDE047]',
  comment: 'text-[#71717A] italic',
  function: 'text-[#E4E4E7]',
};
