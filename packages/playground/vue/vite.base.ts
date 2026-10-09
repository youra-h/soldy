import vue from '@vitejs/plugin-vue'
import react from '@vitejs/plugin-react'
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
 * React и (дальше) Solid одинаковые: плагин фреймворка берёт только папку
 * своего хоста и исходники своего адаптера (`include`), иначе соседний
 * компилировал бы чужой JSX. Пути модулей Vite отдаёт с прямыми слешами.
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
		'@soldy-ui/playground-shared': resolve('../shared/src/index.ts'),
	}
}
