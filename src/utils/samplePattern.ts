export function createCalibrationPattern(width = 400, height = 300): ImageData {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  // 1. Rich multi-stop gradient background
  const grad = ctx.createLinearGradient(0, 0, width, height);
  grad.addColorStop(0, '#0c1024');
  grad.addColorStop(0.35, '#2e1c4a');
  grad.addColorStop(0.7, '#8b2d56');
  grad.addColorStop(1, '#ff6e40');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);

  // 2. High-contrast central shaded sphere with 3D specular highlight
  const sphereX = width * 0.48;
  const sphereY = height * 0.44;
  const sphereRadius = Math.min(width, height) * 0.32;

  const sphereGrad = ctx.createRadialGradient(
    sphereX - sphereRadius * 0.35,
    sphereY - sphereRadius * 0.35,
    sphereRadius * 0.05,
    sphereX,
    sphereY,
    sphereRadius
  );
  sphereGrad.addColorStop(0, '#ffffff');
  sphereGrad.addColorStop(0.2, '#ffd5a5');
  sphereGrad.addColorStop(0.55, '#c84b31');
  sphereGrad.addColorStop(0.85, '#2d132c');
  sphereGrad.addColorStop(1, '#0f051d');

  ctx.fillStyle = sphereGrad;
  ctx.beginPath();
  ctx.arc(sphereX, sphereY, sphereRadius, 0, Math.PI * 2);
  ctx.fill();

  // 3. High-frequency checkerboard pattern
  const cbX = 20;
  const cbY = 20;
  const cbSize = 60;
  ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
  ctx.fillRect(cbX - 4, cbY - 4, cbSize + 8, cbSize + 8);
  for (let cy = 0; cy < 6; cy++) {
    for (let cx = 0; cx < 6; cx++) {
      ctx.fillStyle = (cx + cy) % 2 === 0 ? '#ffffff' : '#111827';
      ctx.fillRect(cbX + cx * 10, cy * 10 + cbY, 10, 10);
    }
  }

  // 4. Concentric rings for frequency testing
  const ringX = width - 50;
  const ringY = 50;
  for (let r = 35; r > 5; r -= 6) {
    ctx.beginPath();
    ctx.arc(ringX, ringY, r, 0, Math.PI * 2);
    ctx.strokeStyle = r % 12 === 0 ? '#ffffff' : '#38bdf8';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  // 5. Linear 16-step grayscale gradient ramp along bottom
  const rampY = height - 36;
  const rampH = 18;
  const rampW = width - 40;
  const rampX = 20;
  const steps = 16;
  const stepW = rampW / steps;
  for (let s = 0; s < steps; s++) {
    const val = Math.round((s / (steps - 1)) * 255);
    ctx.fillStyle = `rgb(${val}, ${val}, ${val})`;
    ctx.fillRect(rampX + s * stepW, rampY, stepW + 1, rampH);
  }

  // 6. Test Typography
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 11px sans-serif';
  ctx.fillText('DITHERFORGE BENCHMARK PATTERN', 22, height - 10);

  return ctx.getImageData(0, 0, width, height);
}

// Downsample ImageData to a fast proxy for Live Mode during slider interaction
export function createProxyImageData(source: ImageData, maxDim = 400): { data: ImageData; scale: number } {
  if (source.width <= maxDim && source.height <= maxDim) {
    return { data: source, scale: 1.0 };
  }
  const scale = Math.min(maxDim / source.width, maxDim / source.height);
  const targetW = Math.max(16, Math.round(source.width * scale));
  const targetH = Math.max(16, Math.round(source.height * scale));

  const srcCanvas = document.createElement('canvas');
  srcCanvas.width = source.width;
  srcCanvas.height = source.height;
  const sCtx = srcCanvas.getContext('2d')!;
  sCtx.putImageData(source, 0, 0);

  const proxyCanvas = document.createElement('canvas');
  proxyCanvas.width = targetW;
  proxyCanvas.height = targetH;
  const pCtx = proxyCanvas.getContext('2d')!;
  pCtx.imageSmoothingEnabled = true;
  pCtx.drawImage(srcCanvas, 0, 0, targetW, targetH);

  return {
    data: pCtx.getImageData(0, 0, targetW, targetH),
    scale
  };
}
