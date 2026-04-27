import { Home, ShoppingBag, Star, User, Bell } from "lucide-react";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";

const navItems = [
  { path: "/", label: "首页", icon: Home },
  { path: "/vip-zone", label: "商城", icon: ShoppingBag },
  { path: "/orders", label: "订单", icon: Star },
  { path: "/notifications", label: "通知", icon: Bell },
  { path: "/profile", label: "我的", icon: User },
];

export default function BottomNav() {
  const [location, navigate] = useLocation();

  return (
    <nav className="bottom-nav safe-area-pb">
      <div className="flex items-center justify-around h-16">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location === item.path || (item.path !== "/" && location.startsWith(item.path));
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={cn(
                "flex flex-col items-center gap-0.5 px-4 py-2 transition-colors",
                isActive ? "text-primary" : "text-muted-foreground"
              )}
            >
              <Icon size={22} strokeWidth={isActive ? 2.5 : 1.8} />
              <span className={cn("text-xs", isActive ? "font-semibold" : "font-normal")}>{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
