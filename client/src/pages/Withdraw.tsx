import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { formatRM, formatDateTime, isSMOrAbove } from "@/lib/utils";
import MobileHeader from "@/components/MobileHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Lock } from "lucide-react";
import { useLocation } from "wouter";

export default function Withdraw() {
  const [, navigate] = useLocation();
  const { data: authData } = trpc.auth.me.useQuery();
  const member = (authData as any)?.member;
  const [amount, setAmount] = useState("");
  const [bankName, setBankName] = useState("");
  const [bankAccount, setBankAccount] = useState("");
  const [accountHolder, setAccountHolder] = useState("");
  const { data: withdrawals } = trpc.bonus.myWithdrawals.useQuery();
  const utils = trpc.useUtils();

  const withdraw = trpc.bonus.withdraw.useMutation({
    onSuccess: () => { toast.success("提现申请已提交"); setAmount(""); utils.bonus.myWithdrawals.invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  if (!member || !isSMOrAbove(member.rank)) {
    return (
      <div className="mobile-app">
        <MobileHeader title="我要提现" />
        <div className="flex flex-col items-center justify-center min-h-[60vh] px-8 text-center">
          <Lock size={48} className="text-muted-foreground/40 mb-4" />
          <h2 className="text-lg font-semibold mb-2">SM级别以上才可提现</h2>
          <p className="text-sm text-muted-foreground mb-4">升级至SM高级代理后即可提取奖金</p>
          <Button onClick={() => navigate("/upgrade")}>了解升级条件</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mobile-app">
      <MobileHeader title="我要提现" />
      <div className="px-4 mt-4 space-y-4">
        <Card className="p-4 rounded-xl border-0 bg-green-50">
          <p className="text-xs text-muted-foreground">可提现奖金</p>
          <p className="text-2xl font-bold text-green-600">{formatRM(member.bonusBalance)}</p>
        </Card>

        <Card className="p-4 rounded-xl border-0 space-y-3">
          <div>
            <Label>提现金额 (RM)</Label>
            <Input type="number" placeholder="请输入提现金额" value={amount} onChange={(e) => setAmount(e.target.value)} className="mt-1.5" />
          </div>
          <div>
            <Label>银行名称</Label>
            <Input placeholder="如: Maybank, CIMB, Public Bank" value={bankName} onChange={(e) => setBankName(e.target.value)} className="mt-1.5" />
          </div>
          <div>
            <Label>银行账号</Label>
            <Input placeholder="请输入银行账号" value={bankAccount} onChange={(e) => setBankAccount(e.target.value)} className="mt-1.5" />
          </div>
          <div>
            <Label>账户持有人姓名</Label>
            <Input placeholder="请输入账户持有人姓名" value={accountHolder} onChange={(e) => setAccountHolder(e.target.value)} className="mt-1.5" />
          </div>
          <Button className="w-full" onClick={() => withdraw.mutate({ amount: parseFloat(amount), bankName, bankAccount, accountHolder })} disabled={withdraw.isPending || !amount || !bankName || !bankAccount || !accountHolder}>
            {withdraw.isPending ? "提交中..." : "提交提现申请"}
          </Button>
        </Card>

        {withdrawals && withdrawals.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold mb-3">提现记录</h3>
            <div className="space-y-2">
              {withdrawals.map((w) => (
                <Card key={w.id} className="p-3 rounded-xl border-0">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm font-bold">{formatRM(w.amount)}</p>
                      <p className="text-xs text-muted-foreground">{w.bankName} · {formatDateTime(w.createdAt)}</p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${w.status === "PAID" ? "bg-green-100 text-green-600" : w.status === "REJECTED" ? "bg-red-100 text-red-600" : "bg-yellow-100 text-yellow-600"}`}>
                      {w.status === "PAID" ? "已转账" : w.status === "REJECTED" ? "已拒绝" : w.status === "APPROVED" ? "已批准" : "待审核"}
                    </span>
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
