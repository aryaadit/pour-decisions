import { useRef, useCallback } from 'react';
import { cn } from '@/lib/utils';

// Match emoji characters (including compound emojis with ZWJ, skin tones, flags, etc.)
const EMOJI_REGEX = /\p{Emoji_Presentation}|\p{Emoji}\uFE0F/u;

function extractFirstEmoji(text: string): string | null {
  // Use Intl.Segmenter to properly handle compound emojis (flags, skin tones, ZWJ sequences)
  if (typeof Intl !== 'undefined' && Intl.Segmenter) {
    const segmenter = new Intl.Segmenter('en', { granularity: 'grapheme' });
    for (const { segment } of segmenter.segment(text)) {
      if (EMOJI_REGEX.test(segment)) return segment;
    }
    return null;
  }
  // Fallback: match first emoji-like character
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
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value;
      const emoji = extractFirstEmoji(raw);
      if (emoji) {
        onChange(emoji);
      }
      // Always reset the input value to just the current emoji
      // so the field never shows raw text
      e.target.value = '';
    },
    [onChange]
  );

  const handleFocus = useCallback((e: React.FocusEvent<HTMLInputElement>) => {
    // Clear input on focus so the keyboard starts fresh
    e.target.value = '';
  }, []);

  return (
    <div className={cn('relative', className)}>
      <div
        className="w-14 h-14 rounded-xl flex items-center justify-center text-3xl border border-border hover:border-primary/50 transition-colors cursor-text"
        style={backgroundColor ? { backgroundColor: `${backgroundColor}20` } : undefined}
        onClick={() => inputRef.current?.focus()}
      >
        {value || defaultEmoji}
      </div>
      <input
        ref={inputRef}
        type="text"
        inputMode="text"
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        onChange={handleChange}
        onFocus={handleFocus}
        className="absolute inset-0 w-full h-full opacity-0 cursor-text"
        aria-label="Pick an emoji"
      />
    </div>
  );
}
