import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess(),

	kit: {
		adapter: adapter({
			pages: 'build',
			assets: 'build',
			fallback: 'index.html',
			precompress: false,
			strict: true
		}),
		alias: {
			$components: 'src/lib/components',
			$stores: 'src/lib/stores',
			$engine: 'src/lib/engine',
			$firebase: 'src/lib/firebase',
			$types: 'src/lib/types',
			$xml: 'src/lib/xml',
			$styles: 'src/lib/styles',
			$data: 'static/data'
		}
	}
};

export default config;
