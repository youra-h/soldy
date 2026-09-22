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
			// Раньше корня пакета: алиас сравнивается префиксом
			'@soldy-ui/theme-oren/setup': path.resolve(
				import.meta.dirname,
				'../../themes/oren/setup/index.ts',
			),
			'@soldy-ui/theme-oren': path.resolve(
				import.meta.dirname,
				'../../themes/oren/dist/index.css',
			),
			'@soldy-ui/core': path.resolve(import.meta.dirname, '../../core/src'),
			'@soldy-ui/icons-material': path.resolve(
				import.meta.dirname,
				'../../icons/material/src',
			),
			'@soldy-ui/plugins': path.resolve(import.meta.dirname, '../../plugins/src'),
			'@soldy-ui/setup': path.resolve(import.meta.dirname, '../../setup/index.ts'),
			'@soldy-ui/vue': path.resolve(import.meta.dirname, '../../ui/vue/src/index.ts'),
			'@soldy-ui/playground-shared': path.resolve(
				import.meta.dirname,
				'../shared/src/index.ts',
			),
		},
	},
})
