import { participantName, q, startBench, type TSel } from './bench'
import type { TRec } from './libs/data'

/**
 * Страница Web Components: фреймворка нет, участник сам держит свои элементы в
 * `#app` — строит таблицу на первых строках, пишет новые в неё же и снимает её
 * на пустых, как у страницы Vue.
 */
type TLib = { sel: TSel; render: (host: Element, rows: TRec[] | null) => void }
const libs: Record<string, () => Promise<TLib>> = {
	soldy: () => import('./libs/webc/soldy'),
	plain: () => import('./libs/webc/plain'),
	vaadin: () => import('./libs/webc/vaadin'),
	carbon: () => import('./libs/webc/carbon'),
	spectrum: () => import('./libs/webc/spectrum'),
	ui5: () => import('./libs/webc/ui5'),
}
const lib = await libs[participantName()]()
const host = q('#app')
startBench({ sel: lib.sel, setRows: (rows) => lib.render(host, rows) })
