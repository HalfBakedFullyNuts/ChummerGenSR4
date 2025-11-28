#!/usr/bin/env node
/**
 * XML to JSON Converter for Chummer Data Files
 * Converts SR4 XML data files to JSON format for the web app.
 */

const fs = require('fs');
const path = require('path');

// Simple XML parser (no external dependencies)
function parseXML(xml) {
	// Remove XML declaration and comments
	xml = xml.replace(/<\?xml[^?]*\?>/g, '');
	xml = xml.replace(/<!--[\s\S]*?-->/g, '');

	function parseElement(str) {
		const result = {};
		const tagMatch = str.match(/^<(\w+)([^>]*)>([\s\S]*)<\/\1>$/);
		if (!tagMatch) return str.trim();

		const [, tag, attrs, content] = tagMatch;

		// Check for child elements
		const childPattern = /<(\w+)(?:[^>]*)>[\s\S]*?<\/\1>/g;
		const children = content.match(childPattern);

		if (children) {
			const grouped = {};
			children.forEach(child => {
				const childTag = child.match(/^<(\w+)/)[1];
				const parsed = parseElement(child);
				if (!grouped[childTag]) grouped[childTag] = [];
				grouped[childTag].push(parsed);
			});

			// Flatten single-item arrays for known patterns
			for (const key in grouped) {
				if (grouped[key].length === 1 && typeof grouped[key][0] !== 'object') {
					result[key] = grouped[key][0];
				} else {
					result[key] = grouped[key];
				}
			}
		} else {
			return content.trim();
		}

		return result;
	}

	// Find root element
	const rootMatch = xml.match(/<chummer>([\s\S]*)<\/chummer>/);
	if (!rootMatch) return null;

	return parseElement(`<chummer>${rootMatch[1]}</chummer>`);
}

// Extract text content from element
function getText(parent, tag) {
	const match = parent.match(new RegExp(`<${tag}>([^<]*)</${tag}>`));
	return match ? match[1].trim() : '';
}

// Extract all elements of a type
function getElements(xml, tag) {
	const pattern = new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, 'g');
	const results = [];
	let match;
	while ((match = pattern.exec(xml)) !== null) {
		results.push(match[1]);
	}
	return results;
}

// Convert bioware.xml
function convertBioware() {
	console.log('Converting bioware.xml...');
	const xml = fs.readFileSync(path.join(__dirname, '../../bin/data/bioware.xml'), 'utf8');

	// Get categories
	const catMatch = xml.match(/<categories>([\s\S]*?)<\/categories>/);
	const categories = catMatch ? getElements(catMatch[1], 'category') : [];

	// Get bioware items
	const biowares = [];
	const biowareMatches = getElements(xml, 'bioware');

	for (const bw of biowareMatches) {
		const name = getText(bw, 'name');
		if (!name) continue;

		const rating = getText(bw, 'rating');
		const essStr = getText(bw, 'ess');
		const costStr = getText(bw, 'cost');

		// Parse essence (handle formulas like "Rating * 0.75")
		let ess = 0;
		if (essStr.includes('Rating')) {
			// Extract multiplier
			const multMatch = essStr.match(/Rating\s*\*\s*([\d.]+)/);
			ess = multMatch ? parseFloat(multMatch[1]) : 0.1;
		} else {
			ess = parseFloat(essStr) || 0;
		}

		// Parse cost (handle formulas)
		let cost = 0;
		if (costStr.includes('Rating')) {
			const multMatch = costStr.match(/Rating\s*\*\s*(\d+)/);
			cost = multMatch ? parseInt(multMatch[1]) : 1000;
		} else {
			cost = parseInt(costStr) || 0;
		}

		biowares.push({
			name,
			category: getText(bw, 'category') || 'Basic',
			rating: parseInt(rating) || 0,
			ess,
			cost,
			capacity: parseInt(getText(bw, 'capacity')) || 0,
			avail: getText(bw, 'avail') || '0',
			source: getText(bw, 'source') || 'SR4',
			page: parseInt(getText(bw, 'page')) || 0
		});
	}

	const result = { categories, biowares };
	fs.writeFileSync(
		path.join(__dirname, '../static/data/bioware.json'),
		JSON.stringify(result, null, 2)
	);
	console.log(`  Converted ${biowares.length} bioware items`);
}

