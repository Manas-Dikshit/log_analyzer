import { NextRequest, NextResponse } from "next/server";
import { analyzeLog } from "@/lib/logAnalyzer";

export const runtime = "nodejs";

const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15 MB — generous for an MVP log upload

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: "No log file was found in the upload." },
        { status: 400 }
      );
    }

    const name = file.name.toLowerCase();
    if (
      !name.endsWith(".log") &&
      !name.endsWith(".txt") &&
      !name.endsWith(".json") &&
      !name.endsWith(".jsonl")
    ) {
      return NextResponse.json(
        { error: "Only .log, .txt, .json, and .jsonl files are supported." },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File is larger than the 15MB limit for this MVP." },
        { status: 413 }
      );
    }

    const content = await file.text();
    if (!content.trim()) {
      return NextResponse.json(
        { error: "That file looks empty — nothing to analyze." },
        { status: 400 }
      );
    }

    const result = analyzeLog(content, file.name);
    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    console.error("analyze route error", err);
    return NextResponse.json(
      { error: "Something went wrong while reading that file." },
      { status: 500 }
    );
  }
}
