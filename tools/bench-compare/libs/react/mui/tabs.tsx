import { useState } from 'react'
import Tab from '@mui/material/Tab'
import Tabs from '@mui/material/Tabs'
import { COLLECTION_ITEMS } from '../../../data'

/** Tabs and a panel of the active one, as the soldy preview: «Панель «…»». */
export default function Page() {
	const [value, setValue] = useState<string>(COLLECTION_ITEMS[0].value)
	const active = COLLECTION_ITEMS.find((item) => item.value === value)

	return (
		<div>
			<Tabs value={value} onChange={(_, next: string) => setValue(next)}>
				{COLLECTION_ITEMS.map((item) => (
					<Tab key={item.value} value={item.value} label={item.text} />
				))}
			</Tabs>
			<div role="tabpanel" style={{ padding: 12 }}>
				Панель «{active?.text}»
			</div>
		</div>
	)
}
