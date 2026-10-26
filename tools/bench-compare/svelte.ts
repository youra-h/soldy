import type { Component } from 'svelte'
import type { TScenario } from '../bench-pages/scenarios'
import { libraryName, pagesOf, startBench } from './bench'
import { mountPage, type ISvelteSetup } from './libs/svelte/mount'
import { idOf } from './pages'

/**
 * The Svelte page: a neighbor library from `?lib=` — its setup (wrapper and
 * styles), one file per component and its scenarios (`libs/svelte/<lib>/`).
 * Component files load lazily, so the page holds only the library it shows.
 */
const SETUPS = import.meta.glob<ISvelteSetup>('./libs/svelte/*/setup.ts')
const SCENARIOS = import.meta.glob<Record<string, TScenario>>('./libs/svelte/*/scenarios.ts', {
	import: 'SCENARIOS',
})
const PAGES = import.meta.glob<Component>('./libs/svelte/*/*.svelte', { import: 'default' })

const lib = libraryName()
const prefix = `./libs/svelte/${lib}/`
const loadSetup = SETUPS[`${prefix}setup.ts`]
const loadScenarios = SCENARIOS[`${prefix}scenarios.ts`]

if (!loadSetup || !loadScenarios) throw new Error(`[bench-compare] no Svelte library «${lib}»`)

const setup = await loadSetup()
const files = Object.keys(PAGES).filter((file) => file.startsWith(prefix))

startBench({
	framework: 'svelte',
	pages: pagesOf(files.map(idOf)),
	scenarios: await loadScenarios(),
	async mount(id, node, count) {
		const load = PAGES[`${prefix}${id}.svelte`]

		if (!load) throw new Error(`[bench-compare] «${lib}» has no «${id}»`)

		return mountPage(node, setup, await load(), count)
	},
})
