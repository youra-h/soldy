import { Component, ChangeDetectionStrategy } from '@angular/core'
import type { IItemGroup } from '@soldy-ui/core'
import { AttributesDirective, provideElevator } from '../../../adapter'
import { TSelectGroupSurface } from '../../../generated/select-group.metadata'
import { setupSelectGroup } from './setup.component'

/** Опции Select под общей подписью: ключ группы получают опции в её содержимом. */
@Component({
	selector: 'div[so-select-group], [so-select-group]',
	imports: [AttributesDirective],
	providers: [provideElevator()],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './select-group.component.html',
})
export class TSelectGroupComponent extends TSelectGroupSurface<IItemGroup> {
	constructor() {
		super(setupSelectGroup, { strategy: 'host' })
	}
}
