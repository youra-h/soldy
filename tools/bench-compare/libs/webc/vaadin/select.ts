import '@vaadin/combo-box/vaadin-combo-box.js'
import { COLLECTION_ITEMS } from '../../../data'
import { h } from '../dom'

/** Select with typing and filtering — `vaadin-combo-box`, as the soldy `editable` preview. */
export default () =>
	h('vaadin-combo-box', { placeholder: 'Выберите' }, [], {
		items: COLLECTION_ITEMS,
		itemLabelPath: 'text',
		itemValuePath: 'value',
	})
