/**
 * Разметка сервера для прогона гидратации — `globalSetup` проекта `hydration`
 * (`vitest.config.ts`).
 *
 * Прогон гидратации собирает страницы для браузера, а разметку сервера ему
 * рисует этот модуль — перед прогоном и той же версией solid-js. Страницы для
 * сервера собирает отдельный сервер Vite: конфиг пакета (`vitest.config.ts`,
 * оттуда алиасы на исходники) и сборка JSX проекта `server`. Он выполняет
 * `server.tsx`, тот рисует страницы, и разметка уходит спекам: `provide`
 * здесь, `inject` — в `serve.ts`.
 *
 * Сервер Vite нужен только на это и сразу закрывается: без HTTP, HMR,
 * слежения за файлами и оптимизатора зависимостей клиента. Импорты модулей он
 * собирает заранее (`preTransformRequests`, у серверного окружения по
 * умолчанию выключено) — параллельно, а не по одному, как их просит
 * выполнение, и вдвое быстрее.
 *
 * Перезапуск спеков проекта в `--watch` рисует разметку заново: она не
 * отстаёт от `pages.tsx`.
 */

import { createServer, isRunnableDevEnvironment, type Plugin } from 'vite'
import solid from 'vite-plugin-solid'
import type { TestProject } from 'vitest/node'
import type * as server from './server'

declare module 'vitest' {
	interface ProvidedContext {
		/** Разметка сервера по имени страницы — её рисует `server.tsx`. */
		serverMarkup: server.TServerMarkup
	}
}

/** Модуль, который рисует разметку, — путь от корня проекта. */
const ENTRY = '/__tests__/hydration/server.tsx'

/**
 * Оптимизатор зависимостей клиента выключен: клиента у этого сервера нет, а
 * `vite-plugin-solid` включает оптимизатор своим `optimizeDeps.include`, и тот
 * собирал бы solid-js для браузера в кэш пакета.
 */
const withoutClientOptimizer: Plugin = {
	name: 'soldy:without-client-optimizer',
	configEnvironment(name, config) {
		if (name === 'client') config.optimizeDeps = { noDiscovery: true, include: [] }
	},
}

/** Разметка сервера всех страниц — сервером Vite, поднятым только на это. */
async function loadServerMarkup(project: TestProject): Promise<server.TServerMarkup> {
	const vite = await createServer({
		configFile: project.vite.config.configFile,
		root: project.config.root,
		plugins: [solid({ hot: false, ssr: true }), withoutClientOptimizer],
		server: { middlewareMode: true, hmr: false, ws: false, watch: null },
		environments: { ssr: { dev: { preTransformRequests: true } } },
		appType: 'custom',
	})

	try {
		const { ssr } = vite.environments

		if (!isRunnableDevEnvironment(ssr)) {
			throw new Error('серверное окружение Vite не выполняет модули')
		}

		const module = await ssr.runner.import<typeof server>(ENTRY)

		return await module.renderServerMarkup()
	} finally {
		await vite.close()
	}
}

export default async function setup(project: TestProject): Promise<void> {
	project.provide('serverMarkup', await loadServerMarkup(project))

	project.onTestsRerun(async (specifications) => {
		if (specifications.some((specification) => specification.project === project)) {
			project.provide('serverMarkup', await loadServerMarkup(project))
		}
	})
}
