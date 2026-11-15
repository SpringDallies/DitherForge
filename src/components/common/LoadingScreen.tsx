import React from 'react';
import { AnvilLogo3D } from './AnvilLogo3D';

export interface LoadingScreenProps {
  fullscreen?: boolean;
  imageOverlay?: boolean;
  size?: number | string;
  fadingOut?: boolean;
  onFirstFrame?: () => void;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({
  fullscreen = false,
  imageOverlay = false,
  size,
  fadingOut = false,
  onFirstFrame
}) => {
  const modeClass = fullscreen
    ? 'loading-screen-fullscreen'
    : imageOverlay
    ? 'loading-screen-image-overlay'
    : 'loading-screen-inline';

  const displaySize = size ?? (fullscreen ? 'min(360px, 80vw)' : 180);

  return (
    <div
      className={`loading-screen ${modeClass} ${fadingOut ? 'loading-screen-fadeout' : ''}`.trim()}
      aria-busy={!fadingOut}
      aria-label="Loading DitherForge"
    >
      <AnvilLogo3D
        size={displaySize}
        interactive={true}
        sharpness="pixelated"
        onFirstFrame={onFirstFrame}
      />
    </div>
  );
};

export default LoadingScreen;
