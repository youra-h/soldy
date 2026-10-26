import { defineConfig } from 'vitest/config'
import path from 'node:path'
import { subpathSources } from '../../../tools/vite/lib.config.ts'

export default defineConfig({
	resolve: {
		alias: {
			// The entries of the elements, before the package root: an alias is
			// matched by prefix
			...subpathSources({
				name: '@soldy-ui/webc',
				root: import.meta.dirname,
				entry: 'src/index.ts',
			}),
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
		setupFiles: ['./__tests__/setup.ts'],
	},
})
