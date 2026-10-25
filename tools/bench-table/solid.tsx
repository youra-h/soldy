import { createSignal, Show, type Component } from 'solid-js'
import { render } from 'solid-js/web'
import { participantName, q, startBench, type TSel } from './bench'
import type { TRec } from './libs/data'

/**
 * Страница Solid: таблица участника под корнем страницы, строки уходят ему
 * сигналом, пустые — снятой таблицей, как у страницы Vue.
 */
type TLib = { Bench: Component<{ rows: TRec[] }>; sel: TSel }
const libs: Record<string, () => Promise<TLib>> = {
	soldy: () => import('./libs/solid/soldy'),
	plain: () => import('./libs/solid/plain'),
	tanstack: () => import('./libs/solid/tanstack'),
	kobalte: () => import('./libs/solid/kobalte'),
	aggrid: () => import('./libs/solid/aggrid'),
}
const { Bench, sel } = await libs[participantName()]()
const [rows, setRows] = createSignal<TRec[] | null>(null)
render(() => <Show when={rows()}>{(shown) => <Bench rows={shown()} />}</Show>, q('#app'))
startBench({ sel, setRows })
