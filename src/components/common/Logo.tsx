import React from 'react';

export interface LogoProps {
  variant?: 'mark' | 'wordmark' | 'full';
  size?: number; // default 20
  animated?: boolean;
  className?: string;
}

export const Logo: React.FC<LogoProps> = ({
  variant = 'mark',
  size = 20,
  animated = false,
  className = '',
}) => {
  return (
    <img
      src="/assets/logo-mark.png"
      alt="DitherForge"
      className={`logo-mark ${animated ? 'logo-animated' : ''} ${className}`}
      style={{ height: `${size}px`, width: 'auto', display: 'block' }}
    />
  );
};
