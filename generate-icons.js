/**
 * Generate placeholder app icons using sharp
 * Install: npm install sharp
 * Run: node generate-icons.js
 */

const fs = require('fs');
const path = require('path');

const assetsDir = path.join(__dirname, 'assets');

// Check if sharp is available
let sharp;
try {
  sharp = require('sharp');
} catch (e) {
  console.log('⚠️  Sharp not installed. Installing...');
  console.log('Run: npm install sharp');
  console.log('Then run: node generate-icons.js');
  process.exit(1);
}

// Create a simple blue icon with white "C"
async function createIcon(size, filename) {
  const svg = `
    <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${size}" height="${size}" fill="#3B82F6"/>
      <text x="50%" y="50%" font-family="Arial, sans-serif" font-size="${size * 0.4}" 
            font-weight="bold" fill="#FFFFFF" text-anchor="middle" 
            dominant-baseline="middle">C</text>
    </svg>
  `;

  await sharp(Buffer.from(svg))
    .png()
    .toFile(path.join(assetsDir, filename));
  
  console.log(`✅ Created ${filename} (${size}x${size})`);
}

// Create splash screen
async function createSplash() {
  const width = 1242;
  const height = 2436;
  
  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#3B82F6;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#2563EB;stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="${width}" height="${height}" fill="url(#grad)"/>
      <text x="50%" y="50%" font-family="Arial, sans-serif" font-size="${width * 0.15}" 
            font-weight="bold" fill="#FFFFFF" text-anchor="middle" 
            dominant-baseline="middle">Cashbook</text>
    </svg>
  `;

  await sharp(Buffer.from(svg))
    .png()
    .toFile(path.join(assetsDir, 'splash.png'));
  
  console.log(`✅ Created splash.png (${width}x${height})`);
}

async function generateAll() {
  console.log('🎨 Generating app icons...\n');
  
  // Ensure assets directory exists
  if (!fs.existsSync(assetsDir)) {
    fs.mkdirSync(assetsDir, { recursive: true });
  }

  try {
    await createIcon(1024, 'icon.png');
    await createIcon(1024, 'adaptive-icon.png');
    await createIcon(48, 'favicon.png');
    await createSplash();
    
    console.log('\n✅ All assets generated successfully!');
    console.log('📱 Your app should now work with Expo Go');
  } catch (error) {
    console.error('❌ Error generating assets:', error.message);
    process.exit(1);
  }
}

generateAll();

