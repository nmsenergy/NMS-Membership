import { useState, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Download, Upload, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface ImportRow {
  姓名: string;
  电邮地址: string;
  国家?: string;
  州属?: string;
  邮区编号?: string;
  城市?: string;
  推荐人: string;
}

export default function AdminImport() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importData, setImportData] = useState<ImportRow[]>([]);
  const [validationErrors, setValidationErrors] = useState<Array<{ row: number; error: string }>>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [importStep, setImportStep] = useState<"select" | "preview" | "validating" | "importing" | "result">("select");
  const [importResult, setImportResult] = useState<{ created: number; failed: Array<{ row: ImportRow; reason: string }>; total: number } | null>(null);
  const [editingRowIndex, setEditingRowIndex] = useState<number | null>(null);
  const [editingData, setEditingData] = useState<ImportRow | null>(null);

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
      const data = XLSX.utils.sheet_to_json<ImportRow>(worksheet);
      setImportData(data);
      setValidationErrors([]);
    } catch (error) {
      toast.error("读取Excel文件失败");
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

  const handleEditRow = (index: number) => {
    setEditingRowIndex(index);
    setEditingData({ ...importData[index] });
  };

  const handleSaveEdit = () => {
    if (editingRowIndex !== null && editingData) {
      const newData = [...importData];
      newData[editingRowIndex] = editingData;
      setImportData(newData);
      setEditingRowIndex(null);
      setEditingData(null);
      // Re-validate after edit
      handleValidate();
    }
  };

  const handleCancelEdit = () => {
    setEditingRowIndex(null);
    setEditingData(null);
  };

  const handleEditFieldChange = (field: keyof ImportRow, value: string) => {
    if (editingData) {
      setEditingData({ ...editingData, [field]: value });
    }
  };

    const handleImport = async () => {
    if (validationErrors.length > 0) {
      toast.error("请先修复所有错误");
      return;
    }

    setImportStep("importing");
    const toastId = toast.loading(`正在导入 ${importData.length} 条会员记录...`);
    
    try {
      // Convert ImportRow[] to CSV string format
      const csvLines = ["姓名,电邮地址,国家,州属,邮区编号,城市,推荐人"];
      importData.forEach(row => {
        const line = [
          row.姓名,
          row.电邮地址,
          row.国家 || "",
          row.州属 || "",
          row.邮区编号 || "",
          row.城市 || "",
          row.推荐人,
        ].join(",");
        csvLines.push(line);
      });
      const csvData = csvLines.join("\n");
      
      console.log(`[Import] Starting import of ${importData.length} members`);
      const result = await importMembersMutation.mutateAsync({ csvData });
      console.log(`[Import] Success: ${result.created} members imported, ${result.failed?.length || 0} failed`);
      
      toast.dismiss(toastId);
      
      // Store result and show result page
      setImportResult(result);
      setImportStep("result");
    } catch (error: any) {
      console.error(`[Import] Error:`, error);
      toast.dismiss(toastId);
      
      const errorMessage = error?.message || "导入失败，请检查数据格式";
      toast.error(`❌ ${errorMessage}`);
      setImportStep("preview");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-2">会员批量导入</h1>
        <p className="text-muted-foreground">使用Excel模板批量导入会员信息，简化大批量用户录入</p>
      </div>

      {/* Step 1: Download Template */}
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

      {/* Step 2: Upload File */}
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

      {/* Step 3: Preview & Validate */}
      {importData.length > 0 && (
        <Card className="p-6">
          <div className="mb-4">
            <h2 className="text-lg font-semibold mb-1">第三步：预览和验证</h2>
            <p className="text-sm text-muted-foreground">共{importData.length}行数据</p>
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
                {validationErrors.length > 10 && (
                  <div className="text-sm text-red-700">...还有{validationErrors.length - 10}个错误</div>
                )}
              </div>
            </Alert>
          )}

          {/* Data Preview Table */}
          <div className="overflow-x-auto mb-4 border rounded-lg">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-2 w-20">行号</th>
                  <th className="text-left p-2">姓名</th>
                  <th className="text-left p-2">电邮地址</th>
                  <th className="text-left p-2">国家</th>
                  <th className="text-left p-2">州属</th>
                  <th className="text-left p-2">邮区编号</th>
                  <th className="text-left p-2">城市</th>
                  <th className="text-left p-2">推荐人</th>
                  <th className="text-left p-2 w-24">操作</th>
                </tr>
              </thead>
              <tbody>
                {importData.map((row, i) => (
                  <tr 
                    key={i} 
                    className={editingRowIndex === i ? "bg-blue-50 border-b" : "border-b hover:bg-muted/30"}
                  >
                    <td className="p-2 text-xs text-muted-foreground">{i + 1}</td>
                    {editingRowIndex === i && editingData ? (
                      <>
                        <td className="p-2"><input type="text" value={editingData.姓名} onChange={(e) => handleEditFieldChange('姓名', e.target.value)} className="w-full px-2 py-1 border rounded text-sm" /></td>
                        <td className="p-2"><input type="email" value={editingData.电邮地址} onChange={(e) => handleEditFieldChange('电邮地址', e.target.value)} className="w-full px-2 py-1 border rounded text-sm" /></td>
                        <td className="p-2"><input type="text" value={editingData.国家 || ''} onChange={(e) => handleEditFieldChange('国家', e.target.value)} className="w-full px-2 py-1 border rounded text-sm" /></td>
                        <td className="p-2"><input type="text" value={editingData.州属 || ''} onChange={(e) => handleEditFieldChange('州属', e.target.value)} className="w-full px-2 py-1 border rounded text-sm" /></td>
                        <td className="p-2"><input type="text" value={editingData.邮区编号 || ''} onChange={(e) => handleEditFieldChange('邮区编号', e.target.value)} className="w-full px-2 py-1 border rounded text-sm" /></td>
                        <td className="p-2"><input type="text" value={editingData.城市 || ''} onChange={(e) => handleEditFieldChange('城市', e.target.value)} className="w-full px-2 py-1 border rounded text-sm" /></td>
                        <td className="p-2"><input type="text" value={editingData.推荐人} onChange={(e) => handleEditFieldChange('推荐人', e.target.value)} className="w-full px-2 py-1 border rounded text-sm" /></td>
                        <td className="p-2 flex gap-1">
                          <Button size="sm" variant="default" onClick={handleSaveEdit} className="text-xs">保存</Button>
                          <Button size="sm" variant="outline" onClick={handleCancelEdit} className="text-xs">取消</Button>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="p-2">{row.姓名}</td>
                        <td className="p-2 text-xs font-mono">{row.电邮地址}</td>
                        <td className="p-2">{row.国家 || "-"}</td>
                        <td className="p-2">{row.州属 || "-"}</td>
                        <td className="p-2">{row.邮区编号 || "-"}</td>
                        <td className="p-2">{row.城市 || "-"}</td>
                        <td className="p-2">{row.推荐人}</td>
                        <td className="p-2">
                          <Button size="sm" variant="outline" onClick={() => handleEditRow(i)} className="text-xs">编辑</Button>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
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
                if (fileInputRef.current) {
                  fileInputRef.current.value = "";
                }
              }}
            >
              重新选择
            </Button>
            <Button onClick={handleValidate} disabled={validateImportMutation.isPending}>
              {validateImportMutation.isPending ? (
                <>
                  <Loader2 size={16} className="mr-2 animate-spin" />
                  验证中...
                </>
              ) : (
                "验证数据"
              )}
            </Button>
            <Button
              onClick={handleImport}
              disabled={validationErrors.length > 0 || importMembersMutation.isPending}
              className="ml-auto"
            >
              {importMembersMutation.isPending ? (
                <>
                  <Loader2 size={16} className="mr-2 animate-spin" />
                  导入中...
                </>
              ) : (
                <>
                  <Upload size={16} className="mr-2" />
                  开始导入
                </>
              )}
            </Button>
          </div>
        </Card>
      )}

      {/* Result Page */}
      {importStep === "result" && importResult && (
        <div className="space-y-6">
          <Card className="p-6 border-green-200 bg-green-50">
            <div className="flex items-start gap-4">
              <CheckCircle size={24} className="text-green-600 flex-shrink-0 mt-1" />
              <div className="flex-1">
                <h2 className="text-lg font-semibold text-green-900 mb-2">导入完成</h2>
                <div className="grid grid-cols-3 gap-4 mt-4">
                  <div className="bg-white rounded-lg p-4">
                    <p className="text-sm text-gray-600">总数</p>
                    <p className="text-2xl font-bold text-gray-900">{importResult.total}</p>
                  </div>
                  <div className="bg-white rounded-lg p-4">
                    <p className="text-sm text-green-600">成功</p>
                    <p className="text-2xl font-bold text-green-600">{importResult.created}</p>
                  </div>
                  <div className="bg-white rounded-lg p-4">
                    <p className="text-sm text-red-600">失败</p>
                    <p className="text-2xl font-bold text-red-600">{importResult.failed?.length || 0}</p>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {importResult.failed && importResult.failed.length > 0 && (
            <Card className="p-6 border-red-200 bg-red-50">
              <div className="flex items-center gap-2 mb-4">
                <XCircle size={20} className="text-red-600" />
                <h3 className="font-semibold text-red-900">失败记录 ({importResult.failed.length})</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-red-200">
                      <th className="text-left py-2 px-3 font-semibold text-red-900">姓名</th>
                      <th className="text-left py-2 px-3 font-semibold text-red-900">电邮地址</th>
                      <th className="text-left py-2 px-3 font-semibold text-red-900">失败原因</th>
                    </tr>
                  </thead>
                  <tbody>
                    {importResult.failed.map((item, idx) => (
                      <tr key={idx} className="border-b border-red-100 hover:bg-red-100/50">
                        <td className="py-2 px-3">{item.row.姓名}</td>
                        <td className="py-2 px-3">{item.row.电邮地址}</td>
                        <td className="py-2 px-3 text-red-600">{item.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-4 flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    const csv = ['姓名,电邮地址,国家,州属,邮区编号,城市,推荐人'];
                    importResult.failed.forEach(item => {
                      const line = [
                        item.row.姓名,
                        item.row.电邮地址,
                        item.row.国家 || '',
                        item.row.州属 || '',
                        item.row.邮区编号 || '',
                        item.row.城市 || '',
                        item.row.推荐人,
                      ].join(',');
                      csv.push(line);
                    });
                    const blob = new Blob([csv.join('\n')], { type: 'text/csv;charset=utf-8;' });
                    const link = document.createElement('a');
                    const url = URL.createObjectURL(blob);
                    link.setAttribute('href', url);
                    link.setAttribute('download', `failed_members_${new Date().toISOString().split('T')[0]}.csv`);
                    link.click();
                    toast.success('失败记录已导出');
                  }}
                >
                  <Download size={16} className="mr-2" />
                  导出失败记录
                </Button>
              </div>
            </Card>
          )}

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setImportStep("select");
                setImportResult(null);
                setImportData([]);
                setValidationErrors([]);
                setSelectedFile(null);
                if (fileInputRef.current) {
                  fileInputRef.current.value = "";
                }
              }}
            >
              返回开始
            </Button>
          </div>
        </div>
      )}

      {/* Instructions */}
      <Card className="p-6 bg-blue-50 border-blue-200">
        <h3 className="font-semibold mb-3 text-blue-900">导入说明</h3>
        <ul className="space-y-2 text-sm text-blue-800">
          <li>• 下载模板后，按照格式填写会员信息</li>
          <li>• openId是用户唯一标识，不能重复</li>
          <li>• 推荐码必须是有效的推荐人推荐码</li>
          <li>• 生日格式必须为 YYYY-MM-DD</li>
          <li>• 会员等级可选：VIP, M-AGENT, SM, GM, CEO</li>
          <li>• 上传后系统会自动验证数据，修复错误后才能导入</li>
          <li>• 导入过程中出错的行会被记录并跳过</li>
        </ul>
      </Card>
    </div>
  );
}
