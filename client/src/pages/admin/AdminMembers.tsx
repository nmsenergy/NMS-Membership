import { useState, useRef } from "react";
import * as XLSX from "xlsx";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Download, Upload, CheckCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface ImportRow {
  openId: string;
  name: string;
  phone?: string;
  birthday?: string;
  referralCode?: string;
  rank?: "VIP" | "M_AGENT" | "SM" | "GM" | "CEO";
}

export default function AdminImport() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importData, setImportData] = useState<ImportRow[]>([]);
  const [validationErrors, setValidationErrors] = useState<Array<{ row: number; error: string }>>([]);
  const [importStep, setImportStep] = useState<"select" | "preview" | "validating" | "importing">("select");

  const downloadTemplateMutation = trpc.admin.downloadTemplate.useMutation();
  const validateImportMutation = trpc.admin.validateImport.useMutation();
  const importMembersMutation = trpc.admin.importMembers.useMutation();

  const handleDownloadTemplate = async () => {
    try {
      const result = await downloadTemplateMutation.mutateAsync();
      const binaryString = atob(result.base64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = result.filename;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success("模板已下载");
    } catch (error) {
      toast.error("下载模板失败");
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setImportStep("preview");

    try {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: "array" });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json<ImportRow>(worksheet);
      setImportData(data);
      setValidationErrors([]);
    } catch (error) {
      console.error("Excel processing error:", error);
      toast.error("读取Excel文件失败，请确保文件格式正确");
      setImportStep("select");
    }
  };

  const handleValidate = async () => {
    if (importData.length === 0) {
      toast.error("没有数据要导入");
      return;
    }

    setImportStep("validating");
    try {
      const result = await validateImportMutation.mutateAsync({ data: importData });
      setValidationErrors(result.errors);

      if (result.valid) {
        toast.success(`验证成功，共${result.totalRows}行数据`);
      } else {
        toast.error(`验证失败，共${result.errors.length}个错误`);
      }
    } catch (error) {
      toast.error("验证失败");
    } finally {
      setImportStep("preview");
    }
  };

  const handleImport = async () => {
    if (validationErrors.length > 0) {
      toast.error("请先修复所有错误");
      return;
    }

    setImportStep("importing");
    try {
      const result = await importMembersMutation.mutateAsync(importData);
      toast.success(`成功导入${result.created}条会员记录`);
      setImportData([]);
      setValidationErrors([]);
      setSelectedFile(null);
      setImportStep("select");
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error) {
      toast.error("导入失败");
      setImportStep("preview");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-2">会员批量导入</h1>
        <p className="text-muted-foreground">使用Excel模板批量导入会员信息，简化大批量用户录入</p>
      </div>

      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold mb-1">第一步：下载模板</h2>
            <p className="text-sm text-muted-foreground">下载Excel模板，按照格式填写会员信息</p>
          </div>
          <Button onClick={handleDownloadTemplate} disabled={downloadTemplateMutation.isPending}>
            {downloadTemplateMutation.isPending ? (
              <>
                <Loader2 size={16} className="mr-2 animate-spin" />
                下载中...
              </>
            ) : (
              <>
                <Download size={16} className="mr-2" />
                下载模板
              </>
            )}
          </Button>
        </div>
      </Card>

      <Card className="p-6">
        <div className="mb-4">
          <h2 className="text-lg font-semibold mb-1">第二步：上传文件</h2>
          <p className="text-sm text-muted-foreground">选择填写好的Excel文件</p>
        </div>

        <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary/50 transition-colors">
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileSelect}
            className="hidden"
          />
          <div className="flex flex-col items-center gap-3">
            <Upload size={32} className="text-muted-foreground" />
            <div>
              <p className="font-medium">点击选择文件或拖拽上传</p>
              <p className="text-sm text-muted-foreground">支持 .xlsx 和 .xls 格式</p>
            </div>
            <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
              选择文件
            </Button>
          </div>
        </div>

        {selectedFile && (
          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-800">
              <CheckCircle size={16} className="inline mr-2" />
              已选择：{selectedFile.name}
            </p>
          </div>
        )}
      </Card>

      {importData.length > 0 && (
        <Card className="p-6">
          <div className="mb-4">
            <h2 className="text-lg font-semibold mb-1">第三步：预览和验证</h2>
            <p className="text-sm text-muted-foreground">共{importData.length}行数据</p>
          </div>

          {validationErrors.length > 0 && (
            <Alert className="mb-4 border-red-200 bg-red-50">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                发现{validationErrors.length}个错误，请检查以下行：
              </AlertDescription>
              <div className="mt-3 space-y-1 max-h-40 overflow-y-auto">
                {validationErrors.slice(0, 10).map((err, i) => (
                  <div key={i} className="text-sm text-red-700">
                    第{err.row}行：{err.error}
                  </div>
                ))}
              </div>
            </Alert>
          )}

          <div className="overflow-x-auto mb-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-2">openId</th>
                  <th className="text-left p-2">姓名</th>
                  <th className="text-left p-2">等级</th>
                </tr>
              </thead>
              <tbody>
                {importData.slice(0, 5).map((row, i) => (
                  <tr key={i} className="border-b hover:bg-muted/30">
                    <td className="p-2 text-xs font-mono">{row.openId}</td>
                    <td className="p-2">{row.name}</td>
                    <td className="p-2">{row.rank || "VIP"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex gap-3">
            <Button variant="outline" onClick={() => { setImportData([]); setSelectedFile(null); setImportStep("select"); }}>重置</Button>
            <Button onClick={handleValidate} disabled={validateImportMutation.isPending}>验证数据</Button>
            <Button onClick={handleImport} disabled={validationErrors.length > 0 || importMembersMutation.isPending} className="ml-auto">
              {importMembersMutation.isPending ? "导入中..." : "开始导入"}
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
