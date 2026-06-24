import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { RANK_LABELS, formatRM } from "@/lib/utils";
import MobileHeader from "@/components/MobileHeader";
import BottomNav from "@/components/BottomNav";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { History, Search, User, LogOut } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";

export default function SwitchAccount() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");

  // Get login history
  const { data: loginHistory = [], isLoading } = trpc.member.getLoginHistory.useQuery(undefined, {
    enabled: !!user,
  });

  // Get team for switching
  const { data: team = [] } = trpc.member.getTeamMembers.useQuery(undefined, {
    enabled: !!user,
  });

  const deleteLoginHistory = trpc.member.deleteLoginHistory.useMutation({
    onSuccess: () => {
      toast.success("已删除登录记录");
      // Refetch login history
      trpc.useUtils().member.getLoginHistory.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  // Filter search results
  const filteredHistory = loginHistory.filter((item: any) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      item.member.referralCode.toLowerCase().includes(q) ||
      (item.member.phone ?? "").toLowerCase().includes(q) ||
      RANK_LABELS[item.member.rank]?.toLowerCase().includes(q)
    );
  });

  const filteredTeam = team.filter((m: any) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      m.referralCode.toLowerCase().includes(q) ||
      (m.phone ?? "").toLowerCase().includes(q) ||
      RANK_LABELS[m.rank]?.toLowerCase().includes(q)
    );
  });

  const handleSwitchAccount = (targetMember: any) => {
    // In logout-then-login flow, we would:
    // 1. Log out current user
    // 2. Show login screen
    // 3. User logs in with target member's account
    // 4. System records this in login history
    toast.info("切换户口功能：请登出后使用新户口登入");
  };

  return (
    <div className="mobile-app pb-20">
      <MobileHeader title="切换户口" />

      <div className="p-4 space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-3 text-muted-foreground" size={18} />
          <Input
            placeholder="搜索推荐码、电话或等级..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Login History Section */}
        {loginHistory.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <History size={18} className="text-blue-500" />
              <h3 className="font-semibold">登录历史</h3>
              <Badge variant="secondary">{loginHistory.length}</Badge>
            </div>

            <div className="space-y-2">
              {filteredHistory.map((item: any) => (
                <Card key={item.id} className="p-3 flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <User size={16} className="text-muted-foreground" />
                      <span className="font-medium">{item.member.referralCode}</span>
                      <Badge variant="outline">{RANK_LABELS[item.member.rank]}</Badge>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      最后登录：{new Date(item.lastLoginAt).toLocaleString()}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleSwitchAccount(item.member)}
                    >
                      <LogOut size={14} />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => deleteLoginHistory.mutate({ memberId: item.memberId })}
                      disabled={deleteLoginHistory.isPending}
                    >
                      ✕
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Team Members Section */}
        {filteredTeam.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <User size={18} className="text-green-500" />
              <h3 className="font-semibold">团队成员</h3>
              <Badge variant="secondary">{filteredTeam.length}</Badge>
            </div>

            <div className="space-y-2">
              {filteredTeam.map((m: any) => (
                <Card key={m.id} className="p-3 flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <User size={16} className="text-muted-foreground" />
                      <span className="font-medium">{m.referralCode}</span>
                      <Badge variant="outline">{RANK_LABELS[m.rank]}</Badge>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {m.phone || "无电话"} • 固本: {m.gubenBalance} • 奖金: {formatRM(m.bonusBalance)}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => handleSwitchAccount(m)}
                  >
                    切换
                  </Button>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {filteredHistory.length === 0 && filteredTeam.length === 0 && !isLoading && (
          <Card className="p-8 text-center">
            <User size={40} className="mx-auto text-muted-foreground mb-2 opacity-50" />
            <p className="text-muted-foreground">暂无可切换的户口</p>
          </Card>
        )}

        {/* Loading State */}
        {isLoading && (
          <Card className="p-8 text-center">
            <div className="animate-spin mx-auto mb-2">⟳</div>
            <p className="text-muted-foreground">加载中...</p>
          </Card>
        )}

        {/* Info Box */}
        <Card className="p-3 bg-blue-50 border-blue-200">
          <p className="text-xs text-blue-900">
            💡 点击「切换」后，系统将登出当前户口。请使用目标户口的账户登入。登入后该户口将被记录到登录历史中，方便下次快速切换。
          </p>
        </Card>
      </div>

      <BottomNav />
    </div>
  );
}
