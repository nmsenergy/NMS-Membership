import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { formatRM } from "@/lib/utils";
import { useAdminView } from "@/contexts/AdminContext";
import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, ShoppingBag, TrendingUp, Settings, Package, Bell, Wallet, ChevronRight, LogOut } from "lucide-react";
import { toast } from "sonner";

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const { setShowAdminView, setCurrentAdminPage } = useAdminView();
  const { data: stats } = trpc.admin.stats.useQuery();

  if (!user || ((user as any).role !== "admin" && (user as any).role !== "regional_manager")) {
    return (
      <div className="mobile-app flex items-center justify-center min-h-screen">
        <div className="text-center px-8">
          <p className="text-lg font-semibold mb-2">无权限访问</p>
          <p className="text-muted-foreground text-sm mb-4">此页面仅限管理员访问</p>
          <Button onClick={() => setShowAdminView(false)}>返回首页</Button>
        </div>
      </div>
    );
  }

  const isRegionalManager = (user as any).role === "regional_manager";

  const menuItems = [
    { label: "会员管理", desc: "查看、编辑、导出会员数据", path: "/admin/members", icon: Users, color: "bg-blue-100 text-blue-600" },
    { label: "订单管理", desc: "处理订单、审核付款", path: "/admin/orders", icon: ShoppingBag, color: "bg-green-100 text-green-600" },
    { label: "产品管理", desc: "管理VIP和代理产品", path: "/admin/products", icon: Package, color: "bg-purple-100 text-purple-600" },
    ...(!isRegionalManager ? [
      { label: "奖金管理", desc: "手动分配奖金、查看报告", path: "/admin/bonuses", icon: TrendingUp, color: "bg-amber-100 text-amber-600" },
      { label: "充值提现", desc: "审核充值和提现申请", path: "/admin/topups", icon: Wallet, color: "bg-cyan-100 text-cyan-600" },
      { label: "系统公告", desc: "发布和管理公告", path: "/admin/announcements", icon: Bell, color: "bg-pink-100 text-pink-600" },
      { label: "系统设置", desc: "配置升级条件和奖金规则", path: "/admin/settings", icon: Settings, color: "bg-gray-100 text-gray-600" },
    ] : []),
  ];

  return (
    <div className="mobile-app pb-8">
      <div className="gradient-header px-5 pt-12 pb-8 text-white" style={{backgroundColor: '#e7081f'}}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-white/70">管理员后台</p>
            <h1 className="text-xl font-bold">{user.name}</h1>
            <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">{isRegionalManager ? "区域库存管理员" : "超级管理员"}</span>
          </div>
          <button onClick={logout} className="p-2 text-white/80">
            <LogOut size={20} />
          </button>
        </div>
        {stats && (
          <div className="grid grid-cols-3 gap-3 mt-5">
            <div className="bg-white/15 rounded-xl p-3 text-center">
              <p className="text-xl font-bold">{stats.totalMembers}</p>
              <p className="text-xs text-white/70">总会员</p>
            </div>
            <div className="bg-white/15 rounded-xl p-3 text-center">
              <p className="text-xl font-bold">{stats.pendingOrders}</p>
              <p className="text-xs text-white/70">待处理订单</p>
            </div>
            <div className="bg-white/15 rounded-xl p-3 text-center">
              <p className="text-base font-bold">{formatRM(stats.monthlyRevenue)}</p>
              <p className="text-xs text-white/70">本月营收</p>
            </div>
          </div>
        )}
      </div>

      <div className="px-4 mt-4 space-y-2">
        <h3 className="text-sm font-semibold text-muted-foreground px-1 mb-3">管理功能</h3>
        <Card className="rounded-xl border-0 overflow-hidden">
          {menuItems.map((item, i) => {
            const Icon = item.icon;
            const pageName = item.path.replace('/admin/', '');
            return (
              <button key={item.path} onClick={() => setCurrentAdminPage(pageName)} className={`w-full flex items-center gap-3 px-4 py-3.5 hover:bg-accent/50 transition-colors ${i < menuItems.length - 1 ? "border-b border-border/50" : ""}`}>
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${item.color}`}>
                  <Icon size={18} />
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
        <button onClick={() => setShowAdminView(false)} className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 border bg-transparent shadow-xs hover:bg-accent h-9 px-4 py-2 w-full mt-4">返回会员首页</button>
      </div>
    </div>
  );
}
