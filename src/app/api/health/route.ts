import { prisma } from "@/lib/prisma";
import { json } from "@/lib/http";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return json({ ok: true, db: "up" });
  } catch {
    return json({ ok: false, db: "down" }, 503);
  }
}
