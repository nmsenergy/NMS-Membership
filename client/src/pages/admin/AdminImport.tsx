import { useState, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Download, Upload, CheckCircle, Loader2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { useAdminView } from "@/contexts/AdminContext";

interface ImportRow {
  openId: string;
  name: string;
  phone?: string;
  birthday?: string;
  referralCode?: string;
  rank?: "VIP" | "M_AGENT" | "SM" | "GM" | "CEO";
}

export default function AdminImport() {
  const { setCurrentAdminPage } = useAdminView(); // 获取页面切换方法
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
      const XLSX = await import("xlsx");
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: "array" });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      
      // 读取为原始 JSON 数据
      const rawData = XLSX.utils.sheet_to_json(worksheet);
      
      // 核心修复：将 Excel 里的中文表头强制转换为系统需要的英文 key
      const mappedData: ImportRow[] = rawData.map((row: any) => ({
        // 用电邮作为 openId，如果没有电邮就自动生成一个临时的防撞号
        openId: row['电邮地址'] || row['电邮'] || row['openId'] || `import_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        name: row['姓名'] || row['name'] || '未知会员',
        phone: row['手机号码'] || row['手机'] || row['phone'] || '',
        birthday: row['生日'] || row['birthday'] || '',
        referralCode: row['推荐人'] || row['推荐码'] || row['referralCode'] || '',
        rank: row['等级'] || row['rank'] || 'VIP'
      }));

      setImportData(mappedData);
      setValidationErrors([]);
    } catch (error) {
      toast.error("读取Excel文件失败，请检查文件格式");
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
      toast.success(`成功导入${result.created}条会员记录！`);
      setImportData([]);
      setValidationErrors([]);
      setSelectedFile(null);
      setImportStep("select");
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      // 导入成功后自动退回列表页
      setTimeout(() => {
        setCurrentAdminPage("members");
      }, 1500);
    } catch (error) {
      toast.error("导入失败，服务器出错");
      setImportStep("preview");
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="flex items-center gap-3">
        {/* 返回按钮 */}
        <Button variant="outline" size="icon" onClick={() => setCurrentAdminPage("members")} className="h-9 w-9">
          <ArrowLeft size={18} />
        </Button>
        <div>
          <h1 className="text-2xl font-bold mb-1">会员批量导入</h1>
          <p className="text-xs text-muted-foreground">使用Excel模板批量导入会员信息</p>
        </div>
      </div>

      {/* Step 2: Upload File (跳过冗余的第一步，直接让用户上传) */}
      <Card className="p-6">
        <div className="mb-4">
          <h2 className="text-lg font-semibold mb-1">上传文件</h2>
          <p className="text-sm text-muted-foreground">选择填写好的 Excel 文件</p>
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
              <p className="font-medium">点击选择文件</p>
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

      {/* Step 3: Preview & Validate */}
      {importData.length > 0 && (
        <Card className="p-6">
          <div className="mb-4">
            <h2 className="text-lg font-semibold mb-1">预览和验证</h2>
            <p className="text-sm text-muted-foreground">共成功解析 {importData.length} 行数据</p>
          </div>

          {/* Validation Errors */}
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

          {/* Data Preview Table */}
          <div className="overflow-x-auto mb-4 border rounded-md">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-2">姓名</th>
                  <th className="text-left p-2">邮箱/ID</th>
                  <th className="text-left p-2">手机</th>
                  <th className="text-left p-2">推荐人(码)</th>
                </tr>
              </thead>
              <tbody>
                {importData.slice(0, 5).map((row, i) => (
                  <tr key={i} className="border-b hover:bg-muted/30">
                    <td className="p-2">{row.name}</td>
                    <td className="p-2 text-xs text-muted-foreground">{row.openId}</td>
                    <td className="p-2">{row.phone || "-"}</td>
                    <td className="p-2 text-xs">{row.referralCode || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {importData.length > 5 && (
              <p className="text-sm text-muted-foreground p-2">...还有 {importData.length - 5} 行数据</p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setImportData([]);
                setValidationErrors([]);
                setSelectedFile(null);
                setImportStep("select");
                if (fileInputRef.current) fileInputRef.current.value = "";
              }}
            >
              重新选择
            </Button>
            <Button onClick={handleValidate} disabled={validateImportMutation.isPending}>
              {validateImportMutation.isPending ? <><Loader2 size={16} className="mr-2 animate-spin" />验证中...</> : "验证数据"}
            </Button>
            <Button
              onClick={handleImport}
              disabled={validationErrors.length > 0 || importMembersMutation.isPending}
              className="ml-auto"
            >
              {importMembersMutation.isPending ? <><Loader2 size={16} className="mr-2 animate-spin" />导入中...</> : "开始导入"}
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
