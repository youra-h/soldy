import '@spectrum-web-components/tabs/sp-tabs.js'
import '@spectrum-web-components/tabs/sp-tab.js'
import '@spectrum-web-components/tabs/sp-tab-panel.js'
import { COLLECTION_ITEMS } from '../../../data'
import { h } from '../dom'

export default () =>
	h('sp-tabs', { selected: COLLECTION_ITEMS[0].value, label: 'Вкладки' }, [
		...COLLECTION_ITEMS.map((item) => h('sp-tab', { value: item.value, label: item.text })),
		...COLLECTION_ITEMS.map((item) =>
			h('sp-tab-panel', { value: item.value }, [
				h('div', { style: 'padding:12px' }, [`Панель «${item.text}»`]),
			]),
		),
	])
