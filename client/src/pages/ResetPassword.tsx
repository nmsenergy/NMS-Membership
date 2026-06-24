import { useEffect, useState } from "react";
import { useLocation, useSearch } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { trpc } from "@/lib/trpc";

export default function ResetPassword() {
  const search = useSearch();
  const [, setLocation] = useLocation();
  const [token, setToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [validating, setValidating] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);

  const verifyToken = trpc.auth.verifyPasswordResetToken.useQuery(
    { token },
    { enabled: !!token && validating }
  );

  const completeReset = trpc.auth.completePasswordReset.useMutation({
    onSuccess: () => {
      setSuccess(true);
      setError("");
    },
    onError: (err) => {
      setError(err.message || "Failed to reset password");
    },
  });

  useEffect(() => {
    const params = new URLSearchParams(search);
    const tokenParam = params.get("token");
    if (tokenParam) {
      setToken(tokenParam);
    } else {
      setError("No reset token provided");
      setValidating(false);
    }
  }, [search]);

  useEffect(() => {
    if (verifyToken.data?.valid) {
      setTokenValid(true);
      setValidating(false);
    } else if (verifyToken.error) {
      setError(verifyToken.error.message || "Invalid or expired reset token");
      setValidating(false);
    }
  }, [verifyToken.data, verifyToken.error]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!newPassword.trim()) {
      setError("Please enter a new password");
      return;
    }

    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    await completeReset.mutateAsync({ token, newPassword });
  };

  if (validating) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <p className="text-center text-gray-600">驗證重設鏈接中...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!tokenValid) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle>無效的重設鏈接</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert className="bg-red-50 border-red-200">
              <AlertDescription className="text-red-800">
                {error || "此重設鏈接已過期或無效。"}
              </AlertDescription>
            </Alert>

            <Button
              className="w-full"
              onClick={() => setLocation("/forgot-password")}
            >
              申請新的重設鏈接
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle>密碼已重設</CardTitle>
            <CardDescription>您可以使用新密碼登入</CardDescription>
          </CardHeader>
          <CardContent>
            <Alert className="bg-green-50 border-green-200 mb-4">
              <AlertDescription className="text-green-800">
                您的密碼已成功重設。
              </AlertDescription>
            </Alert>

            <Button
              className="w-full"
              onClick={() => setLocation("/login")}
            >
              返回登入
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle>重設密碼</CardTitle>
          <CardDescription>輸入您的新密碼</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert className="bg-red-50 border-red-200">
                <AlertDescription className="text-red-800">{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <label htmlFor="newPassword" className="text-sm font-medium">
                新密碼
              </label>
              <Input
                id="newPassword"
                type="password"
                placeholder="至少 6 個字符"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                disabled={completeReset.isPending}
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="confirmPassword" className="text-sm font-medium">
                確認密碼
              </label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="再次輸入新密碼"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={completeReset.isPending}
              />
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={
                completeReset.isPending ||
                !newPassword.trim() ||
                !confirmPassword.trim()
              }
            >
              {completeReset.isPending ? "重設中..." : "重設密碼"}
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
