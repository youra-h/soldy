import { Component, ChangeDetectionStrategy } from '@angular/core'
import { NgTemplateOutlet } from '@angular/common'
import type { INumberInput } from '@soldy-ui/core'
import {
	AttributesDirective,
	FieldTextDirective,
	RoleIconDirective,
	TextPipe,
	provideElevator,
} from '../../adapter'
import { TButtonComponent } from '../button'
import { TIconComponent } from '../icon'
import { TNumberInputSurface } from '../../generated/number-input.metadata'
import { setupNumberInput } from './setup.component'

/**
 * Поле числа: ввод, кнопки шага и скрытое поле формы с числом. Написанное на корне доходит
 * до ввода: AGENTS.md (Angular), «Поле: атрибуты потребителя делятся между корнем и `<input>`».
 */
@Component({
	selector: 'div[so-number-input], [so-number-input]',
	imports: [
		NgTemplateOutlet,
		AttributesDirective,
		FieldTextDirective,
		RoleIconDirective,
		TextPipe,
		TButtonComponent,
		TIconComponent,
	],
	providers: [provideElevator()],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './number-input.component.html',
})
export class TNumberInputComponent extends TNumberInputSurface<INumberInput> {
	constructor() {
		super(setupNumberInput, {
			strategy: 'host',
			sets: ['attrs', 'dataset'],
			control: true,
		})
	}

	/** Всплытие клика гасится, как `@click.stop` у Vue. */
	protected clearClick(event: Event): void {
		event.stopPropagation()
		this.instance()?.clear()
	}
}
