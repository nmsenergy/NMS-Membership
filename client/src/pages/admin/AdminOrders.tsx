import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { formatRM, formatDateTime, ORDER_STATUS_LABELS, ORDER_TYPE_LABELS } from "@/lib/utils";
import MobileHeader from "@/components/MobileHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Download, Search } from "lucide-react";
import { toast } from "sonner";

const STATUS_COLORS: Record<string, string> = {
  PENDING_PAYMENT: "bg-yellow-100 text-yellow-700",
  PENDING_VERIFICATION: "bg-blue-100 text-blue-700",
  PROCESSING: "bg-purple-100 text-purple-700",
  SHIPPED: "bg-cyan-100 text-cyan-700",
  DELIVERED: "bg-green-100 text-green-700",
  CANCELLED: "bg-gray-100 text-gray-600",
};

export default function AdminOrders() {
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [newStatus, setNewStatus] = useState("");

  const { data, isLoading } = trpc.admin.orders.useQuery({ status: statusFilter === "ALL" ? undefined : statusFilter, search, page, limit: 20 });
  const utils = trpc.useUtils();

  const updateStatus = trpc.admin.updateOrderStatus.useMutation({
    onSuccess: () => { toast.success("订单状态已更新"); setSelectedOrder(null); utils.admin.orders.invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  const exportOrders = trpc.admin.exportOrders.useMutation({
    onSuccess: (data) => {
      const blob = new Blob([Buffer.from(data.base64, "base64")], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = `orders_${new Date().toISOString().split("T")[0]}.xlsx`; a.click();
      toast.success("导出成功");
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="mobile-app pb-8">
      <MobileHeader title="订单管理" rightElement={
        <button onClick={() => exportOrders.mutate({})} className="text-primary"><Download size={20} /></button>
      } />
      <div className="px-4 mt-3 space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="搜索订单号" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">全部</SelectItem>
              {Object.entries(ORDER_STATUS_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <p className="text-center text-muted-foreground py-8">加载中...</p>
        ) : (
          <>
            <p className="text-xs text-muted-foreground">共 {data?.total ?? 0} 个订单</p>
            <div className="space-y-2">
              {data?.orders.map((order) => (
                <Card key={order.id} className="p-3 rounded-xl border-0 cursor-pointer hover:bg-accent/30" onClick={() => { setSelectedOrder(order); setNewStatus(order.status); }}>
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="text-xs font-mono text-muted-foreground">{order.orderNo}</p>
                      <p className="text-xs text-muted-foreground">{ORDER_TYPE_LABELS[order.orderType]}</p>
                      <p className="text-xs text-muted-foreground">{(order as any).memberName || "未知会员"}</p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[order.status] || "bg-gray-100 text-gray-600"}`}>
                      {ORDER_STATUS_LABELS[order.status]}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <p className="text-xs text-muted-foreground">{formatDateTime(order.createdAt)}</p>
                    <p className="text-sm font-bold text-primary">
                      {order.orderType === "REDEMPTION_ORDER" ? `${order.gubenUsed} 固本` : formatRM(order.totalAmount)}
                    </p>
                  </div>
                  {order.paymentCode && <p className="text-xs text-muted-foreground mt-1">付款码: {order.paymentCode}</p>}
                </Card>
              ))}
            </div>
            <div className="flex justify-between items-center pt-2">
              <Button variant="outline" size="sm" onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1}>上一页</Button>
              <span className="text-xs text-muted-foreground">第 {page} 页</span>
              <Button variant="outline" size="sm" onClick={() => setPage(page + 1)} disabled={!data?.hasMore}>下一页</Button>
            </div>
          </>
        )}
      </div>

      <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
        <DialogContent className="max-w-sm mx-auto">
          <DialogHeader>
            <DialogTitle>订单详情</DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-3">
              <div className="space-y-1 text-sm">
                <p><span className="text-muted-foreground">订单号: </span><span className="font-mono">{selectedOrder.orderNo}</span></p>
                <p><span className="text-muted-foreground">会员: </span>{selectedOrder.memberName}</p>
                <p><span className="text-muted-foreground">类型: </span>{ORDER_TYPE_LABELS[selectedOrder.orderType]}</p>
                <p><span className="text-muted-foreground">金额: </span><strong>{selectedOrder.orderType === "REDEMPTION_ORDER" ? `${selectedOrder.gubenUsed} 固本` : formatRM(selectedOrder.totalAmount)}</strong></p>
                {selectedOrder.paymentCode && <p><span className="text-muted-foreground">付款码: </span>{selectedOrder.paymentCode}</p>}
              </div>
              <div>
                <Label>更新状态</Label>
                <Select value={newStatus} onValueChange={setNewStatus}>
                  <SelectTrigger className="mt-1.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(ORDER_STATUS_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedOrder(null)}>取消</Button>
            <Button onClick={() => updateStatus.mutate({ orderId: selectedOrder.id, status: newStatus as any })} disabled={updateStatus.isPending}>
              更新状态
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
