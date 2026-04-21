import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET() {
  try {
    const toolsDir = path.join(process.cwd(), "..", "tools");
    const files = fs.readdirSync(toolsDir).filter((f) => f.endsWith(".py"));
    return NextResponse.json({ tools: files });
  } catch {
    return NextResponse.json({ tools: [] });
  }
}
