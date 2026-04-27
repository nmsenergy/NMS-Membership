import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { formatDate, RANK_LABELS, isAgentOrAbove } from "@/lib/utils";
import MobileHeader from "@/components/MobileHeader";
import BottomNav from "@/components/BottomNav";
import RankBadge from "@/components/RankBadge";
import TeamHierarchy from "@/components/TeamHierarchy";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Network } from "lucide-react";

export default function Team() {
  const [viewMode, setViewMode] = useState<"list" | "tree">("list");
  const { data: authData } = trpc.auth.me.useQuery();
  const member = (authData as any)?.member;
  const { data: team } = trpc.member.team.useQuery();

  // Build tree structure for hierarchy view
  const buildTreeNode = (m: any) => ({
    id: m.id,
    name: m.user?.name || "未知",
    rank: m.rank,
    referralCode: m.referralCode,
    children: m.children?.map(buildTreeNode) || [],
  });

  const treeRoot = member
    ? buildTreeNode({
        id: member.id,
        user: { name: authData?.name },
        rank: member.rank,
        referralCode: member.referralCode,
        children: team?.direct?.map((d: any) => d.member) || [],
      })
    : null;

  return (
    <div className="mobile-app pb-20">
      <MobileHeader title="我的团队" />
      <div className="px-4 mt-4">
        <div className="grid grid-cols-2 gap-3 mb-4">
          <Card className="p-4 rounded-xl border-0 text-center">
            <p className="text-2xl font-bold text-primary">{team?.direct?.length ?? 0}</p>
            <p className="text-xs text-muted-foreground mt-1">直接推荐</p>
          </Card>
          <Card className="p-4 rounded-xl border-0 text-center">
            <p className="text-2xl font-bold text-primary">{team?.total?.length ?? 0}</p>
            <p className="text-xs text-muted-foreground mt-1">团队总人数</p>
          </Card>
        </div>

        {/* View Mode Tabs */}
        <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "list" | "tree")} className="mb-4">
          <TabsList className="w-full grid grid-cols-2">
            <TabsTrigger value="list" className="text-xs">
              <Users size={14} className="mr-1" />
              列表视图
            </TabsTrigger>
            <TabsTrigger value="tree" className="text-xs">
              <Network size={14} className="mr-1" />
              层级树
            </TabsTrigger>
          </TabsList>

          {/* List View */}
          <TabsContent value="list" className="mt-4">
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold mb-3">直接推荐成员</h3>
                {(!team?.direct || team.direct.length === 0) ? (
                  <div className="text-center py-12">
                    <Users size={40} className="mx-auto text-muted-foreground/40 mb-3" />
                    <p className="text-muted-foreground text-sm">暂无直接推荐成员</p>
                    <p className="text-xs text-muted-foreground mt-1">分享您的推荐码邀请朋友加入</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {team.direct.map(({ member: m, user: u }) => (
                      <Card key={m.id} className="p-3 rounded-xl border-0">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">
                            {(u?.name || "U")[0].toUpperCase()}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium">{u?.name || "未知"}</p>
                              <RankBadge rank={m.rank} size="sm" />
                            </div>
                            <p className="text-xs text-muted-foreground">加入: {formatDate(m.createdAt)}</p>
                          </div>
                          <p className="text-xs text-muted-foreground">{m.referralCode}</p>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </div>

              {team?.total && team.total.length > team.direct.length && (
                <div>
                  <h3 className="text-sm font-semibold mb-3">全部团队成员 ({team.total.length}人)</h3>
                  <div className="space-y-2">
                    {team.total.slice(0, 20).map((m) => (
                      <Card key={m.id} className="p-3 rounded-xl border-0">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <RankBadge rank={m.rank} size="sm" />
                            <p className="text-sm">{m.referralCode}</p>
                          </div>
                          <p className="text-xs text-muted-foreground">{formatDate(m.createdAt)}</p>
                        </div>
                      </Card>
                    ))}
                    {team.total.length > 20 && (
                      <p className="text-center text-xs text-muted-foreground py-2">还有 {team.total.length - 20} 位成员...</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Tree View */}
          <TabsContent value="tree" className="mt-4">
            {treeRoot ? (
              <Card className="p-4 rounded-xl border-0">
                <TeamHierarchy root={treeRoot} maxDepth={4} />
              </Card>
            ) : (
              <div className="text-center py-12">
                <Network size={40} className="mx-auto text-muted-foreground/40 mb-3" />
                <p className="text-muted-foreground text-sm">加载中...</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
      <BottomNav />
    </div>
  );
}
