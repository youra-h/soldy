import '@vaadin/tabs/vaadin-tabs.js'
import '@vaadin/tabs/vaadin-tab.js'
import { COLLECTION_ITEMS } from '../../../data'
import { h } from '../dom'

/**
 * `vaadin-tabs` is the tab row only: the panels are the application's, shown
 * by the selected index, as the Vaadin docs do it without a tab sheet.
 */
export default () => {
	const tabs = h(
		'vaadin-tabs',
		{},
		COLLECTION_ITEMS.map((item) => h('vaadin-tab', {}, [item.text])),
	)
	const panels = COLLECTION_ITEMS.map((item, index) =>
		h('div', { style: 'padding:12px', hidden: index !== 0 }, [`Панель «${item.text}»`]),
	)

	tabs.addEventListener('selected-changed', () => {
		const selected = Reflect.get(tabs, 'selected')

		panels.forEach((panel, index) => (panel.hidden = index !== selected))
	})

	return h('div', {}, [tabs, ...panels])
}
