import type { Component } from 'vue'
import type { TScenario } from '../bench-pages/scenarios'
import { libraryName, pagesOf, startBench } from './bench'
import { mountPage, type IVueSetup } from './libs/vue/mount'
import { idOf } from './pages'

/**
 * The Vue page: a neighbor library from `?lib=` — its setup (plugins, theme,
 * provider), one file per component and its scenarios (`libs/vue/<lib>/`).
 * Component files load lazily, so the page holds only the library it shows.
 */
const SETUPS = import.meta.glob<IVueSetup>('./libs/vue/*/setup.ts')
const SCENARIOS = import.meta.glob<Record<string, TScenario>>('./libs/vue/*/scenarios.ts', {
	import: 'SCENARIOS',
})
const PAGES = import.meta.glob<Component>('./libs/vue/*/*.vue', { import: 'default' })

const lib = libraryName()
const prefix = `./libs/vue/${lib}/`
const loadSetup = SETUPS[`${prefix}setup.ts`]
const loadScenarios = SCENARIOS[`${prefix}scenarios.ts`]

if (!loadSetup || !loadScenarios) throw new Error(`[bench-compare] no Vue library «${lib}»`)

const setup = await loadSetup()
const files = Object.keys(PAGES).filter((file) => file.startsWith(prefix))

startBench({
	framework: 'vue',
	pages: pagesOf(files.map(idOf)),
	scenarios: await loadScenarios(),
	async mount(id, node, count) {
		const load = PAGES[`${prefix}${id}.vue`]

		if (!load) throw new Error(`[bench-compare] «${lib}» has no «${id}»`)

		return mountPage(node, setup, await load(), count)
	},
})
