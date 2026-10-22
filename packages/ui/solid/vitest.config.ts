import { defineConfig } from 'vitest/config'
import solid, { type Options } from 'vite-plugin-solid'
import type { Plugin } from 'vite'
import path from 'node:path'

/**
 * Три прогона одних исходников — у каждого своя сборка JSX.
 *
 * - `client` — jsdom: JSX собран для браузера (`generate: 'dom'`). Solid
 *   отдаёт разные сборки по условиям экспорта, и без `development` и
 *   `browser` в тестах подключился бы серверный рантайм без DOM.
 * - `server` — node, файлы `*.server.spec.tsx`: JSX собран для сервера
 *   (`solid({ ssr: true })` даёт `generate: 'ssr'`), рисует его
 *   `renderToString` из `solid-js/web`, как рисовал бы сервер приложения.
 * - `hydration` — jsdom, файлы `*.hydration.spec.tsx`: JSX собран для
 *   браузера с метками гидратации (`hydratable`), как его собирает
 *   приложение с серверным рендером, а `hydrate` из `solid-js/web`
 *   гидратирует разметку сервера. Двух сборок сразу у прогона нет, поэтому
 *   разметку сервера пишет серверный прогон — фикстурой, которую он же и
 *   сверяет (`__tests__/hydration/markup.server.spec.tsx`).
 *
 * `hot: false` — solid-refresh ломается вне dev-сервера.
 */

/**
 * Плагин Solid со сборкой JSX — и её опции в ключе кэша трансформаций.
 *
 * Трансформированные модули Vitest кэширует на диске (`fsModuleCache`, по
 * умолчанию включён), а в ключ модуля кладёт исходник, окружение и имена
 * плагинов — без их опций. Окружение у `client` и `hydration` одно, и без
 * опций в ключе их сборки подменяли бы друг друга: клиентский прогон получал
 * JSX с метками гидратации. Опции в ключ кладёт `defineCacheKeyGenerator` —
 * так Vitest велит делать плагину, который ставят с разными опциями.
 */
function solidBuild(options: Partial<Options>): Plugin[] {
	return [
		solid(options),
		{
			name: 'soldy:solid-build',
			configureVitest({ defineCacheKeyGenerator }) {
				defineCacheKeyGenerator(() => JSON.stringify(options))
			},
		},
	]
}

export default defineConfig({
	resolve: {
		alias: {
			'@soldy-ui/core': path.resolve(import.meta.dirname, '../../core/src'),
			'@soldy-ui/icons-material': path.resolve(
				import.meta.dirname,
				'../../icons/material/src',
			),
			'@soldy-ui/plugins': path.resolve(import.meta.dirname, '../../plugins/src'),
			'@soldy-ui/setup': path.resolve(import.meta.dirname, '../../setup/index.ts'),
			'@soldy-ui/solid': path.resolve(import.meta.dirname, 'src/index.ts'),
		},
	},
	test: {
		setupFiles: ['./__tests__/setup.ts'],
		projects: [
			{
				extends: true,
				plugins: solidBuild({ hot: false }),
				resolve: { conditions: ['development', 'browser'] },
				test: {
					name: 'client',
					environment: 'jsdom',
					include: ['__tests__/**/*.spec.tsx'],
					exclude: [
						'__tests__/**/*.server.spec.tsx',
						'__tests__/**/*.hydration.spec.tsx',
					],
				},
			},
			{
				extends: true,
				plugins: solidBuild({ hot: false, ssr: true }),
				test: {
					name: 'server',
					environment: 'node',
					include: ['__tests__/**/*.server.spec.tsx'],
				},
			},
			{
				extends: true,
				plugins: solidBuild({ hot: false, solid: { generate: 'dom', hydratable: true } }),
				resolve: { conditions: ['development', 'browser'] },
				test: {
					name: 'hydration',
					environment: 'jsdom',
					include: ['__tests__/**/*.hydration.spec.tsx'],
				},
			},
		],
	},
})
