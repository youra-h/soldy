import { ChangeDetectionStrategy, Component } from '@angular/core'
import { Tab, TabList, TabPanel, TabPanels, Tabs } from 'primeng/tabs'
import { COLLECTION_ITEMS } from '../../../data'

/** Tabs and a panel of the active one, as the soldy preview: «Панель «…»». */
@Component({
	selector: 'bench-tabs',
	imports: [Tabs, TabList, Tab, TabPanels, TabPanel],
	changeDetection: ChangeDetectionStrategy.OnPush,
	template: `
		<p-tabs [value]="items[0].value">
			<p-tablist>
				@for (item of items; track item.value) {
					<p-tab [value]="item.value">{{ item.text }}</p-tab>
				}
			</p-tablist>
			<p-tabpanels>
				@for (item of items; track item.value) {
					<p-tabpanel [value]="item.value">
						<div style="padding: 12px">Панель «{{ item.text }}»</div>
					</p-tabpanel>
				}
			</p-tabpanels>
		</p-tabs>
	`,
})
export default class TabsPage {
	protected readonly items = COLLECTION_ITEMS
}
