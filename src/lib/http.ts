import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { StageTransitionError } from "@/lib/stages";

export function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

export function unauthorized() {
  return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
}

export function notFound(msg = "Não encontrado.") {
  return NextResponse.json({ error: msg }, { status: 404 });
}

// Converte erros conhecidos em respostas HTTP adequadas.
export function handleError(err: unknown) {
  if (err instanceof ZodError) {
    return NextResponse.json(
      { error: "Dados inválidos.", issues: err.flatten() },
      { status: 422 }
    );
  }
  if (err instanceof StageTransitionError) {
    return NextResponse.json({ error: err.message }, { status: 409 });
  }
  console.error("API error:", err);
  return NextResponse.json({ error: "Erro interno." }, { status: 500 });
}
