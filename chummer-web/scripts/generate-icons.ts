/**
 * Icon Generator Script
 * =====================
 * Generates PWA icons from the base SVG favicon.
 * Run with: npx tsx scripts/generate-icons.ts
 *
 * Note: Requires 'sharp' package for image processing.
 * If not available, icons can be generated manually using any SVG to PNG converter.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { deflateSync } from 'zlib';

const ICON_SIZES = [72, 96, 128, 144, 152, 192, 384, 512];
const STATIC_DIR = join(process.cwd(), 'static');
const ICONS_DIR = join(STATIC_DIR, 'icons');

/** Create a simple PNG placeholder with the app colors. */
function createPlaceholderPNG(size: number): Buffer {
	// Create a simple solid color PNG as placeholder
	// This is a minimal valid PNG with the theme color
	const width = size;
	const height = size;

	// PNG header and IHDR chunk
	const signature = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);

	// IHDR chunk
	const ihdrData = Buffer.alloc(13);
	ihdrData.writeUInt32BE(width, 0);
	ihdrData.writeUInt32BE(height, 4);
	ihdrData.writeUInt8(8, 8);  // bit depth
	ihdrData.writeUInt8(2, 9);  // color type (RGB)
	ihdrData.writeUInt8(0, 10); // compression
	ihdrData.writeUInt8(0, 11); // filter
	ihdrData.writeUInt8(0, 12); // interlace

	const ihdrCrc = crc32(Buffer.concat([Buffer.from('IHDR'), ihdrData]));
	const ihdrChunk = Buffer.concat([
		Buffer.from([0, 0, 0, 13]), // length
		Buffer.from('IHDR'),
		ihdrData,
		ihdrCrc
	]);

	// IDAT chunk (image data) - simple solid color
	// Theme color: #0A0E14 (dark background with cyan accent)
	const rawData: number[] = [];
	for (let y = 0; y < height; y++) {
		rawData.push(0); // filter byte
		for (let x = 0; x < width; x++) {
			// Create a simple gradient pattern
			const inHex = isInHexagon(x, y, width, height);
			if (inHex) {
				// Cyan accent color: #00D9FF
				rawData.push(0, 217, 255);
			} else {
				// Dark background: #0A0E14
				rawData.push(10, 14, 20);
			}
		}
	}

	// Compress with zlib (deflate)
	const compressed = deflateSync(Buffer.from(rawData));

	const idatCrc = crc32(Buffer.concat([Buffer.from('IDAT'), compressed]));
	const idatLenBuf = Buffer.alloc(4);
	idatLenBuf.writeUInt32BE(compressed.length, 0);
	const idatChunk = Buffer.concat([
		idatLenBuf,
		Buffer.from('IDAT'),
		compressed,
		idatCrc
	]);

	// IEND chunk
	const iendCrc = crc32(Buffer.from('IEND'));
	const iendChunk = Buffer.concat([
		Buffer.from([0, 0, 0, 0]),
		Buffer.from('IEND'),
		iendCrc
	]);

	return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

/** Check if point is inside a hexagon shape. */
function isInHexagon(x: number, y: number, w: number, h: number): boolean {
	const cx = w / 2;
	const cy = h / 2;
	const size = Math.min(w, h) * 0.35;

	// Normalize to center
	const dx = Math.abs(x - cx);
	const dy = Math.abs(y - cy);

	// Hexagon check
	return dy < size * 0.866 && dx < size - dy * 0.577;
}

/** CRC32 calculation for PNG chunks. */
function crc32(data: Buffer): Buffer {
	let crc = 0xFFFFFFFF;
	const table = makeCrcTable();

	for (let i = 0; i < data.length; i++) {
		crc = (crc >>> 8) ^ table[(crc ^ data[i]) & 0xFF];
	}

	crc = (crc ^ 0xFFFFFFFF) >>> 0;
	const buf = Buffer.alloc(4);
	buf.writeUInt32BE(crc, 0);
	return buf;
}

/** Generate CRC32 lookup table. */
function makeCrcTable(): number[] {
	const table: number[] = [];
	for (let n = 0; n < 256; n++) {
		let c = n;
		for (let k = 0; k < 8; k++) {
			c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
		}
		table[n] = c >>> 0;
	}
	return table;
}

/** Main function to generate all icons. */
async function generateIcons(): Promise<void> {
	console.log('Generating PWA icons...');

	// Ensure icons directory exists
	if (!existsSync(ICONS_DIR)) {
		mkdirSync(ICONS_DIR, { recursive: true });
	}

	// Generate placeholder icons (sharp not typically available)
	console.log('Generating placeholder icons...');

	for (const size of ICON_SIZES) {
		const outputPath = join(ICONS_DIR, `icon-${size}.png`);
		const png = createPlaceholderPNG(size);
		writeFileSync(outputPath, png);
		console.log(`Generated: icon-${size}.png`);
	}

	// Copy largest icon as apple-touch-icon
	const appleTouchSrc = join(ICONS_DIR, 'icon-192.png');
	const appleTouchDest = join(STATIC_DIR, 'apple-touch-icon.png');
	if (existsSync(appleTouchSrc)) {
		const data = readFileSync(appleTouchSrc);
		writeFileSync(appleTouchDest, data);
		console.log('Created apple-touch-icon.png');
	}

	// Create favicon.png
	const faviconPng = createPlaceholderPNG(32);
	writeFileSync(join(STATIC_DIR, 'favicon.png'), faviconPng);
	console.log('Created favicon.png');

	console.log('Icon generation complete!');
}

generateIcons().catch(console.error);
