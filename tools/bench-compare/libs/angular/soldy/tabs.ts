import { ChangeDetectionStrategy, Component } from '@angular/core'
import { TTabsComponent, TTabsContentComponent, TTabsItemComponent } from '@soldy-ui/angular'
import { COLLECTION_ITEMS } from '../../../data'

/** The preview of `packages/playground/vue/src/hosts/angular/` with `PREVIEW_PROPS`. */
@Component({
	selector: 'bench-tabs',
	imports: [TTabsComponent, TTabsContentComponent, TTabsItemComponent],
	changeDetection: ChangeDetectionStrategy.OnPush,
	host: { style: 'display: contents' },
	template: `
		<div so-tabs>
			@for (item of items; track item.value; let index = $index) {
				<div
					so-tabs-item
					[value]="item.value"
					[text]="item.text"
					[active]="index === 0"
				></div>
			}
			@for (item of items; track item.value) {
				<div so-tabs-content slot="content" [value]="item.value">
					<div style="padding: 12px">Панель «{{ item.text }}»</div>
				</div>
			}
		</div>
	`,
})
export default class TabsPage {
	protected readonly items = COLLECTION_ITEMS
}
