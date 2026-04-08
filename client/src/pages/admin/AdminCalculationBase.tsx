import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { formatRM } from "@/lib/utils";
import MobileHeader from "@/components/MobileHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus } from "lucide-react";
import { toast } from "sonner";

export default function AdminCalculationBase() {
  const [showDialog, setShowDialog] = useState(false);
  const [productId, setProductId] = useState("");
  const [zone, setZone] = useState("BOTH");
  const [gubenBase, setGubenBase] = useState("");
  const [bonusBase, setBonusBase] = useState("");
  const [gubenRate, setGubenRate] = useState("0.15");

  const { data: products } = trpc.product.list.useQuery({ zone: "BOTH" });
  const { data: bases, refetch } = trpc.admin.getCalculationBases.useQuery(
    { productId: productId ? parseInt(productId) : 0 },
    { enabled: !!productId }
  );

  const setBase = trpc.admin.setCalculationBase.useMutation({
    onSuccess: () => {
      toast.success("计算准则已设置");
      setShowDialog(false);
      setProductId("");
      setZone("BOTH");
      setGubenBase("");
      setBonusBase("");
      setGubenRate("0.15");
      refetch();
    },
    onError: (e) => toast.error(e.message),
  });

  const handleSave = () => {
    if (!productId || !gubenBase || !bonusBase || !gubenRate) {
      toast.error("请填写所有字段");
      return;
    }
    setBase.mutate({
      productId: parseInt(productId),
      zone: zone as any,
      gubenBase: parseFloat(gubenBase),
      bonusBase: parseFloat(bonusBase),
      gubenRate: parseFloat(gubenRate),
    });
  };

  return (
    <div className="mobile-app pb-8">
      <MobileHeader title="产品计算准则" rightElement={
        <button onClick={() => setShowDialog(true)} className="text-primary"><Plus size={20} /></button>
      } />

      <div className="px-4 mt-3 space-y-3">
        {!productId ? (
          <div className="text-center text-muted-foreground py-8">
            <p>选择产品查看或设置计算准则</p>
          </div>
        ) : (
          <>
            <div>
              <Label className="text-xs">选择产品</Label>
              <Select value={productId} onValueChange={setProductId}>
                <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {products?.map((p) => (
                    <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">现有计算准则</p>
              {bases && bases.length > 0 ? (
                bases.map((base) => (
                  <Card key={base.id} className="p-3 rounded-xl border-0">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-xs font-medium text-primary">{base.zone}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <p className="text-muted-foreground">固本基数</p>
                        <p className="font-medium">{formatRM(base.gubenBase)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">奖金基数</p>
                        <p className="font-medium">{formatRM(base.bonusBase)}</p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-muted-foreground">固本比率</p>
                        <p className="font-medium">{(parseFloat(base.gubenRate) * 100).toFixed(0)}%</p>
                      </div>
                    </div>
                  </Card>
                ))
              ) : (
                <p className="text-xs text-muted-foreground">暂无设置</p>
              )}
            </div>
          </>
        )}
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-sm mx-auto">
          <DialogHeader>
            <DialogTitle>设置计算准则</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">产品</Label>
              <Select value={productId} onValueChange={setProductId}>
                <SelectTrigger className="mt-1.5"><SelectValue placeholder="选择产品" /></SelectTrigger>
                <SelectContent>
                  {products?.map((p) => (
                    <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">区域</Label>
              <Select value={zone} onValueChange={setZone}>
                <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="VIP">VIP区</SelectItem>
                  <SelectItem value="AGENT">代理区</SelectItem>
                  <SelectItem value="BOTH">两个区</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">固本基数 (RM)</Label>
              <Input type="number" placeholder="1493" value={gubenBase} onChange={(e) => setGubenBase(e.target.value)} className="mt-1.5" step="0.01" />
            </div>
            <div>
              <Label className="text-xs">奖金基数 (RM)</Label>
              <Input type="number" placeholder="1000" value={bonusBase} onChange={(e) => setBonusBase(e.target.value)} className="mt-1.5" step="0.01" />
            </div>
            <div>
              <Label className="text-xs">固本比率 (0-1)</Label>
              <Input type="number" placeholder="0.15" value={gubenRate} onChange={(e) => setGubenRate(e.target.value)} className="mt-1.5" step="0.01" min="0" max="1" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>取消</Button>
            <Button onClick={handleSave} disabled={setBase.isPending}>确认</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
