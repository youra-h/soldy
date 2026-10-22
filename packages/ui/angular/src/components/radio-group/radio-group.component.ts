import { Component, ChangeDetectionStrategy } from '@angular/core'
import { NgTemplateOutlet } from '@angular/common'
import type { IRadioGroup } from '@soldy-ui/core'
import { SlotDirective, provideElevator } from '../../adapter'
import { TRadioGroupItemComponent } from './item'
import { TRadioGroupSurface } from '../../generated/radio-group.metadata'
import { setupRadioGroup } from './setup.component'

/** Группа радио; раскладку радио внутри задаёт потребитель. */
@Component({
	selector: 'div[so-radio-group], [so-radio-group]',
	imports: [NgTemplateOutlet, SlotDirective, TRadioGroupItemComponent],
	providers: [provideElevator()],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './radio-group.component.html',
})
export class TRadioGroupComponent extends TRadioGroupSurface<IRadioGroup> {
	constructor() {
		super((ctrl, inputs) => setupRadioGroup(ctrl, inputs, this.engine), { strategy: 'host' })
	}
}
