import { useRef, useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { formatRM, formatDate, formatDateTime, RANK_LABELS, BONUS_TYPE_LABELS, ORDER_STATUS_LABELS, ORDER_TYPE_LABELS, isSMOrAbove, isAgentOrAbove } from "@/lib/utils";
import MobileHeader from "@/components/MobileHeader";
import BottomNav from "@/components/BottomNav";
import RankBadge from "@/components/RankBadge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { LogOut, Copy, Settings, ChevronRight, Edit, Upload, CheckCircle, Clock } from "lucide-react";

export default function Profile() {
  const { user, logout } = useAuth();
  const [, navigate] = useLocation();
  const { data: authData } = trpc.auth.me.useQuery();
  const member = (authData as any)?.member;
  const { data: gubenLedger } = trpc.bonus.gubenLedger.useQuery({});
  const { data: bonusLedger } = trpc.bonus.bonusLedger.useQuery({});
  const { data: yearEnd } = trpc.member.yearEndDividend.useQuery({ year: new Date().getFullYear() });
  const utils = trpc.useUtils();
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editName, setEditName] = useState(user?.name || "");
  const [editPhone, setEditPhone] = useState(member?.phone || "");
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const updateProfile = trpc.member.updateProfile.useMutation({
    onSuccess: () => {
      toast.success("个人信息已更新");
      setShowEditDialog(false);
      utils.auth.me.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const uploadBirthdayIdPhoto = trpc.member.uploadBirthdayIdPhoto.useMutation({
    onSuccess: () => {
      toast.success("身份证照片已上传，请等待管理员审核");
      utils.auth.me.invalidate();
      setUploadingPhoto(false);
    },
    onError: (e) => {
      toast.error(e.message);
      setUploadingPhoto(false);
    },
  });

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("文件大小不能超过 5MB");
      return;
    }
    if (!file.type.startsWith("image/")) {
      toast.error("请上传图片文件");
      return;
    }
    setUploadingPhoto(true);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      const base64 = dataUrl.split(",")[1];
      uploadBirthdayIdPhoto.mutate({ fileBase64: base64, mimeType: file.type });
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  if (!user || !member) return (
    <div className="mobile-app flex items-center justify-center min-h-screen">
      <p className="text-muted-foreground">请先登录</p>
    </div>
  );

  const copyCode = () => { navigator.clipboard.writeText(member.referralCode); toast.success("推荐码已复制"); };
  const handleSaveProfile = () => {
    updateProfile.mutate({ name: editName, phone: editPhone });
  };

  const isAdminOrManager = (user as any)?.role === "admin" || (user as any)?.role === "regional_manager";

  return (
    <div className="mobile-app pb-20">
      <div className="gradient-header px-5 pt-12 pb-8 text-white">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center text-2xl font-bold">
            {(user.name || "U")[0].toUpperCase()}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg font-bold">{user.name}</span>
              <RankBadge rank={member.rank} className="bg-white/20 text-white border-0" />
            </div>
            <button onClick={copyCode} className="flex items-center gap-1 text-white/80 text-sm">
              <span>推荐码: {member.referralCode}</span>
              <Copy size={12} />
            </button>
          </div>
          <div className="flex gap-2">
            <button onClick={() => { setEditName(user?.name || ""); setEditPhone(member?.phone || ""); setShowEditDialog(true); }} className="p-2 text-white/80">
              <Edit size={20} />
            </button>
            <button onClick={logout} className="p-2 text-white/80">
              <LogOut size={20} />
            </button>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3 mt-5">
          <div className="bg-white/15 rounded-xl p-3 text-center">
            <p className="text-xl font-bold">{member.gubenBalance}</p>
            <p className="text-xs text-white/70">固本积分</p>
          </div>
          <div className="bg-white/15 rounded-xl p-3 text-center">
            <p className="text-xl font-bold">{formatRM(member.bonusBalance)}</p>
            <p className="text-xs text-white/70">奖金余额</p>
          </div>
          <div className="bg-white/15 rounded-xl p-3 text-center">
            <p className="text-xl font-bold">{member.directVipReferrals}</p>
            <p className="text-xs text-white/70">直推VIP</p>
          </div>
        </div>
      </div>
      <div className="px-4 mt-4">
        <Tabs defaultValue="guben">
          <TabsList className="w-full grid grid-cols-3">
            <TabsTrigger value="guben">固本记录</TabsTrigger>
            <TabsTrigger value="bonus">奖金记录</TabsTrigger>
            <TabsTrigger value="info">个人信息</TabsTrigger>
          </TabsList>
          <TabsContent value="guben" className="mt-3 space-y-2">
            {yearEnd && yearEnd.rate > 0 && (
              <Card className="p-4 rounded-xl border-0 bg-amber-50">
                <p className="text-sm font-semibold text-amber-800">年终花红预估</p>
                <p className="text-xs text-amber-700 mt-1">全年收入: {formatRM(yearEnd.annualIncome)} × {(yearEnd.rate * 100).toFixed(0)}% = <strong>{formatRM(yearEnd.dividend)}</strong></p>
              </Card>
            )}
            {(!gubenLedger || gubenLedger.length === 0) ? (
              <p className="text-center text-muted-foreground text-sm py-8">暂无固本记录</p>
            ) : gubenLedger.map((entry) => (
              <Card key={entry.id} className="p-3 rounded-xl border-0">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{BONUS_TYPE_LABELS[entry.type] || entry.type}</p>
                    <p className="text-xs text-muted-foreground">{formatDateTime(entry.createdAt)}</p>
                    {entry.description && <p className="text-xs text-muted-foreground">{entry.description}</p>}
                  </div>
                  <span className={`text-base font-bold ${entry.amount > 0 ? "text-green-600" : "text-red-500"}`}>
                    {entry.amount > 0 ? "+" : ""}{entry.amount}
                  </span>
                </div>
              </Card>
            ))}
          </TabsContent>
          <TabsContent value="bonus" className="mt-3 space-y-2">
            {(!bonusLedger || bonusLedger.length === 0) ? (
              <p className="text-center text-muted-foreground text-sm py-8">暂无奖金记录</p>
            ) : bonusLedger.map((entry) => (
              <Card key={entry.id} className="p-3 rounded-xl border-0">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{BONUS_TYPE_LABELS[entry.type] || entry.type}</p>
                    <p className="text-xs text-muted-foreground">{formatDateTime(entry.createdAt)}</p>
                    {entry.description && <p className="text-xs text-muted-foreground">{entry.description}</p>}
                  </div>
                  <span className={`text-base font-bold ${parseFloat(entry.amount) > 0 ? "text-green-600" : "text-red-500"}`}>
                    {parseFloat(entry.amount) > 0 ? "+" : ""}{formatRM(entry.amount)}
                  </span>
                </div>
              </Card>
            ))}
          </TabsContent>
          <TabsContent value="info" className="mt-3 space-y-3">
            <Card className="p-4 rounded-xl border-0">
              <div className="space-y-3">
                {[
                  { label: "姓名", value: user.name },
                  { label: "邮箱", value: user.email },
                  { label: "手机", value: member.phone || "-" },
                  { label: "生日", value: member.birthday || "-" },
                  { label: "注册时间", value: formatDate(member.createdAt) },
                  { label: "VIP配套数", value: `${member.vipPackagesBought} 套` },
                  { label: "直推M代理", value: `${member.directMAgentReferrals} 人` },
                ].map((item) => (
                  <div key={item.label} className="flex justify-between items-center py-1 border-b border-border/50 last:border-0">
                    <span className="text-sm text-muted-foreground">{item.label}</span>
                    <span className="text-sm font-medium">{item.value}</span>
                  </div>
                ))}
              </div>
            </Card>

            {/* Birthday Verification Section */}
            <Card className="p-4 rounded-xl border-0">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold">生日身份认证</p>
                {member.birthdayVerified ? (
                  <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
                    <CheckCircle size={14} /> 已认证
                  </span>
                ) : member.birthdayIdPhotoUrl ? (
                  <span className="flex items-center gap-1 text-xs text-amber-600 font-medium">
                    <Clock size={14} /> 审核中
                  </span>
                ) : (
                  <span className="text-xs text-muted-foreground">未认证</span>
                )}
              </div>
              {member.birthdayVerified ? (
                <p className="text-xs text-muted-foreground">您的生日身份已认证，可以使用生日优惠功能。</p>
              ) : member.birthdayIdPhotoUrl ? (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">您的身份证照片已上传，正在等待管理员审核。审核完成后，照片将被安全删除，您将收到通知。</p>
                  <div className="rounded-lg overflow-hidden border border-border/50 max-h-32">
                    <img src={member.birthdayIdPhotoUrl} alt="身份证照片" className="w-full object-contain max-h-32" />
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">请上传您的身份证照片以完成生日认证，认证后可使用生日优惠功能。照片仅用于身份核实，认证完成后将被安全删除。</p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handlePhotoUpload}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingPhoto || uploadBirthdayIdPhoto.isPending}
                  >
                    <Upload size={14} className="mr-2" />
                    {uploadingPhoto || uploadBirthdayIdPhoto.isPending ? "上传中..." : "上传身份证照片"}
                  </Button>
                </div>
              )}
            </Card>

            {isAdminOrManager && (
              <Button variant="outline" className="w-full" onClick={() => navigate("/admin")}>
                进入管理后台
              </Button>
            )}
          </TabsContent>
        </Tabs>
      </div>
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-sm mx-auto">
          <DialogHeader>
            <DialogTitle>修改个人信息</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>姓名</Label>
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="mt-1.5" />
            </div>
            <div>
              <Label>手机号码</Label>
              <Input value={editPhone} onChange={(e) => setEditPhone(e.target.value)} className="mt-1.5" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>取消</Button>
            <Button onClick={handleSaveProfile} disabled={updateProfile.isPending || !editName.trim()}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <BottomNav />
    </div>
  );
}
