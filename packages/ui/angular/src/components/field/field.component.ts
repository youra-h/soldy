import { Component, ChangeDetectionStrategy } from '@angular/core'
import type { IField } from '@soldy-ui/core'
import { AttributesDirective, RoleIconDirective, provideElevator } from '../../adapter'
import { TIconComponent } from '../icon'
import { TFieldSurface } from '../../generated/field.metadata'
import { setupField } from './setup.component'

/**
 * Поле формы: подпись, контрол, подсказка и ошибка. Связку с контролом внутри
 * опускает лифтом — AGENTS.md (Angular), «Лифт — слой DI на владельца».
 */
@Component({
	selector: 'div[so-field], [so-field]',
	imports: [AttributesDirective, RoleIconDirective, TIconComponent],
	providers: [provideElevator()],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './field.component.html',
})
export class TFieldComponent extends TFieldSurface<IField> {
	constructor() {
		super(setupField, { strategy: 'host' })
	}
}
