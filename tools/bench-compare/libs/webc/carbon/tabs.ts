import '@carbon/web-components/es/components/tabs/index.js'
import { COLLECTION_ITEMS } from '../../../data'
import { fragment, h } from '../dom'

/**
 * Tabs and their panels: Carbon links a tab to a panel by `target` — an id in
 * the document, so every copy takes its own ids.
 */
let copies = 0

export default () => {
	const id = `tabs${++copies}`

	return fragment(
		h(
			'cds-tabs',
			{ value: COLLECTION_ITEMS[0].value },
			COLLECTION_ITEMS.map((item) =>
				h('cds-tab', { value: item.value, target: `${id}-${item.value}` }, [item.text]),
			),
		),
		...COLLECTION_ITEMS.map((item, index) =>
			h('div', { id: `${id}-${item.value}`, role: 'tabpanel', hidden: index > 0 }, [
				h('div', { style: 'padding:12px' }, [`Панель «${item.text}»`]),
			]),
		),
	)
}
