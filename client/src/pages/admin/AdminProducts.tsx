import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { formatRM, CATEGORY_LABELS } from "@/lib/utils";
import MobileHeader from "@/components/MobileHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Plus, Edit, Trash2, Settings } from "lucide-react";
import { toast } from "sonner";

const CATEGORIES = ["VIP_PACKAGE", "VIP_BENEFIT_ITEM", "BIRTHDAY_ITEM", "REDEMPTION_ITEM", "AGENT_PACKAGE", "AGENT_ITEM", "ASSESSMENT_ITEM"];

export default function AdminProducts() {
  const [showCreate, setShowCreate] = useState(false);
  const [editProduct, setEditProduct] = useState<any>(null);
  const [showZoneConfig, setShowZoneConfig] = useState<any>(null);
  const [form, setForm] = useState({ name: "", description: "", category: "VIP_PACKAGE", price: "", baseValue: "", agentPrice: "", imageUrl: "", isActive: true, zone: "VIP" });
  const [zoneForm, setZoneForm] = useState({ zone: "VIP", gubenBase: "", bonusBase: "", gubenRate: "15" });
  const utils = trpc.useUtils();

  const { data: products } = trpc.product.list.useQuery({ zone: "BOTH" });
  const { data: calculationBases } = trpc.admin.getCalculationBases.useQuery(
    { productId: showZoneConfig?.id },
    { enabled: !!showZoneConfig }
  );

  const createProduct = trpc.admin.createProduct.useMutation({
    onSuccess: () => { toast.success("产品已创建"); setShowCreate(false); resetForm(); utils.product.list.invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  const updateProduct = trpc.admin.updateProduct.useMutation({
    onSuccess: () => { toast.success("产品已更新"); setEditProduct(null); utils.product.list.invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  const deleteProduct = trpc.admin.deleteProduct.useMutation({
    onSuccess: () => { toast.success("产品已删除"); utils.product.list.invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  const setCalculationBase = trpc.admin.setCalculationBase.useMutation({
    onSuccess: () => {
      toast.success("区域配置已保存");
      utils.admin.getCalculationBases.invalidate();
      setZoneForm({ zone: "VIP", gubenBase: "", bonusBase: "", gubenRate: "15" });
    },
    onError: (e) => toast.error(e.message),
  });

  const resetForm = () => setForm({ name: "", description: "", category: "VIP_PACKAGE", price: "", baseValue: "", agentPrice: "", imageUrl: "", isActive: true, zone: "VIP" });

  const openEdit = (p: any) => {
    setEditProduct(p);
    setForm({ name: p.name, description: p.description || "", category: p.category, price: p.price, baseValue: p.baseValue, agentPrice: p.agentPrice || "", imageUrl: p.imageUrl || "", isActive: p.isActive, zone: p.zone });
  };

  const openZoneConfig = (p: any) => {
    setShowZoneConfig(p);
    setZoneForm({ zone: "VIP", gubenBase: "", bonusBase: "", gubenRate: "15" });
  };

  const handleZoneSubmit = () => {
    if (!zoneForm.gubenBase || !zoneForm.bonusBase || !zoneForm.gubenRate) {
      toast.error("请填写所有字段");
      return;
    }
    setCalculationBase.mutate({
      productId: showZoneConfig.id,
      zone: zoneForm.zone as any,
      gubenBase: parseFloat(zoneForm.gubenBase),
      bonusBase: parseFloat(zoneForm.bonusBase),
      gubenRate: parseFloat(zoneForm.gubenRate),
    });
  };

  const handleSubmit = () => {
    const data = { ...form, price: parseFloat(form.price), baseValue: parseFloat(form.baseValue), agentPrice: form.agentPrice ? parseFloat(form.agentPrice) : undefined, zone: form.zone as "VIP" | "AGENT" | "BOTH" };
    if (editProduct) updateProduct.mutate({ id: editProduct.id, ...data });
    else createProduct.mutate(data);
  };

  const getZoneLabel = (zone: string) => {
    switch (zone) {
      case "VIP": return "VIP商城";
      case "AGENT": return "代理区";
      case "BOTH": return "双区域";
      default: return zone;
    }
  };

  return (
    <div className="mobile-app pb-8">
      <MobileHeader title="产品管理" rightElement={
        <button onClick={() => { resetForm(); setShowCreate(true); }} className="text-primary"><Plus size={20} /></button>
      } />
      <div className="px-4 mt-3 space-y-2">
        {products?.map((p) => (
          <Card key={p.id} className={`p-3 rounded-xl border-0 ${!p.isActive ? "opacity-50" : ""}`}>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-sm font-medium">{p.name}</p>
                  {!p.isActive && <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">已下架</span>}
                </div>
                <p className="text-xs text-muted-foreground">{CATEGORY_LABELS[p.category]}</p>
                <p className="text-sm font-bold text-primary">{formatRM(p.price)}</p>
                <p className="text-xs text-muted-foreground">基准: {formatRM(p.baseValue)}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => openEdit(p)} className="p-2 text-blue-500"><Edit size={16} /></button>
                <button onClick={() => openZoneConfig(p)} className="p-2 text-green-500" title="配置区域价格"><Settings size={16} /></button>
                <button onClick={() => { if (confirm("确认删除此产品？")) deleteProduct.mutate({ id: p.id }); }} className="p-2 text-red-500"><Trash2 size={16} /></button>
              </div>
            </div>
          </Card>
        ))}
        {(!products || products.length === 0) && <p className="text-center text-muted-foreground py-8 text-sm">暂无产品</p>}
      </div>

      <Dialog open={showCreate || !!editProduct} onOpenChange={() => { setShowCreate(false); setEditProduct(null); }}>
        <DialogContent className="max-w-sm mx-auto max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editProduct ? "编辑产品" : "新增产品"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>产品名称</Label>
              <Input value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} className="mt-1.5" />
            </div>
            <div>
              <Label>产品描述</Label>
              <Input value={form.description} onChange={(e) => setForm({...form, description: e.target.value})} className="mt-1.5" />
            </div>
            <div>
              <Label>产品分类</Label>
              <Select value={form.category} onValueChange={(v) => setForm({...form, category: v})}>
                <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{CATEGORY_LABELS[c]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>价格 (RM)</Label>
              <Input type="number" value={form.price} onChange={(e) => setForm({...form, price: e.target.value})} className="mt-1.5" />
            </div>
            <div>
              <Label>固本基准值 (RM)</Label>
              <Input type="number" value={form.baseValue} onChange={(e) => setForm({...form, baseValue: e.target.value})} className="mt-1.5" />
            </div>
            <div>
              <Label>代理价 (RM, 选填)</Label>
              <Input type="number" value={form.agentPrice} onChange={(e) => setForm({...form, agentPrice: e.target.value})} className="mt-1.5" />
            </div>
            <div>
              <Label>上架区域</Label>
              <Select value={form.zone} onValueChange={(v) => setForm({...form, zone: v})}>
                <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="VIP">VIP商城</SelectItem>
                  <SelectItem value="AGENT">代理区</SelectItem>
                  <SelectItem value="BOTH">双区域</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>图片URL (选填)</Label>
              <Input value={form.imageUrl} onChange={(e) => setForm({...form, imageUrl: e.target.value})} className="mt-1.5" />
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={form.isActive} onCheckedChange={(v) => setForm({...form, isActive: v})} />
              <Label>上架销售</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowCreate(false); setEditProduct(null); }}>取消</Button>
            <Button onClick={handleSubmit} disabled={createProduct.isPending || updateProduct.isPending}>
              {editProduct ? "保存" : "创建"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Zone Configuration Dialog */}
      <Dialog open={!!showZoneConfig} onOpenChange={() => setShowZoneConfig(null)}>
        <DialogContent className="max-w-sm mx-auto max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>区域配置 - {showZoneConfig?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>选择区域</Label>
              <Select value={zoneForm.zone} onValueChange={(v) => setZoneForm({...zoneForm, zone: v})}>
                <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="VIP">VIP商城</SelectItem>
                  <SelectItem value="AGENT">代理区</SelectItem>
                  <SelectItem value="BOTH">双区域</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>固本基准值 (RM)</Label>
              <Input type="number" value={zoneForm.gubenBase} onChange={(e) => setZoneForm({...zoneForm, gubenBase: e.target.value})} className="mt-1.5" placeholder="如: 100" />
            </div>
            <div>
              <Label>奖金基准值 (RM)</Label>
              <Input type="number" value={zoneForm.bonusBase} onChange={(e) => setZoneForm({...zoneForm, bonusBase: e.target.value})} className="mt-1.5" placeholder="如: 100" />
            </div>
            <div>
              <Label>固本计算比例 (%)</Label>
              <Input type="number" value={zoneForm.gubenRate} onChange={(e) => setZoneForm({...zoneForm, gubenRate: e.target.value})} className="mt-1.5" placeholder="如: 15" />
            </div>
            {calculationBases && calculationBases.length > 0 && (
              <div className="bg-blue-50 p-3 rounded text-xs">
                <p className="font-semibold mb-2">已配置的区域:</p>
                {calculationBases.map((cb: any) => (
                  <div key={cb.id} className="mb-1">
                    <p><strong>{getZoneLabel(cb.zone)}</strong>: 固本基准 {formatRM(cb.gubenBase)}, 奖金基准 {formatRM(cb.bonusBase)}, 固本比例 {cb.gubenRate}%</p>
                  </div>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowZoneConfig(null)}>取消</Button>
            <Button onClick={handleZoneSubmit} disabled={setCalculationBase.isPending}>保存配置</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
