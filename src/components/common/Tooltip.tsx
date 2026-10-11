import React, { useState, useRef, useEffect } from 'react';

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
  const [effectiveSide, setEffectiveSide] = useState<'top' | 'bottom' | 'left' | 'right'>(side);
  const [panelStyle, setPanelStyle] = useState<React.CSSProperties>({});
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLSpanElement | null>(null);

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
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        // If near top of viewport, flip below
        let chosenSide = side;
        if (side === 'top' && rect.top < 45) {
          chosenSide = 'bottom';
        } else if (side === 'bottom' && rect.bottom > window.innerHeight - 45) {
          chosenSide = 'top';
        }
        setEffectiveSide(chosenSide);

        // Boundary check against closest scroll/boundary container or viewport
        const boundaryEl = containerRef.current.closest('.sidebar-scrollable-content, .center-viewport, .app-container') || document.body;
        const bRect = boundaryEl.getBoundingClientRect();
        const distFromLeft = rect.left - bRect.left;
        const distFromRight = bRect.right - rect.right;

        const customStyle: React.CSSProperties = {};
        if (chosenSide === 'top' || chosenSide === 'bottom') {
          if (distFromLeft < 140) {
            customStyle.left = '0';
            customStyle.transform = 'none';
          } else if (distFromRight < 140) {
            customStyle.left = 'auto';
            customStyle.right = '0';
            customStyle.transform = 'none';
          }
        }
        setPanelStyle(customStyle);
      }
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
      {isVisible && (
        <span 
          className={`themed-tooltip-panel side-${effectiveSide}`}
          style={panelStyle}
          role="tooltip"
        >
          {text}
        </span>
      )}
    </span>
  );
};
