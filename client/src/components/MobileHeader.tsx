import { ChevronLeft } from "lucide-react";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";

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
  const [, navigate] = useLocation();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      window.history.back();
    }
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
        <button onClick={handleBack} className="p-1 -ml-1 text-foreground">
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
