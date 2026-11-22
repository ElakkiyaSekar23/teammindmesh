import { useEffect, useState } from 'react';
import { useReducedMotion as useMotionReduced } from 'motion/react';

export function usePrefersReducedMotion(): boolean {
  const motionPrefers = useMotionReduced();
  const [mediaPrefers, setMediaPrefers] = useState<boolean>(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setMediaPrefers(mq.matches);
    update();
    if (typeof mq.addEventListener === 'function') {
      mq.addEventListener('change', update);
      return () => mq.removeEventListener('change', update);
    }
    mq.addListener(update);
    return () => mq.removeListener(update);
  }, []);

  return Boolean(motionPrefers || mediaPrefers);
}
