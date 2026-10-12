import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';

export interface TooltipProps {
  text: string;
  children: React.ReactNode;
  delay?: number;   // ms, default 400
  side?: 'top' | 'bottom' | 'left' | 'right';  // default 'top'
  className?: string;
  style?: React.CSSProperties;
}

export const Tooltip: React.FC<TooltipProps> = ({
  text,
  children,
  delay = 400,
  side = 'top',
  className = '',
  style
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [currentSide, setCurrentSide] = useState<'top' | 'bottom' | 'left' | 'right'>(side);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLSpanElement | null>(null);
  const panelRef = useRef<HTMLSpanElement | null>(null);

  const clearTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const handleMouseEnter = () => {
    if (!text) return;
    clearTimer();
    timerRef.current = setTimeout(() => {
      setIsVisible(true);
    }, delay);
  };

  const handleMouseLeave = () => {
    clearTimer();
    setIsVisible(false);
  };

  const handleClick = () => {
    clearTimer();
    setIsVisible(false);
  };

  // Synchronous positioning and edge clamping before browser paint
  useLayoutEffect(() => {
    if (!isVisible || !panelRef.current || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const pRect = panelRef.current.getBoundingClientRect();
    const padding = 10;
    const margin = 6;
    const vWidth = window.innerWidth;
    const vHeight = window.innerHeight;

    let chosenSide = side;

    // 1. Flip top/bottom if necessary
    if (side === 'top' && rect.top - pRect.height - margin < padding) {
      chosenSide = 'bottom';
    } else if (side === 'bottom' && rect.bottom + pRect.height + margin > vHeight - padding) {
      chosenSide = 'top';
    }

    // 2. Flip left/right if necessary
    if (chosenSide === 'left' && rect.left - pRect.width - margin < padding) {
      chosenSide = 'right';
    } else if (chosenSide === 'right' && rect.right + pRect.width + margin > vWidth - padding) {
      chosenSide = 'left';
    }

    setCurrentSide(chosenSide);

    let top = 0;
    let left = 0;

    if (chosenSide === 'top') {
      top = rect.top - pRect.height - margin;
      left = (rect.left + rect.width / 2) - pRect.width / 2;
    } else if (chosenSide === 'bottom') {
      top = rect.bottom + margin;
      left = (rect.left + rect.width / 2) - pRect.width / 2;
    } else if (chosenSide === 'left') {
      top = (rect.top + rect.height / 2) - pRect.height / 2;
      left = rect.left - pRect.width - margin;
    } else if (chosenSide === 'right') {
      top = (rect.top + rect.height / 2) - pRect.height / 2;
      left = rect.right + margin;
    }

    // 3. HARD VIEWPORT CLAMPING: guarantees panel is NEVER cut in half or clipped
    const clampedLeft = Math.max(padding, Math.min(vWidth - pRect.width - padding, left));
    const clampedTop = Math.max(padding, Math.min(vHeight - pRect.height - padding, top));

    panelRef.current.style.top = `${Math.round(clampedTop)}px`;
    panelRef.current.style.left = `${Math.round(clampedLeft)}px`;
    panelRef.current.style.visibility = 'visible';
    panelRef.current.style.opacity = '1';
  }, [isVisible, text, side]);

  // Support automated testing query param ?tooltip=
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const target = new URLSearchParams(window.location.search).get('tooltip');
    if (target && text.toLowerCase().includes(target.toLowerCase())) {
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [text]);

  // Dismiss tooltip on window scroll or resize to prevent detached floating
  useEffect(() => {
    if (!isVisible) return;
    const handleDismiss = () => setIsVisible(false);
    window.addEventListener('scroll', handleDismiss, true);
    window.addEventListener('resize', handleDismiss);
    return () => {
      window.removeEventListener('scroll', handleDismiss, true);
      window.removeEventListener('resize', handleDismiss);
    };
  }, [isVisible]);

  useEffect(() => {
    return () => clearTimer();
  }, []);

  if (!text) {
    return <>{children}</>;
  }

  return (
    <span
      ref={containerRef}
      className={`themed-tooltip-wrapper ${className}`}
      style={style}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
    >
      {children}
      {isVisible && typeof document !== 'undefined' && createPortal(
        <span
          ref={panelRef}
          className={`themed-tooltip-panel side-${currentSide}`}
          style={{
            position: 'fixed',
            visibility: 'hidden',
            opacity: 0,
            transform: 'none',
            margin: 0,
            zIndex: 99999
          }}
          role="tooltip"
        >
          {text}
        </span>,
        document.body
      )}
    </span>
  );
};
