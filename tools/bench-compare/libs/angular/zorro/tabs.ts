import { ChangeDetectionStrategy, Component } from '@angular/core'
import { NzTabsModule } from 'ng-zorro-antd/tabs'
import { COLLECTION_ITEMS } from '../../../data'

/** Tabs and a panel of the active one, as the soldy preview: «Панель «…»». */
@Component({
	selector: 'bench-tabs',
	imports: [NzTabsModule],
	changeDetection: ChangeDetectionStrategy.OnPush,
	template: `
		<nz-tabs>
			@for (item of items; track item.value) {
				<nz-tab [nzTitle]="item.text">
					<div style="padding: 12px">Панель «{{ item.text }}»</div>
				</nz-tab>
			}
		</nz-tabs>
	`,
})
export default class TabsPage {
	protected readonly items = COLLECTION_ITEMS
}
