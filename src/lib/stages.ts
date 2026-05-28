import { Stage, Gate, Decision } from "@prisma/client";

// Rótulos em PT-BR para a UI.
export const STAGE_LABEL: Record<Stage, string> = {
  AGUARDANDO_ROTEIRO: "Roteiro",
  EM_PRODUCAO: "Em produção",
  AGUARDANDO_FINAL: "Vídeo final",
  AJUSTE_PEDIDO: "Ajuste pedido",
  APROVADO: "Aprovado",
  AGENDADO: "Agendado",
  PUBLICADO: "Publicado",
};

// Estágios que aguardam ação humana (entram na aba "Pendentes" e contam no chip).
export const ACTIONABLE_STAGES: Stage[] = [
  Stage.AGUARDANDO_ROTEIRO,
  Stage.AGUARDANDO_FINAL,
];

// Estágios mostrados na aba "Pendentes" (inclui produção, sem ação).
export const PENDING_STAGES: Stage[] = [
  Stage.AGUARDANDO_ROTEIRO,
  Stage.EM_PRODUCAO,
  Stage.AGUARDANDO_FINAL,
];

// Estágios mostrados na aba "Histórico".
export const HISTORY_STAGES: Stage[] = [
  Stage.AJUSTE_PEDIDO,
  Stage.APROVADO,
  Stage.AGENDADO,
  Stage.PUBLICADO,
];

// Qual portão de aprovação se aplica ao estágio atual.
export function gateForStage(stage: Stage): Gate | null {
  if (stage === Stage.AGUARDANDO_ROTEIRO) return Gate.SCRIPT;
  if (stage === Stage.AGUARDANDO_FINAL) return Gate.FINAL;
  return null;
}

export class StageTransitionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StageTransitionError";
  }
}

// Máquina de estados: resultado de uma decisão humana em um portão.
// Lança StageTransitionError se a decisão não for válida para o estágio atual.
export function nextStageForDecision(
  current: Stage,
  gate: Gate,
  decision: Decision
): Stage {
  const expectedGate = gateForStage(current);
  if (expectedGate !== gate) {
    throw new StageTransitionError(
      `Item está em "${current}" e não aguarda decisão no portão "${gate}".`
    );
  }

  if (decision === Decision.CHANGES_REQUESTED) {
    // Reprova em qualquer portão volta para o roteiro (decisão travada no BUILD).
    return Stage.AJUSTE_PEDIDO;
  }

  // Aprovações:
  if (gate === Gate.SCRIPT) return Stage.EM_PRODUCAO;
  return Stage.APROVADO; // gate FINAL aprovado
}
