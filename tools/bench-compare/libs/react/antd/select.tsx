import { Select } from 'antd'
import { COLLECTION_ITEMS } from '../../../data'

const OPTIONS = COLLECTION_ITEMS.map((item) => ({ value: item.value, label: item.text }))

/**
 * Select with typing and filtering — `showSearch`, as the soldy `editable`
 * preview; the filter goes by the option's text, not by its value.
 */
export default function Page() {
	return (
		<Select
			showSearch={{ optionFilterProp: 'label' }}
			options={OPTIONS}
			placeholder="Выберите"
			style={{ width: 240 }}
		/>
	)
}
