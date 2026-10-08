import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'node:path'

/**
 * Стенд замера таблиц (см. BENCHMARKS.md в корне). soldy берётся исходниками,
 * как в стенде Vue; таблицы других библиотек — из своих зависимостей стенда.
 * Vue один на всех (`dedupe`), иначе соседи принесли бы вторую копию.
 * `PROF=1` собирает без минификации в `dist-prof` — для профиля CPU.
 */
const pk = path.resolve(import.meta.dirname, '../../packages')
export default defineConfig({
	root: import.meta.dirname,
	plugins: [vue()],
	resolve: {
		dedupe: ['vue'],
		alias: {
			// Раньше корня пакета: алиас сравнивается префиксом
			'@soldy-ui/theme-oren/setup': path.join(pk, 'themes/oren/setup/index.ts'),
			'@soldy-ui/theme-oren': path.join(pk, 'themes/oren/dist/index.css'),
			'@soldy-ui/core': path.join(pk, 'core/src'),
			'@soldy-ui/icons-material': path.join(pk, 'icons/material/src'),
			'@soldy-ui/plugins': path.join(pk, 'plugins/src'),
			'@soldy-ui/setup': path.join(pk, 'setup/index.ts'),
			'@soldy-ui/vue': path.join(pk, 'ui/vue/src/index.ts'),
		},
	},
	build: {
		target: 'esnext',
		outDir: process.env.PROF ? 'dist-prof' : 'dist',
		emptyOutDir: true,
		minify: !process.env.PROF,
	},
})
