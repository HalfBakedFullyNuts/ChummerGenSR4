/**
 * ChummerWeb Service Worker
 * =========================
 * Provides offline support with caching strategies.
 */

const CACHE_VERSION = 'v1';
const STATIC_CACHE = `chummer-static-${CACHE_VERSION}`;
const DATA_CACHE = `chummer-data-${CACHE_VERSION}`;
const RUNTIME_CACHE = `chummer-runtime-${CACHE_VERSION}`;

/** Static assets to cache immediately on install. */
const STATIC_ASSETS = [
	'/',
	'/manifest.json',
	'/favicon.svg',
	'/favicon.png',
	'/apple-touch-icon.png'
];

/** Game data files to cache. */
const DATA_ASSETS = [
	'/data/metatypes.json',
	'/data/skills.json',
	'/data/qualities.json',
	'/data/spells.json',
	'/data/powers.json',
	'/data/weapons.json',
	'/data/armor.json',
	'/data/cyberware.json',
	'/data/bioware.json',
	'/data/gear.json',
	'/data/vehicles.json',
	'/data/programs.json',
	'/data/echoes.json',
	'/data/mentors.json',
	'/data/traditions.json',
	'/data/streams.json',
	'/data/martialarts.json',
	'/data/lifestyles.json',
	'/data/metamagics.json'
];

/** Install event - cache static assets. */
self.addEventListener('install', (event) => {
	console.log('[SW] Installing service worker...');

	event.waitUntil(
		Promise.all([
			caches.open(STATIC_CACHE).then((cache) => {
				console.log('[SW] Caching static assets');
				return cache.addAll(STATIC_ASSETS);
			}),
			caches.open(DATA_CACHE).then((cache) => {
				console.log('[SW] Caching game data');
				return cache.addAll(DATA_ASSETS);
			})
		]).then(() => {
			console.log('[SW] Install complete');
			return self.skipWaiting();
		})
	);
});

/** Activate event - clean up old caches. */
self.addEventListener('activate', (event) => {
	console.log('[SW] Activating service worker...');

	event.waitUntil(
		caches.keys().then((cacheNames) => {
			return Promise.all(
				cacheNames
					.filter((name) => {
						return (
							name.startsWith('chummer-') &&
							name !== STATIC_CACHE &&
							name !== DATA_CACHE &&
							name !== RUNTIME_CACHE
						);
					})
					.map((name) => {
						console.log('[SW] Deleting old cache:', name);
						return caches.delete(name);
					})
			);
		}).then(() => {
			console.log('[SW] Activate complete');
			return self.clients.claim();
		})
	);
});

/** Fetch event - serve from cache, fallback to network. */
self.addEventListener('fetch', (event) => {
	const url = new URL(event.request.url);

	// Skip non-GET requests
	if (event.request.method !== 'GET') {
		return;
	}

	// Skip Firebase/external requests
	if (
		url.hostname.includes('firebase') ||
		url.hostname.includes('googleapis') ||
		url.hostname.includes('gstatic')
	) {
		return;
	}

	// Strategy: Cache-first for static and data assets
	if (isStaticAsset(url) || isDataAsset(url)) {
		event.respondWith(cacheFirst(event.request));
		return;
	}

	// Strategy: Network-first for HTML pages (SPA routes)
	if (event.request.mode === 'navigate' || event.request.headers.get('accept')?.includes('text/html')) {
		event.respondWith(networkFirst(event.request));
		return;
	}

	// Strategy: Stale-while-revalidate for other assets
	event.respondWith(staleWhileRevalidate(event.request));
});

/** Check if URL is a static asset. */
function isStaticAsset(url) {
	const path = url.pathname;
	return (
		path.endsWith('.js') ||
		path.endsWith('.css') ||
		path.endsWith('.png') ||
		path.endsWith('.svg') ||
		path.endsWith('.woff2') ||
		path.endsWith('.woff') ||
		path === '/manifest.json'
	);
}

/** Check if URL is a game data asset. */
function isDataAsset(url) {
	return url.pathname.startsWith('/data/') && url.pathname.endsWith('.json');
}

/** Cache-first strategy. */
async function cacheFirst(request) {
	const cached = await caches.match(request);
	if (cached) {
		return cached;
	}

	try {
		const response = await fetch(request);
		if (response.ok) {
			const cache = await caches.open(RUNTIME_CACHE);
			cache.put(request, response.clone());
		}
		return response;
	} catch (error) {
		console.error('[SW] Cache-first fetch failed:', error);
		return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
	}
}

/** Network-first strategy with offline fallback. */
async function networkFirst(request) {
	try {
		const response = await fetch(request);
		if (response.ok) {
			const cache = await caches.open(RUNTIME_CACHE);
			cache.put(request, response.clone());
		}
		return response;
	} catch (error) {
		console.log('[SW] Network-first: falling back to cache');
		const cached = await caches.match(request);
		if (cached) {
			return cached;
		}

		// Return the cached index.html for SPA navigation
		const indexCached = await caches.match('/');
		if (indexCached) {
			return indexCached;
		}

		return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
	}
}

/** Stale-while-revalidate strategy. */
async function staleWhileRevalidate(request) {
	const cache = await caches.open(RUNTIME_CACHE);
	const cached = await cache.match(request);

	const fetchPromise = fetch(request)
		.then((response) => {
			if (response.ok) {
				cache.put(request, response.clone());
			}
			return response;
		})
		.catch(() => null);

	return cached || fetchPromise || new Response('Offline', { status: 503 });
}

/** Handle messages from clients. */
self.addEventListener('message', (event) => {
	if (event.data === 'skipWaiting') {
		self.skipWaiting();
	}

	if (event.data === 'getVersion') {
		event.ports[0].postMessage({ version: CACHE_VERSION });
	}
});
