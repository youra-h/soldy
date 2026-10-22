/**
 * Разметка сервера для прогона гидратации — `globalSetup` проекта `hydration`
 * (`vitest.config.ts`).
 *
 * Прогон гидратации собирает страницы для браузера, а разметку сервера ему
 * рисует этот модуль — перед прогоном и той же версией Svelte. Страницы для
 * сервера собирает отдельный сервер Vite с конфигом пакета
 * (`vitest.config.ts`): оттуда плагин Svelte и алиасы на исходники, а условия
 * импорта у его серверного окружения свои, без `browser`, — компоненты
 * собраны для сервера, как в проекте `server`. Он выполняет `server.ts`, тот
 * рисует страницы, и разметка уходит спекам: `provide` здесь, `inject` — в
 * `serve.ts`.
 *
 * Сервер Vite нужен только на это и сразу закрывается: без HTTP, HMR,
 * слежения за файлами и оптимизатора зависимостей. Импорты модулей он
 * собирает заранее (`preTransformRequests`, у серверного окружения по
 * умолчанию выключено) — параллельно, а не по одному, как их просит
 * выполнение, и вдвое быстрее.
 *
 * Перезапуск спеков проекта в `--watch` рисует разметку заново: она не
 * отстаёт от страниц.
 */

import { createServer, isRunnableDevEnvironment, type Plugin } from 'vite'
import type { TestProject } from 'vitest/node'
import type * as server from './server'

declare module 'vitest' {
	interface ProvidedContext {
		/** Разметка сервера по имени страницы — её рисует `server.ts`. */
		serverMarkup: server.TServerMarkup
	}
}

/** Модуль, который рисует разметку, — путь от корня проекта. */
const ENTRY = '/__tests__/hydration/server.ts'

/**
 * Оптимизатор зависимостей выключен у обоих окружений: клиента у этого
 * сервера нет, а серверное выполняет Svelte исходниками, как проект `server`.
 * `vite-plugin-svelte` включает оптимизатор обоим своим `optimizeDeps.include`,
 * и тот собирал бы Svelte в кэш пакета.
 */
const withoutOptimizer: Plugin = {
	name: 'soldy:without-optimizer',
	configEnvironment(_name, config) {
		config.optimizeDeps = { noDiscovery: true, include: [] }
	},
}

/** Разметка сервера всех страниц — сервером Vite, поднятым только на это. */
async function loadServerMarkup(project: TestProject): Promise<server.TServerMarkup> {
	const vite = await createServer({
		configFile: project.vite.config.configFile,
		root: project.config.root,
		plugins: [withoutOptimizer],
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

		return module.renderServerMarkup()
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
