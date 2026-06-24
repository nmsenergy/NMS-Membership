import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { RANK_LABELS } from "@/lib/utils";
import MobileHeader from "@/components/MobileHeader";
import BottomNav from "@/components/BottomNav";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ArrowLeftRight, Check, Search, User, X } from "lucide-react";
import { toast } from "sonner";
import { useLocation } from "wouter";

export default function SwitchAccount() {
  const [, navigate] = useLocation();
  const [search, setSearch] = useState("");
  const utils = trpc.useUtils();

  const { data, isLoading } = trpc.member.getSwitchableAccounts.useQuery();

  const switchAccount = trpc.member.switchAccount.useMutation({
    onSuccess: () => {
      toast.success("户口已切换");
      utils.auth.me.invalidate();
      utils.member.getSwitchableAccounts.invalidate();
      navigate("/");
    },
    onError: (e) => toast.error(e.message),
  });

  const handleSwitch = (targetId: number | null) => {
    switchAccount.mutate({ targetMemberId: targetId });
  };

  const filteredTeam = (data?.team ?? []).filter((m) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      m.referralCode.toLowerCase().includes(q) ||
      (m.phone ?? "").toLowerCase().includes(q) ||
      RANK_LABELS[m.rank]?.toLowerCase().includes(q)
    );
  });

  const currentMember = data?.current;
  const switchedTo = data?.switchedTo;
  const isCurrentlySwitched = !!switchedTo;

  return (
    <div className="mobile-app pb-20">
      <MobileHeader title="切换户口" />
      <div className="px-4 mt-3 space-y-4">

        {/* Current active account */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">当前使用户口</p>
          {isCurrentlySwitched && switchedTo ? (
            <Card className="p-4 rounded-xl border-0 border-l-4 border-l-primary bg-primary/5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                    <User size={18} className="text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{switchedTo.referralCode}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <Badge variant="secondary" className="text-xs px-1.5 py-0">{RANK_LABELS[switchedTo.rank]}</Badge>
                      {switchedTo.phone && <span className="text-xs text-muted-foreground">{switchedTo.phone}</span>}
                    </div>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs h-8"
                  onClick={() => handleSwitch(null)}
                  disabled={switchAccount.isPending}
                >
                  <X size={12} className="mr-1" />
                  返回自己
                </Button>
              </div>
            </Card>
          ) : (
            <Card className="p-4 rounded-xl border-0 border-l-4 border-l-green-500 bg-green-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                  <Check size={18} className="text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold">{currentMember?.referralCode ?? "—"}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <Badge variant="secondary" className="text-xs px-1.5 py-0">{RANK_LABELS[currentMember?.rank ?? "VIP"]}</Badge>
                    <span className="text-xs text-green-600 font-medium">自己的户口</span>
                  </div>
                </div>
              </div>
            </Card>
          )}
        </div>

        {/* Team member list */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
            可切换的团队户口 ({data?.team.length ?? 0})
          </p>
          <div className="relative mb-3">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="搜索推荐码或手机号..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-9 text-sm"
            />
          </div>

          {isLoading ? (
            <p className="text-center text-muted-foreground text-sm py-8">加载中...</p>
          ) : filteredTeam.length === 0 ? (
            <div className="text-center py-10">
              <ArrowLeftRight size={36} className="mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">
                {search ? "没有匹配的团队成员" : "暂无可切换的团队成员"}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredTeam.map((m) => {
                const isActive = switchedTo?.id === m.id;
                return (
                  <Card
                    key={m.id}
                    className={`p-3.5 rounded-xl border-0 ${isActive ? "bg-primary/5 border-l-4 border-l-primary" : ""}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center ${isActive ? "bg-primary/20" : "bg-muted"}`}>
                          <User size={16} className={isActive ? "text-primary" : "text-muted-foreground"} />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{m.referralCode}</p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <Badge variant="secondary" className="text-xs px-1.5 py-0">{RANK_LABELS[m.rank]}</Badge>
                            {m.phone && <span className="text-xs text-muted-foreground">{m.phone}</span>}
                          </div>
                        </div>
                      </div>
                      {isActive ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs h-8"
                          onClick={() => handleSwitch(null)}
                          disabled={switchAccount.isPending}
                        >
                          <X size={12} className="mr-1" />
                          取消
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          className="text-xs h-8"
                          onClick={() => handleSwitch(m.id)}
                          disabled={switchAccount.isPending}
                        >
                          <ArrowLeftRight size={12} className="mr-1" />
                          切换
                        </Button>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        <p className="text-xs text-muted-foreground text-center pb-2">
          切换后将以该团队成员的身份浏览系统。随时可返回自己的户口。
        </p>
      </div>
      <BottomNav />
    </div>
  );
}
