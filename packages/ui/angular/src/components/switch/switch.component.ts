import { Component, ChangeDetectionStrategy } from '@angular/core'
import { NgTemplateOutlet } from '@angular/common'
import type { ISwitch } from '@soldy-ui/core'
import { AttributesDirective, provideElevator } from '../../adapter'
import { TSwitchSurface } from '../../generated/switch.metadata'
import { setupSwitch } from './setup.component'

/**
 * Переключатель: корень — элемент потребителя, нативный `<input type="checkbox">` внутри.
 * AGENTS.md (Angular), «Поле: атрибуты потребителя делятся между корнем и `<input>`».
 */
@Component({
	selector: 'span[so-switch], [so-switch]',
	imports: [NgTemplateOutlet, AttributesDirective],
	providers: [provideElevator()],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './switch.component.html',
})
export class TSwitchComponent extends TSwitchSurface<ISwitch> {
	constructor() {
		super(setupSwitch, { strategy: 'host', sets: ['attrs', 'dataset'], control: true })
	}
}
