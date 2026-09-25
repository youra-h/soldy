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
			'@soldy-ui/core': path.resolve(import.meta.dirname, '../../core/src'),
			'@soldy-ui/icons-material': path.resolve(
				import.meta.dirname,
				'../../icons/material/src',
			),
			'@soldy-ui/plugins': path.resolve(import.meta.dirname, '../../plugins/src'),
			'@soldy-ui/setup': path.resolve(import.meta.dirname, '../../setup/index.ts'),
			'@soldy-ui/solid': path.resolve(import.meta.dirname, 'src/index.ts'),
		},
	},
	test: {
		environment: 'jsdom',
		include: ['__tests__/**/*.spec.tsx'],
	},
})
