import vue from '@vitejs/plugin-vue'
import react from '@vitejs/plugin-react'
import solid from 'vite-plugin-solid'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import path from 'node:path'
import type { PluginOption } from 'vite'

/**
 * Плагины и алиасы стенда — одни на три конфига: dev-сервер и сборку
 * (`vite.config.ts`), дымовые тесты в jsdom (`vitest.config.ts`) и браузерный
 * прогон (`vitest.browser.config.ts`). Пока у каждого был свой список, они
 * расходились молча: хост фреймворка, подключённый в одном, падал бы в
 * другом.
 *
 * Стенд потребляет соседние воркспейсы **исходниками**, а не сборкой: правка в
 * `packages/core` видна сразу, без промежуточного билда.
 */

const resolve = (to: string) => path.resolve(import.meta.dirname, to)

/**
 * Плагины фреймворков — каждый на свои папки.
 *
 * Оболочка стенда — Vue, а хосты превью — на своих фреймворках, и `.tsx` у
 * React и Solid одинаковые: плагин фреймворка берёт только папку своего хоста
 * и исходники своего адаптера (`include`), иначе соседний компилировал бы чужой
 * JSX. Пути модулей Vite отдаёт с прямыми слешами.
 *
 * Горячей замены у Solid нет (`hot: false`): solid-refresh ломается вне
 * dev-сервера, а плагины одни на dev-сервер и оба прогона тестов. Правка хоста
 * Solid или его адаптера перезагружает страницу стенда.
 *
 * У Svelte файлы свои — `.svelte` и модули с рунами `.svelte.ts`, — и они
 * есть только в хосте Svelte и исходниках его адаптера: плагину Svelte делить
 * нечего, и `include` ему не нужен. Конфиг Svelte он берёт отсюда же — им
 * пользуется и svelte-check хоста.
 */
export function plugins(): PluginOption[] {
	return [
		vue(),
		react({
			include: [
				/\/playground\/vue\/src\/hosts\/react\/.+\.[jt]sx?$/,
				/\/ui\/react\/src\/.+\.[jt]sx?$/,
			],
		}),
		solid({
			hot: false,
			include: [
				/\/playground\/vue\/src\/hosts\/solid\/.+\.[jt]sx?$/,
				/\/ui\/solid\/src\/.+\.[jt]sx?$/,
			],
		}),
		svelte(),
	]
}

/**
 * Алиасы на исходники соседей.
 *
 * Тема отдаёт готовый `dist/index.css`: её корень — CSS, и подключают его
 * только dev-сервер и браузерный прогон (`themeCss`). В jsdom стилей нет, и
 * тему туда не тянем. `/setup` темы — раньше корня пакета: алиас сравнивается
 * префиксом.
 */
export function aliases({ themeCss }: { themeCss: boolean }): Record<string, string> {
	return {
		'@soldy-ui/theme-oren/setup': resolve('../../themes/oren/setup/index.ts'),
		...(themeCss
			? { '@soldy-ui/theme-oren': resolve('../../themes/oren/dist/index.css') }
			: {}),
		'@soldy-ui/core': resolve('../../core/src'),
		'@soldy-ui/icons-material': resolve('../../icons/material/src'),
		'@soldy-ui/plugins': resolve('../../plugins/src'),
		'@soldy-ui/setup': resolve('../../setup/index.ts'),
		'@soldy-ui/vue': resolve('../../ui/vue/src/index.ts'),
		'@soldy-ui/react': resolve('../../ui/react/src/index.ts'),
		'@soldy-ui/solid': resolve('../../ui/solid/src/index.ts'),
		'@soldy-ui/svelte': resolve('../../ui/svelte/src/index.ts'),
		'@soldy-ui/webc': resolve('../../ui/webc/src/index.ts'),
		'@soldy-ui/playground-shared': resolve('../shared/src/index.ts'),
	}
}
