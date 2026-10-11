import { defineConfig } from 'vitest/config'
import solid from 'vite-plugin-solid'
import path from 'node:path'

/**
 * Два прогона одних исходников.
 *
 * - `client` — jsdom: JSX собран для браузера (`generate: 'dom'`). Solid
 *   отдаёт разные сборки по условиям экспорта, и без `development` и
 *   `browser` в тестах подключился бы серверный рантайм без DOM.
 * - `server` — node, файлы `*.server.spec.tsx`: JSX собран для сервера
 *   (`solid({ ssr: true })` даёт `generate: 'ssr'`), рисует его
 *   `renderToString` из `solid-js/web`, как рисовал бы сервер приложения.
 *
 * Гидратацию пакет не проверит: в одном прогоне компоненты собраны под одно
 * окружение, а гидратации нужны обе сборки сразу.
 *
 * `hot: false` — solid-refresh ломается вне dev-сервера.
 */
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
				plugins: [solid({ hot: false })],
				resolve: { conditions: ['development', 'browser'] },
				test: {
					name: 'client',
					environment: 'jsdom',
					include: ['__tests__/**/*.spec.tsx'],
					exclude: ['__tests__/**/*.server.spec.tsx'],
				},
			},
			{
				extends: true,
				plugins: [solid({ hot: false, ssr: true })],
				test: {
					name: 'server',
					environment: 'node',
					include: ['__tests__/**/*.server.spec.tsx'],
				},
			},
		],
	},
})
