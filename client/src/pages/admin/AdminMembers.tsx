import { useState } from "react";
import { useEffect } from "react";
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

  // Referrer search query - only runs when referrerSearch has 2+ chars
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
    // Use BOM for UTF-8 to ensure proper encoding in Excel
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

  const handleImportFile = (e: any) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportFile(file);
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const csv = event.target?.result as string;
      const lines = csv.split('\n').filter(l => l.trim());
      const preview = lines.slice(1, 6).map((line, idx) => {
        const [name, email, referralCode, phone, birthday] = line.split(',').map(s => s.trim());
        return { idx, name, email, referralCode, phone, birthday };
      });
      setImportPreview(preview);
      setShowImportDialog(true);
    };
    reader.readAsText(file);
  };

  const handleConfirmImport = () => {
    if (!importFile) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const csv = event.target?.result as string;
      importMembers.mutate({ csvData: csv });
      setShowImportDialog(false);
      setImportFile(null);
      setImportPreview([]);
    };
    reader.readAsText(importFile);
  };

  const RANK_COLORS: Record<string, string> = {
    VIP: "bg-blue-100 text-blue-700",
    M_AGENT: "bg-green-100 text-green-700",
    SM: "bg-yellow-100 text-yellow-700",
    GM: "bg-orange-100 text-orange-700",
    CEO: "bg-purple-100 text-purple-700",
  };

  return (
    <div className="mobile-app pb-8">
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

        {/* Import Buttons */}
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={handleDownloadTemplate}>
            下载模板
          </Button>
          <Button className="flex-1" onClick={() => document.getElementById('member-import-input')?.click()}>
            导入会员
          </Button>
          <input
            id="member-import-input"
            type="file"
            accept=".csv"
            style={{ display: 'none' }}
            onChange={handleImportFile}
          />
        </div>

        {isLoading ? (
          <p className="text-center text-muted-foreground py-8">加载中...</p>
        ) : (
          <>
            <p className="text-xs text-muted-foreground">共 {data?.total ?? 0} 位会员</p>
            <div className="space-y-2">
              {data?.members.map((m) => (
                <Card key={m.id} className="rounded-xl border-0 overflow-hidden">
                  {/* Summary Row */}
                  <div
                    className="p-3 cursor-pointer"
                    onClick={() => toggleExpand(m.id)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="text-sm font-semibold">{m.userName || "未知"}</span>
                          <RankBadge rank={m.rank} size="sm" />
                          {m.birthdayVerified && (
                            <span className="text-xs bg-pink-100 text-pink-600 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                              <ShieldCheck size={10} /> 已认证
                            </span>
                          )}
                          {!m.isActive && (
                            <span className="text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded">已停用</span>
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

                  {/* Expanded Detail */}
                  {expandedId === m.id && (
                    <div className="border-t border-border/50 bg-muted/30 px-3 py-3 space-y-3">
                      {/* Account Info */}
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">账户资料</p>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                          <div>
                            <span className="text-muted-foreground">会员ID: </span>
                            <span className="font-mono">{m.id}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">等级: </span>
                            <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${RANK_COLORS[m.rank] ?? ""}`}>
                              {RANK_LABELS[m.rank] ?? m.rank}
                            </span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">姓名: </span>
                            <span>{m.userName || "—"}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">电邮: </span>
                            <span className="break-all">{m.userEmail || "—"}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">手机: </span>
                            <span>{m.phone || "—"}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">生日: </span>
                            <span>{m.birthday || "—"}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">生日认证: </span>
                            <span>{m.birthdayVerified ? "✅ 已认证" : m.birthdayIdPhotoUrl ? "⏳ 待审核" : "❌ 未认证"}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">状态: </span>
                            <span>{m.isActive ? "✅ 启用" : "❌ 停用"}</span>
                          </div>
                        </div>
                      </div>

                      {/* Referral Info */}
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">推荐资料</p>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                          <div>
                            <span className="text-muted-foreground">推荐码: </span>
                            <span className="font-mono font-medium">{m.referralCode}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">推荐人: </span>
                            <span>{m.referrerName || "—"}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">直推VIP: </span>
                            <span>{m.directVipReferrals}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">直推代理: </span>
                            <span>{m.directMAgentReferrals}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">VIP购买次数: </span>
                            <span>{m.vipPackagesBought}</span>
                          </div>
                        </div>
                      </div>

                      {/* Balance Info */}
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">余额资料</p>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                          <div>
                            <span className="text-muted-foreground">固本余额: </span>
                            <span className="font-semibold text-amber-600">{m.gubenBalance} 点</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">奖金余额: </span>
                            <span className="font-semibold text-green-600">{formatRM(m.bonusBalance)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Birthday ID Photo */}
                      {m.birthdayIdPhotoUrl && (
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">生日身份证照片</p>
                          <a href={m.birthdayIdPhotoUrl} target="_blank" rel="noopener noreferrer">
                            <img src={m.birthdayIdPhotoUrl} alt="身份证" className="w-full rounded-lg border max-h-32 object-contain" />
                          </a>
                          <div className="flex gap-2 mt-2">
                            {!m.birthdayVerified && (
                              <button
                                className="flex-1 text-xs bg-green-600 text-white rounded-lg py-1.5 hover:bg-green-700"
                                onClick={(e) => { e.stopPropagation(); verifyBirthday.mutate({ memberId: m.id, deletePhoto: true }); }}
                                disabled={verifyBirthday.isPending}
                              >
                                ✅ 认证并删除照片
                              </button>
                            )}
                            <button
                              className="flex-1 text-xs bg-red-100 text-red-600 rounded-lg py-1.5 hover:bg-red-200"
                              onClick={(e) => { e.stopPropagation(); deleteBirthdayPhoto.mutate({ memberId: m.id }); }}
                              disabled={deleteBirthdayPhoto.isPending}
                            >
                              🗑️ 仅删除照片
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Timestamps */}
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">时间记录</p>
                        <div className="grid grid-cols-1 gap-y-1 text-xs">
                          <div>
                            <span className="text-muted-foreground">注册时间: </span>
                            <span>{new Date(m.createdAt).toLocaleString()}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">最后更新: </span>
                            <span>{new Date(m.updatedAt).toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
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

      {/* Edit Dialog */}
      <Dialog open={!!editMember} onOpenChange={() => setEditMember(null)}>
        <DialogContent className="max-w-sm mx-auto max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>编辑会员: {editMember?.userName || editMember?.id}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {/* Basic Info */}
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">基本资料</p>
            <div>
              <Label>会员名字</Label>
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="mt-1.5" placeholder="输入姓名" />
            </div>
            <div>
              <Label>电邮地址</Label>
              <Input type="email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} className="mt-1.5" placeholder="输入电邮" />
            </div>
            <div>
              <Label>手机号码</Label>
              <Input value={editPhone} onChange={(e) => setEditPhone(e.target.value)} className="mt-1.5" placeholder="输入手机号码" />
            </div>
            <div>
              <Label>生日日期</Label>
              <Input type="date" value={editBirthday} onChange={(e) => setEditBirthday(e.target.value)} className="mt-1.5" />
            </div>

            {/* Account Settings */}
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide pt-1">账户设置</p>
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
              <Label>账户状态</Label>
              <Select value={editIsActive ? "active" : "inactive"} onValueChange={(v) => setEditIsActive(v === "active")}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">✅ 启用</SelectItem>
                  <SelectItem value="inactive">❌ 停用</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="bv"
                checked={editBirthdayVerified}
                onChange={(e) => setEditBirthdayVerified(e.target.checked)}
              />
              <Label htmlFor="bv">生日身份已认证</Label>
            </div>

            {/* Login Credentials */}
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide pt-1">登入资料</p>
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => resetPassword.mutate({ userId: editMember.userId })}
              disabled={resetPassword.isPending}
            >
              {resetPassword.isPending ? "生成中..." : "🔑 重置密码"}
            </Button>
            {showPasswordResult && tempPassword && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-2">
                <p className="text-xs font-semibold text-blue-900">临时密码已生成</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-white border rounded px-2 py-1 text-sm font-mono text-blue-600">{tempPassword}</code>
                  <button
                    type="button"
                    className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                    onClick={() => {
                      navigator.clipboard.writeText(tempPassword);
                      toast.success("已复制到剪贴板");
                    }}
                  >
                    复制
                  </button>
                </div>
                <p className="text-xs text-blue-800">请将此密码告知会员，会员可用此密码登入并修改密码。</p>
              </div>
            )}

            {/* Referrer Change */}
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide pt-1">更换推荐人</p>
            <div className="relative">
              <Label>搜索推荐人姓名</Label>
              <div className="relative mt-1.5">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  value={referrerSearch}
                  onChange={(e) => {
                    setReferrerSearch(e.target.value);
                    if (!e.target.value) {
                      setShowReferrerDropdown(false);
                      setReferrerSearchResults([]);
                    }
                  }}
                  className="pl-8"
                  placeholder="输入姓名搜索（至少2个字符）"
                />
              </div>
              {/* Search results dropdown */}
              {showReferrerDropdown && referrerSearchResults.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-background border rounded-md shadow-lg max-h-40 overflow-y-auto">
                  {referrerSearchResults
                    .filter((r: any) => r.id !== editMember?.id)
                    .map((r: any) => (
                      <button
                        key={r.id}
                        type="button"
                        className="w-full text-left px-3 py-2 text-sm hover:bg-accent flex items-center justify-between"
                        onClick={() => {
                          setSelectedReferrer(r);
                          setEditReferrerId(String(r.id));
                          setReferrerSearch("");
                          setShowReferrerDropdown(false);
                        }}
                      >
                        <span className="font-medium">{r.userName || r.id}</span>
                        <span className="text-xs text-muted-foreground">{r.referralCode}</span>
                      </button>
                    ))}
                </div>
              )}
              {showReferrerDropdown && referrerSearchResults.filter((r: any) => r.id !== editMember?.id).length === 0 && referrerSearch.length >= 2 && (
                <div className="absolute z-50 w-full mt-1 bg-background border rounded-md shadow-sm px-3 py-2 text-sm text-muted-foreground">
                  未找到会员
                </div>
              )}
              {/* Selected referrer display */}
              <div className="mt-2 text-xs text-muted-foreground">
                <span>当前推荐人: </span>
                {selectedReferrer ? (
                  <span className="font-medium text-foreground">
                    {selectedReferrer.name || selectedReferrer.userName || selectedReferrer.id}
                    <button
                      type="button"
                      className="ml-2 text-destructive hover:underline"
                      onClick={() => { setSelectedReferrer(null); setEditReferrerId(""); }}
                    >
                      (清除)
                    </button>
                  </span>
                ) : (
                  <span>{editMember?.referrerName || "无"}</span>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditMember(null)}>取消</Button>
            <Button
              onClick={() =>
                updateMember.mutate({
                  id: editMember.id,
                  rank: editRank as any,
                  phone: editPhone || undefined,
                  birthday: editBirthday || undefined,
                  birthdayVerified: editBirthdayVerified,
                  isActive: editIsActive,
                  name: editName || undefined,
                  email: editEmail || undefined,
                  referrerId: editReferrerId ? Number(editReferrerId) : undefined,
                })
              }
              disabled={updateMember.isPending}
            >
              {updateMember.isPending ? "保存中..." : "保存"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
