import { ArrowLeft, Home } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  helperText?: string;
  icon?: ReactNode;
  showBack?: boolean;
  showHome?: boolean;
  rightContent?: ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  subtitle,
  helperText,
  icon,
  showBack = true,
  showHome = false,
  rightContent,
  className,
}: PageHeaderProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const handleBack = () => {
    // If we're at a top-level page, go home
    if (location.key === 'default' || window.history.length <= 2) {
      navigate('/');
    } else {
      navigate(-1);
    }
  };

  const handleHome = () => {
    navigate('/');
  };

  return (
    <header className={cn(
      "sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b pt-[env(safe-area-inset-top)]",
      className
    )}>
      <div className="max-w-2xl mx-auto px-4 py-3">
        <div className="flex items-center gap-3">
          {/* Back/Home Button */}
          {showBack && (
            <Button variant="ghost" size="icon" onClick={handleBack}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )}
          {showHome && !showBack && (
            <Button variant="ghost" size="icon" onClick={handleHome}>
              <Home className="h-5 w-5" />
            </Button>
          )}

          {/* Title Section */}
          <div className="flex-1 flex items-center gap-2 min-w-0">
            {icon}
            <div className="min-w-0">
              <h1 className="text-lg font-semibold text-foreground truncate">{title}</h1>
              {subtitle && (
                <p className="text-xs text-muted-foreground truncate">{subtitle}</p>
              )}
            </div>
          </div>

          {/* Right Content */}
          {rightContent}
        </div>
        
        {/* Helper Text */}
        {helperText && (
          <p className="text-xs text-muted-foreground mt-2 pl-11">{helperText}</p>
        )}
      </div>
    </header>
  );
}

export default PageHeader;
