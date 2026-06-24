import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Star, Mail, Lock, ArrowRight } from "lucide-react";
import { getLoginUrl } from "@/const";

export default function Login() {
  const [, navigate] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [useOAuth, setUseOAuth] = useState(false);

  const loginWithPassword = trpc.auth.loginWithPassword.useMutation({
    onSuccess: () => {
      toast.success("登入成功！");
      // Refresh auth state and redirect to home
      setTimeout(() => {
        window.location.href = "/";
      }, 500);
    },
    onError: (e) => {
      toast.error(e.message || "登入失敗，請檢查郵箱和密碼");
    },
  });

  const handlePasswordLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("請輸入郵箱和密碼");
      return;
    }
    loginWithPassword.mutate({ email, password });
  };

  if (useOAuth) {
    return (
      <div className="mobile-app flex flex-col items-center justify-center min-h-screen p-8">
        <div className="text-center mb-8">
          <div className="w-20 h-20 rounded-full gradient-header flex items-center justify-center mx-auto mb-4">
            <Star size={36} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">會員管理系統</h1>
          <p className="text-muted-foreground text-sm">正在跳轉到 Manus 登入...</p>
        </div>
        <Button
          className="w-full max-w-xs"
          onClick={() => { window.location.href = getLoginUrl(); }}
        >
          使用 Manus 帳號登入
        </Button>
        <Button
          variant="ghost"
          className="mt-4"
          onClick={() => setUseOAuth(false)}
        >
          返回密碼登入
        </Button>
      </div>
    );
  }

  return (
    <div className="mobile-app flex flex-col items-center justify-center min-h-screen p-4 bg-gradient-to-br from-background to-muted/30">
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-full gradient-header flex items-center justify-center mx-auto mb-4">
            <Star size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-1">會員管理系統</h1>
          <p className="text-sm text-muted-foreground">使用密碼登入您的帳號</p>
        </div>

        {/* Login Form */}
        <Card className="p-6 border-0 shadow-lg">
          <form onSubmit={handlePasswordLogin} className="space-y-4">
            {/* Email Input */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">
                <div className="flex items-center gap-2 mb-1">
                  <Mail size={16} className="text-primary" />
                  郵箱地址
                </div>
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loginWithPassword.isPending}
                className="h-10"
              />
            </div>

            {/* Password Input */}
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium">
                <div className="flex items-center gap-2 mb-1">
                  <Lock size={16} className="text-primary" />
                  密碼
                </div>
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="輸入您的密碼"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loginWithPassword.isPending}
                className="h-10"
              />
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full h-10 mt-6"
              disabled={loginWithPassword.isPending}
            >
              {loginWithPassword.isPending ? (
                <>
                  <span className="animate-spin mr-2">⏳</span>
                  登入中...
                </>
              ) : (
                <>
                  登入
                  <ArrowRight size={16} className="ml-2" />
                </>
              )}
            </Button>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">或</span>
            </div>
          </div>

          {/* OAuth Button */}
          <Button
            type="button"
            variant="outline"
            className="w-full h-10"
            onClick={() => setUseOAuth(true)}
          >
            使用 Manus 帳號登入
          </Button>
        </Card>

        {/* Footer Info */}
        <p className="text-xs text-muted-foreground text-center mt-6">
          首次登入？請先完成會員註冊
        </p>
      </div>
    </div>
  );
}
