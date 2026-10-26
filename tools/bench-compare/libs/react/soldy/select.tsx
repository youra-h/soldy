import { Select } from '@soldy-ui/react'
import { COLLECTION_ITEMS } from '../../../data'

export default function Page() {
	return <Select placeholder="Выберите" editable items={COLLECTION_ITEMS} />
}
