import type { Metadata } from "next";
import type { MeResponse } from "@repo/validators";

import { ProfilePageClient } from "@/features/workspace/pages/profile-page-client";
import { fetchApiServer } from "@/global/utils/api-server";

export const metadata: Metadata = {
  title: "Profile — Pralay",
  description: "Manage your account and workspace memberships",
};

export default async function ProfilePage() {
  const data = await fetchApiServer<MeResponse>("/api/v1/me");

  return <ProfilePageClient user={data.user} />;
}
