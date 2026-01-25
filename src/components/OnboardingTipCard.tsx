import { X, Lightbulb, ArrowRight, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ReactNode } from 'react';

interface OnboardingTipCardProps {
  title: string;
  description: string;
  icon?: ReactNode;
  actionLabel?: string;
  onAction?: () => void;
  onDismiss: () => void;
  variant?: 'default' | 'highlight';
  className?: string;
}

export function OnboardingTipCard({
  title,
  description,
  icon,
  actionLabel,
  onAction,
  onDismiss,
  variant = 'default',
  className,
}: OnboardingTipCardProps) {
  return (
    <div 
      className={cn(
        "relative rounded-xl border p-4 animate-fade-in",
        variant === 'highlight' 
          ? "bg-primary/10 border-primary/30" 
          : "bg-muted/50 border-border",
        className
      )}
    >
      {/* Dismiss button */}
      <button
        onClick={onDismiss}
        className="absolute top-2 right-2 p-1.5 rounded-full hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
        aria-label="Dismiss tip"
      >
        <X className="w-4 h-4" />
      </button>

      <div className="flex gap-3">
        {/* Icon */}
        <div className={cn(
          "flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center",
          variant === 'highlight' 
            ? "bg-primary/20 text-primary" 
            : "bg-muted text-muted-foreground"
        )}>
          {icon || <Lightbulb className="w-5 h-5" />}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 pr-6">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-foreground text-sm">{title}</h3>
            <Sparkles className="w-3.5 h-3.5 text-primary animate-pulse" />
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {description}
          </p>

          {/* Action button */}
          {actionLabel && onAction && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onAction}
              className="mt-2 -ml-2 text-primary hover:text-primary"
            >
              {actionLabel}
              <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
