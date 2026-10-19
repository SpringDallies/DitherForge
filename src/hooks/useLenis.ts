import Lenis from 'lenis';
import { useEffect, useRef, useState } from 'react';
import { getStoredSettings, DitherForgeSettings } from '../components/dialogs/SettingsDialog';

export function useLenis<T extends HTMLElement>(
  options?: { wrapper?: T | null; content?: T | null; lerp?: number; duration?: number }
) {
  const lenisRef = useRef<Lenis | null>(null);
  const [settings, setSettings] = useState<DitherForgeSettings>(getStoredSettings);

  useEffect(() => {
    const handleSettingsChange = (e: Event) => {
      const customEvent = e as CustomEvent<DitherForgeSettings>;
      if (customEvent.detail) {
        setSettings(customEvent.detail);
      } else {
        setSettings(getStoredSettings());
      }
    };

    window.addEventListener('ditherforge_settings_changed', handleSettingsChange);
    return () => {
      window.removeEventListener('ditherforge_settings_changed', handleSettingsChange);
    };
  }, []);

  useEffect(() => {
    // If wrapper option is present but not yet attached (null), wait until ref is populated.
    if (options && 'wrapper' in options && !options.wrapper) {
      return;
    }

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const effectiveLerp = options?.lerp ?? settings.scrollTightness ?? 0.22;
    const effectiveDuration = options?.duration ?? settings.scrollDuration ?? 0.45;

    const lenis = new Lenis({
      wrapper: options?.wrapper ?? undefined,
      content: options?.content ?? undefined,
      lerp: prefersReducedMotion ? 1 : effectiveLerp,
      duration: prefersReducedMotion ? 0 : effectiveDuration,
      smoothWheel: !prefersReducedMotion,
      wheelMultiplier: 0.9,
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
  }, [options?.wrapper, options?.content, options?.lerp, options?.duration, settings.scrollTightness, settings.scrollDuration]);

  return lenisRef;
}
