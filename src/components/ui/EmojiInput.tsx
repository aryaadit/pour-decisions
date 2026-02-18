import { useState, useRef, useCallback, useEffect } from 'react';
import { cn } from '@/lib/utils';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';

// Match emoji characters (including compound emojis with ZWJ, skin tones, flags, etc.)
const EMOJI_REGEX = /\p{Emoji_Presentation}|\p{Emoji}\uFE0F/u;

function extractFirstEmoji(text: string): string | null {
  if (typeof Intl !== 'undefined' && Intl.Segmenter) {
    const segmenter = new Intl.Segmenter('en', { granularity: 'grapheme' });
    for (const { segment } of segmenter.segment(text)) {
      if (EMOJI_REGEX.test(segment)) return segment;
    }
    return null;
  }
  const match = text.match(EMOJI_REGEX);
  return match ? match[0] : null;
}

interface EmojiInputProps {
  value: string;
  onChange: (emoji: string) => void;
  defaultEmoji?: string;
  backgroundColor?: string;
  className?: string;
}

export function EmojiInput({
  value,
  onChange,
  defaultEmoji = '🍸',
  backgroundColor,
  className,
}: EmojiInputProps) {
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus the input when the drawer opens
  useEffect(() => {
    if (open) {
      // Small delay to let the drawer animate in before focusing
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [open]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value;
      const emoji = extractFirstEmoji(raw);
      if (emoji) {
        onChange(emoji);
        setOpen(false);
      }
      e.target.value = '';
    },
    [onChange]
  );

  const display = value || defaultEmoji;

  return (
    <>
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          'w-14 h-14 rounded-xl flex items-center justify-center text-3xl border border-border hover:border-primary/50 transition-colors relative group',
          className
        )}
        style={backgroundColor ? { backgroundColor: `${backgroundColor}20` } : undefined}
      >
        {display}
        <span className="absolute bottom-0.5 right-0.5 w-4 h-4 rounded-full bg-muted/80 flex items-center justify-center text-[10px] opacity-60 group-hover:opacity-100 transition-opacity">
          ✏️
        </span>
      </button>

      {/* Bottom sheet for emoji selection */}
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent className="max-h-[50vh]">
          <DrawerHeader className="pb-2">
            <DrawerTitle className="text-center text-lg">Pick an emoji</DrawerTitle>
          </DrawerHeader>
          <div className="flex flex-col items-center gap-4 px-6 pb-8">
            {/* Large emoji preview */}
            <div
              className="w-20 h-20 rounded-2xl flex items-center justify-center text-5xl border-2 border-primary/30 bg-primary/5"
              style={backgroundColor ? { backgroundColor: `${backgroundColor}15` } : undefined}
            >
              {display}
            </div>

            {/* Hint text */}
            <p className="text-sm text-muted-foreground">
              Tap the emoji keyboard to choose
            </p>

            {/* Hidden input that receives keyboard focus */}
            <input
              ref={inputRef}
              type="text"
              inputMode="text"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              onChange={handleChange}
              className="w-16 h-12 text-center text-3xl bg-secondary/50 rounded-xl border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none caret-transparent"
              placeholder="😀"
              aria-label="Pick an emoji"
            />
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}
