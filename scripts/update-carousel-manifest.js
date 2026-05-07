#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const IMAGE_EXTENSIONS = new Set([
  '.avif',
  '.gif',
  '.jpeg',
  '.jpg',
  '.png',
  '.webp'
]);

const folderArg = process.argv[2];

if (!folderArg) {
  console.error('Usage: node scripts/update-carousel-manifest.js <image-folder>');
  process.exit(1);
}

const folderPath = path.resolve(process.cwd(), folderArg);
const manifestPath = path.join(folderPath, 'manifest.json');

if (!fs.existsSync(folderPath) || !fs.statSync(folderPath).isDirectory()) {
  console.error(`Not a directory: ${folderArg}`);
  process.exit(1);
}

const imageFiles = fs.readdirSync(folderPath)
  .filter((entry) => {
    const fullPath = path.join(folderPath, entry);
    return fs.statSync(fullPath).isFile() && IMAGE_EXTENSIONS.has(path.extname(entry).toLowerCase());
  })
  .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));

let existingImages = [];

const normalizeEntry = (entry) => {
  if (entry && typeof entry === 'object' && !Array.isArray(entry)) {
    const src = String(entry.src || '').trim();
    if (!src) return null;

    const nextEntry = { src };
    if (entry.alt) {
      nextEntry.alt = String(entry.alt).trim();
    }
    if (Array.isArray(entry.tags) && entry.tags.length) {
      nextEntry.tags = entry.tags.map((tag) => String(tag).trim()).filter(Boolean);
    }
    return nextEntry;
  }

  const src = String(entry || '').trim();
  return src ? { src } : null;
};

if (fs.existsSync(manifestPath)) {
  try {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    const entries = Array.isArray(manifest) ? manifest : manifest.images;
    if (!Array.isArray(entries)) {
      throw new Error('Manifest must be an array or include an images array');
    }
    existingImages = entries.map(normalizeEntry).filter(Boolean);
  } catch (error) {
    console.error(`Could not read ${manifestPath}: ${error.message}`);
    process.exit(1);
  }
}

const available = new Set(imageFiles);
const referenced = new Set();
const keptImages = existingImages.filter((entry) => {
  if (!available.has(entry.src)) return false;
  referenced.add(entry.src);
  return true;
});
const newImages = imageFiles
  .filter((image) => !referenced.has(image))
  .map((src) => ({ src }));
const nextManifest = {
  images: keptImages.concat(newImages)
};

fs.writeFileSync(manifestPath, `${JSON.stringify(nextManifest, null, 2)}\n`);

console.log(`Updated ${path.relative(process.cwd(), manifestPath)}`);
console.log(`Kept ${keptImages.length}, added ${newImages.length}, removed ${existingImages.length - keptImages.length}`);
