import { For } from 'solid-js'
import { Tabs } from '@kobalte/core/tabs'
import { COLLECTION_ITEMS } from '../../../data'

/** Tabs and a panel of the active one, as the soldy preview: «Панель «…»». */
export default function Page() {
	return (
		<Tabs class="kb-tabs" defaultValue={COLLECTION_ITEMS[0].value}>
			<Tabs.List>
				<For each={COLLECTION_ITEMS}>
					{(item) => <Tabs.Trigger value={item.value}>{item.text}</Tabs.Trigger>}
				</For>
			</Tabs.List>
			<For each={COLLECTION_ITEMS}>
				{(item) => (
					<Tabs.Content value={item.value}>
						<div style={{ padding: '12px' }}>Панель «{item.text}»</div>
					</Tabs.Content>
				)}
			</For>
		</Tabs>
	)
}
