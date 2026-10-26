import { For } from 'solid-js'
import { Tabs } from '@soldy-ui/solid'
import { COLLECTION_ITEMS } from '../../../data'

export default function Page() {
	return (
		<Tabs
			content={
				<For each={COLLECTION_ITEMS}>
					{(item) => (
						<Tabs.Content value={item.value}>
							<div style={{ padding: '12px' }}>Панель «{item.text}»</div>
						</Tabs.Content>
					)}
				</For>
			}
		>
			<For each={COLLECTION_ITEMS}>
				{(item, index) => <Tabs.Item active={index() === 0} {...item} />}
			</For>
		</Tabs>
	)
}
