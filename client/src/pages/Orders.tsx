import { trpc } from "@/lib/trpc";
import { formatRM, formatDateTime, ORDER_STATUS_LABELS, ORDER_TYPE_LABELS } from "@/lib/utils";
import MobileHeader from "@/components/MobileHeader";
import BottomNav from "@/components/BottomNav";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Package } from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  PENDING_PAYMENT: "bg-yellow-100 text-yellow-700",
  PENDING_VERIFICATION: "bg-blue-100 text-blue-700",
  PROCESSING: "bg-purple-100 text-purple-700",
  SHIPPED: "bg-cyan-100 text-cyan-700",
  DELIVERED: "bg-green-100 text-green-700",
  CANCELLED: "bg-gray-100 text-gray-600",
};

export default function Orders() {
  const { data: orders, isLoading } = trpc.order.myOrders.useQuery();
  const { data: codes } = trpc.order.myCodes.useQuery();

  const filterOrders = (status?: string) =>
    orders?.filter((o) => !status || o.status === status) ?? [];

  return (
    <div className="mobile-app pb-20">
      <MobileHeader title="我的订单" showBack={false} />
      <div className="px-4 mt-3">
        <Tabs defaultValue="all">
          <TabsList className="w-full grid grid-cols-4 text-xs">
            <TabsTrigger value="all">全部</TabsTrigger>
            <TabsTrigger value="pending">待处理</TabsTrigger>
            <TabsTrigger value="active">进行中</TabsTrigger>
            <TabsTrigger value="done">已完成</TabsTrigger>
          </TabsList>

          {["all", "pending", "active", "done"].map((tab) => {
            const filtered = tab === "all" ? (orders ?? [])
              : tab === "pending" ? filterOrders("PENDING_PAYMENT").concat(filterOrders("PENDING_VERIFICATION"))
              : tab === "active" ? filterOrders("PROCESSING").concat(filterOrders("SHIPPED"))
              : filterOrders("DELIVERED").concat(filterOrders("CANCELLED"));

            return (
              <TabsContent key={tab} value={tab} className="mt-3 space-y-3">
                {isLoading ? (
                  <p className="text-center text-muted-foreground py-8">加载中...</p>
                ) : filtered.length === 0 ? (
                  <div className="text-center py-12">
                    <Package size={40} className="mx-auto text-muted-foreground/40 mb-3" />
                    <p className="text-muted-foreground text-sm">暂无订单</p>
                  </div>
                ) : filtered.map((order) => (
                  <Card key={order.id} className="p-4 rounded-xl border-0">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="text-xs text-muted-foreground">{ORDER_TYPE_LABELS[order.orderType]}</p>
                        <p className="text-sm font-mono text-muted-foreground">{order.orderNo}</p>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_COLORS[order.status] || "bg-gray-100 text-gray-600"}`}>
                        {ORDER_STATUS_LABELS[order.status]}
                      </span>
                    </div>
                    <div className="flex justify-between items-end mt-3">
                      <p className="text-xs text-muted-foreground">{formatDateTime(order.createdAt)}</p>
                      <p className="text-base font-bold text-primary">
                        {order.orderType === "REDEMPTION_ORDER" ? `${order.gubenUsed} 固本` : formatRM(order.totalAmount)}
                      </p>
                    </div>
                    {order.paymentCode && (
                      <p className="text-xs text-muted-foreground mt-1">付款码: {order.paymentCode}</p>
                    )}
                  </Card>
                ))}
              </TabsContent>
            );
          })}
        </Tabs>

        {codes && codes.length > 0 && (
          <div className="mt-6">
            <h3 className="text-sm font-semibold mb-3">我的VIP付款码</h3>
            <div className="space-y-2">
              {codes.map((code) => (
                <Card key={code.id} className={`p-3 rounded-xl border-0 ${code.isUsed ? "opacity-50" : ""}`}>
                  <div className="flex justify-between items-center">
                    <p className="font-mono text-sm font-medium">{code.code}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${code.isUsed ? "bg-gray-100 text-gray-500" : "bg-green-100 text-green-600"}`}>
                      {code.isUsed ? "已使用" : "可使用"}
                    </span>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  );
}
