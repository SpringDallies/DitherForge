import Lenis from 'lenis';
import { useEffect, useRef } from 'react';

export function useLenis<T extends HTMLElement>(
  options?: { wrapper?: T | null; content?: T | null; lerp?: number; duration?: number }
) {
  const lenisRef = useRef<Lenis | null>(null);

  useEffect(() => {
    // If wrapper option is present but not yet attached (null), wait until ref is populated.
    if (options && 'wrapper' in options && !options.wrapper) {
      return;
    }

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const lenis = new Lenis({
      wrapper: options?.wrapper ?? undefined,
      content: options?.content ?? undefined,
      lerp: prefersReducedMotion ? 1 : (options?.lerp ?? 0.1),
      duration: prefersReducedMotion ? 0 : (options?.duration ?? 1.2),
      smoothWheel: !prefersReducedMotion,
      syncTouch: false,
    });
    lenisRef.current = lenis;

    let rafId: number;
    function raf(time: number) {
      lenis.raf(time);
      rafId = requestAnimationFrame(raf);
    }
    rafId = requestAnimationFrame(raf);

    return () => {
      cancelAnimationFrame(rafId);
      lenis.destroy();
      lenisRef.current = null;
    };
  }, [options?.wrapper, options?.content, options?.lerp, options?.duration]);

  return lenisRef;
}
