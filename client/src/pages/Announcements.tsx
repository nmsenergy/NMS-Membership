import { trpc } from "@/lib/trpc";
import { formatDateTime } from "@/lib/utils";
import MobileHeader from "@/components/MobileHeader";
import { Card } from "@/components/ui/card";
import { Bell } from "lucide-react";

export default function Announcements() {
  const { data: announcements, isLoading } = trpc.announcement.list.useQuery();

  return (
    <div className="mobile-app">
      <MobileHeader title="系统公告" />
      <div className="px-4 mt-4 space-y-3">
        {isLoading ? (
          <p className="text-center text-muted-foreground py-8">加载中...</p>
        ) : !announcements || announcements.length === 0 ? (
          <div className="text-center py-12">
            <Bell size={40} className="mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-muted-foreground text-sm">暂无公告</p>
          </div>
        ) : announcements.map((a) => (
          <Card key={a.id} className="p-4 rounded-xl border-0">
            <h3 className="font-semibold text-sm mb-2">{a.title}</h3>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{a.content}</p>
            <p className="text-xs text-muted-foreground mt-3">{formatDateTime(a.publishedAt || a.createdAt)}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}
