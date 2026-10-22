import { Component, ChangeDetectionStrategy } from '@angular/core'
import { NgTemplateOutlet } from '@angular/common'
import type { IInput } from '@soldy-ui/core'
import {
	AttributesDirective,
	FieldTextDirective,
	RoleIconDirective,
	provideElevator,
} from '../../adapter'
import { TButtonComponent } from '../button'
import { TIconComponent } from '../icon'
import { TInputSurface } from '../../generated/input.metadata'
import { setupInput } from './setup.component'

/**
 * Текстовое поле: корень — элемент потребителя, `<input>` внутри, слоты — по сторонам.
 * AGENTS.md (Angular), «Поле: атрибуты потребителя делятся между корнем и `<input>`».
 */
@Component({
	selector: 'div[so-input], [so-input]',
	imports: [
		NgTemplateOutlet,
		AttributesDirective,
		FieldTextDirective,
		RoleIconDirective,
		TButtonComponent,
		TIconComponent,
	],
	providers: [provideElevator()],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './input.component.html',
})
export class TInputComponent extends TInputSurface<IInput> {
	constructor() {
		super(setupInput, { strategy: 'host', sets: ['attrs', 'dataset'], control: true })
	}

	/** Всплытие гасится: select-only Select открывает панель по клику поля. */
	protected clearClick(event: Event): void {
		event.stopPropagation()
		this.instance()?.clear()
	}
}
