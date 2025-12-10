import js from '@eslint/js';
import ts from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import svelte from 'eslint-plugin-svelte';
import svelteParser from 'svelte-eslint-parser';
import prettier from 'eslint-config-prettier';

export default [
	js.configs.recommended,
	prettier,
	{
		ignores: [
			'.svelte-kit/**',
			'build/**',
			'node_modules/**',
			'*.config.js'
		]
	},
	{
		files: ['**/*.ts'],
		languageOptions: {
			parser: tsParser,
			parserOptions: {
				project: './tsconfig.json'
			}
		},
		plugins: {
			'@typescript-eslint': ts
		},
		rules: {
			...ts.configs.strict.rules,
			'@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
			'@typescript-eslint/explicit-function-return-type': 'error',
			'@typescript-eslint/no-explicit-any': 'error',
			'@typescript-eslint/strict-boolean-expressions': 'error',
			'no-console': ['warn', { allow: ['warn', 'error'] }],
			'max-lines-per-function': ['error', { max: 60, skipBlankLines: true, skipComments: true }],
			'complexity': ['error', 10],
			'max-depth': ['error', 3]
		}
	},
	{
		files: ['**/*.svelte'],
		languageOptions: {
			parser: svelteParser,
			parserOptions: {
				parser: tsParser
			},
			globals: {
				window: 'readonly',
				document: 'readonly',
				console: 'readonly',
				CustomEvent: 'readonly',
				HTMLInputElement: 'readonly',
				HTMLTextAreaElement: 'readonly',
				HTMLElement: 'readonly',
				Event: 'readonly',
				KeyboardEvent: 'readonly',
				MouseEvent: 'readonly',
				setTimeout: 'readonly',
				clearTimeout: 'readonly',
				setInterval: 'readonly',
				clearInterval: 'readonly',
				requestAnimationFrame: 'readonly',
				cancelAnimationFrame: 'readonly',
				fetch: 'readonly',
				localStorage: 'readonly',
				sessionStorage: 'readonly',
				navigator: 'readonly',
				location: 'readonly',
				history: 'readonly',
				URL: 'readonly',
				URLSearchParams: 'readonly',
				FormData: 'readonly',
				File: 'readonly',
				FileReader: 'readonly',
				Blob: 'readonly',
				DOMParser: 'readonly',
				Element: 'readonly',
				Node: 'readonly',
				NodeList: 'readonly',
				MutationObserver: 'readonly',
				ResizeObserver: 'readonly',
				IntersectionObserver: 'readonly',
				confirm: 'readonly',
				alert: 'readonly'
			}
		},
		plugins: {
			svelte
		},
		rules: {
			...svelte.configs.recommended.rules,
			'no-inner-declarations': 'off'
		}
	}
];
