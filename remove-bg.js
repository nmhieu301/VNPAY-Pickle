// Final version: Perfect transparency + Cache busting
const sharp = require('sharp');
const path = require('path');

async function removeBackground(input, output) {
  const image = sharp(input);
  const { width: w, height: h } = await image.metadata();
  const rawBuffer = await image.ensureAlpha().raw().toBuffer();
  
  for (let i = 0; i < w * h; i++) {
    const idx = i * 4;
    const r = rawBuffer[idx];
    const g = rawBuffer[idx + 1];
    const b = rawBuffer[idx + 2];
    
    const brightness = (r + g + b) / 3;
    const saturation = Math.max(r, g, b) - Math.min(r, g, b);
    
    // If it's bright white OR achromatic light grey (checkerboard)
    if (brightness > 245 || (brightness > 150 && saturation < 30)) {
      rawBuffer[idx] = 0;
      rawBuffer[idx+1] = 0;
      rawBuffer[idx+2] = 0;
      rawBuffer[idx+3] = 0; // Pure transparent black
    }
  }
  
  await sharp(rawBuffer, { raw: { width: w, height: h, channels: 4 } })
    .png()
    .trim()
    .toFile(output);
  
  console.log(`✅ Cleaned: ${output}`);
}

async function main() {
  const publicDir = path.resolve('public');
  
  // Define source mapping from Downloads (or already copied public files)
  const files = [
    { src: 'logo.png', out: 'logo-v2.png' },
    { src: 'logo-192.png', out: 'logo-192-v2.png' },
    { src: 'logo-128.png', out: 'logo-128-v2.png' },
    { src: 'vnpay-logo.png', out: 'vnpay-logo-v2.png' }
  ];
  
  for (const f of files) {
    const inPath = path.join(publicDir, f.src);
    const outPath = path.join(publicDir, f.out);
    console.log(`🧹 Processing ${f.src} -> ${f.out}...`);
    try {
      await removeBackground(inPath, outPath);
    } catch (e) {
      console.error(`❌ Failed:`, e.message);
    }
  }
  
  // Update icons/icon-xxx.png from logo-v2.png
  const mainLogo = path.join(publicDir, 'logo-v2.png');
  const transparent = await sharp(mainLogo).toBuffer();
  
  await sharp(transparent)
    .resize(192, 192, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(path.join(publicDir, 'icons', 'icon-192.png'));
  
  await sharp(transparent)
    .resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(path.join(publicDir, 'icons', 'icon-512.png'));
  
  console.log('\n🎉 Done! All logos cleaned and renamed to -v2 to bust cache.');
}

main().catch(console.error);
