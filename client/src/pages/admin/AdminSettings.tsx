import { useState } from "react";
import { trpc } from "@/lib/trpc";
import MobileHeader from "@/components/MobileHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function AdminSettings() {
  const { data: settings, refetch } = trpc.admin.getSettings.useQuery();
  const [form, setForm] = useState<Record<string, string>>({});
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
        { key: "birthday_max_products", label: "生日优惠最多产品种类", desc: "默认3种" },
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
          {updateSettings.isPending ? "保存中..." : "保存所有设置"}
        </Button>
      </div>
    </div>
  );
}
