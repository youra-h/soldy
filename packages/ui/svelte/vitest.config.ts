import { defineConfig } from 'vitest/config'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import path from 'node:path'

export default defineConfig({
	plugins: [svelte()],
	resolve: {
		conditions: ['browser'],
		alias: {
			'@soldy-ui/core': path.resolve(__dirname, '../../core/src'),
			'@soldy-ui/icons-material': path.resolve(__dirname, '../../icons/material/src'),
			'@soldy-ui/plugins': path.resolve(__dirname, '../../plugins/src'),
			'@soldy-ui/setup': path.resolve(__dirname, '../../setup'),
			'@soldy-ui/svelte': path.resolve(__dirname, 'src/index.ts'),
		},
	},
	test: {
		environment: 'jsdom',
		include: ['__tests__/**/*.spec.ts'],
	},
})
