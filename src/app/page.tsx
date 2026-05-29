import { Stage } from "@prisma/client";
import { auth } from "@/auth";
import { listItems } from "@/lib/items";
import { PENDING_STAGES, HISTORY_STAGES } from "@/lib/stages";
import { toItemVM } from "@/lib/viewModel";
import Dashboard from "@/components/Dashboard";

export const dynamic = "force-dynamic";

export default async function Page() {
  const session = await auth();
  const userName = session?.user?.name ?? "Usuário";

  const now = new Date();
  const [pendingItems, historyItems] = await Promise.all([
    listItems({ stages: PENDING_STAGES }),
    listItems({ stages: HISTORY_STAGES }),
  ]);

  // Roteiros: aguardando aprovação do texto (antes do vídeo).
  const roteiros = pendingItems
    .filter((i) => i.stage === Stage.AGUARDANDO_ROTEIRO)
    .map((i) => toItemVM(i, now));

  // Vídeos: renderizando (EM_PRODUCAO) ou prontos p/ aprovação final.
  const videos = pendingItems
    .filter(
      (i) =>
        i.stage === Stage.EM_PRODUCAO || i.stage === Stage.AGUARDANDO_FINAL
    )
    .map((i) => toItemVM(i, now));

  // Histórico: mais recentes primeiro.
  const history = historyItems
    .slice()
    .sort((a, b) => b.stageChangedAt.getTime() - a.stageChangedAt.getTime())
    .map((i) => toItemVM(i, now));

  const roteiroCount = pendingItems.filter(
    (i) => i.stage === Stage.AGUARDANDO_ROTEIRO
  ).length;
  const videoCount = pendingItems.filter(
    (i) => i.stage === Stage.AGUARDANDO_FINAL
  ).length;

  return (
    <Dashboard
      userName={userName}
      roteiros={roteiros}
      videos={videos}
      history={history}
      roteiroCount={roteiroCount}
      videoCount={videoCount}
    />
  );
}
