import React from 'react';
import { useAppStore } from '../../state/useAppStore';

export interface LogoProps {
  variant?: 'mark' | 'wordmark' | 'full';
  size?: number; // default 20
  animated?: boolean;
  className?: string;
}

export const THEME_LOGO_MAP: Record<string, string> = {
  light_pro: '/assets/themes/light_pro.webp',
  dark_pro: '/assets/themes/dark_pro.webp',
  nord: '/assets/themes/nord.webp',
  evergreen: '/assets/themes/evergreen.webp',
  gruvbox: '/assets/themes/gruvbox.webp',
  catppuccin_mocha: '/assets/themes/catppuccin_mocha.webp',
  tokyo_night: '/assets/themes/tokyo_night.webp',
  solarized_dark: '/assets/themes/solarized_dark.webp',
  one_dark: '/assets/themes/one_dark.webp',
};

export const Logo: React.FC<LogoProps> = ({
  size = 210,
  animated = false,
  className = '',
}) => {
  const activeTheme = useAppStore((state) => state.activeTheme);
  const logoSrc = THEME_LOGO_MAP[activeTheme] || THEME_LOGO_MAP.dark_pro;

  return (
    <img
      src={logoSrc}
      alt="DitherForge"
      className={`logo-mark ${animated ? 'logo-animated' : ''} ${className}`}
      style={{ height: `${size}px`, width: 'auto', display: 'block' }}
    />
  );
};
