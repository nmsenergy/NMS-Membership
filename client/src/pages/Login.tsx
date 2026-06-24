import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Star, Mail, Lock, ArrowRight, Chrome } from "lucide-react";
import { getLoginUrl } from "@/const";
import { Link } from "wouter";

export default function Login() {
  const [, navigate] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [activeTab, setActiveTab] = useState<"password" | "google">("password");

  const loginWithPassword = trpc.auth.loginWithPassword.useMutation({
    onSuccess: () => {
      toast.success("登入成功！");
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

  const handleGoogleLogin = () => {
    window.location.href = getLoginUrl();
  };

  return (
    <div className="mobile-app flex flex-col items-center justify-center min-h-screen p-4 bg-gradient-to-br from-background to-muted/30">
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-full gradient-header flex items-center justify-center mx-auto mb-4">
            <Star size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-1">會員管理系統</h1>
          <p className="text-sm text-muted-foreground">登入您的帳號</p>
        </div>

        {/* Login Card */}
        <Card className="p-6 border-0 shadow-lg">
          {/* Tabs */}
          <div className="flex gap-2 mb-6 bg-muted p-1 rounded-lg">
            <button
              onClick={() => setActiveTab("password")}
              className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                activeTab === "password"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Lock size={16} className="inline mr-2" />
              密碼登入
            </button>
            <button
              onClick={() => setActiveTab("google")}
              className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                activeTab === "google"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Chrome size={16} className="inline mr-2" />
              Google
            </button>
          </div>

          {/* Password Login Tab */}
          {activeTab === "password" && (
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
                  autoFocus
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

              {/* Forgot Password Link */}
              <div className="text-right">
                <Link href="/forgot-password" className="text-xs text-primary hover:underline">
                  忘記密碼？
                </Link>
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
          )}

          {/* Google Login Tab */}
          {activeTab === "google" && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground text-center">
                使用您的 Google 帳號登入會員系統
              </p>
              <Button
                type="button"
                className="w-full h-10"
                onClick={handleGoogleLogin}
              >
                <Chrome size={18} className="mr-2" />
                使用 Google 帳號登入
              </Button>
            </div>
          )}
        </Card>

        {/* Footer Info */}
        <p className="text-xs text-muted-foreground text-center mt-6">
          首次登入？請先完成會員註冊
        </p>
      </div>
    </div>
  );
}
