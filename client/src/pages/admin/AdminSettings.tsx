import { useState } from "react";
import { trpc } from "@/lib/trpc";
import MobileHeader from "@/components/MobileHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Settings, Eye, EyeOff, ChevronDown, ChevronUp } from "lucide-react";

const ALL_RANKS = ["VIP", "M_AGENT", "SM", "GM", "CEO"] as const;
const RANK_LABELS: Record<string, string> = {
  VIP: "VIP",
  M_AGENT: "M代理",
  SM: "SM",
  GM: "GM",
  CEO: "CEO",
};

// All controllable features with labels and descriptions
const FEATURE_DEFINITIONS = [
  { key: "vip_zone", label: "VIP商城", desc: "VIP产品购买页面" },
  { key: "agent_zone", label: "代理区", desc: "代理产品购买页面" },
  { key: "orders", label: "我的订单", desc: "查看订单历史" },
  { key: "team", label: "我的团队", desc: "查看团队成员和层级" },
  { key: "topup", label: "Top Up 充值", desc: "固本积分充值功能" },
  { key: "withdraw", label: "提现", desc: "奖金提现功能" },
  { key: "upgrade", label: "升级申请", desc: "会员等级升级申请" },
  { key: "car_allowance", label: "汽车津贴", desc: "汽车津贴奖励显示" },
  { key: "travel_reward", label: "旅游奖励", desc: "旅游奖励显示" },
  { key: "announcements", label: "系统公告", desc: "查看系统公告" },
  { key: "notifications", label: "通知中心", desc: "查看个人通知" },
  { key: "switch_account", label: "切换户口", desc: "切换查看下线会员账户" },
];

