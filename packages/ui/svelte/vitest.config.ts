import { defineConfig } from 'vitest/config'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import path from 'node:path'

/**
 * Три прогона одних исходников.
 *
 * - `client` — jsdom: компоненты собраны для браузера. Условие `browser`
 *   обязательно: без него `svelte` разрешается в серверную сборку, и `mount`
 *   там нет.
 * - `server` — node, файлы `*.server.spec.ts`: компоненты собраны для сервера,
 *   рисует их `render` из `svelte/server`, как рисовал бы сервер приложения.
 * - `hydration` — jsdom, файлы `*.hydration.spec.ts`: компоненты собраны для
 *   браузера, как у `client`, и `hydrate` из `svelte` гидратирует ими
 *   разметку сервера. Двух сборок сразу у прогона нет, поэтому разметку
 *   сервера рисует его `globalSetup` перед прогоном
 *   (`__tests__/hydration/global-setup.ts`): страницы собирает для сервера
 *   отдельный сервер Vite с этим конфигом. Сервер и браузер — одной версии
 *   Svelte, той, что стоит в дереве.
 *
 * Своя сборка гидратации не нужна — браузерная сборка Svelte 5 гидратируема
 * всегда, в отличие от JSX Solid, — и прогон у неё свой ради `globalSetup`:
 * в общем с `client` серверную сборку страниц запускал бы каждый клиентский
 * прогон.
 */
export default defineConfig({
	plugins: [svelte()],
	resolve: {
		alias: {
			'@soldy-ui/core': path.resolve(import.meta.dirname, '../../core/src'),
			'@soldy-ui/icons-material': path.resolve(
				import.meta.dirname,
				'../../icons/material/src',
			),
			'@soldy-ui/plugins': path.resolve(import.meta.dirname, '../../plugins/src'),
			'@soldy-ui/setup': path.resolve(import.meta.dirname, '../../setup/index.ts'),
			'@soldy-ui/svelte': path.resolve(import.meta.dirname, 'src/index.ts'),
		},
	},
	test: {
		setupFiles: ['./__tests__/setup.ts'],
		projects: [
			{
				extends: true,
				resolve: { conditions: ['browser'] },
				test: {
					name: 'client',
					environment: 'jsdom',
					include: ['__tests__/**/*.spec.ts'],
					exclude: ['__tests__/**/*.server.spec.ts', '__tests__/**/*.hydration.spec.ts'],
				},
			},
			{
				extends: true,
				test: {
					name: 'server',
					environment: 'node',
					include: ['__tests__/**/*.server.spec.ts'],
				},
			},
			{
				extends: true,
				resolve: { conditions: ['browser'] },
				test: {
					name: 'hydration',
					environment: 'jsdom',
					include: ['__tests__/**/*.hydration.spec.ts'],
					globalSetup: ['./__tests__/hydration/global-setup.ts'],
				},
			},
		],
	},
})
