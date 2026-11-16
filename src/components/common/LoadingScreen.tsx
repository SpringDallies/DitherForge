import React from 'react';
import { AnvilLogo3D } from './AnvilLogo3D';

export interface LoadingScreenProps {
  fullscreen?: boolean;
  imageOverlay?: boolean;
  imageReplace?: boolean;
  size?: number | string;
  onFirstFrame?: () => void;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({
  fullscreen = false,
  imageOverlay = false,
  imageReplace = false,
  size,
  onFirstFrame
}) => {
  const modeClass = fullscreen
    ? 'loading-screen-fullscreen'
    : imageReplace
    ? 'loading-screen-image-replace'
    : imageOverlay
    ? 'loading-screen-image-overlay'
    : 'loading-screen-inline';

  const displaySize = size ?? (fullscreen ? 'min(360px, 80vw)' : 220);

  return (
    <div
      className={`loading-screen ${modeClass}`.trim()}
      aria-busy="true"
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
