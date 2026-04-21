import {
  getAllMemories,
  saveMemory,
  type MemoryInsert,
} from "@/lib/db/memories";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const projectSlug = searchParams.get("project") || undefined;

  const memories = await getAllMemories(projectSlug);
  return Response.json(memories);
}

export async function POST(request: Request) {
  const body: MemoryInsert = await request.json();

  if (!body.agentSlug || !body.content) {
    return Response.json(
      { error: "agentSlug and content are required" },
      { status: 400 }
    );
  }

  const memory = await saveMemory(body);
  if (!memory) {
    return Response.json({ error: "Failed to save memory" }, { status: 500 });
  }

  return Response.json(memory, { status: 201 });
}
