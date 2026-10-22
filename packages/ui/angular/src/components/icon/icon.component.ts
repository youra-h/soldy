import { Component, ChangeDetectionStrategy } from '@angular/core'
import type { IIcon } from '@soldy-ui/core'
import { TIconSurface } from '../../generated/icon.metadata'
import { setupIcon } from './setup.component'

/**
 * Иконка: корень — элемент потребителя, шаблон пуст. Иконку из пакета на `<svg>` кладёт
 * директива `RoleIconDirective` (`<svg so-icon so-role-icon="close">`).
 */
@Component({
	selector: 'span[so-icon], [so-icon]',
	changeDetection: ChangeDetectionStrategy.OnPush,
	template: '',
})
export class TIconComponent extends TIconSurface<IIcon> {
	constructor() {
		super(setupIcon, { strategy: 'host' })
	}
}
