import { trpc } from "@/lib/trpc";

type Rank = "VIP" | "M_AGENT" | "SM" | "GM" | "CEO";

/**
 * Returns a function `isVisible(featureKey)` that checks whether a feature
 * should be shown to the current member based on admin-controlled visibility settings.
 *
 * Rules:
 * - If no record exists for a feature key → default to visible (true)
 * - If isEnabled = false → hidden for everyone
 * - If allowedRanks is empty ([]) → visible to all ranks
 * - If allowedRanks has values → only visible to those ranks
 */
export function useFeatureVisibility() {
  const { data: visibilityData } = trpc.features.list.useQuery();
  // Get effective member rank from auth.me
  const { data: authData } = trpc.auth.me.useQuery();
  const memberRank = (authData as any)?.member?.rank as Rank | undefined;

  const isVisible = (featureKey: string): boolean => {
    if (!visibilityData) return true; // loading → show by default
    const record = visibilityData.find((v: any) => v.featureKey === featureKey);
    if (!record) return true; // no config → visible
    if (!record.isEnabled) return false; // disabled globally

    const allowedRanks = record.allowedRanks as string[];
    if (!allowedRanks || allowedRanks.length === 0) return true; // all ranks allowed

    if (!memberRank) return false; // no rank info → hide restricted features
    return allowedRanks.includes(memberRank);
  };

  return { isVisible, isLoading: !visibilityData };
}
