import { Component, ChangeDetectionStrategy } from '@angular/core'
import type { IItemGroup } from '@soldy-ui/core'
import { AttributesDirective, provideElevator } from '../../../adapter'
import { TListBoxGroupSurface } from '../../../generated/list-box-group.metadata'
import { setupListBoxGroup } from './setup.component'

/** Элементы списка под общей подписью: ключ группы получают элементы в её содержимом. */
@Component({
	selector: 'div[so-list-box-group], [so-list-box-group]',
	imports: [AttributesDirective],
	providers: [provideElevator()],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './list-box-group.component.html',
})
export class TListBoxGroupComponent extends TListBoxGroupSurface<IItemGroup> {
	constructor() {
		super(setupListBoxGroup, { strategy: 'host' })
	}
}
