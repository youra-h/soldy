import { ChangeDetectionStrategy, Component } from '@angular/core'
import { TSelectComponent, TSelectItemComponent } from '@soldy-ui/angular'
import { COLLECTION_ITEMS } from '../../../data'

/** The preview of `packages/playground/vue/src/hosts/angular/` with `PREVIEW_PROPS`. */
@Component({
	selector: 'bench-select',
	imports: [TSelectComponent, TSelectItemComponent],
	changeDetection: ChangeDetectionStrategy.OnPush,
	host: { style: 'display: contents' },
	template: `
		<div so-select placeholder="Выберите" editable>
			@for (item of items; track item.value) {
				<div so-select-item [value]="item.value" [text]="item.text"></div>
			}
		</div>
	`,
})
export default class SelectPage {
	protected readonly items = COLLECTION_ITEMS
}
