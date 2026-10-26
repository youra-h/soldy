import '@ui5/webcomponents/dist/TabContainer.js'
import '@ui5/webcomponents/dist/Tab.js'
import { COLLECTION_ITEMS } from '../../../data'
import { h } from '../dom'

export default () =>
	h(
		'ui5-tabcontainer',
		{},
		COLLECTION_ITEMS.map((item, index) =>
			h('ui5-tab', { text: item.text, selected: index === 0 }, [
				h('div', { style: 'padding:12px' }, [`Панель «${item.text}»`]),
			]),
		),
	)
