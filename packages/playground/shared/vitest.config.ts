import { defineConfig } from 'vitest/config'
import path from 'node:path'

/**
 * Пакет потребляет исходники соседних воркспейсов напрямую, как это делают
 * тесты остальных пакетов: алиасы вместо сборки.
 */
export default defineConfig({
	resolve: {
		alias: {
			'@soldy/accessor': path.resolve(__dirname, '../../accessor'),
			'@soldy/core': path.resolve(__dirname, '../../core/src'),
			'@soldy/plugins': path.resolve(__dirname, '../../plugins/src'),
			'@soldy/setup': path.resolve(__dirname, '../../setup/index.ts'),
		},
	},
})
