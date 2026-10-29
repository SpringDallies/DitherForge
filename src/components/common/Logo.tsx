import React from 'react';
import { useAppStore } from '../../state/useAppStore';

export interface LogoProps {
  variant?: 'mark' | 'wordmark' | 'full';
  size?: number; // default 20
  animated?: boolean;
  className?: string;
}

const BASE = import.meta.env.BASE_URL;

export const THEME_LOGO_MAP: Record<string, string> = {
  light_pro: `${BASE}assets/themes/light_pro.webp`,
  dark_pro: `${BASE}assets/themes/dark_pro.webp`,
  nord: `${BASE}assets/themes/nord.webp`,
  evergreen: `${BASE}assets/themes/evergreen.webp`,
  gruvbox: `${BASE}assets/themes/gruvbox.webp`,
  catppuccin_mocha: `${BASE}assets/themes/catppuccin_mocha.webp`,
  tokyo_night: `${BASE}assets/themes/tokyo_night.webp`,
  solarized_dark: `${BASE}assets/themes/solarized_dark.webp`,
  one_dark: `${BASE}assets/themes/one_dark.webp`,
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
