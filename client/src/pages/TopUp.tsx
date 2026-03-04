import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { formatRM, formatDateTime } from "@/lib/utils";
import MobileHeader from "@/components/MobileHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Wallet } from "lucide-react";

export default function TopUp() {
  const { data: authData } = trpc.auth.me.useQuery();
  const member = (authData as any)?.member;
  const [amount, setAmount] = useState("");
  const [type, setType] = useState<"CASH" | "BONUS_CONVERT">("CASH");
  const { data: topups } = trpc.bonus.myTopups.useQuery();
  const utils = trpc.useUtils();

  const topup = trpc.bonus.topup.useMutation({
    onSuccess: (data) => {
      toast.success(data.status === "APPROVED" ? "转换成功！固本积分已到账" : "充值申请已提交，等待审核");
      setAmount("");
      utils.auth.me.invalidate();
      utils.bonus.myTopups.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const handleTopup = () => {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) { toast.error("请输入有效金额"); return; }
    topup.mutate({ type, amount: amt });
  };

  return (
    <div className="mobile-app">
      <MobileHeader title="充值 Top Up" />
      <div className="px-4 mt-4">
        <Card className="p-4 rounded-xl border-0 bg-primary/5 mb-4">
          <div className="flex justify-between">
            <div>
              <p className="text-xs text-muted-foreground">固本积分</p>
              <p className="text-2xl font-bold text-primary">{member?.gubenBalance ?? 0}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">奖金余额</p>
              <p className="text-2xl font-bold text-green-600">{formatRM(member?.bonusBalance)}</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-2">RM 1 = 1 固本积分 · 积分每年12月31日清零</p>
        </Card>

        <Tabs value={type} onValueChange={(v) => setType(v as any)}>
          <TabsList className="w-full grid grid-cols-2">
            <TabsTrigger value="CASH">现金充值</TabsTrigger>
            <TabsTrigger value="BONUS_CONVERT">奖金转固本</TabsTrigger>
          </TabsList>

          <TabsContent value="CASH" className="mt-4 space-y-4">
            <p className="text-sm text-muted-foreground">通过线上转账充值固本积分，需上传付款凭证等待管理员审核。</p>
            <div>
              <Label>充值金额 (RM)</Label>
              <Input type="number" placeholder="请输入金额" value={amount} onChange={(e) => setAmount(e.target.value)} className="mt-1.5" min="1" />
            </div>
            <div className="grid grid-cols-4 gap-2">
              {[50, 100, 200, 500].map((v) => (
                <Button key={v} variant="outline" size="sm" onClick={() => setAmount(String(v))}>RM{v}</Button>
              ))}
            </div>
            <Button className="w-full" onClick={handleTopup} disabled={topup.isPending}>
              {topup.isPending ? "提交中..." : "提交充值申请"}
            </Button>
          </TabsContent>

          <TabsContent value="BONUS_CONVERT" className="mt-4 space-y-4">
            <p className="text-sm text-muted-foreground">将奖金余额转换为固本积分，即时到账。RM 1 = 1 固本。</p>
            <div>
              <Label>转换金额 (RM)</Label>
              <Input type="number" placeholder="请输入金额" value={amount} onChange={(e) => setAmount(e.target.value)} className="mt-1.5" min="1" max={member?.bonusBalance} />
              <p className="text-xs text-muted-foreground mt-1">可用奖金: {formatRM(member?.bonusBalance)}</p>
            </div>
            <Button className="w-full" onClick={handleTopup} disabled={topup.isPending}>
              {topup.isPending ? "转换中..." : "立即转换"}
            </Button>
          </TabsContent>
        </Tabs>

        {topups && topups.length > 0 && (
          <div className="mt-6">
            <h3 className="text-sm font-semibold mb-3">充值记录</h3>
            <div className="space-y-2">
              {topups.map((t) => (
                <Card key={t.id} className="p-3 rounded-xl border-0">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm font-medium">{t.type === "CASH" ? "现金充值" : "奖金转换"}</p>
                      <p className="text-xs text-muted-foreground">{formatDateTime(t.createdAt)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-primary">+{t.gubenPoints} 固本</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${t.status === "APPROVED" ? "bg-green-100 text-green-600" : t.status === "REJECTED" ? "bg-red-100 text-red-600" : "bg-yellow-100 text-yellow-600"}`}>
                        {t.status === "APPROVED" ? "已批准" : t.status === "REJECTED" ? "已拒绝" : "待审核"}
                      </span>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
