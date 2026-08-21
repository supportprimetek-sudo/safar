import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

// Icon sizes for Android mipmap directories
const SIZES = {
  'mipmap-mdpi': 48,
  'mipmap-hdpi': 72,
  'mipmap-xhdpi': 96,
  'mipmap-xxhdpi': 144,
  'mipmap-xxxhdpi': 192,
};

function generateRiderSvg(size) {
  const radius = size / 2;
  const fontSize = size * 0.45;
  return `
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${size}" height="${size}" rx="${size * 0.22}" fill="#11151D" />
      <circle cx="${radius}" cy="${radius}" r="${size * 0.4}" fill="#35D0B0" />
      <text x="${radius}" y="${radius + fontSize * 0.35}" font-family="Arial, sans-serif" font-weight="900" font-size="${fontSize}" fill="#11151D" text-anchor="middle">S</text>
      <circle cx="${radius * 1.5}" cy="${radius * 0.5}" r="${size * 0.12}" fill="#FFFFFF" stroke="#35D0B0" stroke-width="${size * 0.03}" />
    </svg>
  `;
}

function generateDriverSvg(size) {
  const radius = size / 2;
  const fontSize = size * 0.45;
  return `
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${size}" height="${size}" rx="${size * 0.22}" fill="#11151D" />
      <circle cx="${radius}" cy="${radius}" r="${size * 0.4}" fill="#F59E0B" />
      <text x="${radius}" y="${radius + fontSize * 0.35}" font-family="Arial, sans-serif" font-weight="900" font-size="${fontSize}" fill="#11151D" text-anchor="middle">S</text>
      <circle cx="${radius * 1.5}" cy="${radius * 0.5}" r="${size * 0.12}" fill="#35D0B0" stroke="#FFFFFF" stroke-width="${size * 0.03}" />
    </svg>
  `;
}

function generateAdminSvg(size) {
  const radius = size / 2;
  const fontSize = size * 0.45;
  return `
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${size}" height="${size}" rx="${size * 0.22}" fill="#11151D" />
      <circle cx="${radius}" cy="${radius}" r="${size * 0.4}" fill="#6366F1" />
      <text x="${radius}" y="${radius + fontSize * 0.35}" font-family="Arial, sans-serif" font-weight="900" font-size="${fontSize}" fill="#FFFFFF" text-anchor="middle">S</text>
      <circle cx="${radius * 1.5}" cy="${radius * 0.5}" r="${size * 0.12}" fill="#35D0B0" stroke="#FFFFFF" stroke-width="${size * 0.03}" />
    </svg>
  `;
}

async function buildAppIcons(appFolder, svgGenerator) {
  const resDir = path.join(process.cwd(), 'apps', appFolder, 'android', 'app', 'src', 'main', 'res');

  for (const [folder, size] of Object.entries(SIZES)) {
    const targetFolder = path.join(resDir, folder);
    if (!fs.existsSync(targetFolder)) {
      fs.mkdirSync(targetFolder, { recursive: true });
    }

    const svg = svgGenerator(size);
    const pngBuffer = await sharp(Buffer.from(svg)).png().toBuffer();

    fs.writeFileSync(path.join(targetFolder, 'ic_launcher.png'), pngBuffer);
    fs.writeFileSync(path.join(targetFolder, 'ic_launcher_round.png'), pngBuffer);
    fs.writeFileSync(path.join(targetFolder, 'ic_launcher_foreground.png'), pngBuffer);
  }
  console.log(`✅ App icons generated for ${appFolder}`);
}

async function run() {
  await buildAppIcons('rider', generateRiderSvg);
  await buildAppIcons('driver', generateDriverSvg);
  await buildAppIcons('admin', generateAdminSvg);
  console.log('🎉 All Android app launcher icons successfully updated!');
}

run().catch(console.error);
