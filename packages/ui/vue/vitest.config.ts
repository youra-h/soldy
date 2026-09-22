import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import path from 'node:path'

export default defineConfig({
	plugins: [vue()],
	resolve: {
		alias: {
			'@soldy-ui/vue': path.resolve(__dirname, 'src/index.ts'),
			'@soldy-ui/core': path.resolve(__dirname, '../../core/src'),
			'@soldy-ui/icons-material': path.resolve(__dirname, '../../icons/material/src'),
			'@soldy-ui/plugins': path.resolve(__dirname, '../../plugins/src'),
			'@soldy-ui/setup': path.resolve(__dirname, '../../setup/index.ts'),
		},
	},
	test: {
		environment: 'jsdom',
		environmentOptions: {
			jsdom: { pretendToBeVisual: true },
		},
		setupFiles: ['./__tests__/setup.ts'],
		include: ['__tests__/**/*.spec.ts'],
	},
})
