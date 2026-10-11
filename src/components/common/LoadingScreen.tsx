import React from 'react';

export interface LoadingScreenProps {
  fullscreen?: boolean; // default false
  withLogo?: boolean;   // default true
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({
  fullscreen = false,
  withLogo = true,
}) => {
  const size = fullscreen ? 64 : 48;

  return (
    <div
      className={`loading-screen ${fullscreen ? 'loading-screen-fullscreen' : 'loading-screen-inline'}`}
      role="status"
      aria-label="Loading"
    >
      {withLogo && (
        <img
          src="/assets/logo-mark.png"
          alt="Loading"
          className="loading-anvil-mark"
          style={{ height: `${size}px`, width: 'auto' }}
        />
      )}
    </div>
  );
};
