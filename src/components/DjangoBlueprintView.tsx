import { useState } from 'react';
import { Check, Copy, FileCode2 } from 'lucide-react';
import type { DjangoFileItem } from '../types/arena';

interface DjangoBlueprintViewProps {
  files: DjangoFileItem[];
  loading: boolean;
}

export function DjangoBlueprintView({ files, loading }: DjangoBlueprintViewProps) {
  const [selectedPath, setSelectedPath] = useState<string>('');
  const [copied, setCopied] = useState(false);

  const activeFile =
    files.find((f) => f.path === selectedPath) ?? (files.length > 0 ? files[0] : null);

  const handleCopy = async () => {
    if (!activeFile) return;
    try {
      await navigator.clipboard.writeText(activeFile.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  return (
    <main className="mx-auto max-w-[1440px] px-4 py-8 sm:px-6 lg:px-8">
      <div className="border-b border-[#26262E] pb-6">
        <h1 className="text-2xl font-bold text-[#F4F4F5] sm:text-3xl">
          Django REST + Channels Cloud Run Deliverables
        </h1>
        <p className="mt-1.5 max-w-3xl text-sm text-[#A1A1AA]">
          Production Python backend modules ready for Google Cloud Run (ASGI/Daphne): ORM models,
          2–3 player Channels WebSocket consumer, and Gemini 2.5 Flash service using{' '}
          <code className="font-mono text-[#FACC15]">GEMINI_API_KEY</code>.
        </p>
      </div>

      {loading ? (
        <div className="mt-6 h-96 animate-pulse rounded-xl bg-[#18181B]" />
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* File Tree Navigation */}
          <aside className="space-y-2 lg:col-span-3" aria-label="Django deliverable files">
            {files.map((file) => {
              const isSelected = activeFile?.path === file.path;
              return (
                <button
                  key={file.path}
                  type="button"
                  onClick={() => setSelectedPath(file.path)}
                  className={`flex w-full items-start gap-3 rounded-xl border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FACC15] ${
                    isSelected
                      ? 'border-[#FACC15] bg-[#1C1C21]'
                      : 'border-[#26262E] bg-[#18181B] hover:border-[#3F3F4A]'
                  }`}
                >
                  <FileCode2
                    className={`mt-0.5 h-4 w-4 shrink-0 ${
                      isSelected ? 'text-[#FACC15]' : 'text-[#4ADE80]'
                    }`}
                    aria-hidden="true"
                  />
                  <div className="min-w-0">
                    <div className="truncate font-mono text-sm font-semibold text-[#F4F4F5]">
                      {file.name}
                    </div>
                    <div className="mt-0.5 truncate font-mono text-xs text-[#71717A]">
                      {file.path}
                    </div>
                  </div>
                </button>
              );
            })}
          </aside>

          {/* Source Viewer */}
          <section className="rounded-xl border border-[#2A2A32] bg-[#18181B] lg:col-span-9">
            {activeFile && (
              <>
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#26262E] px-6 py-4">
                  <div>
                    <h2 className="font-mono text-sm font-semibold text-[#F4F4F5]">
                      {activeFile.path}
                    </h2>
                    <p className="mt-0.5 text-xs text-[#A1A1AA]">{activeFile.role}</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-lg border border-[#2E2E38] bg-[#121212] px-3.5 py-2 text-xs font-medium text-[#F4F4F5] hover:border-[#FACC15]"
                  >
                    {copied ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-[#4ADE80]" aria-hidden="true" />
                        <span>Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5 text-[#A1A1AA]" aria-hidden="true" />
                        <span>Copy Source</span>
                      </>
                    )}
                  </button>
                </div>

                <pre className="max-h-[620px] overflow-auto p-6 font-mono text-xs leading-relaxed text-[#E4E4E7]">
                  <code>{activeFile.content}</code>
                </pre>
              </>
            )}
          </section>
        </div>
      )}
    </main>
  );
}
