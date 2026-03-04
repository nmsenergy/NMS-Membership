import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { RANK_LABELS, isAgentOrAbove } from "@/lib/utils";
import MobileHeader from "@/components/MobileHeader";
import RankBadge from "@/components/RankBadge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, Circle, ArrowRight } from "lucide-react";
import { useLocation } from "wouter";

const UPGRADE_STEPS = [
  { rank: "VIP", label: "VIP会员", condition: "购买VIP配套", icon: "🌟" },
  { rank: "M_AGENT", label: "M代理", condition: "购买12套VIP配套 或 累积推荐12位VIP", icon: "💼" },
  { rank: "SM", label: "SM高级代理", condition: "购买36套VIP配套 或 培养10位M代理", icon: "🏆" },
  { rank: "GM", label: "GM总经理", condition: "3个不同组织各产生1位SM（需管理员审核）", icon: "👑" },
  { rank: "CEO", label: "CEO执行长", condition: "3个不同组织各产生1位GM（需管理员审核）", icon: "🎯" },
];

const RANK_ORDER: Record<string, number> = { VIP: 0, M_AGENT: 1, SM: 2, GM: 3, CEO: 4 };

export default function Upgrade() {
  const [, navigate] = useLocation();
  const { data: authData } = trpc.auth.me.useQuery();
  const member = (authData as any)?.member;
  const currentRankOrder = RANK_ORDER[member?.rank ?? "VIP"] ?? 0;

  return (
    <div className="mobile-app">
      <MobileHeader title="我要升级" />
      <div className="px-4 mt-4 space-y-4">
        {member && (
          <Card className="p-4 rounded-xl border-0 bg-primary/5">
            <p className="text-sm text-muted-foreground">当前身份</p>
            <div className="flex items-center gap-3 mt-2">
              <RankBadge rank={member.rank} size="lg" />
              <div className="text-sm">
                <p>VIP配套: <strong>{member.vipPackagesBought}</strong> 套</p>
                <p>直推VIP: <strong>{member.directVipReferrals}</strong> 人</p>
                <p>直推M代理: <strong>{member.directMAgentReferrals}</strong> 人</p>
              </div>
            </div>
          </Card>
        )}

        <div className="space-y-3">
          {UPGRADE_STEPS.map((step, idx) => {
            const stepOrder = RANK_ORDER[step.rank] ?? 0;
            const isCompleted = stepOrder < currentRankOrder;
            const isCurrent = stepOrder === currentRankOrder;
            const isNext = stepOrder === currentRankOrder + 1;
            return (
              <Card key={step.rank} className={`p-4 rounded-xl border-0 ${isCurrent ? "ring-2 ring-primary" : ""} ${isCompleted ? "opacity-60" : ""}`}>
                <div className="flex items-start gap-3">
                  <div className="text-2xl">{step.icon}</div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-sm">{step.label}</span>
                      {isCompleted && <CheckCircle size={16} className="text-green-500" />}
                      {isCurrent && <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">当前</span>}
                      {isNext && <span className="text-xs bg-amber-100 text-amber-600 px-2 py-0.5 rounded-full">下一级</span>}
                    </div>
                    <p className="text-xs text-muted-foreground">{step.condition}</p>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        <Card className="p-4 rounded-xl border-0 bg-amber-50">
          <p className="text-sm font-semibold text-amber-800 mb-2">升级说明</p>
          <ul className="text-xs text-amber-700 space-y-1">
            <li>• 升级条件达成后即可自动升级</li>
            <li>• GM和CEO需要管理员手动审核确认</li>
            <li>• 升级后立即享有该阶级的奖金和权限</li>
            <li>• 购买VIP配套可在VIP商城或代理区进行</li>
          </ul>
        </Card>

        <Button className="w-full" onClick={() => navigate("/vip-zone")}>
          前往VIP商城购买配套 <ArrowRight size={16} className="ml-2" />
        </Button>
      </div>
    </div>
  );
}
