import { ChangeDetectionStrategy, Component } from '@angular/core'
import { TSelectComponent } from '@soldy-ui/angular'
import { COLLECTION_ITEMS } from '../../../data'

/** The preview of `packages/playground/vue/src/hosts/angular/` with `PREVIEW_PROPS`, options as data. */
@Component({
	selector: 'bench-select',
	imports: [TSelectComponent],
	changeDetection: ChangeDetectionStrategy.OnPush,
	host: { style: 'display: contents' },
	template: `<div so-select placeholder="Выберите" editable [items]="items"></div>`,
})
export default class SelectPage {
	protected readonly items = COLLECTION_ITEMS
}
