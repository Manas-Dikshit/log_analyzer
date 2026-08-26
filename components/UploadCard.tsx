"use client";

import { useCallback, useRef, useState } from "react";
import {
  UploadCloud,
  FileText,
  X,
  Loader2,
  Sparkles,
  ClipboardPaste,
} from "lucide-react";
import { clsx } from "clsx";

interface UploadCardProps {
  onAnalyze: (file: File) => void;
  isAnalyzing: boolean;
  errorMessage: string | null;
}

export function UploadCard({ onAnalyze, isAnalyzing, errorMessage }: UploadCardProps) {
  const [file, setFile] = useState<File | null>(null);
  const [pastedText, setPastedText] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const acceptFile = useCallback((f: File | undefined | null) => {
    if (!f) return;
    const okExt = /\.(log|txt|json|jsonl)$/i.test(f.name);
    if (!okExt) return;
    setFile(f);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(false);
      acceptFile(e.dataTransfer.files?.[0]);
    },
    [acceptFile]
  );

  const loadSample = useCallback(async () => {
    const res = await fetch("/sample/application.log");
    const text = await res.text();
    const sampleFile = new File([text], "application.log", { type: "text/plain" });
    setFile(sampleFile);
  }, []);

  const analyzePasted = useCallback(() => {
    if (!pastedText.trim()) return;
    onAnalyze(new File([pastedText], "pasted-log.txt", { type: "text/plain" }));
  }, [pastedText, onAnalyze]);

  return (
    <section id="upload" className="mx-auto max-w-5xl px-6 py-20 sm:px-10">
      <div className="mb-8 text-center">
        <p className="mb-3 font-mono text-[12px] font-bold uppercase tracking-[0.18em] text-ink/45">
          Step 1 of 2
        </p>
        <h2 className="font-display text-3xl font-bold tracking-tight sm:text-[2.2rem]">
          Upload your application log
        </h2>
        <p className="mx-auto mt-3 max-w-md text-[15px] text-ink/60">
          Drop a file, paste raw log text, or try the bundled sample if you just want to see how it
          works.
        </p>
      </div>

      <div className="grid items-stretch gap-6 lg:grid-cols-2">

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={clsx(
          "relative rounded-2xl border-2 border-dashed border-ink/40 bg-paper p-10 text-center transition-colors sm:p-14",
          isDragging && "border-ink bg-lav/40",
          file && "border-solid border-ink bg-mint/20"
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".log,.txt,.json,.jsonl"
          className="hidden"
          onChange={(e) => acceptFile(e.target.files?.[0])}
        />

        {!file ? (
          <>
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full border border-ink bg-butter shadow-hard-sm">
              <UploadCloud size={24} strokeWidth={2} />
            </div>
            <p className="font-medium text-ink/80">
              Drag a <span className="font-mono text-ink">.log</span> or{" "}
              <span className="font-mono text-ink">.txt</span> file here
            </p>
            <p className="mt-1 text-[13px] text-ink/45">or</p>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="rounded-full border border-ink bg-paper px-5 py-2.5 text-[14px] font-semibold shadow-hard-sm transition-transform hover:-translate-y-0.5"
              >
                Choose log file
              </button>
              <button
                type="button"
                onClick={loadSample}
                className="inline-flex items-center gap-1.5 rounded-full border border-ink/30 px-5 py-2.5 text-[14px] font-semibold text-ink/70 transition-colors hover:border-ink hover:text-ink"
              >
                <Sparkles size={14} /> Try sample log
              </button>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-ink bg-mint shadow-hard-sm">
              <FileText size={22} strokeWidth={2} />
            </div>
            <p className="font-mono text-[14px] font-semibold">{file.name}</p>
            <p className="mt-1 text-[13px] text-ink/50">
              {(file.size / 1024).toFixed(1)} KB — ready to analyze
            </p>
            <button
              type="button"
              onClick={() => setFile(null)}
              className="mt-3 inline-flex items-center gap-1 text-[13px] font-medium text-ink/50 hover:text-severity-critical"
            >
              <X size={13} /> Remove
            </button>
          </div>
        )}
      </div>

      <div className="flex flex-col rounded-2xl border-2 border-dashed border-ink/40 bg-paper p-6 sm:p-8">
        <div className="mb-4 flex items-center justify-center gap-2">
          <ClipboardPaste size={18} />
          <h3 className="font-display text-lg font-bold tracking-tight">Or paste log text</h3>
        </div>
        <textarea
          value={pastedText}
          onChange={(e) => setPastedText(e.target.value)}
          disabled={isAnalyzing}
          rows={9}
          placeholder={"Paste logs or error output here…\ne.g. 2026-08-22 12:00:01 ERROR Payment failed: timeout"}
          className="w-full flex-1 resize-y rounded-xl border border-ink/50 bg-paper p-4 font-mono text-[13px] leading-relaxed transition-colors placeholder:text-ink/30 focus:border-ink focus:outline-none focus:ring-2 focus:ring-lav/60 disabled:bg-ink/5"
        />
        <p className="mt-2 text-center text-[13px] text-ink/45">
          Analyzed exactly like an uploaded file.
        </p>
        <div className="mt-4 flex justify-center">
          <button
            type="button"
            disabled={!pastedText.trim() || isAnalyzing}
            onClick={analyzePasted}
            className={clsx(
              "inline-flex items-center gap-2 rounded-full border border-ink px-8 py-3.5 font-semibold shadow-hard transition-transform",
              !pastedText.trim() || isAnalyzing
                ? "cursor-not-allowed bg-ink/10 text-ink/40 shadow-none"
                : "bg-ink text-paper hover:-translate-y-0.5 active:translate-y-0 active:shadow-hard-sm"
            )}
          >
            {isAnalyzing ? (
              <>
                <Loader2 size={17} className="animate-spin" /> Analyzing…
              </>
            ) : (
              "Analyze Logs"
            )}
          </button>
        </div>
      </div>
      </div>

      {errorMessage && (
        <p className="mt-4 rounded-lg border border-severity-critical bg-severity-criticalBg px-4 py-3 text-center text-[14px] font-medium text-severity-critical">
          {errorMessage}
        </p>
      )}

      <div className="mt-8 flex justify-center">
        <button
          type="button"
          disabled={!file || isAnalyzing}
          onClick={() => file && onAnalyze(file)}
          className={clsx(
            "inline-flex items-center gap-2 rounded-full border border-ink px-8 py-3.5 font-semibold shadow-hard transition-transform",
            !file || isAnalyzing
              ? "cursor-not-allowed bg-ink/10 text-ink/40 shadow-none"
              : "bg-ink text-paper hover:-translate-y-0.5 active:translate-y-0 active:shadow-hard-sm"
          )}
        >
          {isAnalyzing ? (
            <>
              <Loader2 size={17} className="animate-spin" /> Analyzing…
            </>
          ) : (
            "Analyze"
          )}
        </button>
      </div>
    </section>
  );
}
