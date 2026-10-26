import { Select } from '@mantine/core'
import { COLLECTION_ITEMS } from '../../../data'

const DATA = COLLECTION_ITEMS.map((item) => ({ value: item.value, label: item.text }))

/** Select with typing and filtering — `searchable`, as the soldy `editable` preview. */
export default function Page() {
	return <Select searchable data={DATA} placeholder="Выберите" w={240} />
}
