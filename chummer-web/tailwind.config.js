/** @type {import('tailwindcss').Config} */
export default {
	content: ['./src/**/*.{html,js,svelte,ts}'],
	theme: {
		extend: {
			colors: {
				// Core Colors - Corp Blue Theme
				background: '#0A0E14',
				panel: {
					DEFAULT: '#0F1419',
					elevated: '#141A21'
				},
				border: {
					DEFAULT: '#1E2A36',
					subtle: '#162029'
				},
				text: {
					primary: '#E6EDF3',
					secondary: '#8B949E',
					muted: '#6E7681'
				},
				// Accent Colors
				accent: {
					primary: '#58A6FF',
					secondary: '#1F6FEB',
					cyan: '#39C5CF',
					teal: '#2EA043',
					amber: '#D29922',
					orange: '#DB6D28',
					red: '#F85149',
					purple: '#A371F7'
				},
				// Semantic Colors
				success: '#2EA043',
				warning: '#D29922',
				error: '#F85149',
				info: '#58A6FF',
				// Glow Colors
				glow: {
					primary: 'rgba(88, 166, 255, 0.4)',
					secondary: 'rgba(31, 111, 235, 0.3)',
					cyan: 'rgba(57, 197, 207, 0.4)',
					success: 'rgba(46, 160, 67, 0.4)',
					warning: 'rgba(210, 153, 34, 0.4)',
					error: 'rgba(248, 81, 73, 0.4)'
				}
			},
			fontFamily: {
				heading: ['Chakra Petch', 'monospace'],
				body: ['Exo 2', 'sans-serif'],
				mono: ['JetBrains Mono', 'monospace'],
				cyber: ['Cyber', 'sans-serif']
			},
			fontSize: {
				xs: '0.75rem',
				sm: '0.875rem',
				base: '1rem',
				lg: '1.125rem',
				xl: '1.25rem',
				'2xl': '1.5rem',
				'3xl': '1.875rem',
				'4xl': '2.25rem'
			},
			spacing: {
				xs: '0.25rem',
				sm: '0.5rem',
				md: '1rem',
				lg: '1.5rem',
				xl: '2rem',
				'2xl': '3rem',
				'3xl': '4rem'
			},
			borderRadius: {
				sm: '2px',
				md: '4px',
				lg: '6px',
				xl: '8px'
			},
			transitionDuration: {
				fast: '150ms',
				normal: '250ms',
				slow: '400ms'
			},
			boxShadow: {
				'glow-primary': '0 0 15px rgba(88, 166, 255, 0.4)',
				'glow-cyan': '0 0 15px rgba(57, 197, 207, 0.4)',
				'glow-success': '0 0 15px rgba(46, 160, 67, 0.4)',
				'glow-warning': '0 0 15px rgba(210, 153, 34, 0.4)',
				'glow-error': '0 0 15px rgba(248, 81, 73, 0.4)'
			},
			animation: {
				'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
				flicker: 'flicker 4s linear infinite',
				glitch: 'glitch 0.2s ease-in-out'
			},
			keyframes: {
				'pulse-glow': {
					'0%, 100%': { boxShadow: '0 0 5px rgba(88, 166, 255, 0.4)' },
					'50%': { boxShadow: '0 0 20px rgba(88, 166, 255, 0.6), 0 0 30px rgba(88, 166, 255, 0.4)' }
				},
				flicker: {
					'0%, 19.999%, 22%, 62.999%, 64%, 64.999%, 70%, 100%': { opacity: '1' },
					'20%, 21.999%, 63%, 63.999%, 65%, 69.999%': { opacity: '0.5' }
				},
				glitch: {
					'0%': { transform: 'translate(0)', filter: 'hue-rotate(0deg)' },
					'20%': { transform: 'translate(-2px, 1px) skewX(1deg)', filter: 'hue-rotate(45deg)' },
					'40%': { transform: 'translate(2px, -1px)', filter: 'hue-rotate(-30deg)' },
					'60%': { transform: 'translate(-1px, 2px)', filter: 'hue-rotate(90deg)' },
					'80%': { transform: 'translate(1px, -2px)', filter: 'hue-rotate(20deg)' },
					'100%': { transform: 'translate(0)', filter: 'hue-rotate(0deg)' }
				}
			}
		}
	},
	plugins: [
		require('@tailwindcss/forms'),
		require('@tailwindcss/typography')
	]
};
