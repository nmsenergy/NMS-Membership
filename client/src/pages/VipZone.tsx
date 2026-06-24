import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { formatRM, CATEGORY_LABELS } from "@/lib/utils";
import MobileHeader from "@/components/MobileHeader";
import BottomNav from "@/components/BottomNav";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ShoppingBag, Gift, Cake } from "lucide-react";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function VipZone() {
  const { data: authData } = trpc.auth.me.useQuery();
  const member = (authData as any)?.member;
  const { data: products } = trpc.product.list.useQuery({ zone: "VIP" });
  const { data: birthdayProducts } = trpc.product.birthdayProducts.useQuery();
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [paymentCode, setPaymentCode] = useState("");
  const [orderType, setOrderType] = useState<"vip" | "birthday" | "redeem">("vip");
  const [shippingLocation, setShippingLocation] = useState<"KK_STOCKIST" | "PUCHONG_HQ">("PUCHONG_HQ");
  const utils = trpc.useUtils();

  const createVipOrder = trpc.order.createVipOrder.useMutation({
    onSuccess: () => { toast.success("VIP订单创建成功！"); setSelectedProduct(null); setPaymentCode(""); utils.auth.me.invalidate(); utils.order.myOrders.invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  const createBirthdayOrder = trpc.order.createBirthdayOrder.useMutation({
    onSuccess: () => { toast.success("生日优惠订单创建成功！"); setSelectedProduct(null); utils.auth.me.invalidate(); utils.order.myOrders.invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  const createRedemptionOrder = trpc.order.createRedemptionOrder.useMutation({
    onSuccess: () => { toast.success("兑换成功！"); setSelectedProduct(null); utils.auth.me.invalidate(); utils.order.myOrders.invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  const vipProducts = products?.filter(p => ["VIP_PACKAGE", "VIP_BENEFIT_ITEM"].includes(p.category)) ?? [];
  const redeemProducts = products?.filter(p => p.category === "REDEMPTION_ITEM") ?? [];

  const handleBuy = () => {
    if (!selectedProduct) return;
    if (orderType === "vip") {
      if (!paymentCode.trim()) { toast.error("请输入付款码"); return; }
      createVipOrder.mutate({ paymentCode: paymentCode.trim(), shippingLocation });
    } else if (orderType === "birthday") {
      createBirthdayOrder.mutate({ items: [{ productId: selectedProduct.id, quantity: 1 }], paymentMethod: "ONLINE_TRANSFER" });
    } else {
      createRedemptionOrder.mutate({ items: [{ productId: selectedProduct.id, quantity: 1 }] });
    }
  };

  return (
    <div className="mobile-app pb-20">
      <MobileHeader title="VIP商城" showBack={false} />
      <div className="px-4 mt-3">
        <Tabs defaultValue="products">
          <TabsList className="w-full grid grid-cols-3">
            <TabsTrigger value="products"><ShoppingBag size={14} className="mr-1" />VIP产品</TabsTrigger>
            <TabsTrigger value="birthday"><Cake size={14} className="mr-1" />生日优惠</TabsTrigger>
            <TabsTrigger value="redeem"><Gift size={14} className="mr-1" />固本兑换</TabsTrigger>
          </TabsList>

          <TabsContent value="products" className="mt-3">
            <div className="grid grid-cols-2 gap-3">
              {vipProducts.map((p) => (
                <Card key={p.id} className="rounded-xl border-0 overflow-hidden cursor-pointer hover:shadow-md transition-shadow" onClick={() => { setSelectedProduct(p); setOrderType("vip"); }}>
                  <div className="h-32 bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                    {p.imageUrl ? <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" /> : <ShoppingBag size={32} className="text-primary/40" />}
                  </div>
                  <div className="p-3">
                    <p className="text-sm font-medium line-clamp-2">{p.name}</p>
                    <p className="text-xs text-muted-foreground mt-1">{CATEGORY_LABELS[p.category]}</p>
                    <p className="text-base font-bold text-primary mt-1">{formatRM(p.price)}</p>
                    <p className="text-xs text-muted-foreground">固本基准: {formatRM(p.baseValue)}</p>
                  </div>
                </Card>
              ))}
              {vipProducts.length === 0 && <p className="col-span-2 text-center text-muted-foreground py-8 text-sm">暂无产品</p>}
            </div>
          </TabsContent>

          <TabsContent value="birthday" className="mt-3">
            {!member?.birthdayVerified ? (
              <Card className="p-6 rounded-xl border-0 text-center">
                <Cake size={40} className="mx-auto text-muted-foreground/40 mb-3" />
                <p className="text-sm font-medium">生日身份未认证</p>
                <p className="text-xs text-muted-foreground mt-1">请联系管理员完成生日认证后使用此功能</p>
              </Card>
            ) : birthdayProducts && birthdayProducts.length > 0 ? (
              <>
                <div className="mb-3 p-3 bg-blue-50 rounded-xl border border-blue-200">
                  <p className="text-xs text-blue-900">💡 <strong>提示：</strong>生日優惠最多可選擇 <strong>2 種</strong>產品</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                {birthdayProducts.map((p) => (
                  <Card key={p.id} className="rounded-xl border-0 overflow-hidden cursor-pointer" onClick={() => { setSelectedProduct(p); setOrderType("birthday"); }}>
                    <div className="h-32 bg-gradient-to-br from-pink-100 to-pink-50 flex items-center justify-center">
                      <Cake size={32} className="text-pink-400" />
                    </div>
                    <div className="p-3">
                      <p className="text-sm font-medium line-clamp-2">{p.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-base font-bold text-pink-600">{formatRM(parseFloat(p.price) / 2)}</p>
                        <p className="text-xs text-muted-foreground line-through">{formatRM(p.price)}</p>
                      </div>
                      <Badge className="mt-1 text-xs bg-pink-100 text-pink-600 border-0">生日5折</Badge>
                    </div>
                  </Card>
                ))}
                </div>
              </>
            ) : (
              <Card className="p-6 rounded-xl border-0 text-center">
                <Cake size={40} className="mx-auto text-muted-foreground/40 mb-3" />
                <p className="text-sm font-medium">生日优惠仅限当月</p>
                <p className="text-xs text-muted-foreground mt-1">在您的生日当月可享受5折优惠</p>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="redeem" className="mt-3">
            <div className="mb-3 p-3 bg-primary/5 rounded-xl">
              <p className="text-sm">当前固本积分: <strong className="text-primary">{member?.gubenBalance ?? 0}</strong></p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {redeemProducts.map((p) => (
                <Card key={p.id} className="rounded-xl border-0 overflow-hidden cursor-pointer" onClick={() => { setSelectedProduct(p); setOrderType("redeem"); }}>
                  <div className="h-32 bg-gradient-to-br from-amber-100 to-amber-50 flex items-center justify-center">
                    <Gift size={32} className="text-amber-400" />
                  </div>
                  <div className="p-3">
                    <p className="text-sm font-medium line-clamp-2">{p.name}</p>
                    <p className="text-base font-bold text-amber-600 mt-1">{parseFloat(p.price).toFixed(0)} 固本</p>
                  </div>
                </Card>
              ))}
              {redeemProducts.length === 0 && <p className="col-span-2 text-center text-muted-foreground py-8 text-sm">暂无兑换产品</p>}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={!!selectedProduct} onOpenChange={() => setSelectedProduct(null)}>
        <DialogContent className="max-w-sm mx-auto">
          <DialogHeader>
            <DialogTitle>{selectedProduct?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">{selectedProduct?.description || "暂无描述"}</p>
            {orderType === "vip" && (
              <>
                <p className="text-sm">价格: <strong>{formatRM(selectedProduct?.price)}</strong></p>
                <p className="text-xs text-muted-foreground">固本基准: {formatRM(selectedProduct?.baseValue)} (您和推荐人各获得 {Math.floor(parseFloat(selectedProduct?.baseValue || "0") * 0.15)} 固本)</p>
                <div>
                  <Label className="text-sm">VIP付款码</Label>
                  <Input placeholder="请输入代理提供的付款码" value={paymentCode} onChange={(e) => setPaymentCode(e.target.value.toUpperCase())} className="mt-1.5 font-mono" />
                </div>
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
              </>
            )}
            {orderType === "birthday" && (
              <p className="text-sm">生日优惠价: <strong className="text-pink-600">{formatRM(parseFloat(selectedProduct?.price || "0") / 2)}</strong></p>
            )}
            {orderType === "redeem" && (
              <p className="text-sm">所需固本: <strong className="text-amber-600">{parseFloat(selectedProduct?.price || "0").toFixed(0)} 积分</strong></p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedProduct(null)}>取消</Button>
            <Button onClick={handleBuy} disabled={createVipOrder.isPending || createBirthdayOrder.isPending || createRedemptionOrder.isPending}>
              确认购买
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <BottomNav />
    </div>
  );
}
