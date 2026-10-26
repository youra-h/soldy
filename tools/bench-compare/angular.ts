import type { Type } from '@angular/core'
import type { TScenario } from '../bench-pages/scenarios'
import { libraryName, pagesOf, startBench } from './bench'
import { mountPage, type IAngularSetup } from './libs/angular/mount'
import { idOf } from './pages'

/**
 * The Angular page: a neighbor library from `?lib=` — its setup (providers
 * and styles), one file per component and its scenarios
 * (`libs/angular/<lib>/`). Component files load lazily, so the page holds only
 * the library it shows.
 */
const SETUPS = import.meta.glob<IAngularSetup>('./libs/angular/*/setup.ts')
const SCENARIOS = import.meta.glob<Record<string, TScenario>>('./libs/angular/*/scenarios.ts', {
	import: 'SCENARIOS',
})
const PAGES = import.meta.glob<Type<unknown>>(
	['./libs/angular/*/*.ts', '!./libs/angular/*/setup.ts', '!./libs/angular/*/scenarios.ts'],
	{ import: 'default' },
)

const lib = libraryName()
const prefix = `./libs/angular/${lib}/`
const loadSetup = SETUPS[`${prefix}setup.ts`]
const loadScenarios = SCENARIOS[`${prefix}scenarios.ts`]

if (!loadSetup || !loadScenarios) throw new Error(`[bench-compare] no Angular library «${lib}»`)

const setup = await loadSetup()
const files = Object.keys(PAGES).filter((file) => file.startsWith(prefix))

startBench({
	framework: 'angular',
	pages: pagesOf(files.map(idOf)),
	scenarios: await loadScenarios(),
	async mount(id, node, count) {
		const load = PAGES[`${prefix}${id}.ts`]

		if (!load) throw new Error(`[bench-compare] «${lib}» has no «${id}»`)

		return mountPage(node, setup, await load(), count)
	},
})
