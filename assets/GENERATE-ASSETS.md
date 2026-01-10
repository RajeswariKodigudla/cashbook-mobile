# Asset Generation

To create the required PNG assets, you can:

1. Use an online tool like:
   - https://www.favicon-generator.org/
   - https://realfavicongenerator.net/
   - https://www.appicon.co/

2. Or use ImageMagick/Sharp to convert SVG to PNG:
   npm install sharp
   node convert-svg-to-png.js

3. For now, create simple placeholder PNGs:
   - icon.png: 1024x1024px (blue background, white "C" text)
   - splash.png: 1242x2436px (blue gradient background)
   - adaptive-icon.png: 1024x1024px (blue background, white "C" text)
   - favicon.png: 48x48px (blue background, white "C" text)

The app will work with placeholder images for development.
