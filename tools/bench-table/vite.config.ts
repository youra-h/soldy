import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import react from '@vitejs/plugin-react'
import solid from 'vite-plugin-solid'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import path from 'node:path'
import { angular } from '../../packages/playground/vue/src/vite-angular.ts'

/**
 * Стенд замера таблиц (см. benchmarks/table/README.md в корне). soldy берётся исходниками,
 * как в стенде разработчика; таблицы других библиотек — из своих зависимостей стенда.
 * Страница на фреймворк: `index.html` — участники на Vue, `react.html`, `angular.html`,
 * `svelte.html`, `solid.html` и `webc.html` — на своих.
 *
 * Фреймворки — по одной копии на всех (`dedupe`), иначе соседи принесли бы вторую:
 * адаптер из исходников взял бы фреймворк корня монорепо, а библиотеки — стенда.
 * Версии в стенде — те же, что в корне.
 *
 * Плагины фреймворков — каждый на свои файлы, как в стенде разработчика
 * (`packages/playground/vue/vite.base.ts`): `.tsx` у React и Solid одинаковые, и плагин
 * берёт только страницу своего фреймворка, его участников и исходники его адаптера.
 * Solid ещё компилирует `.jsx` пакетов — так Kobalte выпускает свои компоненты под
 * условием `solid`. Angular компилирует плагин стенда разработчика: компилятор Angular
 * по программе `tsconfig.angular.json` и линкер пакетов в частичной форме.
 *
 * `PROF=1` собирает без минификации в `dist-prof` — для профиля CPU.
 */
const pk = path.resolve(import.meta.dirname, '../../packages')
const page = (name: string) => path.resolve(import.meta.dirname, `${name}.html`)
export default defineConfig({
	root: import.meta.dirname,
	plugins: [
		vue(),
		react({
			include: [
				/\/bench-table\/react\.tsx$/,
				/\/bench-table\/libs\/react\/.+\.tsx?$/,
				/\/ui\/react\/src\/.+\.[jt]sx?$/,
			],
		}),
		solid({
			hot: false,
			include: [
				/\/bench-table\/solid\.tsx$/,
				/\/bench-table\/libs\/solid\/.+\.tsx?$/,
				/\/ui\/solid\/src\/.+\.[jt]sx?$/,
				/\/node_modules\/.+\.jsx$/,
			],
		}),
		svelte(),
		angular({
			tsconfig: path.resolve(import.meta.dirname, 'tsconfig.angular.json'),
			include: [
				/\/bench-table\/angular\.ts$/,
				/\/bench-table\/libs\/angular\/.+\.ts$/,
				/\/ui\/angular\/src\/.+\.ts$/,
			],
		}),
	],
	resolve: {
		dedupe: [
			'vue',
			'react',
			'react-dom',
			'solid-js',
			'svelte',
			'@angular/core',
			'@angular/common',
			'@angular/platform-browser',
			'@angular/forms',
			'@angular/router',
			'rxjs',
		],
		alias: {
			// Раньше корня пакета: алиас сравнивается префиксом
			'@soldy-ui/theme-oren/setup': path.join(pk, 'themes/oren/setup/index.ts'),
			'@soldy-ui/theme-oren': path.join(pk, 'themes/oren/dist/index.css'),
			// Плагины раскладки, которые ставит поведение темы
			'@soldy-ui/theme-base/setup': path.join(pk, 'themes/base/setup/index.ts'),
			'@soldy-ui/core': path.join(pk, 'core/src'),
			'@soldy-ui/icons-material': path.join(pk, 'icons/material/src'),
			'@soldy-ui/plugins': path.join(pk, 'plugins/src'),
			'@soldy-ui/setup': path.join(pk, 'setup/index.ts'),
			'@soldy-ui/vue': path.join(pk, 'ui/vue/src/index.ts'),
			'@soldy-ui/react': path.join(pk, 'ui/react/src/index.ts'),
			'@soldy-ui/angular': path.join(pk, 'ui/angular/src/index.ts'),
			'@soldy-ui/svelte': path.join(pk, 'ui/svelte/src/index.ts'),
			'@soldy-ui/solid': path.join(pk, 'ui/solid/src/index.ts'),
			'@soldy-ui/webc': path.join(pk, 'ui/webc/src/index.ts'),
		},
	},
	build: {
		target: 'esnext',
		outDir: process.env.PROF ? 'dist-prof' : 'dist',
		emptyOutDir: true,
		minify: !process.env.PROF,
		rollupOptions: {
			input: {
				index: page('index'),
				react: page('react'),
				angular: page('angular'),
				svelte: page('svelte'),
				solid: page('solid'),
				webc: page('webc'),
			},
		},
	},
})
