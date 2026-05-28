import { timingSafeEqual } from "crypto";
import { auth } from "@/auth";

export type Actor = {
  kind: "user" | "service";
  userId?: string;
  name: string;
  role?: string;
};

function constantTimeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

// Autoriza uma requisição de API: chave de serviço (n8n) OU sessão de usuário (tela).
export async function authorizeRequest(req: Request): Promise<Actor | null> {
  const key = req.headers.get("x-api-key");
  const expected = process.env.SERVICE_API_KEY;
  if (key && expected && constantTimeEqual(key, expected)) {
    return { kind: "service", name: "n8n" };
  }

  const session = await auth();
  if (session?.user) {
    return {
      kind: "user",
      userId: session.user.id,
      name: session.user.name ?? session.user.email ?? "Usuário",
      role: session.user.role,
    };
  }

  return null;
}
