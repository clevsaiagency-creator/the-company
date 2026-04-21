import { NextRequest } from "next/server";
import { spawn } from "child_process";
import path from "path";
import fs from "fs";

export async function POST(request: NextRequest) {
  const { tool, args = [] } = await request.json();

  const toolsDir = path.resolve(process.cwd(), "..", "tools");
  const toolPath = path.resolve(toolsDir, tool);

  // Security: must be inside tools dir
  if (!toolPath.startsWith(toolsDir) || !toolPath.endsWith(".py")) {
    return new Response(JSON.stringify({ error: "Invalid tool" }), { status: 400 });
  }

  if (!fs.existsSync(toolPath)) {
    return new Response(JSON.stringify({ error: "Tool not found" }), { status: 404 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      const proc = spawn("python", [toolPath, ...args], {
        cwd: toolsDir,
        env: { ...process.env },
      });

      proc.stdout.on("data", (data: Buffer) => {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: "output", content: data.toString() })}\n\n`)
        );
      });

      proc.stderr.on("data", (data: Buffer) => {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: "error", content: data.toString() })}\n\n`)
        );
      });

      proc.on("close", (code: number) => {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: "done", code })}\n\n`)
        );
        controller.close();
      });

      proc.on("error", (err: Error) => {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: "error", content: err.message })}\n\n`)
        );
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
