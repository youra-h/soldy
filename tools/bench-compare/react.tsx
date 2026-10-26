import type { ComponentType } from 'react'
import type { TScenario } from '../bench-pages/scenarios'
import { libraryName, pagesOf, startBench } from './bench'
import { mountPage, type IReactSetup } from './libs/react/mount'
import { idOf } from './pages'

/**
 * The React page: a neighbor library from `?lib=` — its setup (provider and
 * styles), one file per component and its scenarios (`libs/react/<lib>/`).
 * Component files load lazily, so the page holds only the library it shows.
 */
const SETUPS = import.meta.glob<IReactSetup>('./libs/react/*/setup.tsx')
const SCENARIOS = import.meta.glob<Record<string, TScenario>>('./libs/react/*/scenarios.ts', {
	import: 'SCENARIOS',
})
const PAGES = import.meta.glob<ComponentType>(
	['./libs/react/*/*.tsx', '!./libs/react/*/setup.tsx'],
	{ import: 'default' },
)

const lib = libraryName()
const prefix = `./libs/react/${lib}/`
const loadSetup = SETUPS[`${prefix}setup.tsx`]
const loadScenarios = SCENARIOS[`${prefix}scenarios.ts`]

if (!loadSetup || !loadScenarios) throw new Error(`[bench-compare] no React library «${lib}»`)

const setup = await loadSetup()
const files = Object.keys(PAGES).filter((file) => file.startsWith(prefix))

startBench({
	framework: 'react',
	pages: pagesOf(files.map(idOf)),
	scenarios: await loadScenarios(),
	async mount(id, node, count) {
		const load = PAGES[`${prefix}${id}.tsx`]

		if (!load) throw new Error(`[bench-compare] «${lib}» has no «${id}»`)

		return mountPage(node, setup, await load(), count)
	},
})
