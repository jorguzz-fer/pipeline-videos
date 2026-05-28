import { authorizeRequest } from "@/lib/apiAuth";
import { getItem, updateItem } from "@/lib/items";
import { json, unauthorized, notFound, handleError } from "@/lib/http";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: Request, { params }: Ctx) {
  const actor = await authorizeRequest(req);
  if (!actor) return unauthorized();
  const { id } = await params;
  const item = await getItem(id);
  if (!item) return notFound("Item não encontrado.");
  return json({ item });
}

// PATCH: origem posta resultado do render (videoUrl, duração), textos por rede,
// e pode marcar o item como pronto p/ aprovação final (markReadyForFinal).
export async function PATCH(req: Request, { params }: Ctx) {
  const actor = await authorizeRequest(req);
  if (!actor) return unauthorized();
  const { id } = await params;
  try {
    const body = await req.json();
    const item = await updateItem(id, body);
    if (!item) return notFound("Item não encontrado.");
    return json({ item });
  } catch (err) {
    return handleError(err);
  }
}
