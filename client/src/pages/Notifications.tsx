import { useEffect, useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import MobileHeader from "@/components/MobileHeader";
import BottomNav from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { formatDate } from "@/lib/utils";
import { Bell, Trash2, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

export default function Notifications() {
  const { user } = useAuth();
  const [page, setPage] = useState(0);
  const [allNotifications, setAllNotifications] = useState<any[]>([]);

  const { data: notifications, isLoading } = trpc.notification.list.useQuery(
    { limit: 20, offset: page * 20 },
    { enabled: !!user }
  );
  const { data: unreadCount } = trpc.notification.unreadCount.useQuery(undefined, { enabled: !!user });
  const markAsReadMutation = trpc.notification.markAsRead.useMutation();
  const markAllAsReadMutation = trpc.notification.markAllAsRead.useMutation();
  const deleteMutation = trpc.notification.delete.useMutation();

  useEffect(() => {
    if (notifications) {
      if (page === 0) {
        setAllNotifications(notifications);
      } else {
        // De-duplicate by id when appending new page
        setAllNotifications((prev) => {
          const existingIds = new Set(prev.map((n) => n.id));
          const newNotifications = notifications.filter((n) => !existingIds.has(n.id));
          return [...prev, ...newNotifications];
        });
      }
    }
  }, [notifications, page]);

  const handleMarkAsRead = async (notificationId: number) => {
    try {
      await markAsReadMutation.mutateAsync({ notificationId });
      setAllNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, isRead: true } : n))
      );
    } catch (error) {
      toast.error("标记失败");
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsReadMutation.mutateAsync();
      setAllNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      toast.success("已标记全部为已读");
    } catch (error) {
      toast.error("操作失败");
    }
  };

  const handleDelete = async (notificationId: number) => {
    try {
      await deleteMutation.mutateAsync({ notificationId });
      setAllNotifications((prev) => prev.filter((n) => n.id !== notificationId));
      toast.success("已删除");
    } catch (error) {
      toast.error("删除失败");
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "BONUS":
        return "bg-green-100 text-green-800";
      case "ORDER":
        return "bg-blue-100 text-blue-800";
      case "SYSTEM":
        return "bg-red-100 text-red-800";
      case "REMINDER":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "BONUS":
      case "ORDER":
        return <AlertCircle size={16} />;
      default:
        return <Bell size={16} />;
    }
  };

  return (
    <div className="mobile-app pb-20">
      <MobileHeader title="通知中心" showBack />

      <div className="px-4 py-4">
        {unreadCount && unreadCount > 0 && (
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Badge variant="destructive">{unreadCount} 条未读</Badge>
            </div>
            <Button variant="outline" size="sm" onClick={handleMarkAllAsRead}>
              全部标记为已读
            </Button>
          </div>
        )}

        {isLoading && (
          <div className="text-center py-8">
            <p className="text-muted-foreground">加载中...</p>
          </div>
        )}

        {!isLoading && allNotifications.length === 0 && (
          <div className="text-center py-12">
            <Bell size={48} className="mx-auto text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground">暂无通知</p>
          </div>
        )}

        <div className="space-y-3">
          {allNotifications.map((notification) => (
            <Card
              key={notification.id}
              className={`p-4 cursor-pointer transition-colors ${
                !notification.isRead ? "bg-blue-50 border-blue-200" : ""
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-lg ${getTypeColor(notification.type)}`}>
                  {getTypeIcon(notification.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <h3 className="font-semibold text-sm">{notification.title}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {formatDate(new Date(notification.createdAt))}
                      </p>
                    </div>
                    {!notification.isRead && (
                      <CheckCircle2
                        size={18}
                        className="text-blue-600 cursor-pointer flex-shrink-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMarkAsRead(notification.id);
                        }}
                      />
                    )}
                  </div>
                  <p className="text-sm text-foreground mt-2 line-clamp-2">{notification.content}</p>
                  {notification.actionUrl && (
                    <Button variant="link" size="sm" className="mt-2 h-auto p-0">
                      查看详情 →
                    </Button>
                  )}
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(notification.id);
                  }}
                  className="p-1 text-muted-foreground hover:text-destructive transition-colors flex-shrink-0"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </Card>
          ))}
        </div>

        {allNotifications.length > 0 && allNotifications.length % 20 === 0 && (
          <Button
            variant="outline"
            className="w-full mt-4"
            onClick={() => setPage(page + 1)}
            disabled={isLoading}
          >
            加载更多
          </Button>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
