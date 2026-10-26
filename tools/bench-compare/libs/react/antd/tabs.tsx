import { Tabs } from 'antd'
import { COLLECTION_ITEMS } from '../../../data'

const ITEMS = COLLECTION_ITEMS.map((item) => ({
	key: item.value,
	label: item.text,
	children: <div style={{ padding: 12 }}>Панель «{item.text}»</div>,
}))

/** Tabs and a panel per tab, as the soldy preview: «Панель «…»». */
export default function Page() {
	return <Tabs items={ITEMS} />
}
