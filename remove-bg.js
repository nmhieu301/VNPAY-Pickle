// Ultra-aggressive background removal for VNPAY logo checkerboards
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
    
    // Calculate brightness
    const brightness = (r + g + b) / 3;
    
    // Calculate saturation/deviation - colored pixels should stay
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const saturation = max - min;
    
    // IF it's very bright (white-ish)
    // OR if it's achromatic (r~g~b) and fairly bright (checkerboard grey)
    // AND it's not a colored part of the logo (saturation < 15)
    if (brightness > 240 || (brightness > 160 && saturation < 25)) {
      rawBuffer[idx + 3] = 0; // Make transparent
    }
  }
  
  // Save result
  await sharp(rawBuffer, { raw: { width: w, height: h, channels: 4 } })
    .png()
    .trim()
    .toFile(output);
  
  console.log(`✅ Cleaned: ${output}`);
}

async function main() {
  const publicDir = path.resolve('public');
  const logos = ['logo.png', 'logo-192.png', 'logo-128.png', 'vnpay-logo.png'];
  
  for (const logo of logos) {
    const logoPath = path.join(publicDir, logo);
    console.log(`🧹 Aggressively cleaning ${logo}...`);
    try {
      await removeBackground(logoPath, logoPath);
    } catch (e) {
      console.error(`❌ Failed:`, e.message);
    }
  }
  
  // Re-generate PWA icons from the now ultra-clean logo.png
  const mainLogo = path.join(publicDir, 'logo.png');
  const transparent = await sharp(mainLogo).toBuffer();
  
  await sharp(transparent)
    .resize(192, 192, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(path.join(publicDir, 'icons', 'icon-192.png'));
  
  await sharp(transparent)
    .resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(path.join(publicDir, 'icons', 'icon-512.png'));
  
  console.log('🎉 Done! Checkers should be gone.');
}

main().catch(console.error);
