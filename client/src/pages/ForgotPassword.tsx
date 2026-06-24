import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { trpc } from "@/lib/trpc";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [, setLocation] = useLocation();

  const requestReset = trpc.auth.requestPasswordReset.useMutation({
    onSuccess: () => {
      setSubmitted(true);
      setError("");
    },
    onError: (err) => {
      setError(err.message || "Failed to send reset link");
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email.trim()) {
      setError("Please enter your email address");
      return;
    }

    // Get the reset URL from current origin
    const resetUrl = `${window.location.origin}/reset-password`;
    await requestReset.mutateAsync({ email, resetUrl });
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle>檢查您的郵箱</CardTitle>
            <CardDescription>密碼重設鏈接已發送</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert className="bg-green-50 border-green-200">
              <AlertDescription className="text-green-800">
                如果該郵箱已註冊，您將收到一封包含密碼重設鏈接的郵件。
              </AlertDescription>
            </Alert>

            <p className="text-sm text-gray-600">
              鏈接將在 1 小時後過期。請檢查您的垃圾郵件文件夾（如果沒有在收件箱中看到）。
            </p>

            <div className="space-y-2">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setLocation("/login")}
              >
                返回登入
              </Button>
              <Button
                variant="ghost"
                className="w-full"
                onClick={() => {
                  setSubmitted(false);
                  setEmail("");
                }}
              >
                嘗試另一個郵箱
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle>忘記密碼？</CardTitle>
          <CardDescription>輸入您的郵箱地址，我們將發送重設鏈接</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert className="bg-red-50 border-red-200">
                <AlertDescription className="text-red-800">{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">
                郵箱地址
              </label>
              <Input
                id="email"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={requestReset.isPending}
              />
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={requestReset.isPending || !email.trim()}
            >
              {requestReset.isPending ? "發送中..." : "發送重設鏈接"}
            </Button>

            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={() => setLocation("/login")}
            >
              返回登入
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
