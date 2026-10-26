import '@carbon/web-components/es/components/combo-box/index.js'
import { COLLECTION_ITEMS } from '../../../data'
import { h } from '../dom'

/** Select with typing and filtering — `cds-combo-box`, as the soldy `editable` preview. */
export default () =>
	h(
		'cds-combo-box',
		{ placeholder: 'Выберите', style: 'width:240px' },
		COLLECTION_ITEMS.map((item) => h('cds-combo-box-item', { value: item.value }, [item.text])),
	)
