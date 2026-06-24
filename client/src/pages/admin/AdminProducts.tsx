import { useState, useRef } from "react";
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
import { Plus, Edit, Trash2, Settings, Upload, X, ImageIcon, Tag } from "lucide-react";
import { toast } from "sonner";

const CATEGORIES = ["VIP_PACKAGE", "VIP_BENEFIT_ITEM", "BIRTHDAY_ITEM", "REDEMPTION_ITEM", "AGENT_PACKAGE", "AGENT_ITEM", "ASSESSMENT_ITEM"];

export default function AdminProducts() {
  const [showCreate, setShowCreate] = useState(false);
  const [editProduct, setEditProduct] = useState<any>(null);
  const [showZoneConfig, setShowZoneConfig] = useState<any>(null);
  const [form, setForm] = useState({ name: "", description: "", category: "VIP_PACKAGE", price: "", baseValue: "", agentPrice: "", imageUrl: "", isActive: true, zone: "VIP" });
  const [zoneForm, setZoneForm] = useState({ zone: "VIP", gubenBase: "", bonusBase: "", gubenRate: "15" });
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
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

  const toggleDiscount = trpc.product.toggleDiscount.useMutation({
    onSuccess: () => {
      toast.success("优惠状态已更新");
      utils.product.list.invalidate();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const setCalculationBase = trpc.admin.setCalculationBase.useMutation({
    onSuccess: () => {
      toast.success("区域配置已保存");
      utils.admin.getCalculationBases.invalidate();
      setZoneForm({ zone: "VIP", gubenBase: "", bonusBase: "", gubenRate: "15" });
    },
    onError: (e) => toast.error(e.message),
  });

  const uploadProductImage = trpc.admin.uploadProductImage.useMutation({
    onSuccess: (data) => {
      setForm((f) => ({ ...f, imageUrl: data.url }));
      setImagePreview(data.url);
      setUploadingImage(false);
      toast.success("图片已上传");
    },
    onError: (e) => {
      toast.error(e.message);
      setUploadingImage(false);
    },
  });

  const resetForm = () => {
    setForm({ name: "", description: "", category: "VIP_PACKAGE", price: "", baseValue: "", agentPrice: "", imageUrl: "", isActive: true, zone: "VIP" });
    setImagePreview(null);
  };

  const openEdit = (p: any) => {
    setEditProduct(p);
    setForm({ name: p.name, description: p.description || "", category: p.category, price: p.price, baseValue: p.baseValue, agentPrice: p.agentPrice || "", imageUrl: p.imageUrl || "", isActive: p.isActive, zone: p.zone });
    setImagePreview(p.imageUrl || null);
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

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("图片大小不能超过 5MB"); return; }
    if (!file.type.startsWith("image/")) { toast.error("请选择图片文件"); return; }
    setUploadingImage(true);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      setImagePreview(dataUrl); // show local preview immediately
      const base64 = dataUrl.split(",")[1];
      const allowedMimes = ["image/jpeg", "image/png", "image/webp", "image/gif"] as const;
      const mimeType = allowedMimes.includes(file.type as any) ? (file.type as typeof allowedMimes[number]) : "image/jpeg";
      uploadProductImage.mutate({ fileBase64: base64, mimeType, productId: editProduct?.id });
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const clearImage = () => {
    setForm((f) => ({ ...f, imageUrl: "" }));
    setImagePreview(null);
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
            <div className="flex items-start gap-3">
              {/* Product thumbnail */}
              {p.imageUrl ? (
                <img
                  src={p.imageUrl}
                  alt={p.name}
                  className="w-14 h-14 rounded-lg object-cover shrink-0 border border-border/50"
                />
              ) : (
                <div className="w-14 h-14 rounded-lg bg-muted flex items-center justify-center shrink-0">
                  <ImageIcon size={20} className="text-muted-foreground/40" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <p className="text-sm font-medium">{p.name}</p>
                      {p.isDiscount && <span className="text-xs bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded-full font-medium">🎉 优惠</span>}
                      {!p.isActive && <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">已下架</span>}
                    </div>
                    <p className="text-xs text-muted-foreground">{CATEGORY_LABELS[p.category]}</p>
                    <p className="text-sm font-bold text-primary">{formatRM(p.price)}</p>
                    <p className="text-xs text-muted-foreground">基准: {formatRM(p.baseValue)}</p>
                  </div>
                  <div className="flex gap-1 shrink-0 ml-2">
                    <button
                      onClick={() => toggleDiscount.mutate({ productId: p.id, isDiscount: !p.isDiscount })}
                      className={`p-1.5 transition-colors ${
                        p.isDiscount ? "text-orange-500" : "text-gray-400 hover:text-orange-500"
                      }`}
                      title={p.isDiscount ? "取消优惠" : "设为优惠"}
                    >
                      <Tag size={15} />
                    </button>
                    <button onClick={() => openEdit(p)} className="p-1.5 text-blue-500"><Edit size={15} /></button>
                    <button onClick={() => openZoneConfig(p)} className="p-1.5 text-green-500" title="配置区域价格"><Settings size={15} /></button>
                    <button onClick={() => { if (confirm("确认删除此产品？")) deleteProduct.mutate({ id: p.id }); }} className="p-1.5 text-red-500"><Trash2 size={15} /></button>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        ))}
        {(!products || products.length === 0) && <p className="text-center text-muted-foreground py-8 text-sm">暂无产品</p>}
      </div>

      <Dialog open={showCreate || !!editProduct} onOpenChange={() => { setShowCreate(false); setEditProduct(null); resetForm(); }}>
        <DialogContent className="max-w-sm mx-auto max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editProduct ? "编辑产品" : "新增产品"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {/* Image Upload Section */}
            <div>
              <Label>产品图片</Label>
              <div className="mt-1.5">
                {imagePreview ? (
                  <div className="relative">
                    <img
                      src={imagePreview}
                      alt="产品图片预览"
                      className="w-full h-40 object-cover rounded-lg border border-border/50"
                    />
                    {uploadingImage && (
                      <div className="absolute inset-0 bg-black/40 rounded-lg flex items-center justify-center">
                        <p className="text-white text-sm font-medium">上传中...</p>
                      </div>
                    )}
                    {!uploadingImage && (
                      <div className="absolute top-2 right-2 flex gap-1.5">
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="bg-white/90 hover:bg-white text-foreground rounded-full p-1.5 shadow"
                          title="更换图片"
                        >
                          <Upload size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={clearImage}
                          className="bg-white/90 hover:bg-white text-red-500 rounded-full p-1.5 shadow"
                          title="删除图片"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full h-28 border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center gap-2 text-muted-foreground hover:border-primary hover:text-primary transition-colors"
                    disabled={uploadingImage}
                  >
                    <Upload size={20} />
                    <span className="text-xs">{uploadingImage ? "上传中..." : "点击上传产品图片"}</span>
                    <span className="text-xs opacity-60">支持 JPG、PNG，最大 5MB</span>
                  </button>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageSelect}
                />
              </div>
            </div>

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
            <div className="flex items-center gap-3">
              <Switch checked={form.isActive} onCheckedChange={(v) => setForm({...form, isActive: v})} />
              <Label>上架销售</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowCreate(false); setEditProduct(null); resetForm(); }}>取消</Button>
            <Button onClick={handleSubmit} disabled={createProduct.isPending || updateProduct.isPending || uploadingImage}>
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
