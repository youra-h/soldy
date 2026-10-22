import { Component, ChangeDetectionStrategy } from '@angular/core'
import { NgTemplateOutlet } from '@angular/common'
import type { ICheckBox } from '@soldy-ui/core'
import { AttributesDirective, RoleIconDirective, provideElevator } from '../../adapter'
import { TCheckBoxSurface } from '../../generated/check-box.metadata'
import { setupCheckBox } from './setup.component'

/**
 * Флажок: корень — элемент потребителя, нативный `<input type="checkbox">` внутри.
 * AGENTS.md (Angular), «Поле: атрибуты потребителя делятся между корнем и `<input>`».
 */
@Component({
	selector: 'span[so-check-box], [so-check-box]',
	imports: [NgTemplateOutlet, AttributesDirective, RoleIconDirective],
	providers: [provideElevator()],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './check-box.component.html',
})
export class TCheckBoxComponent extends TCheckBoxSurface<ICheckBox> {
	constructor() {
		super(setupCheckBox, {
			strategy: 'host',
			sets: ['attrs', 'dataset'],
			control: true,
		})
	}
}
