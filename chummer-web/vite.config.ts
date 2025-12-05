import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	plugins: [sveltekit()],
	test: {
		include: ['src/**/*.{test,spec}.{js,ts}', 'tests/integration/**/*.{test,spec}.{js,ts}'],
		exclude: ['tests/e2e/**/*'],
		globals: true,
		environment: 'jsdom'
	},
	build: {
		target: 'esnext',
		minify: 'esbuild',
		/* Report compressed sizes */
		reportCompressedSize: true,
		/* Chunk size warning limit (500kb) */
		chunkSizeWarningLimit: 500
	},
	server: {
		port: 3000,
		strictPort: false
	},
	/* Optimize dependency pre-bundling */
	optimizeDeps: {
		include: ['firebase/app', 'firebase/auth', 'firebase/firestore']
	}
});
