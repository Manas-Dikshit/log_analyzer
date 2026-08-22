import { NextRequest, NextResponse } from "next/server";
import { analyzeTerminalOutput } from "@/lib/terminalParser";

export const runtime = "nodejs";

const MAX_INPUT_SIZE = 15 * 1024 * 1024; // 15 MB — matches the file analyzer limit

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const text = typeof body?.text === "string" ? body.text : "";

    if (!text.trim()) {
      return NextResponse.json(
        { error: "Paste some terminal output first — nothing to analyze." },
        { status: 400 }
      );
    }

    if (text.length > MAX_INPUT_SIZE) {
      return NextResponse.json(
        { error: "That input is larger than the 15MB limit for this MVP." },
        { status: 413 }
      );
    }

    return NextResponse.json(analyzeTerminalOutput(text), { status: 200 });
  } catch (err) {
    console.error("analyze-terminal route error", err);
    return NextResponse.json(
      { error: "Something went wrong while analyzing that terminal output." },
      { status: 500 }
    );
  }
}
