// PondMaster — Icon Generator
// Uses sharp to resize icon-source.svg into all required PNG sizes

const path = require('path');
const fs = require('fs');

let sharp;
try {
  sharp = require('sharp');
} catch (e) {
  console.error('sharp not installed. Run: npm install');
  process.exit(1);
}

const SOURCE = path.join(__dirname, '..', 'assets', 'icon-source.svg');
const DOCS_ICONS = path.join(__dirname, '..', 'docs', 'icons');

const DOCS_SIZES = [72, 96, 128, 144, 152, 192, 384, 512];

const STORE_SIZES = {
  [path.join(__dirname, '..', 'platforms', 'pwa-builder', 'microsoft-store')]: [44, 150, 300, 620],
  [path.join(__dirname, '..', 'platforms', 'pwa-builder', 'android')]: [512],
  [path.join(__dirname, '..', 'platforms', 'huawei')]: [216],
};

async function generateAll() {
  if (!fs.existsSync(SOURCE)) {
    console.error('Missing: assets/icon-source.svg');
    process.exit(1);
  }

  fs.mkdirSync(DOCS_ICONS, { recursive: true });

  // Generate docs icons
  for (const size of DOCS_SIZES) {
    const out = path.join(DOCS_ICONS, `icon-${size}.png`);
    await sharp(SOURCE).resize(size, size).png().toFile(out);
    console.log(`  Generated icon-${size}.png`);
  }

  // Generate store icons
  for (const [dir, sizes] of Object.entries(STORE_SIZES)) {
    fs.mkdirSync(dir, { recursive: true });
    for (const size of sizes) {
      const out = path.join(dir, `icon-${size}.png`);
      await sharp(SOURCE).resize(size, size).png().toFile(out);
      console.log(`  Generated ${path.relative(path.join(__dirname, '..'), out)}`);
    }
  }

  console.log('\nAll icons generated successfully');
}

generateAll().catch(err => {
  console.error('Icon generation failed:', err.message);
  process.exit(1);
});
