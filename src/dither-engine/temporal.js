// DitherForge 9 Temporal CRT Noise Patterns
// Clean-Room Implementation for Timeline, Video, and Animation Processing

export const TEMPORAL_PATTERNS = [
  { id: "grain", name: "1. Grain (Stochastic Per-Pixel)", description: "High-frequency per-pixel noise updated every frame." },
  { id: "static", name: "2. Static (Macroblock Snow)", description: "Block-based analog noise simulating television receiver snow." },
  { id: "scanline_drift", name: "3. Scanline Drift", description: "Horizontal noise bands drifting vertically across raster fields." },
  { id: "vertical_drift", name: "4. Vertical Drift", description: "Subtle vertical phase jitter simulating CRT vertical hold drift." },
  { id: "pulse", name: "5. Pulse (Power Line Hum)", description: "Sinusoidal global luminance modulation emulating fluctuating supply." },
  { id: "flicker", name: "6. Flicker (Phosphor Decay)", description: "Random frame-to-frame luminance dips simulating 50Hz/60Hz refresh." },
  { id: "wave", name: "7. Wave (Harmonic Warping)", description: "Perlin-driven harmonic distortion warping scanline alignment." },
  { id: "shimmer", name: "8. Shimmer (Phase Stipple)", description: "Blue-noise temporal phase shifting animating dot placement." },
  { id: "chaos", name: "9. Chaos (Analog Composite)", description: "Composite stochastic modulation combining grain, tracking & flutter." }
];

export function applyTemporalNoise(data, width, height, patternId, frameIndex, intensity = 0.5, speed = 1.0) {
  const t = frameIndex * speed;
  const amt = intensity * 40;

  switch (patternId) {
    case "grain": {
      for (let i = 0; i < data.length; i += 4) {
        const n = (Math.random() - 0.5) * amt * 2;
        data[i] = Math.max(0, Math.min(255, data[i] + n));
        data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + n));
        data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + n));
      }
      break;
    }

    case "static": {
      const bs = 4;
      for (let by = 0; by < height; by += bs) {
        for (let bx = 0; bx < width; bx += bs) {
          const n = (Math.random() - 0.5) * amt * 2.5;
          for (let y = by; y < Math.min(height, by + bs); y++) {
            for (let x = bx; x < Math.min(width, bx + bs); x++) {
              const idx = (y * width + x) * 4;
              data[idx] = Math.max(0, Math.min(255, data[idx] + n));
              data[idx + 1] = Math.max(0, Math.min(255, data[idx + 1] + n));
              data[idx + 2] = Math.max(0, Math.min(255, data[idx + 2] + n));
            }
          }
        }
      }
      break;
    }

    case "scanline_drift": {
      const driftY = (t * 4) % height;
      for (let y = 0; y < height; y++) {
        const dist = Math.abs(y - driftY);
        if (dist < 16) {
          const mod = Math.sin(dist * 0.2) * amt;
          for (let x = 0; x < width; x++) {
            const idx = (y * width + x) * 4;
            data[idx] = Math.max(0, Math.min(255, data[idx] + mod));
            data[idx + 1] = Math.max(0, Math.min(255, data[idx + 1] + mod));
            data[idx + 2] = Math.max(0, Math.min(255, data[idx + 2] + mod));
          }
        }
      }
      break;
    }

    case "vertical_drift": {
      const vOffset = Math.sin(t * 0.3) * (intensity * 6);
      for (let y = 0; y < height; y++) {
        const mod = Math.sin((y + vOffset) * 0.1) * amt;
        for (let x = 0; x < width; x++) {
          const idx = (y * width + x) * 4;
          data[idx] = Math.max(0, Math.min(255, data[idx] + mod));
          data[idx + 1] = Math.max(0, Math.min(255, data[idx + 1] + mod));
          data[idx + 2] = Math.max(0, Math.min(255, data[idx + 2] + mod));
        }
      }
      break;
    }

    case "pulse": {
      const pulseMod = Math.sin(t * 0.2) * amt * 0.8;
      for (let i = 0; i < data.length; i += 4) {
        data[i] = Math.max(0, Math.min(255, data[i] + pulseMod));
        data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + pulseMod));
        data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + pulseMod));
      }
      break;
    }

    case "flicker": {
      if (Math.random() < 0.25) {
        const drop = -Math.random() * amt * 1.5;
        for (let i = 0; i < data.length; i += 4) {
          data[i] = Math.max(0, Math.min(255, data[i] + drop));
          data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + drop));
          data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + drop));
        }
      }
      break;
    }

    case "wave": {
      for (let y = 0; y < height; y++) {
        const waveMod = Math.sin(y * 0.08 + t * 0.3) * amt;
        for (let x = 0; x < width; x++) {
          const idx = (y * width + x) * 4;
          data[idx] = Math.max(0, Math.min(255, data[idx] + waveMod));
          data[idx + 1] = Math.max(0, Math.min(255, data[idx + 1] + waveMod));
          data[idx + 2] = Math.max(0, Math.min(255, data[idx + 2] + waveMod));
        }
      }
      break;
    }

    case "shimmer": {
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const shim = (((x * 67 + y * 131 + Math.floor(t * 19)) % 64) - 32) * (amt / 32);
          const idx = (y * width + x) * 4;
          data[idx] = Math.max(0, Math.min(255, data[idx] + shim));
          data[idx + 1] = Math.max(0, Math.min(255, data[idx + 1] + shim));
          data[idx + 2] = Math.max(0, Math.min(255, data[idx + 2] + shim));
        }
      }
      break;
    }

    case "chaos": {
      for (let y = 0; y < height; y++) {
        const lineJitter = (Math.random() - 0.5) * amt * 0.5;
        for (let x = 0; x < width; x++) {
          const pixelJitter = (Math.random() - 0.5) * amt * 1.5;
          const idx = (y * width + x) * 4;
          const totalN = lineJitter + pixelJitter;
          data[idx] = Math.max(0, Math.min(255, data[idx] + totalN));
          data[idx + 1] = Math.max(0, Math.min(255, data[idx + 1] + totalN));
          data[idx + 2] = Math.max(0, Math.min(255, data[idx + 2] + totalN));
        }
      }
      break;
    }
  }
}
