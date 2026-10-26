import { COLLECTION_ITEMS } from '../../../data'
import { so } from '../dom'

export default () =>
	so(
		'div',
		'so-select',
		{ placeholder: 'Выберите', editable: true },
		COLLECTION_ITEMS.map((item) => so('div', 'so-select-item', { ...item })),
	)
