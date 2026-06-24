import { trpc } from "@/lib/trpc";
import { formatRM, isAgentOrAbove } from "@/lib/utils";
import MobileHeader from "@/components/MobileHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Car, Plane, Lock } from "lucide-react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { useFeatureVisibility } from "@/hooks/useFeatureVisibility";

export default function ExtraRewards() {
  const [, navigate] = useLocation();
  const { data: authData } = trpc.auth.me.useQuery();
  const member = (authData as any)?.member;
  const { data: carStatus } = trpc.member.carAllowanceStatus.useQuery();
  const { data: travelStatus } = trpc.member.travelRewardStatus.useQuery();
  const { data: visibility } = trpc.member.rewardVisibility.useQuery();
  const utils = trpc.useUtils();
  const { isVisible } = useFeatureVisibility();

  const setVisibility = trpc.member.setRewardVisibility.useMutation({
    onSuccess: () => utils.member.rewardVisibility.invalidate(),
    onError: (e) => toast.error(e.message),
  });

  // Admin-controlled visibility for each section
  const showCarSection = isVisible("car_allowance");
  const showTravelSection = isVisible("travel_reward");

  if (!member || !isAgentOrAbove(member.rank)) {
    return (
      <div className="mobile-app">
        <MobileHeader title="额外奖励" />
        <div className="flex flex-col items-center justify-center min-h-[60vh] px-8 text-center">
          <Lock size={48} className="text-muted-foreground/40 mb-4" />
          <p className="text-muted-foreground">需要M代理或以上身份</p>
          <Button className="mt-4" onClick={() => navigate("/upgrade")}>了解升级</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mobile-app">
      <MobileHeader title="额外奖励" />
      <div className="px-4 mt-4 space-y-4">

        {/* Car Allowance - admin controlled */}
        {showCarSection && (
          <Card className="p-4 rounded-xl border-0">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Car size={20} className="text-blue-500" />
                <h3 className="font-semibold">汽车供车津贴</h3>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>显示</span>
                <Switch
                  checked={visibility?.showCarAllowance ?? true}
                  onCheckedChange={(v) => setVisibility.mutate({ showCarAllowance: v })}
                />
              </div>
            </div>
            {carStatus ? (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">直推VIP人数</span>
                  <span className={`font-medium ${carStatus.directVips >= 12 ? "text-green-600" : "text-foreground"}`}>
                    {carStatus.directVips} / 12 人
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">本月团队业绩</span>
                  <span className={`font-medium ${carStatus.performance >= 18000 ? "text-green-600" : "text-foreground"}`}>
                    {formatRM(carStatus.performance)} / RM18,000
                  </span>
                </div>
                <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                  <p className="text-xs text-blue-700 font-medium">津贴奖励</p>
                  <p className="text-sm text-blue-800 mt-1">
                    {carStatus.eligible && carStatus.performance >= 18000 ? (
                      <span className="font-bold text-blue-600">✓ 已达标: RM 300.00 / 月</span>
                    ) : (
                      <span>达标后可获 RM 300.00 / 月</span>
                    )}
                  </p>
                  <p className="text-xs text-blue-600 mt-1">+ RM 200.00 每帮助一位小组成员达标</p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">加载中...</p>
            )}
          </Card>
        )}

        {/* Travel Reward - admin controlled */}
        {showTravelSection && (
          <Card className="p-4 rounded-xl border-0">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Plane size={20} className="text-green-500" />
                <h3 className="font-semibold">旅游奖励</h3>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>显示</span>
                <Switch
                  checked={visibility?.showTravelReward ?? true}
                  onCheckedChange={(v) => setVisibility.mutate({ showTravelReward: v })}
                />
              </div>
            </div>
            {travelStatus && (
              <div className="space-y-3">
                <div className="p-3 bg-green-50 rounded-lg">
                  <p className="text-xs font-medium text-green-800 mb-1">选项一</p>
                  <p className="text-xs text-green-700">注册12位VIP + 考核区购买RM2,800以上</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${travelStatus.option1Met ? "bg-green-200 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                      VIP: {travelStatus.option1Vips} / 12
                    </span>
                  </div>
                </div>
                <div className="p-3 bg-green-50 rounded-lg">
                  <p className="text-xs font-medium text-green-800 mb-1">选项二</p>
                  <p className="text-xs text-green-700">累积推荐15位VIP + 考核区购买RM2,800以上</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${travelStatus.option2Met ? "bg-green-200 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                      VIP: {travelStatus.option1Vips} / 15
                    </span>
                  </div>
                </div>
              </div>
            )}
          </Card>
        )}

        {/* Fallback when both sections are hidden by admin */}
        {!showCarSection && !showTravelSection && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-muted-foreground text-sm">额外奖励功能暂未开放</p>
          </div>
        )}
      </div>
    </div>
  );
}
