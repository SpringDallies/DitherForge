import Lenis from 'lenis';
import 'lenis/dist/lenis.css';
import { useEffect, useRef, useState } from 'react';
import { getStoredSettings, DitherForgeSettings } from '../components/dialogs/SettingsDialog';

export type TargetElement<T extends HTMLElement> =
  | T
  | React.RefObject<T | null | undefined>
  | null
  | undefined;

export interface UseLenisOptions<T extends HTMLElement = HTMLElement> {
  wrapper?: TargetElement<T>;
  content?: TargetElement<T>;
  lerp?: number;
  duration?: number;
  wheelMultiplier?: number;
  touchMultiplier?: number;
  smoothWheel?: boolean;
  syncTouch?: boolean;
}

function resolveElement<T extends HTMLElement>(target?: TargetElement<T>): T | null {
  if (!target) return null;
  if (typeof target === 'object' && 'current' in target) {
    return (target.current as T) ?? null;
  }
  return target as T;
}

export function useLenis<T extends HTMLElement = HTMLElement>(
  options?: UseLenisOptions<T>
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
    // If smooth scrolling is disabled in settings, clean up and do not initialize Lenis
    if (settings.smoothScroll === false) {
      if (lenisRef.current) {
        lenisRef.current.destroy();
        lenisRef.current = null;
      }
      return;
    }

    const wrapper = resolveElement(options?.wrapper);
    const content = resolveElement(options?.content);

    // If options.wrapper was specified but the element is not available yet, wait.
    if (options && 'wrapper' in options && !wrapper) {
      return;
    }

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Use pure LERP mode for ultra-responsive, 0ms input latency and silky smooth glide.
    // Clamp tightness to optimal smooth dampening (0.05 to 0.45).
    const currentTightness = options?.lerp ?? settings.scrollTightness ?? 0.25;
    const effectiveLerp = prefersReducedMotion ? 1 : Math.max(0.04, Math.min(0.45, currentTightness * 0.5));

    const lenis = new Lenis({
      wrapper: wrapper ?? undefined,
      content: content ?? undefined,
      autoRaf: true,
      lerp: effectiveLerp,
      smoothWheel: !prefersReducedMotion,
      wheelMultiplier: options?.wheelMultiplier ?? 1.0,
      syncTouch: false,
      overscroll: true,
    });
    lenisRef.current = lenis;

    return () => {
      lenis.destroy();
      lenisRef.current = null;
    };
  }, [
    options?.wrapper,
    options?.content,
    options?.wheelMultiplier,
    settings.smoothScroll
  ]);

  // Dynamically update Lenis tuning parameters without rebuilding the instance
  useEffect(() => {
    if (!lenisRef.current || settings.smoothScroll === false) return;

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const currentTightness = options?.lerp ?? settings.scrollTightness ?? 0.25;
    const effectiveLerp = prefersReducedMotion ? 1 : Math.max(0.04, Math.min(0.45, currentTightness * 0.5));

    lenisRef.current.options.lerp = effectiveLerp;
    lenisRef.current.options.smoothWheel = !prefersReducedMotion;
  }, [settings.scrollTightness, settings.smoothScroll, options?.lerp]);

  return lenisRef;
}
