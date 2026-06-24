import { useState } from "react";
import { trpc } from "@/lib/trpc";
import MobileHeader from "@/components/MobileHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Edit, Trash2, MapPin, Mail, User, CheckSquare, Square, Download, Upload } from "lucide-react";
import { toast } from "sonner";

const SHIPPING_LOCATIONS = ["KK_AGENT", "PUCHONG_HQ"];

export default function AdminRegionalManagers() {
  const [showDialog, setShowDialog] = useState(false);
  const [showBulkDialog, setShowBulkDialog] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [description, setDescription] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkLocations, setBulkLocations] = useState<string[]>([]);
  const [bulkDescription, setBulkDescription] = useState("");
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<any[]>([]);

  const { data: managers, isLoading, refetch } = trpc.admin.regionalManagers.useQuery();
  const { data: candidates } = trpc.admin.regionalManagerCandidates.useQuery();
  const utils = trpc.useUtils();

  const createMutation = trpc.admin.createRegionalManager.useMutation({
    onSuccess: () => {
      toast.success("區域代理已創建");
      resetForm();
      utils.admin.regionalManagers.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const updateMutation = trpc.admin.updateRegionalManager.useMutation({
    onSuccess: () => {
      toast.success("區域代理已更新");
      resetForm();
      utils.admin.regionalManagers.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = trpc.admin.deleteRegionalManager.useMutation({
    onSuccess: () => {
      toast.success("區域代理已刪除");
      utils.admin.regionalManagers.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const importMutation = trpc.admin.importRegionalManagersFromCSV.useMutation({
    onSuccess: (data) => {
      toast.success(`已導入 ${data.created} 個新代理商，更新 ${data.updated} 個`);
      if (data.errors.length > 0) {
        toast.error(`有 ${data.errors.length} 個錯誤`);
      }
      setShowImportDialog(false);
      setImportFile(null);
      setImportPreview([]);
      utils.admin.regionalManagers.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const bulkUpdateMutation = trpc.admin.bulkUpdateRegionalManagers.useMutation({
    onSuccess: (data) => {
      toast.success(`已批量更新 ${data.count} 個代理商`);
      setShowBulkDialog(false);
      setSelectedIds(new Set());
      setBulkLocations([]);
      setBulkDescription("");
      utils.admin.regionalManagers.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  
  const handleExport = () => {
    if (!managers || managers.length === 0) {
      toast.error("沒有數據可導出");
      return;
    }

    const csvData = [
      ['Email', 'Locations', 'Description'],
      ...managers.map((m: any) => [
        m.userEmail,
        JSON.parse(m.allowedLocations || "[]").join(', '),
        m.description || '',
      ]),
    ];

    const csvContent = csvData.map(row => 
      row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
    ).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `regional-managers-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("已導出 CSV 文件");
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportFile(file);
    const text = await file.text();
    const lines = text.split('\n').filter(l => l.trim());
    
    if (lines.length < 2) {
      toast.error("CSV 文件格式不正確");
      return;
    }

    const rows = lines.slice(1).map(line => {
      const cells = line.split(',').map(c => c.replace(/^"|"$/g, ''));
      return {
        email: cells[0],
        locations: cells[1],
        description: cells[2],
      };
    }).filter(r => r.email);

    setImportPreview(rows);
  };

  const handleConfirmImport = () => {
    if (importPreview.length === 0) {
      toast.error("沒有有效的數據");
      return;
    }
    importMutation.mutate(importPreview);
  };

  const resetForm = () => {
    setShowDialog(false);
    setEditingId(null);
    setSelectedUserId(null);
    setSelectedLocations([]);
    setDescription("");
  };

  const handleEdit = (manager: any) => {
    setEditingId(manager.userId);
    setSelectedUserId(manager.userId);
    setSelectedLocations(JSON.parse(manager.allowedLocations || "[]"));
    setDescription(manager.description || "");
    setShowDialog(true);
  };

  const handleSave = () => {
    if (!selectedUserId) {
      toast.error("請選擇代理商");
      return;
    }
    if (selectedLocations.length === 0) {
      toast.error("請選擇至少一個出貨地點");
      return;
    }

    if (editingId) {
      updateMutation.mutate({
        userId: selectedUserId,
        allowedLocations: selectedLocations,
        description: description || undefined,
      });
    } else {
      createMutation.mutate({
        userId: selectedUserId,
        allowedLocations: selectedLocations,
        description: description || undefined,
      });
    }
  };

  const handleDelete = (userId: number) => {
    if (confirm("確定要刪除此區域代理嗎？")) {
      deleteMutation.mutate({ userId });
    }
  };

  const toggleLocation = (location: string) => {
    setSelectedLocations((prev) =>
      prev.includes(location) ? prev.filter((l) => l !== location) : [...prev, location]
    );
  };

  const toggleBulkLocation = (location: string) => {
    setBulkLocations((prev) =>
      prev.includes(location) ? prev.filter((l) => l !== location) : [...prev, location]
    );
  };

  const toggleSelection = (userId: number) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(userId)) {
      newSet.delete(userId);
    } else {
      newSet.add(userId);
    }
    setSelectedIds(newSet);
  };

  const toggleSelectAll = () => {
    if (managers && selectedIds.size === managers.length) {
      setSelectedIds(new Set());
    } else if (managers) {
      setSelectedIds(new Set(managers.map((m: any) => m.userId)));
    }
  };

  const handleBulkUpdate = () => {
    if (selectedIds.size === 0) {
      toast.error("請選擇至少一個代理商");
      return;
    }
    if (bulkLocations.length === 0) {
      toast.error("請選擇至少一個出貨地點");
      return;
    }

    bulkUpdateMutation.mutate({
      userIds: Array.from(selectedIds),
      allowedLocations: bulkLocations,
      description: bulkDescription || undefined,
    });
  };

  if (isLoading) return <div className="p-4">加載中...</div>;

  return (
    <div className="min-h-screen bg-background">
      <MobileHeader title="區域代理配置" />
      <div className="p-4 pb-20">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-xl font-bold">區域代理管理</h1>
          <div className="flex gap-2 flex-wrap">
            {selectedIds.size > 0 && (
              <Button onClick={() => setShowBulkDialog(true)} size="sm" variant="secondary" className="gap-2">
                批量設定 ({selectedIds.size})
              </Button>
            )}
            <Button onClick={handleExport} size="sm" variant="outline" className="gap-2">
              <Download size={16} /> 匯出
            </Button>
            <Button onClick={() => setShowImportDialog(true)} size="sm" variant="outline" className="gap-2">
              <Upload size={16} /> 匯入
            </Button>
            <Button onClick={() => setShowDialog(true)} size="sm" className="gap-2">
              <Plus size={16} /> 新增代理
            </Button>
          </div>
        </div>

        {/* Bulk selection toolbar */}
        {managers && managers.length > 0 && (
          <Card className="p-3 rounded-xl border-0 mb-4 bg-accent/50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={toggleSelectAll}
                className="p-1 hover:bg-accent rounded transition-colors"
              >
                {selectedIds.size === managers.length ? (
                  <CheckSquare size={20} className="text-primary" />
                ) : (
                  <Square size={20} className="text-muted-foreground" />
                )}
              </button>
              <span className="text-sm font-medium">
                {selectedIds.size > 0 ? `已選擇 ${selectedIds.size} 個` : "全選"}
              </span>
            </div>
            {selectedIds.size > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedIds(new Set())}
                className="text-xs"
              >
                清除選擇
              </Button>
            )}
          </Card>
        )}

        <div className="space-y-3">
          {managers && managers.length > 0 ? (
            managers.map((manager: any) => (
              <Card key={manager.userId} className="p-4 rounded-xl border-0">
                <div className="flex justify-between items-start">
                  <div className="flex items-start gap-3 flex-1">
                    <button
                      onClick={() => toggleSelection(manager.userId)}
                      className="p-1 hover:bg-accent rounded transition-colors mt-0.5"
                    >
                      {selectedIds.has(manager.userId) ? (
                        <CheckSquare size={20} className="text-primary" />
                      ) : (
                        <Square size={20} className="text-muted-foreground" />
                      )}
                    </button>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <User size={16} className="text-muted-foreground" />
                        <p className="font-semibold">{manager.userName}</p>
                        {!manager.isActive && <Badge variant="outline" className="text-xs">停用</Badge>}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                        <Mail size={14} />
                        {manager.userEmail}
                      </div>
                      <div className="flex items-start gap-2 mb-2">
                        <MapPin size={14} className="text-primary mt-0.5 flex-shrink-0" />
                        <div className="flex flex-wrap gap-1">
                          {JSON.parse(manager.allowedLocations || "[]").map((loc: string) => (
                            <Badge key={loc} variant="secondary" className="text-xs">
                              {loc}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      {manager.description && (
                        <p className="text-xs text-muted-foreground mt-2">{manager.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 ml-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(manager)}
                      className="text-blue-600"
                    >
                      <Edit size={16} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(manager.userId)}
                      className="text-red-600"
                    >
                      <Trash2 size={16} />
                    </Button>
                  </div>
                </div>
              </Card>
            ))
          ) : (
            <Card className="p-6 rounded-xl border-0 text-center text-muted-foreground">
              <MapPin size={32} className="mx-auto mb-2 opacity-50" />
              <p>暫無區域代理</p>
            </Card>
          )}
        </div>
      </div>

      {/* Single edit dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{editingId ? "編輯區域代理" : "新增區域代理"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium mb-2 block">選擇代理商</Label>
              <select
                value={selectedUserId || ""}
                onChange={(e) => setSelectedUserId(Number(e.target.value))}
                disabled={!!editingId}
                className="w-full px-3 py-2 border rounded-lg text-sm"
              >
                <option value="">-- 請選擇 --</option>
                {candidates &&
                  candidates.map((user: any) => (
                    <option key={user.id} value={user.id}>
                      {user.name} ({user.email})
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <Label className="text-sm font-medium mb-2 block">出貨地點</Label>
              <div className="space-y-2">
                {SHIPPING_LOCATIONS.map((location) => (
                  <div key={location} className="flex items-center gap-2">
                    <Checkbox
                      checked={selectedLocations.includes(location)}
                      onCheckedChange={() => toggleLocation(location)}
                      id={location}
                    />
                    <Label htmlFor={location} className="font-normal cursor-pointer">
                      {location}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <Label htmlFor="description" className="text-sm font-medium mb-2 block">
                備註（可選）
              </Label>
              <Input
                id="description"
                placeholder="例如：負責吉隆坡地區"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={resetForm}>
              取消
            </Button>
            <Button onClick={handleSave} disabled={createMutation.isPending || updateMutation.isPending}>
              {editingId ? "更新" : "創建"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk update dialog */}
      <Dialog open={showBulkDialog} onOpenChange={setShowBulkDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>批量設定出貨地點</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="bg-accent/50 p-3 rounded-lg">
              <p className="text-sm font-medium">選中的代理商：{selectedIds.size} 個</p>
            </div>

            <div>
              <Label className="text-sm font-medium mb-2 block">出貨地點</Label>
              <div className="space-y-2">
                {SHIPPING_LOCATIONS.map((location) => (
                  <div key={location} className="flex items-center gap-2">
                    <Checkbox
                      checked={bulkLocations.includes(location)}
                      onCheckedChange={() => toggleBulkLocation(location)}
                      id={`bulk-${location}`}
                    />
                    <Label htmlFor={`bulk-${location}`} className="font-normal cursor-pointer">
                      {location}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <Label htmlFor="bulk-description" className="text-sm font-medium mb-2 block">
                備註（可選）
              </Label>
              <Input
                id="bulk-description"
                placeholder="例如：新增的代理商"
                value={bulkDescription}
                onChange={(e) => setBulkDescription(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowBulkDialog(false);
                setBulkLocations([]);
                setBulkDescription("");
              }}
            >
              取消
            </Button>
            <Button onClick={handleBulkUpdate} disabled={bulkUpdateMutation.isPending}>
              批量更新
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
