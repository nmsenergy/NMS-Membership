import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { formatRM, CATEGORY_LABELS, isAgentOrAbove } from "@/lib/utils";
import MobileHeader from "@/components/MobileHeader";
import BottomNav from "@/components/BottomNav";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Package, Lock } from "lucide-react";
import { toast } from "sonner";
import { useLocation } from "wouter";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

export default function AgentZone() {
  const [, navigate] = useLocation();
  const { data: authData } = trpc.auth.me.useQuery();
  const member = (authData as any)?.member;
  const { data: products } = trpc.product.list.useQuery({ zone: "AGENT" }, { enabled: isAgentOrAbove(member?.rank ?? "") });
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [qty, setQty] = useState(1);
  const [shippingLocation, setShippingLocation] = useState<"KK_STOCKIST" | "PUCHONG_HQ">("PUCHONG_HQ");
  const utils = trpc.useUtils();

  const createAgentOrder = trpc.order.createAgentOrder.useMutation({
    onSuccess: (data) => {
      toast.success(`代理订单创建成功！生成了 ${data.codes.length} 个VIP付款码`);
      setSelectedProduct(null);
      utils.order.myOrders.invalidate();
      utils.order.myCodes.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  if (!member || !isAgentOrAbove(member.rank)) {
    return (
      <div className="mobile-app">
        <MobileHeader title="代理区" />
        <div className="flex flex-col items-center justify-center min-h-[60vh] px-8 text-center">
          <Lock size={48} className="text-muted-foreground/40 mb-4" />
          <h2 className="text-lg font-semibold mb-2">代理专属区域</h2>
          <p className="text-sm text-muted-foreground mb-4">此区域仅限M代理及以上身份访问</p>
          <Button onClick={() => navigate("/upgrade")}>了解如何升级</Button>
        </div>
        <BottomNav />
      </div>
    );
  }

  const agentProducts = products ?? [];

  return (
    <div className="mobile-app pb-20">
      <MobileHeader title="代理区" />
      <div className="px-4 mt-3">
        <div className="p-3 bg-primary/5 rounded-xl mb-4">
          <p className="text-xs text-muted-foreground">代理身份购买产品后，系统将自动生成VIP付款码供会员使用</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {agentProducts.map((p) => (
            <Card key={p.id} className="rounded-xl border-0 overflow-hidden cursor-pointer hover:shadow-md transition-shadow" onClick={() => { setSelectedProduct(p); setQty(1); }}>
              <div className="h-32 bg-gradient-to-br from-blue-100 to-blue-50 flex items-center justify-center">
                {p.imageUrl ? <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" /> : <Package size={32} className="text-blue-400" />}
              </div>
              <div className="p-3">
                <p className="text-sm font-medium line-clamp-2">{p.name}</p>
                <Badge className="mt-1 text-xs bg-blue-100 text-blue-600 border-0">{CATEGORY_LABELS[p.category]}</Badge>
                <p className="text-base font-bold text-blue-600 mt-1">{formatRM(p.agentPrice || p.price)}</p>
                {p.agentPrice && <p className="text-xs text-muted-foreground line-through">{formatRM(p.price)}</p>}
              </div>
            </Card>
          ))}
          {agentProducts.length === 0 && (
            <div className="col-span-2 text-center py-12">
              <Package size={40} className="mx-auto text-muted-foreground/40 mb-3" />
              <p className="text-muted-foreground text-sm">暂无代理产品</p>
            </div>
          )}
        </div>
      </div>

      <Dialog open={!!selectedProduct} onOpenChange={() => setSelectedProduct(null)}>
        <DialogContent className="max-w-sm mx-auto">
          <DialogHeader>
            <DialogTitle>{selectedProduct?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">{selectedProduct?.description || "暂无描述"}</p>
            <p className="text-sm">代理价: <strong className="text-blue-600">{formatRM(selectedProduct?.agentPrice || selectedProduct?.price)}</strong></p>
            <p className="text-xs text-muted-foreground">组织奖基准: {formatRM(selectedProduct?.baseValue)}</p>
            <div className="flex items-center gap-3">
              <span className="text-sm">数量:</span>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={() => setQty(Math.max(1, qty - 1))}>-</Button>
                <span className="w-8 text-center font-medium">{qty}</span>
                <Button size="sm" variant="outline" onClick={() => setQty(qty + 1)}>+</Button>
              </div>
            </div>
            <p className="text-sm font-semibold">总计: {formatRM((parseFloat(selectedProduct?.agentPrice || selectedProduct?.price || "0")) * qty)}</p>
            <div>
              <Label className="text-sm">出货地点</Label>
              <Select value={shippingLocation} onValueChange={(v) => setShippingLocation(v as "KK_STOCKIST" | "PUCHONG_HQ")}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PUCHONG_HQ">Puchong总部</SelectItem>
                  <SelectItem value="KK_STOCKIST">KK Stockist</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedProduct(null)}>取消</Button>
            <Button onClick={() => createAgentOrder.mutate({ items: [{ productId: selectedProduct.id, quantity: qty }], paymentMethod: "ONLINE_TRANSFER", shippingLocation })} disabled={createAgentOrder.isPending}>
              {createAgentOrder.isPending ? "处理中..." : "确认下单"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <BottomNav />
    </div>
  );
}
