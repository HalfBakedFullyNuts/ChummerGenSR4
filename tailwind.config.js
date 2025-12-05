/** @type {import('tailwindcss').Config} */
export default {
	content: ['./src/**/*.{html,js,svelte,ts}'],
	theme: {
		extend: {
			colors: {
				// Background colors - Light Mode
				background: {
					DEFAULT: '#F5F5F5',
					paper: '#FFFFFF',
					elevated: '#FFFFFF'
				},
				// Surface/Panel colors
				surface: {
					DEFAULT: '#FFFFFF',
					variant: '#FAFAFA',
					elevated: '#FFFFFF'
				},
				// Border colors
				border: {
					DEFAULT: '#E0E0E0',
					light: '#EEEEEE',
					dark: '#BDBDBD'
				},
				// Text colors - Light Mode
				text: {
					primary: '#212121',
					secondary: '#616161',
					muted: '#9E9E9E',
					disabled: '#BDBDBD'
				},
				// Primary - Cyan
				primary: {
					main: '#00e5ff',
					light: '#33EAFF',
					dark: '#00A0B2',
					contrast: '#000000'
				},
				// Secondary - Blue
				secondary: {
					main: '#58A6FF',
					light: '#79B7FF',
					dark: '#79B7FF',
					contrast: '#FFFFFF'
				},
				// Error - Red
				error: {
					main: '#F85149',
					light: '#F9736D',
					dark: '#AD3833',
					contrast: '#FFFFFF'
				},
				// Warning - Amber
				warning: {
					main: '#D29922',
					light: '#DBAD4E',
					dark: '#936B17',
					contrast: '#000000'
				},
				// Success - Green
				success: {
					main: '#2EA043',
					light: '#57B368',
					dark: '#20702E',
					contrast: '#FFFFFF'
				},
				// Info - Purple
				info: {
					main: '#A371F7',
					light: '#B58DF8',
					dark: '#724FAC',
					contrast: '#FFFFFF'
				},
				// Gray scale
				gray: {
					50: '#FAFAFA',
					100: '#F5F5F5',
					200: '#EEEEEE',
					300: '#E0E0E0',
					400: '#BDBDBD',
					500: '#9E9E9E',
					600: '#757575',
					700: '#616161',
					800: '#424242',
					900: '#212121'
				}
			},
			fontFamily: {
				display: ['Roboto Mono', 'monospace'],
				mono: ['Roboto Mono', 'monospace'],
				body: ['Roboto Mono', 'monospace']
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
				'sm': '0 1px 2px 0 rgb(0 0 0 / 0.05)',
				'DEFAULT': '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
				'md': '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
				'lg': '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
				'xl': '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
				'primary': '0 4px 14px 0 rgba(0, 229, 255, 0.25)',
				'primary-hover': '0 6px 20px 0 rgba(0, 229, 255, 0.35)',
				'error': '0 4px 14px 0 rgba(248, 81, 73, 0.25)'
			}
		}
	},
	plugins: [
		require('@tailwindcss/forms')({ strategy: 'class' }),
		require('@tailwindcss/typography')
	]
};
