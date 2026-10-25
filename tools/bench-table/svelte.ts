import { mount, type Component } from 'svelte'
import { participantName, q, startBench, type TSel } from './bench'
import type { TRec } from './libs/data'
import Host from './libs/svelte/Host.svelte'
import { page } from './libs/svelte/page.svelte'

/**
 * Страница Svelte: таблица участника под корнем `Host`, строки уходят ему
 * через общее состояние страницы (`page`), пустые — снятой таблицей, как у
 * страницы Vue.
 */
type TLib = { default: Component<{ rows: TRec[] }>; sel: TSel }
const libs: Record<string, () => Promise<TLib>> = {
	soldy: () => import('./libs/svelte/soldy.svelte'),
	plain: () => import('./libs/svelte/plain.svelte'),
	tanstack: () => import('./libs/svelte/tanstack.svelte'),
	shadcn: () => import('./libs/svelte/shadcn.svelte'),
	carbon: () => import('./libs/svelte/carbon.svelte'),
	svgrid: () => import('./libs/svelte/svgrid.svelte'),
}
const lib = await libs[participantName()]()
mount(Host, { target: q('#app'), props: { Bench: lib.default } })
startBench({ sel: lib.sel, setRows: (rows) => (page.rows = rows) })
