import { shallowRef } from 'vue'
import { participantName, q, startBench } from './bench'
import type { TRec } from './libs/data'

/** Страница Vue: таблица участника над `shallowRef` строк. */
const libs = {
	soldy: () => import('./libs/soldy'),
	naive: () => import('./libs/naive'),
	prime: () => import('./libs/prime'),
	plain: () => import('./libs/plain'),
	tanstack: () => import('./libs/tanstack'),
	reka: () => import('./libs/reka'),
	core: () => import('./libs/core'),
}
const name = participantName() as keyof typeof libs
const rows = shallowRef<TRec[] | null>(null)
const lib = await libs[name]()
lib.mount(q('#app'), rows)
startBench({ sel: lib.sel, setRows: (next) => (rows.value = next) })
