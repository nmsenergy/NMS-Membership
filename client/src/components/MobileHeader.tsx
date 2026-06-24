import { ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAdminView } from "@/contexts/AdminContext";

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

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (showAdminView) {
      // In admin view, go back to admin dashboard
      setCurrentAdminPage("dashboard");
    }
    // If not in admin view and no onBack, do nothing (avoid navigate which triggers unload)
  };

  return (
    <header
      className={cn(
        "flex items-center h-14 px-4 sticky top-0 z-40",
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
  );
}
