import { deleteMemory } from "@/lib/db/memories";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const success = await deleteMemory(id);
  if (!success) {
    return Response.json({ error: "Failed to delete" }, { status: 500 });
  }

  return Response.json({ ok: true });
}
