import { defineConfig } from 'vitest/config'
import solid from 'vite-plugin-solid'
import path from 'node:path'

export default defineConfig({
	// hot: false — solid-refresh ломается вне dev-сервера
	plugins: [solid({ hot: false })],
	resolve: {
		// Solid отдаёт разные сборки по условиям экспорта; без 'development'
		// в тестах подключится server-рантайм без DOM.
		conditions: ['development', 'browser'],
		alias: {
			'@soldy/accessor': path.resolve(__dirname, '../../accessor'),
			'@soldy/core': path.resolve(__dirname, '../../core/src'),
			'@soldy/icons-material': path.resolve(__dirname, '../../icons/material/src'),
			'@soldy/plugins': path.resolve(__dirname, '../../plugins/src'),
			'@soldy/setup': path.resolve(__dirname, '../../setup'),
			'@soldy/ui-solid': path.resolve(__dirname, 'src/index.ts'),
		},
	},
	test: {
		environment: 'jsdom',
		include: ['__tests__/**/*.spec.tsx'],
	},
})
