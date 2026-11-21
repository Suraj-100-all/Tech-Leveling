import { useMemo, useRef } from 'react';
import type { ProgrammingLanguage } from '../types/arena';
import { TOKEN_CLASS_MAP, tokenizeCode } from '../utils/syntaxHighlight';

interface CodeEditorProps {
  value: string;
  language: ProgrammingLanguage;
  disabled?: boolean;
  onChange: (nextCode: string) => void;
}

export function CodeEditor({ value, language, disabled = false, onChange }: CodeEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const preRef = useRef<HTMLPreElement | null>(null);
  const gutterRef = useRef<HTMLDivElement | null>(null);

  const tokens = useMemo(() => tokenizeCode(value, language), [value, language]);

  const lineCount = useMemo(() => {
    if (!value) return 16;
    return Math.max(16, value.split('\n').length + 2);
  }, [value]);

  const handleScroll = () => {
    if (!textareaRef.current) return;
    const { scrollTop, scrollLeft } = textareaRef.current;
    if (preRef.current) {
      preRef.current.scrollTop = scrollTop;
      preRef.current.scrollLeft = scrollLeft;
    }
    if (gutterRef.current) {
      gutterRef.current.scrollTop = scrollTop;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const el = e.currentTarget;
      const start = el.selectionStart;
      const end = el.selectionEnd;
      const indent = '    ';
      const updated = value.slice(0, start) + indent + value.slice(end);
      onChange(updated);
      requestAnimationFrame(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart = start + indent.length;
          textareaRef.current.selectionEnd = start + indent.length;
        }
      });
    }
  };

  return (
    <div className="relative flex h-[440px] w-full overflow-hidden rounded-lg border border-[#2A2A32] bg-[#0D0D10] font-mono text-sm leading-6 lg:h-[520px]">
      {/* Line Number Gutter */}
      <div
        ref={gutterRef}
        aria-hidden="true"
        className="w-12 shrink-0 select-none overflow-hidden border-r border-[#22222A] bg-[#121216] py-4 pr-3 text-right text-xs leading-6 tabular-nums text-[#52525B]"
      >
        {Array.from({ length: lineCount }, (_, idx) => (
          <div key={idx}>{idx + 1}</div>
        ))}
      </div>

      {/* Synchronized Highlight Layer + Accessible Textarea */}
      <div className="relative flex-1 overflow-hidden">
        <pre
          ref={preRef}
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 m-0 overflow-hidden whitespace-pre p-4 font-mono text-sm leading-6"
        >
          {value.length === 0 ? (
            <span className="text-[#52525B]">
              {`// Editor starts empty. Write your ${language.toUpperCase()} solution here...`}
            </span>
          ) : (
            tokens.map((tok, i) => (
              <span key={i} className={TOKEN_CLASS_MAP[tok.type]}>
                {tok.value}
              </span>
            ))
          )}
          {'\n'}
        </pre>

        <textarea
          ref={textareaRef}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          onScroll={handleScroll}
          onKeyDown={handleKeyDown}
          spellCheck={false}
          autoCapitalize="off"
          autoComplete="off"
          autoCorrect="off"
          aria-label="Code editor"
          data-testid="battle-code-editor"
          className="absolute inset-0 h-full w-full resize-none overflow-auto whitespace-pre bg-transparent p-4 font-mono text-sm leading-6 text-transparent caret-[#FACC15] focus:outline-none disabled:cursor-not-allowed"
        />
      </div>
    </div>
  );
}
