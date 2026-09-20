import type { MeResponse } from "@repo/validators";

import { AppNavbar } from "@/global/components/app-navbar";
import { fetchApiServer } from "@/global/utils/api-server";

export async function AppNavbarServer() {
  try {
    const data = await fetchApiServer<MeResponse>("/api/v1/me");
    return (
      <AppNavbar
        userName={data.user.name}
        userEmail={data.user.email}
        userAvatarKey={data.user.image}
      />
    );
  } catch {
    return <AppNavbar userName="" userEmail="" userAvatarKey={null} />;
  }
}

