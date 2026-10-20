import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import react from '@vitejs/plugin-react'
import path from 'node:path'

/**
 * Стенд замера таблиц (см. benchmarks/table.md в корне). soldy берётся исходниками,
 * как в стенде Vue; таблицы других библиотек — из своих зависимостей стенда.
 * Страниц две: `index.html` — участники на Vue, `react.html` — на React.
 * Vue и React — по одному на всех (`dedupe`), иначе соседи принесли бы
 * вторую копию: адаптер React из исходников взял бы React корня монорепо.
 * `PROF=1` собирает без минификации в `dist-prof` — для профиля CPU.
 */
const pk = path.resolve(import.meta.dirname, '../../packages')
export default defineConfig({
	root: import.meta.dirname,
	plugins: [vue(), react()],
	resolve: {
		dedupe: ['vue', 'react', 'react-dom'],
		alias: {
			// Раньше корня пакета: алиас сравнивается префиксом
			'@soldy-ui/theme-oren/setup': path.join(pk, 'themes/oren/setup/index.ts'),
			'@soldy-ui/theme-oren': path.join(pk, 'themes/oren/dist/index.css'),
			'@soldy-ui/core': path.join(pk, 'core/src'),
			'@soldy-ui/icons-material': path.join(pk, 'icons/material/src'),
			'@soldy-ui/plugins': path.join(pk, 'plugins/src'),
			'@soldy-ui/setup': path.join(pk, 'setup/index.ts'),
			'@soldy-ui/vue': path.join(pk, 'ui/vue/src/index.ts'),
			'@soldy-ui/react': path.join(pk, 'ui/react/src/index.ts'),
		},
	},
	build: {
		target: 'esnext',
		outDir: process.env.PROF ? 'dist-prof' : 'dist',
		emptyOutDir: true,
		minify: !process.env.PROF,
		rollupOptions: {
			input: {
				index: path.resolve(import.meta.dirname, 'index.html'),
				react: path.resolve(import.meta.dirname, 'react.html'),
			},
		},
	},
})
