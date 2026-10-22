import { Component, ChangeDetectionStrategy } from '@angular/core'
import { NgTemplateOutlet } from '@angular/common'
import type { IDateInput } from '@soldy-ui/core'
import { AttributesDirective, RoleIconDirective, provideElevator } from '../../adapter'
import { TButtonComponent } from '../button'
import { TIconComponent } from '../icon'
import { TDateInputSurface } from '../../generated/date-input.metadata'
import { setupDateInput } from './setup.component'

/**
 * Поле даты из частей по формату локали; корень — элемент потребителя, на нём и `id` поля.
 * AGENTS.md (Angular), «Даты — поле из частей, сетка из `td`, поле с календарём в панели».
 */
@Component({
	selector: 'div[so-date-input], [so-date-input]',
	imports: [
		NgTemplateOutlet,
		AttributesDirective,
		RoleIconDirective,
		TButtonComponent,
		TIconComponent,
	],
	providers: [provideElevator()],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './date-input.component.html',
})
export class TDateInputComponent extends TDateInputSurface<IDateInput> {
	constructor() {
		super(setupDateInput, { strategy: 'host', id: 'id' })
	}

	/** Всплытие гасится: клик очистки не доходит до предка, который слушает поле. */
	protected clearClick(event: Event): void {
		event.stopPropagation()
		this.instance()?.clear()
	}
}
