import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import path from 'node:path'

/**
 * Тесты стенда — дымовые: он существует ради того, чтобы дёргать компоненты, и
 * молча сломавшаяся страница обесценивает его целиком. Тему сюда не тянем: она
 * отдаёт CSS, а в jsdom стилей всё равно нет.
 */
export default defineConfig({
	plugins: [vue()],
	test: {
		environment: 'jsdom',
		environmentOptions: {
			jsdom: { pretendToBeVisual: true },
		},
		setupFiles: ['./__tests__/setup.ts'],
	},
	resolve: {
		alias: {
			'@soldy/accessor': path.resolve(import.meta.dirname, '../../accessor'),
			'@soldy/core': path.resolve(import.meta.dirname, '../../core/src'),
			'@soldy/icons-material': path.resolve(import.meta.dirname, '../../icons/material/src'),
			'@soldy/plugins': path.resolve(import.meta.dirname, '../../plugins/src'),
			'@soldy/setup': path.resolve(import.meta.dirname, '../../setup/index.ts'),
			'@soldy/ui-vue': path.resolve(import.meta.dirname, '../../ui/vue/src/index.ts'),
			'@soldy/playground-shared': path.resolve(import.meta.dirname, '../shared/src/index.ts'),
		},
	},
})
