/**
 * Generate placeholder assets for Expo app
 * Creates simple PNG images for development
 */

const fs = require('fs');
const path = require('path');

// Create a simple 1x1 pixel PNG (base64 encoded)
// This is a minimal valid PNG that we'll use as placeholder
const createMinimalPNG = (width, height, bgColor = [59, 130, 246]) => {
  // This is a minimal PNG structure - for actual use, you'd want proper PNG encoding
  // For now, we'll create a simple script that uses canvas or sharp if available
  const size = Math.max(width, height);
  
  // Create a simple base64-encoded 1x1 blue pixel PNG
  // This is a minimal valid PNG (1x1 blue pixel)
  const minimalPNG = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    'base64'
  );
  
  return minimalPNG;
};

const assetsDir = path.join(__dirname, 'assets');

// Ensure assets directory exists
if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir, { recursive: true });
}

// Try to use sharp if available, otherwise create simple placeholders
let sharp;
try {
  sharp = require('sharp');
} catch (e) {
  console.log('⚠️  Sharp not installed. Installing sharp for better image generation...');
  console.log('   Run: npm install sharp --save-dev');
}

const createPNG = async (width, height, bgColor = '#3B82F6', text = 'C') => {
  if (sharp) {
    // Create image with sharp
    const svg = `
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <rect width="${width}" height="${height}" fill="${bgColor}"/>
        <text x="50%" y="50%" font-family="Arial, sans-serif" font-size="${width * 0.4}" 
              font-weight="bold" fill="#FFFFFF" text-anchor="middle" 
              dominant-baseline="middle">${text}</text>
      </svg>
    `;
    
    return await sharp(Buffer.from(svg))
      .png()
      .toBuffer();
  } else {
    // Fallback: Create a minimal valid PNG
    // This is a 1x1 blue pixel - not ideal but will work
    return Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'base64'
    );
  }
};

const generateAssets = async () => {
  console.log('🎨 Generating app assets...\n');

  try {
    // Generate icon.png (1024x1024)
    console.log('📱 Creating icon.png (1024x1024)...');
    const icon = await createPNG(1024, 1024, '#3B82F6', 'C');
    fs.writeFileSync(path.join(assetsDir, 'icon.png'), icon);
    console.log('   ✅ icon.png created');

    // Generate adaptive-icon.png (1024x1024)
    console.log('📱 Creating adaptive-icon.png (1024x1024)...');
    const adaptiveIcon = await createPNG(1024, 1024, '#3B82F6', 'C');
    fs.writeFileSync(path.join(assetsDir, 'adaptive-icon.png'), adaptiveIcon);
    console.log('   ✅ adaptive-icon.png created');

    // Generate splash.png (1242x2436)
    console.log('🖼️  Creating splash.png (1242x2436)...');
    const splash = await createPNG(1242, 2436, '#3B82F6', '');
    fs.writeFileSync(path.join(assetsDir, 'splash.png'), splash);
    console.log('   ✅ splash.png created');

    // Generate favicon.png (48x48)
    console.log('🌐 Creating favicon.png (48x48)...');
    const favicon = await createPNG(48, 48, '#3B82F6', 'C');
    fs.writeFileSync(path.join(assetsDir, 'favicon.png'), favicon);
    console.log('   ✅ favicon.png created');

    console.log('\n✨ All assets generated successfully!');
    console.log('💡 Tip: Replace these with your custom branded assets before production.');
  } catch (error) {
    console.error('❌ Error generating assets:', error.message);
    console.log('\n💡 Installing sharp for better image generation...');
    console.log('   Run: npm install sharp --save-dev');
    console.log('   Then run this script again.');
  }
};

// Run if called directly
if (require.main === module) {
  generateAssets();
}

module.exports = { generateAssets };
