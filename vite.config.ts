import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	plugins: [sveltekit()],
	test: {
		include: ['src/**/*.{test,spec}.{js,ts}'],
		globals: true,
		environment: 'jsdom',
		coverage: {
			provider: 'v8',
			reporter: ['text', 'html'],
			exclude: ['node_modules/', 'src/**/*.svelte']
		}
	},
	build: {
		target: 'esnext',
		minify: 'esbuild'
	},
	server: {
		port: 3000,
		strictPort: false
	}
});
