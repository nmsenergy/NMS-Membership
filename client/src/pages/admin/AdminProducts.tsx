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
import { Plus, Edit, Trash2 } from "lucide-react";
import { toast } from "sonner";

const CATEGORIES = ["VIP_PACKAGE", "VIP_BENEFIT_ITEM", "BIRTHDAY_ITEM", "REDEMPTION_ITEM", "AGENT_PACKAGE", "AGENT_ITEM", "ASSESSMENT_ITEM"];

export default function AdminProducts() {
  const [showCreate, setShowCreate] = useState(false);
  const [editProduct, setEditProduct] = useState<any>(null);
  const [form, setForm] = useState({ name: "", description: "", category: "VIP_PACKAGE", price: "", baseValue: "", agentPrice: "", imageUrl: "", isActive: true });
  const utils = trpc.useUtils();

  const { data: products } = trpc.product.list.useQuery({ zone: "ALL" as any });

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

  const resetForm = () => setForm({ name: "", description: "", category: "VIP_PACKAGE", price: "", baseValue: "", agentPrice: "", imageUrl: "", isActive: true });

  const openEdit = (p: any) => {
    setEditProduct(p);
    setForm({ name: p.name, description: p.description || "", category: p.category, price: p.price, baseValue: p.baseValue, agentPrice: p.agentPrice || "", imageUrl: p.imageUrl || "", isActive: p.isActive });
  };

  const handleSubmit = () => {
    const data = { ...form, price: parseFloat(form.price), baseValue: parseFloat(form.baseValue), agentPrice: form.agentPrice ? parseFloat(form.agentPrice) : undefined };
    if (editProduct) updateProduct.mutate({ id: editProduct.id, ...data });
    else createProduct.mutate(data);
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
    </div>
  );
}
