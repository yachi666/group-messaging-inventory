import { useRef, type MouseEventHandler, type PropsWithChildren } from 'react';

type SpotlightCardProps = PropsWithChildren<{
  className?: string;
  spotlightColor?: string;
}>;

// Adapted from React Bits SpotlightCard; styling lives with the page design system.
export function SpotlightCard({ children, className = '', spotlightColor = 'rgba(116, 89, 238, .1)' }: SpotlightCardProps) {
  const cardRef = useRef<HTMLElement>(null);
  const handlePointerMove: MouseEventHandler<HTMLElement> = (event) => {
    const card = cardRef.current;
    if (!card) return;
    const bounds = card.getBoundingClientRect();
    card.style.setProperty('--spotlight-x', `${event.clientX - bounds.left}px`);
    card.style.setProperty('--spotlight-y', `${event.clientY - bounds.top}px`);
    card.style.setProperty('--spotlight-color', spotlightColor);
  };

  return <article className={`statistics-spotlight ${className}`} onMouseMove={handlePointerMove} ref={cardRef}>{children}</article>;
}
