import { useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { formatRM, RANK_LABELS, isAgentOrAbove } from "@/lib/utils";
import { getLoginUrl } from "@/const";
import BottomNav from "@/components/BottomNav";
import RankBadge from "@/components/RankBadge";
import { Bell, Copy, Gift, TrendingUp, Users, Wallet, ArrowUpRight, ChevronRight, Star } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdminView } from "@/contexts/AdminContext";
import { useLocation } from "wouter";

export default function Home() {
  const { user, loading: authLoading } = useAuth();
  const { setShowAdminView } = useAdminView();
  const [, navigate] = useLocation();
  const { data: authData, isLoading: authMeLoading } = trpc.auth.me.useQuery();
  const member = (authData as any)?.member;
  const ownMember = (authData as any)?.ownMember;
  const isSwitched = !!(authData as any)?.isSwitched;
  const { data: announcements } = trpc.announcement.list.useQuery();
  const switchAccount = trpc.member.switchAccount.useMutation({
    onSuccess: () => {
      toast.success("已切换回自己的账户");
      window.location.reload();
    },
  });

  // Auto-redirect admin to admin dashboard
  useEffect(() => {
    if (user && (user as any)?.role === "admin") {
      setShowAdminView(true);
    }
  }, [user, setShowAdminView]);

  // If user is admin, show loading while redirecting
  if (user && (user as any)?.role === "admin") {
    return (
      <div className="mobile-app flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">正在进入管理后台...</p>
      </div>
    );
  }

  // Show skeleton while either the OAuth state OR the member data is loading
  if (authLoading || authMeLoading) {
    return (
      <div className="mobile-app">
        <div className="gradient-header p-6 pt-12 pb-16">
          <Skeleton className="h-6 w-32 bg-white/20 mb-2" />
          <Skeleton className="h-4 w-24 bg-white/20" />
        </div>
        <div className="px-4 -mt-8 space-y-4">
          <Skeleton className="h-28 rounded-2xl" />
          <Skeleton className="h-20 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mobile-app flex flex-col items-center justify-center min-h-screen p-8">
        <div className="text-center mb-8">
          <div className="w-20 h-20 rounded-full gradient-header flex items-center justify-center mx-auto mb-4">
            <Star size={36} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">会员管理系统</h1>
          <p className="text-muted-foreground text-sm">登录以访问您的会员中心</p>
        </div>
        <Button
          className="w-full max-w-xs"
          onClick={() => { window.location.href = getLoginUrl(); }}
        >
          登录 / 注册
        </Button>
      </div>
    );
  }

  if (!member) {
    return (
      <div className="mobile-app flex flex-col items-center justify-center min-h-screen p-8">
        <div className="text-center mb-8">
          <div className="w-20 h-20 rounded-full gradient-header flex items-center justify-center mx-auto mb-4">
            <Users size={36} className="text-white" />
          </div>
          <h1 className="text-xl font-bold mb-2">完善会员资料</h1>
          <p className="text-muted-foreground text-sm">请先完成会员注册以使用所有功能</p>
        </div>
        <Button
          className="w-full max-w-xs"
          onClick={() => {
            // Use window.location for reliable navigation within the SPA
            window.history.pushState({}, "", "/register");
            window.dispatchEvent(new PopStateEvent("popstate"));
          }}
        >
          立即注册
        </Button>
      </div>
    );
  }

  const copyReferralCode = () => {
    navigator.clipboard.writeText(member.referralCode);
    toast.success("推荐码已复制");
  };

  const gubenBalance = member.gubenBalance ?? 0;
  const bonusBalance = parseFloat(member.bonusBalance ?? "0");
  const rank = member.rank ?? "VIP";

  const quickActions = [
    { label: "Top Up", icon: Wallet, path: "/topup", color: "bg-purple-100 text-purple-600" },
    { label: "我要提现", icon: ArrowUpRight, path: "/withdraw", color: "bg-green-100 text-green-600", agentOnly: true },
    { label: "奖金明细", icon: TrendingUp, path: "/profile", color: "bg-blue-100 text-blue-600" },
    { label: "我要升级", icon: Star, path: "/upgrade", color: "bg-amber-100 text-amber-600" },
  ];

  return (
    <div className="mobile-app pb-20">
      {/* Switched-account banner */}
      {isSwitched && ownMember && (
        <div className="bg-amber-500 text-white px-4 py-2 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5">
            <ArrowUpRight size={13} className="rotate-90" />
            <span>
              正在查看：<strong>{member?.referralCode}</strong>（{member?.rank}）
            </span>
          </div>
          <button
            onClick={() => switchAccount.mutate({ targetMemberId: null })}
            disabled={switchAccount.isPending}
            className="bg-white/20 hover:bg-white/30 rounded px-2 py-0.5 font-medium transition-colors"
          >
            {switchAccount.isPending ? "..." : "返回自己"}
          </button>
        </div>
      )}

      {/* Header */}
      <div className="gradient-header px-5 pt-12 pb-20 text-white">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg font-bold">{user.name ?? "会员"}</span>
              <RankBadge rank={rank} className="bg-white/20 text-white border-0" />
            </div>
            <button
              onClick={copyReferralCode}
              className="flex items-center gap-1 text-white/80 text-sm hover:text-white transition-colors"
            >
              <span>推荐码: {member.referralCode}</span>
              <Copy size={13} />
            </button>
          </div>
          <button onClick={() => navigate("/notifications")} className="relative p-2">
            <Bell size={22} className="text-white" />
            {announcements && announcements.length > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-400 rounded-full" />
            )}
          </button>
        </div>
      </div>

      {/* Balance Card */}
      <div className="px-4 -mt-12">
        <Card className="rounded-2xl shadow-lg p-5 border-0">
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <p className="text-xs text-muted-foreground mb-1">固本积分</p>
              <p className="text-2xl font-bold text-primary">{gubenBalance}</p>
              <p className="text-xs text-muted-foreground">≈ {formatRM(gubenBalance)}</p>
            </div>
            <div className="text-center border-l border-border">
              <p className="text-xs text-muted-foreground mb-1">奖金余额</p>
              <p className="text-2xl font-bold text-green-600">{formatRM(bonusBalance)}</p>
              <p className="text-xs text-muted-foreground">可提现</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="px-4 mt-4">
        <div className="grid grid-cols-4 gap-3">
          {quickActions
            .filter((a) => !a.agentOnly || isAgentOrAbove(rank))
            .map((action) => {
              const Icon = action.icon;
              return (
                <button
                  key={action.label}
                  onClick={() => navigate(action.path)}
                  className="flex flex-col items-center gap-2"
                >
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${action.color}`}>
                    <Icon size={22} />
                  </div>
                  <span className="text-xs text-muted-foreground text-center leading-tight">{action.label}</span>
                </button>
              );
            })}
        </div>
      </div>

      {/* Announcements */}
      {announcements && announcements.length > 0 && (
        <div className="px-4 mt-4">
          <Card className="rounded-xl border-0 bg-amber-50 p-3">
            <div className="flex items-center gap-2">
              <Bell size={16} className="text-amber-600 shrink-0" />
              <p className="text-sm text-amber-800 truncate flex-1">{announcements[0].title}</p>
              <button onClick={() => navigate("/announcements")}>
                <ChevronRight size={16} className="text-amber-600" />
              </button>
            </div>
          </Card>
        </div>
      )}

      {/* Stats Grid */}
      <div className="px-4 mt-4 grid grid-cols-3 gap-3">
        <Card className="rounded-xl border-0 p-3 text-center">
          <p className="text-lg font-bold text-foreground">{member.directVipReferrals}</p>
          <p className="text-xs text-muted-foreground">直推VIP</p>
        </Card>
        <Card className="rounded-xl border-0 p-3 text-center">
          <p className="text-lg font-bold text-foreground">{member.vipPackagesBought}</p>
          <p className="text-xs text-muted-foreground">配套数量</p>
        </Card>
        <Card className="rounded-xl border-0 p-3 text-center">
          <p className="text-lg font-bold text-foreground">{member.directMAgentReferrals}</p>
          <p className="text-xs text-muted-foreground">M代理数</p>
        </Card>
      </div>

      {/* Menu Items */}
      <div className="px-4 mt-4 space-y-2">
        <h3 className="text-sm font-semibold text-muted-foreground px-1 mb-2">基础服务</h3>
        <Card className="rounded-xl border-0 overflow-hidden">
          {[
            { label: "VIP商城", desc: "购买VIP配套和产品", path: "/vip-zone", icon: ShoppingBagIcon },
            ...(isAgentOrAbove(rank) ? [{ label: "代理区", desc: "代理专属产品", path: "/agent-zone", icon: BoxIcon }] : []),
            { label: "我的订单", desc: "查看所有订单记录", path: "/orders", icon: OrderIcon },
            { label: "我的团队", desc: "查看团队成员", path: "/team", icon: TeamIcon },
            ...(isAgentOrAbove(rank) ? [{ label: "额外奖励", desc: "汽车津贴、旅游奖励", path: "/extra-rewards", icon: GiftIcon }] : []),
          ].map((item, i, arr) => {
            const Icon = item.icon;
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`w-full flex items-center gap-3 px-4 py-3.5 hover:bg-accent/50 transition-colors ${i < arr.length - 1 ? "border-b border-border/50" : ""}`}
              >
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Icon />
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-medium">{item.label}</p>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </div>
                <ChevronRight size={16} className="text-muted-foreground" />
              </button>
            );
          })}
        </Card>
      </div>

      <BottomNav />
    </div>
  );
}

// Inline icon components
function ShoppingBagIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>;
}
function BoxIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>;
}
function OrderIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>;
}
function TeamIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>;
}
function GiftIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary"><polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/><path d="M12 22V7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/></svg>;
}
