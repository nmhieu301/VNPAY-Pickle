// Smart background removal - flood fill from edges only, preserve interior content
const sharp = require('sharp');
const path = require('path');

async function removeWhiteBg(input, output) {
  const image = sharp(input);
  const { width: w, height: h } = await image.metadata();
  
  const rawBuffer = await image.ensureAlpha().raw().toBuffer();
  
  // Strategy: Flood fill from all edges. 
  // Only pixels reachable from the edge that are white/near-white get removed.
  // This preserves white text/elements INSIDE the logo.
  
  const bgThreshold = 200; // brightness threshold for "background-like" pixels
  const visited = new Uint8Array(w * h);
  const isBg = new Uint8Array(w * h); // mark as background
  
  function getPixelBrightness(x, y) {
    const idx = (y * w + x) * 4;
    return (rawBuffer[idx] + rawBuffer[idx + 1] + rawBuffer[idx + 2]) / 3;
  }
  
  // BFS flood fill from edges
  const queue = [];
  
  // Seed from all edges
  for (let x = 0; x < w; x++) {
    if (getPixelBrightness(x, 0) > bgThreshold) queue.push(x * h + 0);
    if (getPixelBrightness(x, h-1) > bgThreshold) queue.push(x * h + (h-1));
  }
  for (let y = 0; y < h; y++) {
    if (getPixelBrightness(0, y) > bgThreshold) queue.push(0 * h + y);
    if (getPixelBrightness(w-1, y) > bgThreshold) queue.push((w-1) * h + y);
  }
  
  const dx = [1, -1, 0, 0, 1, 1, -1, -1]; // 8-directional
  const dy = [0, 0, 1, -1, 1, -1, 1, -1];
  
  let head = 0;
  const flatQueue = new Int32Array(w * h); // flat queue for performance
  let tail = 0;
  
  // Re-seed with proper flat coords
  for (let x = 0; x < w; x++) {
    for (const y of [0, h-1]) {
      const flat = y * w + x;
      if (getPixelBrightness(x, y) > bgThreshold && !visited[flat]) {
        visited[flat] = 1;
        isBg[flat] = 1;
        flatQueue[tail++] = flat;
      }
    }
  }
  for (let y = 1; y < h - 1; y++) {
    for (const x of [0, w-1]) {
      const flat = y * w + x;
      if (getPixelBrightness(x, y) > bgThreshold && !visited[flat]) {
        visited[flat] = 1;
        isBg[flat] = 1;
        flatQueue[tail++] = flat;
      }
    }
  }
  
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
      
      const brightness = getPixelBrightness(nx, ny);
      if (brightness > bgThreshold) {
        visited[nFlat] = 1;
        isBg[nFlat] = 1;
        flatQueue[tail++] = nFlat;
      }
    }
  }
  
  // Apply: make background pixels transparent
  let removedCount = 0;
  for (let i = 0; i < w * h; i++) {
    if (isBg[i]) {
      rawBuffer[i * 4 + 3] = 0;
      removedCount++;
    }
  }
  
  // Edge anti-aliasing: for pixels right next to background, soften alpha
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const flat = y * w + x;
      if (isBg[flat]) continue; // skip bg pixels
      
      // Count nearby bg pixels
      let bgNeighbors = 0;
      for (let d = 0; d < 8; d++) {
        const nFlat = (y + dy[d]) * w + (x + dx[d]);
        if (isBg[nFlat]) bgNeighbors++;
      }
      
      // If this pixel borders background, reduce alpha for smoother edge
      if (bgNeighbors >= 3) {
        const brightness = getPixelBrightness(x, y);
        if (brightness > 170) {
          const alpha = Math.round(255 * (1 - bgNeighbors / 8) * ((255 - brightness) / 85));
          rawBuffer[flat * 4 + 3] = Math.min(rawBuffer[flat * 4 + 3], Math.max(30, alpha));
        }
      }
    }
  }
  
  console.log(`  Removed ${removedCount}/${w*h} pixels as background (${(removedCount/w/h*100).toFixed(1)}%)`);
  
  // Trim + save
  const trimmed = await sharp(rawBuffer, { raw: { width: w, height: h, channels: 4 } })
    .png()
    .trim()
    .toBuffer();
  
  await sharp(trimmed).png().toFile(output);
  const meta = await sharp(output).metadata();
  console.log(`✅ Saved: ${output} (${meta.width}x${meta.height})`);
}

async function main() {
  const srcLogo = path.resolve('C:/Users/hieunm2/Pictures/vnp pick.png');
  const publicDir = path.resolve('D:/GG Antigravity/Project/Pickle/public');
  
  const mainLogo = path.join(publicDir, 'logo.png');
  await removeWhiteBg(srcLogo, mainLogo);
  
  const transparent = await sharp(mainLogo).toBuffer();
  
  await sharp(transparent)
    .resize(192, 192, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(path.join(publicDir, 'icons', 'icon-192.png'));
  console.log('✅ icon-192.png');
  
  await sharp(transparent)
    .resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(path.join(publicDir, 'icons', 'icon-512.png'));
  console.log('✅ icon-512.png');
  
  console.log('\n🎉 Done! Background fully removed, logo content preserved.');
}

main().catch(console.error);
