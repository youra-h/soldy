// @vitest-environment node

/**
 * The modules the Angular plugin compiles (`src/vite-angular.ts`) stay out of
 * the Vitest module cache on disk (`fsModuleCache`). The cache keys a module
 * by its source, the environment and the plugin names, while the Angular
 * output follows the component's templates and the whole program: after an
 * edit of a template alone, a run took the old compiled template until
 * `--clearCache`.
 *
 * The plugin's `configureVitest` gets the context Vitest gives plugins: an
 * instance from `createVitest` and its root project, with the generator caught
 * by `defineCacheKeyGenerator`.
 */

import path from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createVitest, type CacheKeyIdGenerator, type Vitest } from 'vitest/node'
import { normalizePath } from 'vite'
import { angular } from '../src/vite-angular.ts'

const ROOT = path.resolve(import.meta.dirname, '..')

/** A module id as Vite gives it: an absolute path with forward slashes. */
const idOf = (file: string) => normalizePath(path.resolve(ROOT, file))

/** What the plugin compiles: the Angular host and the adapter sources, as in `vite.base.ts`. */
const INCLUDE = [/\/playground\/vue\/src\/hosts\/angular\/.+\.ts$/, /\/ui\/angular\/src\/.+\.ts$/]

let vitest: Vitest

beforeAll(async () => {
	vitest = await createVitest({ config: false, root: ROOT, watch: false })
})

afterAll(() => vitest.close())

/** What the cache key generators of the Angular plugins give a module, one answer each. */
function keysOf(id: string): ReturnType<CacheKeyIdGenerator>[] {
	const project = vitest.getRootProject()
	const plugins = angular({ tsconfig: idOf('src/hosts/angular/tsconfig.json'), include: INCLUDE })
	const generators: CacheKeyIdGenerator[] = []
	const define = (generator: CacheKeyIdGenerator) => {
		generators.push(generator)
	}

	for (const plugin of plugins) {
		plugin.configureVitest?.({
			vitest,
			project,
			injectTestProjects: async () => [],
			defineCacheKeyGenerator: define,
			experimental_defineCacheKeyGenerator: define,
		})
	}

	return generators.map((generate) =>
		generate({ environment: project.vite.environments.client, id, sourceCode: '' }),
	)
}

describe('плагин Angular и кэш модулей Vitest на диске', () => {
	it('модуль, который компилирует Angular, в кэш не идёт', () => {
		expect(
			keysOf(idOf('../../ui/angular/src/components/popover/popover.component.ts')),
		).toEqual([false])
		expect(keysOf(idOf('src/hosts/angular/index.ts'))).toEqual([false])
	})

	it('прочий .ts — с обычным ключом', () => {
		expect(keysOf(idOf('../../core/src/index.ts'))).toEqual([undefined])
		expect(keysOf(idOf('src/vite-angular.ts'))).toEqual([undefined])
	})
})
