import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { formatDateTime } from "@/lib/utils";
import MobileHeader from "@/components/MobileHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Trash2, Edit } from "lucide-react";
import { toast } from "sonner";

export default function AdminAnnouncements() {
  const [showCreate, setShowCreate] = useState(false);
  const [editAnn, setEditAnn] = useState<any>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const utils = trpc.useUtils();

  const { data: announcements } = trpc.announcement.list.useQuery();

  const createAnn = trpc.admin.createAnnouncement.useMutation({
    onSuccess: () => { toast.success("公告已发布"); setShowCreate(false); setTitle(""); setContent(""); utils.announcement.list.invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  const updateAnn = trpc.admin.updateAnnouncement.useMutation({
    onSuccess: () => { toast.success("公告已更新"); setEditAnn(null); utils.announcement.list.invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  // Use admin.deleteAnnouncement from the router (which maps to deleteAnnouncement db function)
  const deleteAnn = (trpc.admin as any).deleteAnnouncement.useMutation({
    onSuccess: () => { toast.success("公告已删除"); utils.announcement.list.invalidate(); },
    onError: (e: any) => toast.error(e.message),
  });

  const openEdit = (a: any) => { setEditAnn(a); setTitle(a.title); setContent(a.content); };

  return (
    <div className="mobile-app pb-8">
      <MobileHeader title="系统公告" rightElement={
        <button onClick={() => { setTitle(""); setContent(""); setShowCreate(true); }} className="text-primary"><Plus size={20} /></button>
      } />
      <div className="px-4 mt-3 space-y-2">
        {(!announcements || announcements.length === 0) ? (
          <p className="text-center text-muted-foreground py-8 text-sm">暂无公告</p>
        ) : announcements.map((a) => (
          <Card key={a.id} className="p-3 rounded-xl border-0">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium">{a.title}</p>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{a.content}</p>
                <p className="text-xs text-muted-foreground mt-1">{formatDateTime(a.publishedAt || a.createdAt)}</p>
              </div>
              <div className="flex gap-1">
                <button onClick={() => openEdit(a)} className="p-2 text-blue-500"><Edit size={15} /></button>
                <button onClick={() => { if (confirm("确认删除？")) deleteAnn.mutate({ id: a.id }); }} className="p-2 text-red-500"><Trash2 size={15} /></button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Dialog open={showCreate || !!editAnn} onOpenChange={() => { setShowCreate(false); setEditAnn(null); }}>
        <DialogContent className="max-w-sm mx-auto">
          <DialogHeader>
            <DialogTitle>{editAnn ? "编辑公告" : "发布公告"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>标题</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1.5" />
            </div>
            <div>
              <Label>内容</Label>
              <Textarea value={content} onChange={(e) => setContent(e.target.value)} className="mt-1.5" rows={5} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowCreate(false); setEditAnn(null); }}>取消</Button>
            <Button onClick={() => editAnn ? updateAnn.mutate({ id: editAnn.id, title, content }) : createAnn.mutate({ title, content })} disabled={createAnn.isPending || updateAnn.isPending || !title || !content}>
              {editAnn ? "保存" : "发布"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
