import { Component, ChangeDetectionStrategy } from '@angular/core'
import type { IMenuRadioGroup } from '@soldy-ui/core'
import { AttributesDirective, provideElevator } from '../../../adapter'
import { TMenuRadioGroupSurface } from '../../../generated/menu-radio-group.metadata'
import { setupMenuRadioGroup } from './setup.component'

/**
 * Переключатели меню под общей подписью и со своим значением. Роль — `group`, а не
 * `radiogroup`: так в меню по APG.
 */
@Component({
	selector: 'div[so-menu-radio-group], [so-menu-radio-group]',
	imports: [AttributesDirective],
	providers: [provideElevator()],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './menu-radio-group.component.html',
})
export class TMenuRadioGroupComponent extends TMenuRadioGroupSurface<IMenuRadioGroup> {
	constructor() {
		super(setupMenuRadioGroup, { strategy: 'host' })
	}
}
