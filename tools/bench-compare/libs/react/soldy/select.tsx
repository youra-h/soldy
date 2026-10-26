import { Select } from '@soldy-ui/react'
import { COLLECTION_ITEMS } from '../../../data'

export default function Page() {
	return (
		<Select placeholder="Выберите" editable>
			{COLLECTION_ITEMS.map((item) => (
				<Select.Item key={item.value} {...item} />
			))}
		</Select>
	)
}
