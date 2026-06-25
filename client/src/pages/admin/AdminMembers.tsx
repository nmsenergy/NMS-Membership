import { useState } from "react";
import { useEffect } from "react";
import { Link } from "wouter";
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
import { Badge } from "@/components/ui/badge";
import { Search, Download, Edit, ChevronDown, ChevronUp, Mail, Phone, User, Users, Calendar, Wallet, Star, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { useAdminView } from "@/contexts/AdminContext";

export default function AdminMembers() {
  const { setCurrentAdminPage } = useAdminView();
  const [search, setSearch] = useState("");
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<any[]>([]);
  const [rankFilter, setRankFilter] = useState("ALL");
  const [editMember, setEditMember] = useState<any>(null);
  const [editRank, setEditRank] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editBirthday, setEditBirthday] = useState("");
  const [editBirthdayVerified, setEditBirthdayVerified] = useState(false);
  const [editNotes, setEditNotes] = useState("");
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editIsActive, setEditIsActive] = useState(true);
  const [editReferrerId, setEditReferrerId] = useState<string>("");
  const [referrerSearch, setReferrerSearch] = useState("");
  const [referrerSearchResults, setReferrerSearchResults] = useState<any[]>([]);
  const [selectedReferrer, setSelectedReferrer] = useState<any>(null);
  const [showReferrerDropdown, setShowReferrerDropdown] = useState(false);
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const { data: referrerData } = trpc.admin.members.useQuery(
    { search: referrerSearch, page: 1, limit: 10 },
    { enabled: referrerSearch.length >= 2 }
  );

  useEffect(() => {
    if (referrerSearch.length >= 2 && referrerData) {
      setReferrerSearchResults((referrerData as any)?.members || []);
      setShowReferrerDropdown(true);
    }
  }, [referrerData, referrerSearch]);

  const { data, isLoading, refetch } = trpc.admin.members.useQuery({
    search,
    rank: rankFilter === "ALL" ? undefined : rankFilter,
    page,
    limit: 20,
  });
  const utils = trpc.useUtils();

  const updateMember = trpc.admin.updateMember.useMutation({
    onSuccess: () => {
      toast.success("会员信息已更新");
      setEditMember(null);
      utils.admin.members.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const verifyBirthday = trpc.admin.verifyBirthday.useMutation({
    onSuccess: () => { toast.success("生日认证已完成，已通知会员"); utils.admin.members.invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  const deleteBirthdayPhoto = trpc.admin.deleteBirthdayIdPhoto.useMutation({
    onSuccess: () => { toast.success("身份证照片已删除"); utils.admin.members.invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  const [showPasswordResult, setShowPasswordResult] = useState(false);
  const [tempPassword, setTempPassword] = useState("");

  const resetPassword = trpc.admin.resetMemberPassword.useMutation({
    onSuccess: (data) => {
      setTempPassword(data.tempPassword);
      setShowPasswordResult(true);
      toast.success("临时密码已生成");
    },
    onError: (e) => toast.error(e.message),
  });

  const exportExcel = trpc.admin.exportMembers.useMutation({
    onSuccess: (data) => {
      const binaryString = atob(data.base64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `members_${new Date().toISOString().split("T")[0]}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
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
    setEditName(m.userName || "");
    setEditEmail(m.userEmail || "");
    setEditIsActive(m.isActive !== false);
    setEditReferrerId(m.referrerId ? String(m.referrerId) : "");
    setSelectedReferrer(m.referrerId ? { id: m.referrerId, name: m.referrerName } : null);
    setReferrerSearch("");
    setReferrerSearchResults([]);
    setShowReferrerDropdown(false);
  };

  const toggleExpand = (id: number) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const importMembers = trpc.admin.importMembers.useMutation({
    onSuccess: () => {
      toast.success("会员导入成功");
      utils.admin.members.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const handleDownloadTemplate = () => {
    const headers = ['姓名', '邮箱', '推荐码', '手机', '生日'];
    const csv = headers.join(',') + '\n';
    const bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
    const blob = new Blob([bom, new TextEncoder().encode(csv)], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'member_template.csv');
    link.click();
    URL.revokeObjectURL(url);
    toast.success('模板已下载');
  };

  // 后台管理界面视觉修正：移除了旧的丝绸背景与杂乱视觉元素，采用纯净色调
  return (
    <div className="mobile-app pb-8 bg-background">
      <MobileHeader
        title="会员管理"
        onBack={() => setCurrentAdminPage("dashboard")}
        rightElement={
          <button onClick={() => exportExcel.mutate({})} className="text-primary">
            <Download size={20} />
          </button>
        }
      />
      <div className="px-4 mt-3 space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="搜索姓名/推荐码/手机"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
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

        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={handleDownloadTemplate}>
            下载模板
          </Button>
          <Link href="/admin/import">
            <Button className="flex-1" type="button">
              导入会员
            </Button>
          </Link>
        </div>

        {isLoading ? (
          <p className="text-center text-muted-foreground py-8">加载中...</p>
        ) : (
          <>
            <p className="text-xs text-muted-foreground">共 {data?.total ?? 0} 位会员</p>
            <div className="space-y-2">
              {data?.members.map((m) => (
                <Card key={m.id} className="rounded-xl border shadow-none bg-card">
                  <div className="p-3 cursor-pointer" onClick={() => toggleExpand(m.id)}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="text-sm font-semibold">{m.userName || "未知"}</span>
                          <RankBadge rank={m.rank} size="sm" />
                          {m.birthdayVerified && (
                            <span className="text-xs bg-pink-50 text-pink-600 px-1.5 py-0.5 rounded flex items-center gap-0.5 border border-pink-100">
                              <ShieldCheck size={10} /> 已认证
                            </span>
                          )}
                          {!m.isActive && (
                            <span className="text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">已停用</span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                          {m.phone && (
                            <span className="flex items-center gap-1">
                              <Phone size={11} /> {m.phone}
                            </span>
                          )}
                          {m.userEmail && (
                            <span className="flex items-center gap-1 truncate max-w-[160px]">
                              <Mail size={11} /> {m.userEmail}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                          <span>推荐码: <span className="font-mono text-foreground">{m.referralCode}</span></span>
                          {m.referrerName && (
                            <span className="flex items-center gap-1">
                              <Users size={11} /> 推荐人: {m.referrerName}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 ml-2">
                        <button
                          onClick={(e) => { e.stopPropagation(); openEdit(m); }}
                          className="p-1.5 text-primary hover:bg-primary/10 rounded"
                        >
                          <Edit size={15} />
                        </button>
                        {expandedId === m.id ? <ChevronUp size={15} className="text-muted-foreground" /> : <ChevronDown size={15} className="text-muted-foreground" />}
                      </div>
                    </div>
                  </div>
                  
                  {expandedId === m.id && (
                    <div className="border-t border-dashed bg-muted/20 px-3 py-3 space-y-3">
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                        <div><span className="text-muted-foreground">会员ID: </span><span className="font-mono">{m.id}</span></div>
                        <div><span className="text-muted-foreground">等级: </span><span>{RANK_LABELS[m.rank] ?? m.rank}</span></div>
                        <div><span className="text-muted-foreground">姓名: </span><span>{m.userName || "—"}</span></div>
                        <div><span className="text-muted-foreground">状态: </span><span>{m.isActive ? "✅ 启用" : "❌ 停用"}</span></div>
                      </div>
                      {/* 后续详情... */}
                    </div>
                  )}
                </Card>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
