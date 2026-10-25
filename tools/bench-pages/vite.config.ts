import { defineConfig } from 'vite'
import path from 'node:path'
import { aliases, constants, plugins } from '../../packages/playground/vue/vite.base.ts'

/**
 * Стенд замера страниц (см. benchmarks/pages/README.md в корне). Компоненты
 * рисуют хосты превью стенда разработчика — их превью с типовыми данными есть
 * у всех шести фреймворков, — поэтому плагины,
 * константы и алиасы те же (`packages/playground/vue/vite.base.ts`): плагин
 * каждого фреймворка берёт папку своего хоста и исходники своего адаптера.
 * Своих файлов фреймворков у стенда нет — страница одна (`index.html`), а
 * хост фреймворка она грузит лениво по `?fw=`.
 *
 * Продакшн-сборка, как у стенда таблиц: меряется то, что получит приложение.
 */
export default defineConfig({
	root: import.meta.dirname,
	plugins: plugins(),
	define: constants(),
	resolve: { alias: aliases({ themeCss: true }) },
	build: {
		target: 'esnext',
		outDir: path.resolve(import.meta.dirname, 'dist'),
		emptyOutDir: true,
	},
	logLevel: 'warn',
})
