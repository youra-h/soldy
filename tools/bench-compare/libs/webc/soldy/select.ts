import '@soldy-ui/webc/select'
import { COLLECTION_ITEMS } from '../../../data'
import { so } from '../dom'

export default () =>
	so('div', 'so-select', { placeholder: 'Выберите', editable: true, items: COLLECTION_ITEMS })
