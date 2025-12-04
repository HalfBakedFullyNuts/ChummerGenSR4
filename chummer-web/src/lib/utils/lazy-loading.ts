/**
 * Lazy Loading Utilities
 * ======================
 * Performance optimization through lazy loading and code splitting.
 */

import { browser } from '$app/environment';

/**
 * Lazy load a component when it enters the viewport.
 * Returns a Svelte action.
 */
export function lazyLoad(
	node: HTMLElement,
	options: {
		onLoad: () => void;
		threshold?: number;
		rootMargin?: string;
	}
): { destroy: () => void } {
	if (!browser || !('IntersectionObserver' in window)) {
		// Fallback: load immediately if no IntersectionObserver
		options.onLoad();
		return { destroy: () => {} };
	}

	const observer = new IntersectionObserver(
		(entries) => {
			entries.forEach((entry) => {
				if (entry.isIntersecting) {
					options.onLoad();
					observer.disconnect();
				}
			});
		},
		{
			threshold: options.threshold ?? 0,
			rootMargin: options.rootMargin ?? '100px'
		}
	);

	observer.observe(node);

	return {
		destroy() {
			observer.disconnect();
		}
	};
}

/**
 * Preload a module when idle or after a delay.
 */
export function preloadWhenIdle<T>(
	loader: () => Promise<T>,
	delay: number = 2000
): void {
	if (!browser) return;

	if ('requestIdleCallback' in window) {
		(window as any).requestIdleCallback(() => {
			loader().catch(() => {
				// Silently fail preload - it's just an optimization
			});
		});
	} else {
		setTimeout(() => {
			loader().catch(() => {});
		}, delay);
	}
}

/**
 * Create a lazy-loaded store that only fetches data when subscribed.
 */
export function lazyStore<T>(
	fetcher: () => Promise<T>,
	initialValue: T
): {
	subscribe: (fn: (value: T) => void) => () => void;
	refresh: () => Promise<void>;
} {
	let value = initialValue;
	let subscribers = new Set<(value: T) => void>();
	let loaded = false;
	let loading = false;

	async function load(): Promise<void> {
		if (loading || loaded) return;
		loading = true;

		try {
			value = await fetcher();
			loaded = true;
			subscribers.forEach((fn) => fn(value));
		} catch (error) {
			console.error('Lazy store load failed:', error);
		} finally {
			loading = false;
		}
	}

	return {
		subscribe(fn: (value: T) => void) {
			subscribers.add(fn);
			fn(value);

			// Load on first subscription
			if (!loaded && !loading) {
				load();
			}

			return () => {
				subscribers.delete(fn);
			};
		},

		async refresh(): Promise<void> {
			loaded = false;
			await load();
		}
	};
}

/**
 * Debounce a function call.
 */
export function debounce<T extends (...args: any[]) => any>(
	fn: T,
	delay: number
): (...args: Parameters<T>) => void {
	let timeoutId: ReturnType<typeof setTimeout>;

	return (...args: Parameters<T>) => {
		clearTimeout(timeoutId);
		timeoutId = setTimeout(() => fn(...args), delay);
	};
}

/**
 * Throttle a function call.
 */
export function throttle<T extends (...args: any[]) => any>(
	fn: T,
	limit: number
): (...args: Parameters<T>) => void {
	let inThrottle = false;

	return (...args: Parameters<T>) => {
		if (!inThrottle) {
			fn(...args);
			inThrottle = true;
			setTimeout(() => {
				inThrottle = false;
			}, limit);
		}
	};
}

/**
 * Memoize a function result.
 */
export function memoize<T extends (...args: any[]) => any>(
	fn: T,
	keyFn?: (...args: Parameters<T>) => string
): T {
	const cache = new Map<string, ReturnType<T>>();

	return ((...args: Parameters<T>) => {
		const key = keyFn ? keyFn(...args) : JSON.stringify(args);

		if (cache.has(key)) {
			return cache.get(key)!;
		}

		const result = fn(...args);
		cache.set(key, result);
		return result;
	}) as T;
}

/**
 * Batch multiple updates into a single frame.
 */
export function batchUpdates(updates: (() => void)[]): void {
	if (!browser) {
		updates.forEach((fn) => fn());
		return;
	}

	requestAnimationFrame(() => {
		updates.forEach((fn) => fn());
	});
}

/**
 * Wait for the browser to be idle before executing.
 */
export function whenIdle(callback: () => void, timeout: number = 1000): void {
	if (!browser) {
		callback();
		return;
	}

	if ('requestIdleCallback' in window) {
		(window as any).requestIdleCallback(callback, { timeout });
	} else {
		setTimeout(callback, 50);
	}
}

/**
 * Image lazy loading with placeholder.
 */
export function lazyImage(
	node: HTMLImageElement,
	options: {
		src: string;
		placeholder?: string;
		threshold?: number;
	}
): { destroy: () => void; update: (opts: typeof options) => void } {
	let currentSrc = options.src;

	function load(src: string): void {
		const img = new Image();
		img.onload = () => {
			node.src = src;
			node.classList.remove('loading');
			node.classList.add('loaded');
		};
		img.onerror = () => {
			node.classList.remove('loading');
			node.classList.add('error');
		};
		img.src = src;
	}

	if (options.placeholder) {
		node.src = options.placeholder;
	}
	node.classList.add('loading');

	const observer = browser
		? new IntersectionObserver(
				(entries) => {
					entries.forEach((entry) => {
						if (entry.isIntersecting) {
							load(currentSrc);
							observer.disconnect();
						}
					});
				},
				{ threshold: options.threshold ?? 0, rootMargin: '50px' }
			)
		: null;

	if (observer) {
		observer.observe(node);
	} else {
		load(currentSrc);
	}

	return {
		destroy() {
			observer?.disconnect();
		},
		update(newOptions) {
			if (newOptions.src !== currentSrc) {
				currentSrc = newOptions.src;
				load(currentSrc);
			}
		}
	};
}

/**
 * Prefetch links when they come into view.
 */
export function prefetchLink(node: HTMLAnchorElement): { destroy: () => void } {
	if (!browser || !('IntersectionObserver' in window)) {
		return { destroy: () => {} };
	}

	let prefetched = false;

	const observer = new IntersectionObserver(
		(entries) => {
			entries.forEach((entry) => {
				if (entry.isIntersecting && !prefetched) {
					const href = node.getAttribute('href');
					if (href && href.startsWith('/')) {
						const link = document.createElement('link');
						link.rel = 'prefetch';
						link.href = href;
						document.head.appendChild(link);
						prefetched = true;
					}
					observer.disconnect();
				}
			});
		},
		{ rootMargin: '50px' }
	);

	observer.observe(node);

	return {
		destroy() {
			observer.disconnect();
		}
	};
}
