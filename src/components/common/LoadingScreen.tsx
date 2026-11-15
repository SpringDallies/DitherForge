import React from 'react';
import { Anvil3DLogo } from './Anvil3DLogo';

interface LoadingScreenProps {
  fullscreen?: boolean;
  overlayOverImage?: boolean;
  size?: number;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({
  fullscreen = false,
  overlayOverImage = false,
  size = 180,
}) => {
  const modeClass = fullscreen
    ? 'loading-screen-fullscreen'
    : overlayOverImage
    ? 'loading-screen-image-overlay'
    : 'loading-screen-inline';

  return (
    <div className={`loading-screen ${modeClass}`} role="status" aria-label="Loading">
      <Anvil3DLogo size={size} resolution={128} interactive={!overlayOverImage} />
    </div>
  );
};
