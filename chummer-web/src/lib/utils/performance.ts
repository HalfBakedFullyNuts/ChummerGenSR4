/**
 * Performance Monitoring Utilities
 * ================================
 * Tools for measuring and optimizing application performance.
 */

import { browser } from '$app/environment';

/**
 * Performance metrics store.
 */
interface PerformanceMetrics {
	readonly firstContentfulPaint: number | null;
	readonly largestContentfulPaint: number | null;
	readonly firstInputDelay: number | null;
	readonly cumulativeLayoutShift: number | null;
	readonly timeToInteractive: number | null;
}

let metrics: PerformanceMetrics = {
	firstContentfulPaint: null,
	largestContentfulPaint: null,
	firstInputDelay: null,
	cumulativeLayoutShift: null,
	timeToInteractive: null
};

/**
 * Initialize performance monitoring.
 */
export function initPerformanceMonitoring(): void {
	if (!browser || !('PerformanceObserver' in window)) return;

	// First Contentful Paint
	try {
		const fcpObserver = new PerformanceObserver((list) => {
			const entries = list.getEntries();
			const fcp = entries.find((e) => e.name === 'first-contentful-paint');
			if (fcp) {
				metrics = { ...metrics, firstContentfulPaint: fcp.startTime };
			}
		});
		fcpObserver.observe({ type: 'paint', buffered: true });
	} catch {
		// Not supported
	}

	// Largest Contentful Paint
	try {
		const lcpObserver = new PerformanceObserver((list) => {
			const entries = list.getEntries();
			const lastEntry = entries[entries.length - 1];
			if (lastEntry) {
				metrics = { ...metrics, largestContentfulPaint: lastEntry.startTime };
			}
		});
		lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
	} catch {
		// Not supported
	}

	// First Input Delay
	try {
		const fidObserver = new PerformanceObserver((list) => {
			const entries = list.getEntries();
			const firstInput = entries[0];
			if (firstInput) {
				const fid = (firstInput as any).processingStart - firstInput.startTime;
				metrics = { ...metrics, firstInputDelay: fid };
			}
		});
		fidObserver.observe({ type: 'first-input', buffered: true });
	} catch {
		// Not supported
	}

	// Cumulative Layout Shift
	try {
		let clsValue = 0;
		const clsObserver = new PerformanceObserver((list) => {
			for (const entry of list.getEntries()) {
				if (!(entry as any).hadRecentInput) {
					clsValue += (entry as any).value;
				}
			}
			metrics = { ...metrics, cumulativeLayoutShift: clsValue };
		});
		clsObserver.observe({ type: 'layout-shift', buffered: true });
	} catch {
		// Not supported
	}
}

/**
 * Get current performance metrics.
 */
export function getPerformanceMetrics(): PerformanceMetrics {
	return { ...metrics };
}

/**
 * Measure the execution time of a function.
 */
export function measureTime<T>(
	name: string,
	fn: () => T
): T {
	if (!browser || !performance.mark) {
		return fn();
	}

	const startMark = `${name}-start`;
	const endMark = `${name}-end`;

	performance.mark(startMark);
	const result = fn();
	performance.mark(endMark);

	performance.measure(name, startMark, endMark);

	// Clean up marks
	performance.clearMarks(startMark);
	performance.clearMarks(endMark);

	return result;
}

/**
 * Measure the execution time of an async function.
 */
export async function measureTimeAsync<T>(
	name: string,
	fn: () => Promise<T>
): Promise<T> {
	if (!browser || !performance.mark) {
		return fn();
	}

	const startMark = `${name}-start`;
	const endMark = `${name}-end`;

	performance.mark(startMark);
	const result = await fn();
	performance.mark(endMark);

	performance.measure(name, startMark, endMark);

	// Clean up marks
	performance.clearMarks(startMark);
	performance.clearMarks(endMark);

	return result;
}

/**
 * Log performance entries to console (for debugging).
 */
export function logPerformanceEntries(name?: string): void {
	if (!browser) return;

	const entries = name
		? performance.getEntriesByName(name)
		: performance.getEntries();

	console.group('Performance Entries');
	entries.forEach((entry) => {
		console.log(`${entry.name}: ${entry.duration?.toFixed(2) || entry.startTime.toFixed(2)}ms`);
	});
	console.groupEnd();
}

/**
 * Clear all performance entries.
 */
export function clearPerformanceEntries(): void {
	if (!browser) return;
	performance.clearMarks();
	performance.clearMeasures();
}

/**
 * Check if the page is visible.
 */
export function isPageVisible(): boolean {
	if (!browser) return true;
	return document.visibilityState === 'visible';
}

/**
 * Run a callback when the page becomes visible.
 */
export function onPageVisible(callback: () => void): () => void {
	if (!browser) return () => {};

	function handleVisibilityChange(): void {
		if (document.visibilityState === 'visible') {
			callback();
		}
	}

	document.addEventListener('visibilitychange', handleVisibilityChange);

	return () => {
		document.removeEventListener('visibilitychange', handleVisibilityChange);
	};
}

/**
 * Detect slow network connection.
 */
export function isSlowConnection(): boolean {
	if (!browser || !('connection' in navigator)) return false;

	const connection = (navigator as any).connection;
	if (!connection) return false;

	// Consider 2G or slower as "slow"
	const slowTypes = ['slow-2g', '2g'];
	return slowTypes.includes(connection.effectiveType);
}

/**
 * Get connection info.
 */
export function getConnectionInfo(): {
	effectiveType: string;
	downlink: number;
	rtt: number;
	saveData: boolean;
} | null {
	if (!browser || !('connection' in navigator)) return null;

	const connection = (navigator as any).connection;
	if (!connection) return null;

	return {
		effectiveType: connection.effectiveType || 'unknown',
		downlink: connection.downlink || 0,
		rtt: connection.rtt || 0,
		saveData: connection.saveData || false
	};
}

/**
 * Schedule a task during idle time.
 */
export function scheduleIdleTask(
	callback: () => void,
	options: { timeout?: number } = {}
): void {
	if (!browser) {
		callback();
		return;
	}

	if ('requestIdleCallback' in window) {
		(window as any).requestIdleCallback(callback, options);
	} else {
		setTimeout(callback, 1);
	}
}

/**
 * Run tasks in chunks to avoid blocking the main thread.
 */
export async function runInChunks<T, R>(
	items: T[],
	processor: (item: T) => R,
	chunkSize: number = 100,
	delayBetweenChunks: number = 0
): Promise<R[]> {
	const results: R[] = [];

	for (let i = 0; i < items.length; i += chunkSize) {
		const chunk = items.slice(i, i + chunkSize);
		const chunkResults = chunk.map(processor);
		results.push(...chunkResults);

		if (i + chunkSize < items.length && delayBetweenChunks > 0) {
			await new Promise((resolve) => setTimeout(resolve, delayBetweenChunks));
		}
	}

	return results;
}

/**
 * Memory usage info (Chrome only).
 */
export function getMemoryUsage(): {
	usedJSHeapSize: number;
	totalJSHeapSize: number;
	jsHeapSizeLimit: number;
} | null {
	if (!browser) return null;

	const memory = (performance as any).memory;
	if (!memory) return null;

	return {
		usedJSHeapSize: memory.usedJSHeapSize,
		totalJSHeapSize: memory.totalJSHeapSize,
		jsHeapSizeLimit: memory.jsHeapSizeLimit
	};
}
