import { ChangeDetectionStrategy, Component } from '@angular/core'
import { NzSelectModule } from 'ng-zorro-antd/select'
import { COLLECTION_ITEMS } from '../../../data'

/** Select with typing and filtering — `nz-select` with search, as the soldy `editable` preview. */
@Component({
	selector: 'bench-select',
	imports: [NzSelectModule],
	changeDetection: ChangeDetectionStrategy.OnPush,
	template: `
		<nz-select nzShowSearch nzPlaceHolder="Выберите" style="width: 240px">
			@for (item of items; track item.value) {
				<nz-option [nzValue]="item.value" [nzLabel]="item.text" />
			}
		</nz-select>
	`,
})
export default class SelectPage {
	protected readonly items = COLLECTION_ITEMS
}