// Convert vehicles.xml
function convertVehicles() {
	console.log('Converting vehicles.xml...');
	const xml = fs.readFileSync(path.join(__dirname, '../../bin/data/vehicles.xml'), 'utf8');

	// Get categories
	const catMatch = xml.match(/<categories>([\s\S]*?)<\/categories>/);
	const categories = catMatch ? getElements(catMatch[1], 'category') : [];

	// Get vehicles
	const vehicles = [];
	const vehicleMatches = getElements(xml, 'vehicle');

	for (const v of vehicleMatches) {
		const name = getText(v, 'name');
		if (!name) continue;

		vehicles.push({
			name,
			category: getText(v, 'category') || 'Groundcraft',
			handling: getText(v, 'handling') || '0',
			accel: getText(v, 'accel') || '0',
			speed: getText(v, 'speed') || '0',
			pilot: parseInt(getText(v, 'pilot')) || 1,
			body: parseInt(getText(v, 'body')) || 1,
			armor: parseInt(getText(v, 'armor')) || 0,
			sensor: parseInt(getText(v, 'sensor')) || 1,
			seats: getText(v, 'seats') || '1',
			avail: getText(v, 'avail') || '0',
			cost: parseInt(getText(v, 'cost')) || 0,
			source: getText(v, 'source') || 'SR4',
			page: parseInt(getText(v, 'page')) || 0
		});
	}

	const result = { categories, vehicles };
	fs.writeFileSync(
		path.join(__dirname, '../static/data/vehicles.json'),
		JSON.stringify(result, null, 2)
	);
	console.log(`  Converted ${vehicles.length} vehicles`);
}

// Convert martialarts.xml
function convertMartialArts() {
	console.log('Converting martialarts.xml...');
	const xml = fs.readFileSync(path.join(__dirname, '../../bin/data/martialarts.xml'), 'utf8');

	// Get styles
	const styles = [];
	const styleMatches = getElements(xml, 'martialart');

	for (const s of styleMatches) {
		const name = getText(s, 'name');
		if (!name) continue;

		// Get techniques
		const techMatch = s.match(/<techniques>([\s\S]*?)<\/techniques>/);
		const techniques = techMatch ? getElements(techMatch[1], 'technique').map(t => getText(t, 'name') || t) : [];

		styles.push({
			name,
			source: getText(s, 'source') || 'SR4',
			page: parseInt(getText(s, 'page')) || 0,
			techniques
		});
	}

	// Get standalone techniques
	const techniques = [];
	const techMatches = getElements(xml, 'technique');

	for (const t of techMatches) {
		const name = getText(t, 'name');
		if (!name) continue;

		techniques.push({
			name,
			source: getText(t, 'source') || 'SR4',
			page: parseInt(getText(t, 'page')) || 0
		});
	}

	const result = { styles, techniques };
	fs.writeFileSync(
		path.join(__dirname, '../static/data/martialarts.json'),
		JSON.stringify(result, null, 2)
	);
	console.log(`  Converted ${styles.length} martial art styles, ${techniques.length} techniques`);
}

// Convert echoes.xml (for technomancers)
function convertEchoes() {
	console.log('Converting echoes.xml...');
	const xml = fs.readFileSync(path.join(__dirname, '../../bin/data/echoes.xml'), 'utf8');

	const echoes = [];
	const echoMatches = getElements(xml, 'echo');

	for (const e of echoMatches) {
		const name = getText(e, 'name');
		if (!name) continue;

		echoes.push({
			name,
			source: getText(e, 'source') || 'SR4',
			page: parseInt(getText(e, 'page')) || 0,
			limit: parseInt(getText(e, 'limit')) || 0,
			bonus: getText(e, 'bonus') || ''
		});
	}

	fs.writeFileSync(
		path.join(__dirname, '../static/data/echoes.json'),
		JSON.stringify({ echoes }, null, 2)
	);
	console.log(`  Converted ${echoes.length} echoes`);
}

// Convert streams.xml (technomancer streams/traditions)
function convertStreams() {
	console.log('Converting streams.xml...');
	const xml = fs.readFileSync(path.join(__dirname, '../../bin/data/streams.xml'), 'utf8');

	const streams = [];
	// Streams are stored as "tradition" elements in the XML
	const streamMatches = getElements(xml, 'tradition');

	for (const s of streamMatches) {
		const name = getText(s, 'name');
		if (!name) continue;

		// Get sprites
		const spiritMatch = s.match(/<spirits>([\s\S]*?)<\/spirits>/);
		const sprites = spiritMatch ? getElements(spiritMatch[1], 'spirit') : [];

		streams.push({
			name,
			drain: getText(s, 'drain') || 'WIL + RES',
			sprites,
			source: getText(s, 'source') || 'SR4',
			page: parseInt(getText(s, 'page')) || 0
		});
	}

	fs.writeFileSync(
		path.join(__dirname, '../static/data/streams.json'),
		JSON.stringify({ streams }, null, 2)
	);
	console.log(`  Converted ${streams.length} streams`);
}

// Main
console.log('Converting Chummer XML data files to JSON...\n');

try {
	convertBioware();
	convertVehicles();
	convertMartialArts();
	convertEchoes();
	convertStreams();
	console.log('\nConversion complete!');
} catch (error) {
	console.error('Error during conversion:', error.message);
	process.exit(1);
}
