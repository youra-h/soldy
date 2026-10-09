import { defineConfig } from 'vite'
import { openInEditor } from './src/vite-open-in-editor.ts'
import { aliases, plugins } from './vite.base.ts'

/**
 * Стенд потребляет соседние воркспейсы **исходниками**, а не сборкой: правка в
 * `packages/core` видна сразу, без промежуточного билда. Исключение — тема: она
 * отдаёт готовый `dist/index.css`, поэтому её нужно держать в watch
 * (`npm run dev` из корня запускает и то и другое).
 *
 * Плагины и алиасы — общие с конфигами тестов (`vite.base.ts`).
 */
export default defineConfig({
	plugins: [...plugins(), openInEditor()],
	resolve: {
		alias: aliases({ themeCss: true }),
	},
})
