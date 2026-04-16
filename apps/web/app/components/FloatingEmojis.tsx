'use client';

const ITEMS: {
  emoji: string;
  className: string;
  delay: string;
  keepOnMobile?: boolean;
  animateOnMobile?: boolean;
}[] = [
  {
    emoji: '🌟',
    className: 'left-[4%] top-[12%] text-3xl sm:text-4xl',
    delay: '0s',
    keepOnMobile: true,
    animateOnMobile: true,
  },
  {
    emoji: '✨',
    className: 'right-[8%] top-[18%] text-2xl sm:text-3xl',
    delay: '0.3s',
    keepOnMobile: true,
    animateOnMobile: true,
  },
  { emoji: '💚', className: 'left-[12%] bottom-[22%] text-3xl', delay: '0.6s' },
  { emoji: '🧒', className: 'right-[14%] bottom-[28%] text-4xl', delay: '0.2s' },
  { emoji: '👨‍👩‍👧', className: 'left-[40%] top-[8%] text-3xl hidden sm:block', delay: '0.9s' },
  { emoji: '📚', className: 'right-[28%] top-[38%] text-2xl', delay: '0.5s' },
  { emoji: '🎮', className: 'left-[22%] top-[44%] hidden text-2xl sm:block', delay: '0.7s' },
  { emoji: '💪', className: 'right-[6%] top-[52%] hidden text-3xl sm:block', delay: '0.4s' },
  { emoji: '🧠', className: 'left-[6%] top-[58%] hidden text-3xl sm:block', delay: '1s' },
  { emoji: '❤️', className: 'right-[38%] bottom-[14%] text-3xl', delay: '0.8s' },
];

export function FloatingEmojis(): React.ReactElement {
  return (
    <div
      className="pointer-events-none absolute inset-0 z-[2] overflow-hidden"
      aria-hidden
    >
      {ITEMS.map((item) => (
        <span
          key={item.emoji + item.className}
          className={`absolute select-none opacity-80 ${
            item.keepOnMobile ? 'inline sm:inline' : 'hidden sm:inline'
          } ${item.animateOnMobile ? 'animate-float-drift' : 'sm:animate-float-drift'} ${
            item.className
          }`}
          style={{
            animationDelay: item.delay,
            animationDuration: '7s',
          }}
        >
          {item.emoji}
        </span>
      ))}
    </div>
  );
}
