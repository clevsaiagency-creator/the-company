import { streamChat, type Message } from "@/lib/ai/orchestrator";

export async function POST(request: Request) {
  const body = await request.json();
  const {
    messages,
    agentSlug,
    conversationType = "one_on_one",
    projectSlug = "all",
  }: {
    messages: Message[];
    agentSlug: string;
    conversationType: string;
    projectSlug: string;
  } = body;

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of streamChat({
          messages,
          agentSlug,
          conversationType: conversationType as
            | "one_on_one"
            | "department"
            | "board_meeting"
            | "brief"
            | "orchestrated",
          projectSlug,
        })) {
          const data = `data: ${JSON.stringify(chunk)}\n\n`;
          controller.enqueue(encoder.encode(data));
        }
      } catch (error) {
        const errorChunk = `data: ${JSON.stringify({
          type: "text",
          content: `Eroare: ${error instanceof Error ? error.message : "necunoscută"}`,
        })}\n\n`;
        controller.enqueue(encoder.encode(errorChunk));
      } finally {
        controller.close();
      }
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
