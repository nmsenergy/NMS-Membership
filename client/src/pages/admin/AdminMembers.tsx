import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { formatDate, RANK_LABELS, formatRM } from "@/lib/utils";
import MobileHeader from "@/components/MobileHeader";
import RankBadge from "@/components/RankBadge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Search, Download, Upload, Edit, UserCheck } from "lucide-react";
import { toast } from "sonner";

export default function AdminMembers() {
  const [search, setSearch] = useState("");
  const [rankFilter, setRankFilter] = useState("ALL");
  const [editMember, setEditMember] = useState<any>(null);
  const [editRank, setEditRank] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editBirthday, setEditBirthday] = useState("");
  const [editBirthdayVerified, setEditBirthdayVerified] = useState(false);
  const [editNotes, setEditNotes] = useState("");
  const [page, setPage] = useState(1);

  const { data, isLoading, refetch } = trpc.admin.members.useQuery({ search, rank: rankFilter === "ALL" ? undefined : rankFilter, page, limit: 20 });
  const utils = trpc.useUtils();

  const updateMember = trpc.admin.updateMember.useMutation({
    onSuccess: () => { toast.success("会员信息已更新"); setEditMember(null); utils.admin.members.invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  const exportExcel = trpc.admin.exportMembers.useMutation({
    onSuccess: (data) => {
      const blob = new Blob([Buffer.from(data.base64, "base64")], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = `members_${new Date().toISOString().split("T")[0]}.xlsx`; a.click();
      toast.success("导出成功");
    },
    onError: (e) => toast.error(e.message),
  });

  const openEdit = (m: any) => {
    setEditMember(m);
    setEditRank(m.rank);
    setEditPhone(m.phone || "");
    setEditBirthday(m.birthday || "");
    setEditBirthdayVerified(m.birthdayVerified || false);
    setEditNotes(m.notes || "");
  };

  return (
    <div className="mobile-app pb-8">
      <MobileHeader title="会员管理" rightElement={
        <button onClick={() => exportExcel.mutate({})} className="text-primary">
          <Download size={20} />
        </button>
      } />
      <div className="px-4 mt-3 space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="搜索姓名/推荐码/手机" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={rankFilter} onValueChange={setRankFilter}>
            <SelectTrigger className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">全部</SelectItem>
              {["VIP", "M_AGENT", "SM", "GM", "CEO"].map((r) => (
                <SelectItem key={r} value={r}>{RANK_LABELS[r]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <p className="text-center text-muted-foreground py-8">加载中...</p>
        ) : (
          <>
            <p className="text-xs text-muted-foreground">共 {data?.total ?? 0} 位会员</p>
            <div className="space-y-2">
              {data?.members.map((m) => (
                <Card key={m.id} className="p-3 rounded-xl border-0">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium">{m.userName || "未知"}</span>
                        <RankBadge rank={m.rank} size="sm" />
                        {m.birthdayVerified && <span className="text-xs bg-pink-100 text-pink-600 px-1.5 py-0.5 rounded">已认证</span>}
                      </div>
                      <p className="text-xs text-muted-foreground">推荐码: {m.referralCode} · {m.phone || "无手机"}</p>
                      <p className="text-xs text-muted-foreground">固本: {m.gubenBalance} · 奖金: {formatRM(m.bonusBalance)}</p>
                      <p className="text-xs text-muted-foreground">直推VIP: {m.directVipReferrals} · 注册: {formatDate(m.createdAt)}</p>
                    </div>
                    <button onClick={() => openEdit(m)} className="p-2 text-primary">
                      <Edit size={16} />
                    </button>
                  </div>
                </Card>
              ))}
            </div>
            <div className="flex justify-between items-center pt-2">
              <Button variant="outline" size="sm" onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1}>上一页</Button>
              <span className="text-xs text-muted-foreground">第 {page} 页</span>
              <Button variant="outline" size="sm" onClick={() => setPage(page + 1)} disabled={!data?.hasMore}>下一页</Button>
            </div>
          </>
        )}
      </div>

      <Dialog open={!!editMember} onOpenChange={() => setEditMember(null)}>
        <DialogContent className="max-w-sm mx-auto max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>编辑会员: {editMember?.userName}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>身份等级</Label>
              <Select value={editRank} onValueChange={setEditRank}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["VIP", "M_AGENT", "SM", "GM", "CEO"].map((r) => (
                    <SelectItem key={r} value={r}>{RANK_LABELS[r]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>手机号码</Label>
              <Input value={editPhone} onChange={(e) => setEditPhone(e.target.value)} className="mt-1.5" />
            </div>
            <div>
              <Label>生日</Label>
              <Input type="date" value={editBirthday} onChange={(e) => setEditBirthday(e.target.value)} className="mt-1.5" />
            </div>
            <div className="flex items-center gap-3">
              <input type="checkbox" id="bv" checked={editBirthdayVerified} onChange={(e) => setEditBirthdayVerified(e.target.checked)} />
              <Label htmlFor="bv">生日身份已认证</Label>
            </div>
            <div>
              <Label>备注</Label>
              <Input value={editNotes} onChange={(e) => setEditNotes(e.target.value)} className="mt-1.5" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditMember(null)}>取消</Button>
            <Button onClick={() => updateMember.mutate({ id: editMember.id, rank: editRank as any, phone: editPhone, birthday: editBirthday, birthdayVerified: editBirthdayVerified })} disabled={updateMember.isPending}>
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
