"use client";

import { useCallback, useRef, useState } from "react";
import { Hero } from "@/components/Hero";
import { UploadCard } from "@/components/UploadCard";
import { Dashboard } from "@/components/Dashboard";
import { HowItWorks } from "@/components/HowItWorks";
import { RulesTable } from "@/components/RulesTable";
import { FAQ } from "@/components/FAQ";
import { Footer } from "@/components/Footer";
import type { AnalysisResult } from "@/lib/logParser";

export default function Home() {
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const uploadRef = useRef<HTMLDivElement>(null);

  const scrollToUpload = useCallback(() => {
    document.getElementById("upload")?.scrollIntoView({ behavior: "smooth" });
  }, []);

  const handleAnalyze = useCallback(async (file: File) => {
    setIsAnalyzing(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/analyze", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong while analyzing that file.");
        return;
      }
      setResult(data as AnalysisResult);
      requestAnimationFrame(() => {
        document.getElementById("results")?.scrollIntoView({ behavior: "smooth" });
      });
    } catch {
      setError("Couldn't reach the analyzer. Check your connection and try again.");
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  const handleReset = useCallback(() => {
    setResult(null);
    setError(null);
    requestAnimationFrame(() => {
      document.getElementById("upload")?.scrollIntoView({ behavior: "smooth" });
    });
  }, []);

  return (
    <main>
      <Hero onScrollToUpload={scrollToUpload} />

      <div ref={uploadRef}>
        <UploadCard onAnalyze={handleAnalyze} isAnalyzing={isAnalyzing} errorMessage={error} />
      </div>

      {result && <Dashboard result={result} onReset={handleReset} />}

      <HowItWorks />
      <RulesTable />
      <FAQ />
      <Footer />
    </main>
  );
}
