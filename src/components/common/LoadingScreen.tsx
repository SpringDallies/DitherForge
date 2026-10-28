import React from 'react';
import { useAppStore } from '../../state/useAppStore';

export interface LoadingScreenProps {
  fullscreen?: boolean; // default false
  withLogo?: boolean;   // default true
}

// Per-theme logo config: dark themes use the dark logo, light themes use the light logo.
// Filters removed to prevent load-time glow flash.
const THEME_LOGO_CONFIG: Record<string, { src: string; filter: string }> = {
  dark_pro: {
    src: '/assets/themes/dark_pro.webp',
    filter: 'none',
  },
  nord: {
    src: '/assets/themes/nord.webp',
    filter: 'none',
  },
  evergreen: {
    src: '/assets/themes/evergreen.webp',
    filter: 'none',
  },
  gruvbox: {
    src: '/assets/themes/gruvbox.webp',
    filter: 'none',
  },
  catppuccin_mocha: {
    src: '/assets/themes/catppuccin_mocha.webp',
    filter: 'none',
  },
  tokyo_night: {
    src: '/assets/themes/tokyo_night.webp',
    filter: 'none',
  },
  solarized_dark: {
    src: '/assets/themes/solarized_dark.webp',
    filter: 'none',
  },
  one_dark: {
    src: '/assets/themes/one_dark.webp',
    filter: 'none',
  },
  light_pro: {
    src: '/assets/themes/light_pro.webp',
    filter: 'none',
  },
};

export const LoadingScreen: React.FC<LoadingScreenProps> = ({
  fullscreen = false,
  withLogo = true,
}) => {
  const activeTheme = useAppStore((state) => state.activeTheme);
  const logo = THEME_LOGO_CONFIG[activeTheme] ?? THEME_LOGO_CONFIG.light_pro;

  return (
    <div
      className={`loading-screen ${fullscreen ? 'loading-screen-fullscreen' : 'loading-screen-inline'}`}
      role="status"
      aria-label="Loading"
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {withLogo && (
          <img
            src={logo.src}
            alt="DitherForge"
            className="loading-anvil-mark"
            style={{
              height: fullscreen ? '210px' : '60px',
              width: 'auto',
              display: 'block',
              filter: logo.filter,
            }}
          />
        )}
      </div>
    </div>
  );
};
