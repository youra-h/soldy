import { Tabs } from '@mantine/core'
import { COLLECTION_ITEMS } from '../../../data'

/** Tabs and a panel per tab, as the soldy preview: «Панель «…»». */
export default function Page() {
	return (
		<Tabs defaultValue={COLLECTION_ITEMS[0].value}>
			<Tabs.List>
				{COLLECTION_ITEMS.map((item) => (
					<Tabs.Tab key={item.value} value={item.value}>
						{item.text}
					</Tabs.Tab>
				))}
			</Tabs.List>
			{COLLECTION_ITEMS.map((item) => (
				<Tabs.Panel key={item.value} value={item.value}>
					<div style={{ padding: 12 }}>Панель «{item.text}»</div>
				</Tabs.Panel>
			))}
		</Tabs>
	)
}
