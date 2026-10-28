import { useRef } from 'react';

export function useLenis<T extends HTMLElement>(
  _options?: { wrapper?: T | null; content?: T | null; lerp?: number; duration?: number }
) {
  // Native browser compositor scrolling provides 0ms input latency and 0% idle CPU usage.
  const lenisRef = useRef<any>(null);
  return lenisRef;
}
