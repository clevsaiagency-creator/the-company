import { updateKnowledge, deleteKnowledge } from "@/lib/db/knowledge";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();

  const entry = await updateKnowledge(id, body);
  if (!entry) {
    return Response.json({ error: "Failed to update" }, { status: 500 });
  }

  return Response.json(entry);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const success = await deleteKnowledge(id);
  if (!success) {
    return Response.json({ error: "Failed to delete" }, { status: 500 });
  }

  return Response.json({ ok: true });
}
