import { defineConfig } from 'vitest/config'
import path from 'node:path'

export default defineConfig({
	resolve: {
		alias: {
			'@soldy-ui/core': path.resolve(import.meta.dirname, '../../core/src'),
			'@soldy-ui/icons-material': path.resolve(
				import.meta.dirname,
				'../../icons/material/src',
			),
			'@soldy-ui/plugins': path.resolve(import.meta.dirname, '../../plugins/src'),
			'@soldy-ui/setup': path.resolve(import.meta.dirname, '../../setup/index.ts'),
			'@soldy-ui/webc': path.resolve(import.meta.dirname, 'src/index.ts'),
		},
	},
	test: {
		environment: 'jsdom',
		include: ['__tests__/**/*.spec.ts'],
	},
})
