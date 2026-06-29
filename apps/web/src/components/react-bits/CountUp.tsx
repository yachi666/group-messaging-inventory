import { useInView, useMotionValue, useSpring } from 'motion/react';
import { useCallback, useEffect, useRef } from 'react';

type CountUpProps = {
  className?: string;
  delay?: number;
  duration?: number;
  from?: number;
  separator?: string;
  to: number;
};

// Adapted from React Bits CountUp for the dashboard's restrained number reveals.
export function CountUp({ className, delay = 0, duration = 1.4, from = 0, separator = ',', to }: CountUpProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const motionValue = useMotionValue(from);
  const springValue = useSpring(motionValue, {
    damping: 20 + 40 / duration,
    stiffness: 100 / duration,
  });
  const isInView = useInView(ref, { once: true });
  const format = useCallback((value: number) => Math.round(value).toLocaleString('en-US', {
    useGrouping: Boolean(separator),
  }).replace(/,/g, separator), [separator]);

  useEffect(() => {
    if (!isInView) return undefined;
    const timeout = window.setTimeout(() => motionValue.set(to), delay * 1000);
    return () => window.clearTimeout(timeout);
  }, [delay, isInView, motionValue, to]);

  useEffect(() => {
    const unsubscribe = springValue.on('change', (latest) => {
      if (ref.current) ref.current.textContent = format(latest);
    });
    return unsubscribe;
  }, [format, springValue]);

  return <span className={className} ref={ref}>{format(from)}</span>;
}
