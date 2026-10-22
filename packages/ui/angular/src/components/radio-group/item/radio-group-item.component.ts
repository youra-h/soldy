import { Component, ChangeDetectionStrategy } from '@angular/core'
import { NgTemplateOutlet } from '@angular/common'
import type { IRadioGroupItem } from '@soldy-ui/core'
import { AttributesDirective } from '../../../adapter'
import { TRadioGroupItemSurface } from '../../../generated/radio-group-item.metadata'
import { setupRadioGroupItem } from './setup.component'

/**
 * Радио: корень — подпись (клик по тексту выбирает радио), внутри нативный `<input>`.
 * Группировку по `name`, стрелки и одну остановку Tab на группу даёт браузер.
 * См. AGENTS.md (Angular), «Поле: атрибуты потребителя делятся между корнем и `<input>`».
 */
@Component({
	selector: 'label[so-radio-group-item], [so-radio-group-item]',
	imports: [NgTemplateOutlet, AttributesDirective],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './radio-group-item.component.html',
})
export class TRadioGroupItemComponent extends TRadioGroupItemSurface<IRadioGroupItem> {
	constructor() {
		super(setupRadioGroupItem, {
			strategy: 'host',
			sets: ['attrs', 'dataset'],
			control: true,
		})
	}

	/** `change` поля: браузер отметил радио, коллекция делает его активным. */
	protected activate(): void {
		const context = this.facade()?.context

		if (context) context.adapters.activation.active = true
	}
}
