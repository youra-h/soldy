import { defineConfig } from 'vitest/config'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import path from 'node:path'

/**
 * Два прогона одних исходников.
 *
 * - `client` — jsdom: компоненты собраны для браузера. Условие `browser`
 *   обязательно: без него `svelte` разрешается в серверную сборку, и `mount`
 *   там нет.
 * - `server` — node, файлы `*.server.spec.ts`: компоненты собраны для сервера,
 *   рисует их `render` из `svelte/server`, как рисовал бы сервер приложения.
 *
 * Гидратацию пакет не проверит: в одном прогоне компоненты собраны под одно
 * окружение, а гидратации нужны обе сборки сразу.
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
					exclude: ['__tests__/**/*.server.spec.ts'],
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
		],
	},
})