function FeatureVisibilityPanel() {
  const { data: visibilityData, refetch } = trpc.admin.getFeatureVisibility.useQuery();
  const setVisibility = trpc.admin.setFeatureVisibility.useMutation({
    onSuccess: () => { toast.success("已保存"); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  // Build a map from featureKey → { isEnabled, allowedRanks }
  const visMap = new Map(
    (visibilityData ?? []).map((v) => [
      v.featureKey,
      {
        isEnabled: v.isEnabled,
        allowedRanks: (() => {
          try { return JSON.parse(v.allowedRanks || "[]") as string[]; }
          catch { return [] as string[]; }
        })(),
      },
    ])
  );

  const getEnabled = (key: string) => visMap.get(key)?.isEnabled ?? true;
  const getAllowedRanks = (key: string): string[] => {
    const ranks = visMap.get(key)?.allowedRanks ?? [];
    return ranks.length === 0 ? [] : ranks; // [] means all ranks
  };

  const handleToggleEnabled = (key: string, val: boolean) => {
    const current = visMap.get(key);
    setVisibility.mutate({
      featureKey: key,
      isEnabled: val,
      allowedRanks: (current?.allowedRanks ?? []) as any,
    });
  };

  const handleToggleRank = (key: string, rank: string) => {
    const currentRanks = getAllowedRanks(key);
    let newRanks: string[];
    if (currentRanks.length === 0) {
      // Currently all ranks → restrict to all except this one
      newRanks = ALL_RANKS.filter((r) => r !== rank);
    } else if (currentRanks.includes(rank)) {
      newRanks = currentRanks.filter((r) => r !== rank);
    } else {
      newRanks = [...currentRanks, rank];
    }
    // If all ranks selected, store as [] (meaning all)
    if (newRanks.length === ALL_RANKS.length) newRanks = [];
    setVisibility.mutate({
      featureKey: key,
      isEnabled: getEnabled(key),
      allowedRanks: newRanks as any,
    });
  };

  const isRankAllowed = (key: string, rank: string) => {
    const ranks = getAllowedRanks(key);
    return ranks.length === 0 || ranks.includes(rank);
  };

  return (
    <Card className="p-4 rounded-xl border-0">
      <div className="flex items-center gap-2 mb-4">
        <Eye size={16} className="text-primary" />
        <h3 className="font-semibold text-sm">功能显示控制</h3>
      </div>
      <p className="text-xs text-muted-foreground mb-4">
        控制会员端各功能的显示与隐藏，并设定可查看的会员等级。关闭后会员将无法看到该功能入口。
      </p>
      <div className="space-y-3">
        {FEATURE_DEFINITIONS.map((feature) => {
          const enabled = getEnabled(feature.key);
          const allowedRanks = getAllowedRanks(feature.key);
          return (
            <div
              key={feature.key}
              className={`rounded-lg border p-3 transition-opacity ${enabled ? "" : "opacity-50"}`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{feature.label}</span>
                    {enabled ? (
                      <Badge variant="outline" className="text-xs text-green-600 border-green-300 bg-green-50 px-1.5 py-0">显示</Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs text-red-500 border-red-300 bg-red-50 px-1.5 py-0">隐藏</Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{feature.desc}</p>
                </div>
                <Switch
                  checked={enabled}
                  onCheckedChange={(val) => handleToggleEnabled(feature.key, val)}
                  disabled={setVisibility.isPending}
                  className="ml-3 shrink-0"
                />
              </div>
              {enabled && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1.5">
                    可查看等级：
                    {allowedRanks.length === 0 ? (
                      <span className="text-green-600 font-medium">全部等级</span>
                    ) : (
                      <span className="text-amber-600 font-medium">{allowedRanks.map(r => RANK_LABELS[r]).join("、")}</span>
                    )}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {ALL_RANKS.map((rank) => {
                      const active = isRankAllowed(feature.key, rank);
                      return (
                        <button
                          key={rank}
                          onClick={() => handleToggleRank(feature.key, rank)}
                          disabled={setVisibility.isPending}
                          className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                            active
                              ? "bg-primary text-primary-foreground border-primary"
                              : "bg-muted text-muted-foreground border-border hover:border-primary/50"
                          }`}
                        >
                          {RANK_LABELS[rank]}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}

export default function AdminSettings() {
  const { data: settings, refetch } = trpc.admin.getSettings.useQuery();
  const [form, setForm] = useState<Record<string, string>>({});
  const [showFeaturePanel, setShowFeaturePanel] = useState(true);
  const utils = trpc.useUtils();

  const updateSettings = trpc.admin.updateSettings.useMutation({
    onSuccess: () => { toast.success("设置已保存"); utils.admin.getSettings.invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  const settingGroups = [
    {
      title: "固本积分设置",
      fields: [
        { key: "guben_earn_rate", label: "固本获得比例 (%)", desc: "购买时固本获得比例，默认15%" },
      ],
    },
    {
      title: "升级条件",
      fields: [
        { key: "m_agent_vip_packages", label: "M代理: 所需VIP配套数", desc: "默认12套" },
        { key: "m_agent_vip_referrals", label: "M代理: 所需直推VIP数", desc: "默认12人" },
        { key: "sm_vip_packages", label: "SM: 所需VIP配套数", desc: "默认36套" },
        { key: "sm_m_agent_referrals", label: "SM: 所需直推M代理数", desc: "默认10人" },
      ],
    },
    {
      title: "生日优惠设置",
      fields: [
        { key: "birthday_max_products", label: "生日优惠最多产品种类", desc: "默认2种" },
        { key: "birthday_max_qty_per_product", label: "每种产品最多数量", desc: "默认1件" },
      ],
    },
    {
      title: "汽车津贴设置",
      fields: [
        { key: "car_allowance_min_performance", label: "最低月业绩 (RM)", desc: "默认18000" },
        { key: "car_allowance_sub_cap", label: "小组成员业绩上限 (RM)", desc: "默认6000" },
        { key: "car_allowance_base", label: "基础津贴 (RM)", desc: "默认300" },
        { key: "car_allowance_per_member", label: "每位达标成员津贴 (RM)", desc: "默认200" },
      ],
    },
    {
      title: "组织奖比例",
      fields: [
        { key: "sm_org_bonus_rate", label: "SM组织奖比例 (%)", desc: "SM从M代理销售获得，默认10%" },
        { key: "gm_m_agent_bonus_rate", label: "GM从M代理奖比例 (%)", desc: "默认15%" },
        { key: "gm_sm_bonus_rate", label: "GM从SM小组奖比例 (%)", desc: "默认5%" },
      ],
    },
  ];

  const getValue = (key: string) => form[key] ?? settings?.[key] ?? "";

  return (
    <div className="mobile-app pb-8">
      <MobileHeader title="系统设置" />
      <div className="px-4 mt-3 space-y-4">

        {/* Feature Visibility Panel */}
        <FeatureVisibilityPanel />

        {/* System Settings */}
        <div className="flex items-center gap-2 mt-2">
          <Settings size={15} className="text-muted-foreground" />
          <h2 className="text-sm font-semibold text-muted-foreground">系统参数设置</h2>
        </div>

        {settingGroups.map((group) => (
          <Card key={group.title} className="p-4 rounded-xl border-0">
            <h3 className="font-semibold text-sm mb-3">{group.title}</h3>
            <div className="space-y-3">
              {group.fields.map((field) => (
                <div key={field.key}>
                  <Label className="text-sm">{field.label}</Label>
                  <p className="text-xs text-muted-foreground mb-1">{field.desc}</p>
                  <Input
                    type="number"
                    value={getValue(field.key)}
                    onChange={(e) => setForm({ ...form, [field.key]: e.target.value })}
                    className="mt-0.5"
                  />
                </div>
              ))}
            </div>
          </Card>
        ))}
        <Button className="w-full" onClick={() => updateSettings.mutate(form)} disabled={updateSettings.isPending}>
          {updateSettings.isPending ? "保存中..." : "保存系统参数"}
        </Button>
      </div>
    </div>
  );
}
