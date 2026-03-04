import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { formatRM, formatDateTime, BONUS_TYPE_LABELS } from "@/lib/utils";
import MobileHeader from "@/components/MobileHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download, Plus } from "lucide-react";
import { toast } from "sonner";

export default function AdminBonuses() {
  const [showManual, setShowManual] = useState(false);
  const [memberId, setMemberId] = useState("");
  const [bonusType, setBonusType] = useState("ADMIN_ADJUST");
  const [amount, setAmount] = useState("");
  const [gubenAmount, setGubenAmount] = useState("");
  const [description, setDescription] = useState("");
  const [page, setPage] = useState(1);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const { data: bonusReport } = trpc.admin.bonusReport.useQuery({ page, limit: 30, dateFrom: dateFrom || undefined, dateTo: dateTo || undefined });
  const utils = trpc.useUtils();

  const manualBonus = trpc.admin.manualBonus.useMutation({
    onSuccess: () => { toast.success("奖金已手动分配"); setShowManual(false); setMemberId(""); setAmount(""); setGubenAmount(""); setDescription(""); utils.admin.bonusReport.invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  const exportBonuses = trpc.admin.exportBonuses.useMutation({
    onSuccess: (data) => {
      const blob = new Blob([Buffer.from(data.base64, "base64")], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = `bonuses_${new Date().toISOString().split("T")[0]}.xlsx`; a.click();
      toast.success("导出成功");
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="mobile-app pb-8">
      <MobileHeader title="奖金管理" rightElement={
        <div className="flex gap-1">
          <button onClick={() => exportBonuses.mutate({ dateFrom: dateFrom || undefined, dateTo: dateTo || undefined })} className="text-primary"><Download size={18} /></button>
          <button onClick={() => setShowManual(true)} className="text-primary ml-1"><Plus size={20} /></button>
        </div>
      } />
      <div className="px-4 mt-3 space-y-3">
        <div className="flex gap-2">
          <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="flex-1 text-xs" placeholder="开始日期" />
          <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="flex-1 text-xs" placeholder="结束日期" />
        </div>

        {bonusReport && (
          <div className="grid grid-cols-2 gap-3">
            <Card className="p-3 rounded-xl border-0 text-center">
              <p className="text-lg font-bold text-primary">{formatRM(bonusReport.totalBonus)}</p>
              <p className="text-xs text-muted-foreground">总奖金发放</p>
            </Card>
            <Card className="p-3 rounded-xl border-0 text-center">
              <p className="text-lg font-bold text-amber-600">{bonusReport.totalGuben}</p>
              <p className="text-xs text-muted-foreground">总固本发放</p>
            </Card>
          </div>
        )}

        <div className="space-y-2">
          {bonusReport?.entries.map((entry) => (
            <Card key={entry.id} className="p-3 rounded-xl border-0">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium">{entry.memberName || "未知"}</p>
                  <p className="text-xs text-muted-foreground">{BONUS_TYPE_LABELS[entry.type] || entry.type}</p>
                  <p className="text-xs text-muted-foreground">{formatDateTime(entry.createdAt)}</p>
                  {entry.description && <p className="text-xs text-muted-foreground">{entry.description}</p>}
                </div>
                <div className="text-right">
                  {entry.bonusAmount && <p className={`text-sm font-bold ${parseFloat(entry.bonusAmount) > 0 ? "text-green-600" : "text-red-500"}`}>{parseFloat(entry.bonusAmount) > 0 ? "+" : ""}{formatRM(entry.bonusAmount)}</p>}
                  {entry.gubenAmount && <p className={`text-sm font-bold ${entry.gubenAmount > 0 ? "text-primary" : "text-red-500"}`}>{entry.gubenAmount > 0 ? "+" : ""}{entry.gubenAmount} 固本</p>}
                </div>
              </div>
            </Card>
          ))}
        </div>
        <div className="flex justify-between items-center pt-2">
          <Button variant="outline" size="sm" onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1}>上一页</Button>
          <span className="text-xs text-muted-foreground">第 {page} 页</span>
          <Button variant="outline" size="sm" onClick={() => setPage(page + 1)} disabled={!bonusReport?.hasMore}>下一页</Button>
        </div>
      </div>

      <Dialog open={showManual} onOpenChange={setShowManual}>
        <DialogContent className="max-w-sm mx-auto">
          <DialogHeader>
            <DialogTitle>手动分配奖金</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>会员ID</Label>
              <Input type="number" placeholder="输入会员ID" value={memberId} onChange={(e) => setMemberId(e.target.value)} className="mt-1.5" />
            </div>
            <div>
              <Label>奖金类型</Label>
              <Select value={bonusType} onValueChange={setBonusType}>
                <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["ADMIN_ADJUST", "ORG_BONUS", "GRATITUDE_BONUS", "YEAR_END_DIVIDEND", "CAR_ALLOWANCE", "TRAVEL_REWARD", "SHAREHOLDER_DIVIDEND"].map((t) => (
                    <SelectItem key={t} value={t}>{BONUS_TYPE_LABELS[t]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>奖金金额 (RM, 可为负)</Label>
              <Input type="number" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} className="mt-1.5" />
            </div>
            <div>
              <Label>固本积分 (可为负)</Label>
              <Input type="number" placeholder="0" value={gubenAmount} onChange={(e) => setGubenAmount(e.target.value)} className="mt-1.5" />
            </div>
            <div>
              <Label>备注说明</Label>
              <Input placeholder="说明原因" value={description} onChange={(e) => setDescription(e.target.value)} className="mt-1.5" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowManual(false)}>取消</Button>
            <Button onClick={() => manualBonus.mutate({ memberId: parseInt(memberId), type: bonusType, bonusAmount: amount ? parseFloat(amount) : undefined, gubenAmount: gubenAmount ? parseInt(gubenAmount) : undefined, description })} disabled={manualBonus.isPending || !memberId}>
              确认分配
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
