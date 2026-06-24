import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { formatRM, formatDateTime } from "@/lib/utils";
import MobileHeader from "@/components/MobileHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download } from "lucide-react";
import { toast } from "sonner";

export default function AdminTopups() {
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const { data: topups, isLoading: loadingTopups } = trpc.admin.pendingTopups.useQuery();
  const { data: withdrawals, isLoading: loadingWithdrawals } = trpc.admin.pendingWithdrawals.useQuery();
  const utils = trpc.useUtils();

  const approveTopup = trpc.admin.approveTopup.useMutation({
    onSuccess: () => { toast.success("充值已批准"); utils.admin.pendingTopups.invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  const rejectTopup = trpc.admin.rejectTopup.useMutation({
    onSuccess: () => { toast.success("充值已拒绝"); utils.admin.pendingTopups.invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  const approveWithdrawal = trpc.admin.approveWithdrawal.useMutation({
    onSuccess: () => { toast.success("提现已批准"); utils.admin.pendingWithdrawals.invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  const rejectWithdrawal = trpc.admin.rejectWithdrawal.useMutation({
    onSuccess: () => { toast.success("提现已拒绝"); utils.admin.pendingWithdrawals.invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  const markWithdrawalPaid = trpc.admin.markWithdrawalPaid.useMutation({
    onSuccess: () => { toast.success("已标记为已转账"); utils.admin.pendingWithdrawals.invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  const downloadExcel = (base64: string, filename: string) => {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    const blob = new Blob([bytes], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("导出成功");
  };

  const exportTopups = trpc.admin.exportTopups.useMutation({
    onSuccess: (data) => downloadExcel(data.base64, `topups_${new Date().toISOString().split("T")[0]}.xlsx`),
    onError: (e) => toast.error(e.message),
  });

  const exportWithdrawals = trpc.admin.exportWithdrawals.useMutation({
    onSuccess: (data) => downloadExcel(data.base64, `withdrawals_${new Date().toISOString().split("T")[0]}.xlsx`),
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="mobile-app pb-8">
      <MobileHeader title="充值与提现审核" />
      <div className="px-4 mt-3">
        <Tabs defaultValue="topups">
          <TabsList className="w-full grid grid-cols-2">
            <TabsTrigger value="topups">充值申请 {topups?.length ? `(${topups.length})` : ""}</TabsTrigger>
            <TabsTrigger value="withdrawals">提现申请 {withdrawals?.length ? `(${withdrawals.length})` : ""}</TabsTrigger>
          </TabsList>

          <TabsContent value="topups" className="mt-3 space-y-2">
            {/* Date filter + export */}
            <div className="flex gap-2 items-center">
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="flex-1 text-xs h-8" />
              <span className="text-xs text-muted-foreground">至</span>
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="flex-1 text-xs h-8" />
              <Button size="sm" variant="outline" onClick={() => exportTopups.mutate({ dateFrom: dateFrom || undefined, dateTo: dateTo || undefined })} disabled={exportTopups.isPending} className="shrink-0">
                <Download size={14} className="mr-1" />导出
              </Button>
            </div>
            {loadingTopups ? <p className="text-center text-muted-foreground py-8">加载中...</p>
              : !topups || topups.length === 0 ? <p className="text-center text-muted-foreground py-8 text-sm">暂无待审核充值</p>
              : topups.map((t) => (
                <Card key={t.id} className="p-3 rounded-xl border-0">
                  <div className="mb-2">
                    <p className="text-sm font-medium">{t.memberName || "未知会员"}</p>
                    <p className="text-sm">{t.type === "CASH" ? "现金充值" : "奖金转换"}: <strong>{formatRM(t.amount)}</strong> → <strong className="text-primary">{t.gubenPoints} 固本</strong></p>
                    <p className="text-xs text-muted-foreground">{formatDateTime(t.createdAt)}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" className="flex-1 bg-green-600 hover:bg-green-700" onClick={() => approveTopup.mutate({ id: t.id })} disabled={approveTopup.isPending}>批准</Button>
                    <Button size="sm" variant="outline" className="flex-1 text-red-500 border-red-200" onClick={() => rejectTopup.mutate({ id: t.id })} disabled={rejectTopup.isPending}>拒绝</Button>
                  </div>
                </Card>
              ))
            }
          </TabsContent>

          <TabsContent value="withdrawals" className="mt-3 space-y-2">
            {/* Date filter + export */}
            <div className="flex gap-2 items-center">
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="flex-1 text-xs h-8" />
              <span className="text-xs text-muted-foreground">至</span>
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="flex-1 text-xs h-8" />
              <Button size="sm" variant="outline" onClick={() => exportWithdrawals.mutate({ dateFrom: dateFrom || undefined, dateTo: dateTo || undefined })} disabled={exportWithdrawals.isPending} className="shrink-0">
                <Download size={14} className="mr-1" />导出
              </Button>
            </div>
            {loadingWithdrawals ? <p className="text-center text-muted-foreground py-8">加载中...</p>
              : !withdrawals || withdrawals.length === 0 ? <p className="text-center text-muted-foreground py-8 text-sm">暂无待处理提现</p>
              : withdrawals.map((w) => (
                <Card key={w.id} className="p-3 rounded-xl border-0">
                  <div className="mb-2">
                    <p className="text-sm font-medium">{w.memberName || "未知会员"}</p>
                    <p className="text-sm font-bold">{formatRM(w.amount)}</p>
                    <p className="text-xs text-muted-foreground">{w.bankName} · {w.bankAccount}</p>
                    <p className="text-xs text-muted-foreground">账户: {w.accountHolder}</p>
                    <p className="text-xs text-muted-foreground">{formatDateTime(w.createdAt)}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${w.status === "APPROVED" ? "bg-blue-100 text-blue-600" : "bg-yellow-100 text-yellow-600"}`}>
                      {w.status === "APPROVED" ? "已批准待转账" : "待审核"}
                    </span>
                  </div>
                  {w.status === "PENDING" && (
                    <div className="flex gap-2">
                      <Button size="sm" className="flex-1 bg-green-600 hover:bg-green-700" onClick={() => approveWithdrawal.mutate({ id: w.id })} disabled={approveWithdrawal.isPending}>批准</Button>
                      <Button size="sm" variant="outline" className="flex-1 text-red-500 border-red-200" onClick={() => rejectWithdrawal.mutate({ id: w.id })} disabled={rejectWithdrawal.isPending}>拒绝</Button>
                    </div>
                  )}
                  {w.status === "APPROVED" && (
                    <Button size="sm" className="w-full" onClick={() => markWithdrawalPaid.mutate({ id: w.id })} disabled={markWithdrawalPaid.isPending}>标记已转账</Button>
                  )}
                </Card>
              ))
            }
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
