import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import MobileHeader from "@/components/MobileHeader";
import { toast } from "sonner";
import { Users } from "lucide-react";

export default function Register() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const [phone, setPhone] = useState("");
  const [birthday, setBirthday] = useState("");
  const [referralCode, setReferralCode] = useState("");

  const utils = trpc.useUtils();
  const register = trpc.member.register.useMutation({
    onSuccess: () => {
      toast.success("注册成功！欢迎加入会员系统");
      utils.auth.me.invalidate();
      navigate("/");
    },
    onError: (err) => toast.error(err.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!referralCode.trim()) {
      toast.error("请输入推荐人码");
      return;
    }
    register.mutate({ phone, birthday: birthday || undefined, referralCode });
  };

  if (!user) {
    return (
      <div className="mobile-app flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">请先登录</p>
      </div>
    );
  }

  return (
    <div className="mobile-app">
      <MobileHeader title="会员注册" showBack={false} />
      <div className="px-4 py-6">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-full gradient-header flex items-center justify-center mx-auto mb-3">
            <Users size={28} className="text-white" />
          </div>
          <h2 className="text-xl font-bold">完善会员资料</h2>
          <p className="text-sm text-muted-foreground mt-1">填写以下信息完成注册</p>
        </div>
        <Card className="p-5 rounded-2xl border-0 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="phone" className="text-sm font-medium">手机号码</Label>
              <Input id="phone" type="tel" placeholder="请输入手机号码" value={phone} onChange={(e) => setPhone(e.target.value)} className="mt-1.5" />
            </div>
            <div>
              <Label htmlFor="birthday" className="text-sm font-medium">生日日期 <span className="text-muted-foreground font-normal">(用于生日优惠)</span></Label>
              <Input id="birthday" type="date" value={birthday} onChange={(e) => setBirthday(e.target.value)} className="mt-1.5" />
            </div>
            <div>
              <Label htmlFor="referralCode" className="text-sm font-medium">推荐人码 <span className="text-red-500">*必填</span></Label>
              <Input id="referralCode" placeholder="请输入推荐人的推荐码" value={referralCode} onChange={(e) => setReferralCode(e.target.value.toUpperCase())} className="mt-1.5" />
            </div>
            <Button type="submit" className="w-full mt-6" disabled={register.isPending || !referralCode.trim()}>
              {register.isPending ? "注册中..." : "立即注册"}
            </Button>
          </form>
        </Card>
        <p className="text-xs text-muted-foreground text-center mt-4">注册即表示您同意我们的服务条款</p>
      </div>
    </div>
  );
}
