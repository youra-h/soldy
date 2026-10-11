import { createRoot } from 'react-dom/client'
import { participantName, q, startBench } from './bench'

/**
 * Страница React: таблица участника — корень React, строки уходят ему
 * перерисовкой корня (`root.render`), пустые строки — пустой корень, как у
 * страницы Vue.
 */
const libs = {
	soldy: () => import('./libs/react/soldy'),
	plain: () => import('./libs/react/plain'),
	shadcn: () => import('./libs/react/shadcn'),
	mui: () => import('./libs/react/mui'),
	antd: () => import('./libs/react/antd'),
	mantine: () => import('./libs/react/mantine'),
}
const name = participantName() as keyof typeof libs
const lib = await libs[name]()
const root = createRoot(q('#app'))
const { Bench } = lib
startBench({ sel: lib.sel, setRows: (rows) => root.render(rows ? <Bench rows={rows} /> : null) })
