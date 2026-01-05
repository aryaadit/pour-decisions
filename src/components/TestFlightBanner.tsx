import { Apple, X } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';

const TESTFLIGHT_URL = 'https://testflight.apple.com/join/ySRegsMR';

export function TestFlightBanner() {
  const [dismissed, setDismissed] = useState(() => {
    return localStorage.getItem('testflight-banner-dismissed') === 'true';
  });

  const handleDismiss = () => {
    localStorage.setItem('testflight-banner-dismissed', 'true');
    setDismissed(true);
  };

  if (dismissed) return null;

  return (
    <div className="bg-gradient-to-r from-primary/20 via-primary/10 to-primary/20 border-b border-primary/20">
      <div className="container mx-auto px-4 py-2.5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
              <Apple className="w-4 h-4 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-foreground truncate">
                Get the iOS app
                <span className="ml-2 text-xs px-1.5 py-0.5 rounded-full bg-primary/20 text-primary font-semibold">
                  BETA
                </span>
              </p>
              <p className="text-xs text-muted-foreground truncate hidden sm:block">
                Join our TestFlight beta for the best mobile experience
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button
              size="sm"
              variant="glow"
              className="text-xs h-8 px-3"
              onClick={() => window.open(TESTFLIGHT_URL, '_blank')}
            >
              Download
            </Button>
            <button
              onClick={handleDismiss}
              className="p-1.5 rounded-full hover:bg-secondary/80 text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
