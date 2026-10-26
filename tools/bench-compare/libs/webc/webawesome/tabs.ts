import '@awesome.me/webawesome/dist/components/tab-group/tab-group.js'
import '@awesome.me/webawesome/dist/components/tab/tab.js'
import '@awesome.me/webawesome/dist/components/tab-panel/tab-panel.js'
import { COLLECTION_ITEMS } from '../../../data'
import { h } from '../dom'

export default () =>
	h('wa-tab-group', {}, [
		...COLLECTION_ITEMS.map((item) => h('wa-tab', { panel: item.value }, [item.text])),
		...COLLECTION_ITEMS.map((item) =>
			h('wa-tab-panel', { name: item.value }, [`Панель «${item.text}»`]),
		),
	])
