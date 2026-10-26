import type { TScenario } from '../bench-pages/scenarios'
import { libraryName, pagesOf, startBench } from './bench'
import { mountPage, type IWebcSetup, type TPage } from './libs/webc/mount'
import { idOf } from './pages'

/**
 * The Web Components page: a neighbor library from `?lib=` — its setup
 * (registration and styles), one file per component and its scenarios
 * (`libs/webc/<lib>/`). Component files load lazily: a page registers only the
 * elements of the components it shows.
 */
const SETUPS = import.meta.glob<IWebcSetup>('./libs/webc/*/setup.ts')
const SCENARIOS = import.meta.glob<Record<string, TScenario>>('./libs/webc/*/scenarios.ts', {
	import: 'SCENARIOS',
})
const PAGES = import.meta.glob<TPage>(
	['./libs/webc/*/*.ts', '!./libs/webc/*/setup.ts', '!./libs/webc/*/scenarios.ts'],
	{ import: 'default' },
)

const lib = libraryName()
const prefix = `./libs/webc/${lib}/`
const loadSetup = SETUPS[`${prefix}setup.ts`]
const loadScenarios = SCENARIOS[`${prefix}scenarios.ts`]

if (!loadSetup || !loadScenarios)
	throw new Error(`[bench-compare] no Web Components library «${lib}»`)

const setup = await loadSetup()
const files = Object.keys(PAGES).filter((file) => file.startsWith(prefix))

startBench({
	framework: 'webc',
	pages: pagesOf(files.map(idOf)),
	scenarios: await loadScenarios(),
	async mount(id, node, count) {
		const load = PAGES[`${prefix}${id}.ts`]

		if (!load) throw new Error(`[bench-compare] «${lib}» has no «${id}»`)

		return mountPage(node, setup, await load(), count)
	},
})
