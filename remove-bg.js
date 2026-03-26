// Updated background removal script - handles checkerboard patterns
const sharp = require('sharp');
const path = require('path');

async function removeBackground(input, output) {
  const image = sharp(input);
  const { width: w, height: h } = await image.metadata();
  
  const rawBuffer = await image.ensureAlpha().raw().toBuffer();
  const visited = new Uint8Array(w * h);
  const isBg = new Uint8Array(w * h);
  
  const bgThreshold = 180; // Lowered to catch checkerboard grey (~204)
  
  function getPixelBrightness(x, y) {
    const idx = (y * w + x) * 4;
    return (rawBuffer[idx] + rawBuffer[idx + 1] + rawBuffer[idx + 2]) / 3;
  }
  
  function isBgPixel(x, y) {
    const b = getPixelBrightness(x, y);
    if (b > bgThreshold) return true;
    
    // Check for specific checkerboard grey
    const idx = (y * w + x) * 4;
    const r = rawBuffer[idx];
    const g = rawBuffer[idx + 1];
    const bl = rawBuffer[idx + 2];
    
    // Grey checkers often have R=G=B around 190-210
    if (Math.abs(r - g) < 5 && Math.abs(g - bl) < 5 && r > 185 && r < 215) return true;
    
    return false;
  }
  
  const flatQueue = new Int32Array(w * h); 
  let head = 0;
  let tail = 0;
  
  // Seed from edges
  for (let x = 0; x < w; x++) {
    for (const y of [0, h-1]) {
      const flat = y * w + x;
      if (isBgPixel(x, y) && !visited[flat]) {
        visited[flat] = 1;
        isBg[flat] = 1;
        flatQueue[tail++] = flat;
      }
    }
  }
  for (let y = 1; y < h - 1; y++) {
    for (const x of [0, w-1]) {
      const flat = y * w + x;
      if (isBgPixel(x, y) && !visited[flat]) {
        visited[flat] = 1;
        isBg[flat] = 1;
        flatQueue[tail++] = flat;
      }
    }
  }
  
  const dx = [1, -1, 0, 0, 1, 1, -1, -1]; 
  const dy = [0, 0, 1, -1, 1, -1, 1, -1];
  
  while (head < tail) {
    const flat = flatQueue[head++];
    const cx = flat % w;
    const cy = Math.floor(flat / w);
    
    for (let d = 0; d < 8; d++) {
      const nx = cx + dx[d];
      const ny = cy + dy[d];
      
      if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue;
      const nFlat = ny * w + nx;
      if (visited[nFlat]) continue;
      
      if (isBgPixel(nx, ny)) {
        visited[nFlat] = 1;
        isBg[nFlat] = 1;
        flatQueue[tail++] = nFlat;
      }
    }
  }
  
  for (let i = 0; i < w * h; i++) {
    if (isBg[i]) rawBuffer[i * 4 + 3] = 0;
  }
  
  // Edge anti-aliasing
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const flat = y * w + x;
      if (isBg[flat]) continue; 
      
      let bgNeighbors = 0;
      for (let d = 0; d < 8; d++) {
        const nFlat = (y + dy[d]) * w + (x + dx[d]);
        if (isBg[nFlat]) bgNeighbors++;
      }
      
      if (bgNeighbors >= 3) {
        const brightness = getPixelBrightness(x, y);
        if (brightness > 160) {
          const alpha = Math.round(255 * (1 - bgNeighbors / 8) * ((255 - brightness) / 95));
          rawBuffer[flat * 4 + 3] = Math.min(rawBuffer[flat * 4 + 3], Math.max(0, alpha));
        }
      }
    }
  }
  
  const trimmed = await sharp(rawBuffer, { raw: { width: w, height: h, channels: 4 } })
    .png()
    .trim()
    .toBuffer();
  
  await sharp(trimmed).png().toFile(output);
  console.log(`✅ Cleaned: ${output}`);
}

async function main() {
  const publicDir = path.resolve('public');
  const logos = ['logo.png', 'logo-192.png', 'logo-128.png', 'vnpay-logo.png'];
  
  for (const logo of logos) {
    const logoPath = path.join(publicDir, logo);
    console.log(`🧹 Cleaning ${logo}...`);
    try {
      await removeBackground(logoPath, logoPath);
    } catch (e) {
      console.error(`❌ Failed to clean ${logo}:`, e.message);
    }
  }
  
  // Also update PWA icons in icons/ folder using the new cleaned logo.png
  const mainLogo = path.join(publicDir, 'logo.png');
  const transparent = await sharp(mainLogo).toBuffer();
  
  await sharp(transparent)
    .resize(192, 192, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(path.join(publicDir, 'icons', 'icon-192.png'));
  console.log('✅ Updated icons/icon-192.png');
  
  await sharp(transparent)
    .resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(path.join(publicDir, 'icons', 'icon-512.png'));
  console.log('✅ Updated icons/icon-512.png');
  
  console.log('\n🎉 Finished cleaning all logos!');
}

main().catch(console.error);
