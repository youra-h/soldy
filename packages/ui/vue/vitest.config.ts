import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import path from 'node:path'

export default defineConfig({
	plugins: [vue()],
	resolve: {
		alias: {
			'@soldy/ui-vue': path.resolve(__dirname, 'src/index.ts'),
			'@soldy/core': path.resolve(__dirname, '../../core/src'),
			'@soldy/foundation': path.resolve(__dirname, '../../foundation/src'),
			'@soldy/icons': path.resolve(__dirname, '../../icons/src'),
			'@soldy/plugins': path.resolve(__dirname, '../../plugins/src'),
			'@soldy/accessor': path.resolve(__dirname, '../../accessor/index.ts'),
			'@soldy/setup': path.resolve(__dirname, '../../setup/index.ts'),
		},
	},
	test: {
		environment: 'jsdom',
		environmentOptions: {
			jsdom: { pretendToBeVisual: true },
		},
		include: ['__tests__/**/*.spec.ts'],
	},
})
