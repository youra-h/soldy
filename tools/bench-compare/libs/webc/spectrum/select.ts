import '@spectrum-web-components/combobox/sp-combobox.js'
import '@spectrum-web-components/menu/sp-menu-item.js'
import { COLLECTION_ITEMS } from '../../../data'
import { h } from '../dom'

/** Select with typing and filtering — `sp-combobox` with a filtered list (`autocomplete="list"`). */
export default () =>
	h(
		'sp-combobox',
		{ autocomplete: 'list', placeholder: 'Выберите', label: 'Выберите' },
		COLLECTION_ITEMS.map((item) => h('sp-menu-item', { value: item.value }, [item.text])),
	)
