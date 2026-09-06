import { defineConfig } from 'vitest/config'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import path from 'node:path'

export default defineConfig({
	plugins: [svelte()],
	resolve: {
		conditions: ['browser'],
		alias: {
			'@soldy/accessor': path.resolve(__dirname, '../../accessor'),
			'@soldy/core': path.resolve(__dirname, '../../core/src'),
			'@soldy/icons': path.resolve(__dirname, '../../icons/src'),
			'@soldy/plugins': path.resolve(__dirname, '../../plugins/src'),
			'@soldy/setup': path.resolve(__dirname, '../../setup'),
			'@soldy/ui-svelte': path.resolve(__dirname, 'src/index.ts'),
		},
	},
	test: {
		environment: 'jsdom',
		include: ['__tests__/**/*.spec.ts'],
	},
})
