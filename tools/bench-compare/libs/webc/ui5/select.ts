import '@ui5/webcomponents/dist/ComboBox.js'
import '@ui5/webcomponents/dist/ComboBoxItem.js'
import { COLLECTION_ITEMS } from '../../../data'
import { h } from '../dom'

/** Select with typing and filtering — `ui5-combobox`, as the soldy `editable` preview. */
export default () =>
	h(
		'ui5-combobox',
		{ placeholder: 'Выберите' },
		COLLECTION_ITEMS.map((item) => h('ui5-cb-item', { text: item.text })),
	)
