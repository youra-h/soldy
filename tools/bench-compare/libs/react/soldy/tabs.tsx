import { Tabs } from '@soldy-ui/react'
import { COLLECTION_ITEMS } from '../../../data'

export default function Page() {
	return (
		<Tabs
			content={COLLECTION_ITEMS.map((item) => (
				<Tabs.Content key={`c-${item.value}`} value={item.value}>
					<div style={{ padding: 12 }}>Панель «{item.text}»</div>
				</Tabs.Content>
			))}
		>
			{COLLECTION_ITEMS.map((item, index) => (
				<Tabs.Item key={item.value} active={index === 0} {...item} />
			))}
		</Tabs>
	)
}
