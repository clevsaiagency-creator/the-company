import {
  getKnowledge,
  createKnowledge,
  type KnowledgeInsert,
} from "@/lib/db/knowledge";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const projectSlug = searchParams.get("project") || undefined;
  const category = searchParams.get("category") || undefined;

  const entries = await getKnowledge(projectSlug, category);
  return Response.json(entries);
}

export async function POST(request: Request) {
  const body: KnowledgeInsert = await request.json();

  if (!body.title || !body.content || !body.category) {
    return Response.json(
      { error: "title, content, and category are required" },
      { status: 400 }
    );
  }

  const entry = await createKnowledge(body);
  if (!entry) {
    return Response.json({ error: "Failed to create entry" }, { status: 500 });
  }

  return Response.json(entry, { status: 201 });
}
