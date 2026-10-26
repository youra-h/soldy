import { ChangeDetectionStrategy, Component } from '@angular/core'
import { MatTabsModule } from '@angular/material/tabs'
import { COLLECTION_ITEMS } from '../../../data'

/** Tabs and a panel of the active one, as the soldy preview: «Панель «…»». */
@Component({
	selector: 'bench-tabs',
	imports: [MatTabsModule],
	changeDetection: ChangeDetectionStrategy.OnPush,
	template: `
		<mat-tab-group>
			@for (item of items; track item.value) {
				<mat-tab [label]="item.text">
					<div style="padding: 12px">Панель «{{ item.text }}»</div>
				</mat-tab>
			}
		</mat-tab-group>
	`,
})
export default class TabsPage {
	protected readonly items = COLLECTION_ITEMS
}
