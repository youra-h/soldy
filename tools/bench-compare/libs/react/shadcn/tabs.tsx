import { COLLECTION_ITEMS } from '../../../data'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'

/** Tabs and a panel per tab, as the soldy preview: «Панель «…»». */
export default function Page() {
	return (
		<Tabs defaultValue={COLLECTION_ITEMS[0].value}>
			<TabsList>
				{COLLECTION_ITEMS.map((item) => (
					<TabsTrigger key={item.value} value={item.value}>
						{item.text}
					</TabsTrigger>
				))}
			</TabsList>
			{COLLECTION_ITEMS.map((item) => (
				<TabsContent key={item.value} value={item.value}>
					<div style={{ padding: 12 }}>Панель «{item.text}»</div>
				</TabsContent>
			))}
		</Tabs>
	)
}
