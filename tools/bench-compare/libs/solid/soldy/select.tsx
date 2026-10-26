import { For } from 'solid-js'
import { Select } from '@soldy-ui/solid'
import { COLLECTION_ITEMS } from '../../../data'

export default function Page() {
	return (
		<Select placeholder="Выберите" editable>
			<For each={COLLECTION_ITEMS}>{(item) => <Select.Item {...item} />}</For>
		</Select>
	)
}
