"use client";

import { useEffect, useState } from "react";
import { Trophy, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface AchievementToastProps {
  title: string;
  description: string;
  onClose: () => void;
}

export function AchievementToast({ title, description, onClose }: AchievementToastProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Animate in
    const showTimeout = setTimeout(() => setIsVisible(true), 100);
    // Auto-dismiss after 5s
    const hideTimeout = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onClose, 300);
    }, 5000);

    return () => {
      clearTimeout(showTimeout);
      clearTimeout(hideTimeout);
    };
  }, [onClose]);

  return (
    <div
      className={cn(
        "fixed top-4 left-1/2 -translate-x-1/2 z-[200] transition-all duration-300",
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-4"
      )}
    >
      <div className="flex items-center gap-3 px-5 py-3 rounded-xl bg-card border border-primary/30 shadow-2xl shadow-primary/10 backdrop-blur-xl max-w-sm">
        <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center shrink-0 animate-achievement">
          <Trophy className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-foreground">Achievement Unlocked!</p>
          <p className="text-xs text-primary font-medium">{title}</p>
          <p className="text-xs text-muted-foreground truncate">{description}</p>
        </div>
        <button onClick={onClose} className="shrink-0 text-muted-foreground hover:text-foreground">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
