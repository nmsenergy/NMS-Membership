import { ChevronLeft, ArrowLeftRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAdminView } from "@/contexts/AdminContext";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";
import { useLocation } from "wouter";

interface MobileHeaderProps {
  title: string;
  showBack?: boolean;
  onBack?: () => void;
  rightElement?: React.ReactNode;
  className?: string;
  transparent?: boolean;
}

export default function MobileHeader({
  title,
  showBack = true,
  onBack,
  rightElement,
  className,
  transparent = false,
}: MobileHeaderProps) {
  const { showAdminView, setCurrentAdminPage } = useAdminView();
  const { user } = useAuth();
  const { data: switchData, refetch } = trpc.member.getSwitchableAccounts.useQuery(undefined, {
    enabled: !!user && !showAdminView,
  });
  const switchAccount = trpc.member.switchAccount.useMutation({
    onSuccess: () => {
      refetch();
      toast.success("已切换回自己的账户");
      // Navigate to home first, then reload to refresh all cached data
      navigate("/");
      setTimeout(() => window.location.reload(), 100);
    },
  });

  const [, navigate] = useLocation();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (showAdminView) {
      setCurrentAdminPage("dashboard");
    } else {
      // Navigate back to home for member-facing pages
      navigate("/");
    }
  };

  const isSwitched = !!switchData?.switchedTo;

  return (
    <div className="sticky top-0 z-40">
      <header
        className={cn(
          "flex items-center h-14 px-4",
          transparent ? "bg-transparent" : "bg-background border-b border-border",
          className
        )}
      >
        {showBack && (
          <button
            onClick={handleBack}
            className="p-1 -ml-1 text-foreground hover:bg-muted rounded transition-colors"
          >
            <ChevronLeft size={24} />
          </button>
        )}
        <h1 className={cn("flex-1 text-center font-semibold text-base", showBack ? "" : "ml-0")}>
          {title}
        </h1>
        <div className="w-8">{rightElement}</div>
      </header>

      {/* Switched-account banner */}
      {isSwitched && !showAdminView && (
        <div className="bg-amber-500 text-white px-4 py-1.5 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5">
            <ArrowLeftRight size={13} />
            <span>
              正在查看：<strong>{switchData.switchedTo?.referralCode}</strong>（{switchData.switchedTo?.rank}）
            </span>
          </div>
          <button
            onClick={() => switchAccount.mutate({ targetMemberId: null })}
            disabled={switchAccount.isPending}
            className="bg-white/20 hover:bg-white/30 rounded px-2 py-0.5 font-medium transition-colors"
          >
            {switchAccount.isPending ? "..." : "返回自己"}
          </button>
        </div>
      )}
    </div>
  );
}
