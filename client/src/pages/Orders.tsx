import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { formatRM, formatDateTime, ORDER_STATUS_LABELS, ORDER_TYPE_LABELS } from "@/lib/utils";
import MobileHeader from "@/components/MobileHeader";
import BottomNav from "@/components/BottomNav";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Package, Truck } from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  PENDING_PAYMENT: "bg-yellow-100 text-yellow-700",
  PENDING_VERIFICATION: "bg-blue-100 text-blue-700",
  PROCESSING: "bg-purple-100 text-purple-700",
  SHIPPED: "bg-cyan-100 text-cyan-700",
  DELIVERED: "bg-green-100 text-green-700",
  CANCELLED: "bg-gray-100 text-gray-600",
};

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  ONLINE_TRANSFER: "在线转账",
  OFFLINE_PAYMENT: "线下付款",
  VIP_CODE: "VIP付款码",
};

const SHIPPING_LOCATION_LABELS: Record<string, string> = {
  KK_STOCKIST: "KK Stockist",
  PUCHONG_HQ: "Puchong总部",
};

export default function Orders() {
  const { data: orders, isLoading } = trpc.order.myOrders.useQuery();
  const { data: codes } = trpc.order.myCodes.useQuery();
  const [locationFilter, setLocationFilter] = useState<string>("ALL");

  const filterOrders = (status?: string) =>
    (orders ?? []).filter((o) => {
      const statusMatch = !status || o.status === status;
      const locationMatch =
        locationFilter === "ALL" ||
        (locationFilter === "NONE" ? !o.shippingLocation : o.shippingLocation === locationFilter);
      return statusMatch && locationMatch;
    });

  const applyLocationFilter = (list: any[]) =>
    locationFilter === "ALL"
      ? list
      : locationFilter === "NONE"
      ? list.filter((o) => !o.shippingLocation)
      : list.filter((o) => o.shippingLocation === locationFilter);

  return (
    <div className="mobile-app pb-20">
      <MobileHeader title="我的订单" showBack={false} />
      <div className="px-4 mt-3">
        {/* Shipping Location Filter */}
        <div className="flex items-center gap-2 mb-3">
          <Truck size={15} className="text-muted-foreground shrink-0" />
          <Select value={locationFilter} onValueChange={setLocationFilter}>
            <SelectTrigger className="h-8 text-xs flex-1">
              <SelectValue placeholder="筛选出货点" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">全部出货点</SelectItem>
              <SelectItem value="KK_STOCKIST">KK Stockist</SelectItem>
              <SelectItem value="PUCHONG_HQ">Puchong总部</SelectItem>
            </SelectContent>
          </Select>
          {locationFilter !== "ALL" && (
            <button
              onClick={() => setLocationFilter("ALL")}
              className="text-xs text-muted-foreground hover:text-foreground shrink-0"
            >
              清除
            </button>
          )}
        </div>

        <Tabs defaultValue="all">
          <TabsList className="w-full grid grid-cols-4 text-xs">
            <TabsTrigger value="all">全部</TabsTrigger>
            <TabsTrigger value="pending">待处理</TabsTrigger>
            <TabsTrigger value="active">进行中</TabsTrigger>
            <TabsTrigger value="done">已完成</TabsTrigger>
          </TabsList>

          {["all", "pending", "active", "done"].map((tab) => {
            const base =
              tab === "all"
                ? (orders ?? [])
                : tab === "pending"
                ? filterOrders("PENDING_PAYMENT").concat(filterOrders("PENDING_VERIFICATION"))
                : tab === "active"
                ? filterOrders("PROCESSING").concat(filterOrders("SHIPPED"))
                : filterOrders("DELIVERED").concat(filterOrders("CANCELLED"));

            const filtered = tab === "all" ? applyLocationFilter(base) : base;

            return (
              <TabsContent key={tab} value={tab} className="mt-3 space-y-3">
                {isLoading ? (
                  <p className="text-center text-muted-foreground py-8">加载中...</p>
                ) : filtered.length === 0 ? (
                  <div className="text-center py-12">
                    <Package size={40} className="mx-auto text-muted-foreground/40 mb-3" />
                    <p className="text-muted-foreground text-sm">
                      {locationFilter !== "ALL" ? `没有「${SHIPPING_LOCATION_LABELS[locationFilter] ?? locationFilter}」的订单` : "暂无订单"}
                    </p>
                  </div>
                ) : filtered.map((order: any) => (
                  <Card key={order.id} className="p-4 rounded-xl border-0">
                    {/* Header: Order Type, Order No, Status */}
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="text-xs text-muted-foreground">{ORDER_TYPE_LABELS[order.orderType]}</p>
                        <p className="text-sm font-mono text-muted-foreground">{order.orderNo}</p>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_COLORS[order.status] || "bg-gray-100 text-gray-600"}`}>
                        {ORDER_STATUS_LABELS[order.status]}
                      </span>
                    </div>

                    {/* Product Details */}
                    {order.items && order.items.length > 0 && (
                      <div className="bg-muted/30 rounded-lg p-3 mb-3 space-y-2">
                        {order.items.map((item: any, idx: number) => (
                          <div key={idx} className="text-sm">
                            <p className="font-medium text-foreground">{item.product?.name || "产品"}</p>
                            <div className="flex justify-between text-xs text-muted-foreground mt-1">
                              <span>数量: {item.quantity}</span>
                              <span>{formatRM(item.price)}/件</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Shipping Location */}
                    {order.shippingLocation && (
                      <div className="flex items-center gap-1.5 mb-2">
                        <Truck size={12} className="text-muted-foreground shrink-0" />
                        <p className="text-xs text-muted-foreground">
                          出货点:{" "}
                          <span className={`font-medium ${order.shippingLocation === locationFilter && locationFilter !== "ALL" ? "text-primary" : "text-foreground"}`}>
                            {SHIPPING_LOCATION_LABELS[order.shippingLocation] || order.shippingLocation}
                          </span>
                        </p>
                      </div>
                    )}

                    {/* Payment Information */}
                    <div className="space-y-1 mb-3 pb-3 border-b border-border/50">
                      {order.paymentMethod && (
                        <p className="text-xs text-muted-foreground">
                          付款方式: <span className="font-medium text-foreground">{PAYMENT_METHOD_LABELS[order.paymentMethod] || order.paymentMethod}</span>
                        </p>
                      )}
                      {order.paymentCode && (
                        <p className="text-xs text-muted-foreground">
                          付款码: <span className="font-mono font-medium text-foreground">{order.paymentCode}</span>
                        </p>
                      )}
                    </div>

                    {/* Date and Amount */}
                    <div className="flex justify-between items-end">
                      <div className="flex flex-col">
                        <p className="text-xs text-muted-foreground">订单时间</p>
                        <p className="text-xs font-medium">{formatDateTime(order.createdAt)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">
                          {order.orderType === "REDEMPTION_ORDER" ? "使用固本" : "订单金额"}
                        </p>
                        <p className="text-lg font-bold text-primary">
                          {order.orderType === "REDEMPTION_ORDER" ? `${order.gubenUsed} 固本` : formatRM(order.totalAmount)}
                        </p>
                      </div>
                    </div>
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
