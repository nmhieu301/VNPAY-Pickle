const sharp = require('sharp');
async function debug() {
  const image = sharp('public/logo.png');
  const { width, height } = await image.metadata();
  const buffer = await image.raw().toBuffer();
  console.log('Image size:', width, 'x', height);
  for (let y of [0, 10, 100]) {
    for (let x of [0, 10, 100]) {
      const idx = (y * width + x) * 4;
      console.log(`Pixel at (${x}, ${y}): R:${buffer[idx]} G:${buffer[idx+1]} B:${buffer[idx+2]} A:${buffer[idx+3]}`);
    }
  }
}
debug();
