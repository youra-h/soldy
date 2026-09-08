import { defineConfig } from 'vitest/config'
import path from 'node:path'

export default defineConfig({
	resolve: {
		alias: {
			'@soldy/accessor': path.resolve(__dirname, '../../accessor'),
			'@soldy/core': path.resolve(__dirname, '../../core/src'),
			'@soldy/icons-material': path.resolve(__dirname, '../../icons/material/src'),
			'@soldy/plugins': path.resolve(__dirname, '../../plugins/src'),
			'@soldy/setup': path.resolve(__dirname, '../../setup'),
			'@soldy/ui-webc': path.resolve(__dirname, 'src/index.ts'),
		},
	},
	test: {
		environment: 'jsdom',
		include: ['__tests__/**/*.spec.ts'],
	},
})
