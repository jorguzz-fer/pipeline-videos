import { auth } from "@/auth";
import { listItems } from "@/lib/items";
import {
  PENDING_STAGES,
  HISTORY_STAGES,
  ACTIONABLE_STAGES,
} from "@/lib/stages";
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

  const pending = pendingItems.map((i) => toItemVM(i, now));
  // Histórico: mais recentes primeiro.
  const history = historyItems
    .slice()
    .sort((a, b) => b.stageChangedAt.getTime() - a.stageChangedAt.getTime())
    .map((i) => toItemVM(i, now));

  const actionableCount = pendingItems.filter((i) =>
    ACTIONABLE_STAGES.includes(i.stage)
  ).length;

  return (
    <Dashboard
      userName={userName}
      pending={pending}
      history={history}
      pendingCount={actionableCount}
    />
  );
}
