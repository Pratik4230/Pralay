import type { MeResponse } from "@repo/validators";

import { DashboardPageClient } from "@/features/workspace/pages/dashboard-page-client";
import { fetchApiServer } from "@/global/utils/api-server";

export async function DashboardPage() {
  const data = await fetchApiServer<MeResponse>("/api/v1/me");

  return <DashboardPageClient user={data.user} />;
}
