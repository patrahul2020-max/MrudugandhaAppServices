import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.join(__dirname, '..', 'public');

if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// 1. Standard SVG Icon (Full bleed with safe margins)
const standardSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#064e3b" />
      <stop offset="50%" stop-color="#065f46" />
      <stop offset="100%" stop-color="#022c22" />
    </linearGradient>
    <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fef08a" />
      <stop offset="50%" stop-color="#f59e0b" />
      <stop offset="100%" stop-color="#b45309" />
    </linearGradient>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="8" stdDeviation="12" flood-color="#000000" flood-opacity="0.4" />
    </filter>
  </defs>

  <!-- Background -->
  <rect width="512" height="512" rx="104" fill="url(#bgGrad)" />
  <rect width="496" height="496" x="8" y="8" rx="96" fill="none" stroke="#34d399" stroke-opacity="0.25" stroke-width="4" />

  <!-- Villa Roof / Heritage Canopy Silhouette -->
  <g filter="url(#shadow)">
    <!-- Main Villa Roof Triangle -->
    <path d="M 256 90 L 416 220 L 376 220 L 376 360 L 136 360 L 136 220 L 96 220 Z" fill="#042f2e" stroke="url(#goldGrad)" stroke-width="8" stroke-linejoin="round" />
    
    <!-- Warm Golden Front Portico & Pillars -->
    <path d="M 256 125 L 366 215 L 146 215 Z" fill="url(#goldGrad)" opacity="0.9" />
    
    <!-- Stylized "M" for Mrudugandha in the center doorway -->
    <path d="M 180 340 L 180 230 L 230 300 L 256 265 L 282 300 L 332 230 L 332 340" 
          fill="none" stroke="#ffffff" stroke-width="18" stroke-linecap="round" stroke-linejoin="round" />

    <!-- Kokan Nature / Coconut Palm Fronds Accent -->
    <path d="M 256 210 Q 230 160 170 170 Q 220 185 240 215" fill="none" stroke="url(#goldGrad)" stroke-width="6" stroke-linecap="round" />
    <path d="M 256 210 Q 282 160 342 170 Q 292 185 272 215" fill="none" stroke="url(#goldGrad)" stroke-width="6" stroke-linecap="round" />
  </g>

  <!-- Bottom Brand Ribbon Banner -->
  <rect x="76" y="380" width="360" height="60" rx="14" fill="#022c22" stroke="url(#goldGrad)" stroke-width="3" />
  <text x="256" y="420" font-family="system-ui, -apple-system, sans-serif" font-size="28" font-weight="900" fill="url(#goldGrad)" text-anchor="middle" letter-spacing="4">
    MRUDUGANDHA
  </text>
  <text x="256" y="465" font-family="system-ui, -apple-system, sans-serif" font-size="16" font-weight="700" fill="#a7f3d0" text-anchor="middle" letter-spacing="2">
    GUESTHOUSE • KOTAWADE
  </text>
</svg>
`;

// 2. Maskable Icon (Has 15% safe padding around all sides so Android circles/squircles never clip)
const maskableSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="bgGradMask" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#064e3b" />
      <stop offset="50%" stop-color="#065f46" />
      <stop offset="100%" stop-color="#022c22" />
    </linearGradient>
    <linearGradient id="goldGradMask" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fef08a" />
      <stop offset="50%" stop-color="#f59e0b" />
      <stop offset="100%" stop-color="#b45309" />
    </linearGradient>
    <filter id="shadowMask" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="6" stdDeviation="10" flood-color="#000000" flood-opacity="0.5" />
    </filter>
  </defs>

  <!-- Full-bleed background extending to outer canvas boundaries -->
  <rect width="512" height="512" fill="url(#bgGradMask)" />

  <!-- Inner safe zone (scaled 0.75 inside center) -->
  <g transform="translate(64, 64) scale(0.75)" filter="url(#shadowMask)">
    <!-- Main Villa Roof Triangle -->
    <path d="M 256 90 L 416 220 L 376 220 L 376 360 L 136 360 L 136 220 L 96 220 Z" fill="#042f2e" stroke="url(#goldGradMask)" stroke-width="10" stroke-linejoin="round" />
    
    <!-- Warm Golden Front Portico -->
    <path d="M 256 125 L 366 215 L 146 215 Z" fill="url(#goldGradMask)" opacity="0.9" />
    
    <!-- Stylized "M" in the center -->
    <path d="M 180 340 L 180 230 L 230 300 L 256 265 L 282 300 L 332 230 L 332 340" 
          fill="none" stroke="#ffffff" stroke-width="20" stroke-linecap="round" stroke-linejoin="round" />

    <!-- Palm fronds -->
    <path d="M 256 210 Q 230 160 170 170 Q 220 185 240 215" fill="none" stroke="url(#goldGradMask)" stroke-width="8" stroke-linecap="round" />
    <path d="M 256 210 Q 282 160 342 170 Q 292 185 272 215" fill="none" stroke="url(#goldGradMask)" stroke-width="8" stroke-linecap="round" />

    <!-- Brand Ribbon Banner -->
    <rect x="66" y="380" width="380" height="66" rx="16" fill="#022c22" stroke="url(#goldGradMask)" stroke-width="4" />
    <text x="256" y="424" font-family="system-ui, -apple-system, sans-serif" font-size="30" font-weight="900" fill="url(#goldGradMask)" text-anchor="middle" letter-spacing="4">
      MRUDUGANDHA
    </text>
  </g>
</svg>
`;

async function generate() {
  console.log('Writing public/icon.svg...');
  fs.writeFileSync(path.join(publicDir, 'icon.svg'), standardSvg.trim(), 'utf-8');

  console.log('Generating pwa-192x192.png...');
  await sharp(Buffer.from(standardSvg))
    .resize(192, 192)
    .png()
    .toFile(path.join(publicDir, 'pwa-192x192.png'));

  console.log('Generating pwa-512x512.png...');
  await sharp(Buffer.from(standardSvg))
    .resize(512, 512)
    .png()
    .toFile(path.join(publicDir, 'pwa-512x512.png'));

  console.log('Generating pwa-maskable-512x512.png...');
  await sharp(Buffer.from(maskableSvg))
    .resize(512, 512)
    .png()
    .toFile(path.join(publicDir, 'pwa-maskable-512x512.png'));

  console.log('Generating apple-touch-icon.png (180x180)...');
  await sharp(Buffer.from(standardSvg))
    .resize(180, 180)
    .png()
    .toFile(path.join(publicDir, 'apple-touch-icon.png'));

  console.log('Generating favicon.ico...');
  await sharp(Buffer.from(standardSvg))
    .resize(64, 64)
    .png()
    .toFile(path.join(publicDir, 'favicon.ico'));

  console.log('✓ All PWA icons generated successfully!');
}

generate().catch(err => {
  console.error('Error generating icons:', err);
  process.exit(1);
});
