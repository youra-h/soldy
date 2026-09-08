import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'node:path'
import { openInEditor } from './src/vite-open-in-editor.ts'

/**
 * Стенд потребляет соседние воркспейсы **исходниками**, а не сборкой: правка в
 * `packages/core` видна сразу, без промежуточного билда. Исключение — тема: она
 * отдаёт готовый `dist/index.css`, поэтому её нужно держать в watch
 * (`npm run dev:vue` из корня запускает и то и другое).
 */
export default defineConfig({
	plugins: [vue(), openInEditor()],
	resolve: {
		alias: {
			'@soldy/theme-oren': path.resolve(
				import.meta.dirname,
				'../../themes/oren/dist/index.css',
			),
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
