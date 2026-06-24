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
import { Plus, Edit, Trash2, MapPin, Mail, User } from "lucide-react";
import { toast } from "sonner";

const SHIPPING_LOCATIONS = ["KK_AGENT", "PUCHONG_HQ"];

export default function AdminRegionalManagers() {
  const [showDialog, setShowDialog] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [description, setDescription] = useState("");

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

  if (isLoading) return <div className="p-4">加載中...</div>;

  return (
    <div className="min-h-screen bg-background">
      <MobileHeader title="區域代理配置" />
      <div className="p-4 pb-20">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-xl font-bold">區域代理管理</h1>
          <Button onClick={() => setShowDialog(true)} size="sm" className="gap-2">
            <Plus size={16} /> 新增代理
          </Button>
        </div>

        <div className="space-y-3">
          {managers && managers.length > 0 ? (
            managers.map((manager: any) => (
              <Card key={manager.userId} className="p-4 rounded-xl border-0">
                <div className="flex justify-between items-start">
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
    </div>
  );
}
