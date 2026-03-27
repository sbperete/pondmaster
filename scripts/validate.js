// PondMaster — Build Validator
// Checks all required files exist and manifest is valid

const fs = require('fs');
const path = require('path');

const docsDir = path.join(__dirname, '..', 'docs');

const REQUIRED_FILES = [
  'index.html',
  'auth.html',
  'dashboard.html',
  'pond.html',
  'calendar.html',
  'settings.html',
  'worker-card.html',
  'offline.html',
  '404.html',
  'demo.html',
  'privacy.html',
  'reports.html',
  'share-target.html',
  'manifest.json',
  'sw.js',
  'js/app.js',
  'js/supabase.js',
  'js/theme.js',
  'js/tour.js',
  'js/growth.js',
  'js/ai-chat.js',
  'js/pwa.js',
  'js/charts.js',
  'js/demo-data.js',
  'css/style.css',
  'icons/icon-192.png',
  'icons/icon-512.png',
];

let allPassed = true;

console.log('PondMaster Build Validator\n');

// Check files
REQUIRED_FILES.forEach(file => {
  const full = path.join(docsDir, file);
  if (fs.existsSync(full)) {
    console.log(`  ✓  ${file}`);
  } else {
    console.error(`  ✗  MISSING: ${file}`);
    allPassed = false;
  }
});

// Validate manifest
const manifestPath = path.join(docsDir, 'manifest.json');
if (fs.existsSync(manifestPath)) {
  try {
    const m = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    const required = ['name', 'short_name', 'start_url', 'display', 'icons', 'screenshots', 'shortcuts'];
    required.forEach(field => {
      if (!m[field]) {
        console.error(`  ✗  manifest.json missing field: ${field}`);
        allPassed = false;
      }
    });
    if (m.icons && m.icons.length < 8) {
      console.error(`  ✗  manifest.json needs 8 icon sizes, has ${m.icons.length}`);
      allPassed = false;
    }
    console.log('\n  ✓  manifest.json valid');
  } catch (e) {
    console.error(`  ✗  manifest.json parse error: ${e.message}`);
    allPassed = false;
  }
}

console.log('');
if (allPassed) {
  console.log('All checks passed ✓');
  process.exit(0);
} else {
  console.error('Some checks failed. See above.');
  process.exit(1);
}
