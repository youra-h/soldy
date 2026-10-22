import { Component, ChangeDetectionStrategy } from '@angular/core'
import { NgTemplateOutlet } from '@angular/common'
import type { IAccordion } from '@soldy-ui/core'
import { SlotDirective, provideElevator } from '../../adapter'
import { TAccordionItemComponent } from './item'
import { TAccordionSurface } from '../../generated/accordion.metadata'
import { setupAccordion } from './setup.component'

/**
 * Набор раскрывающихся секций. Панель — не отдельная часть: она внутри секции, и у
 * секций из данных её содержимое — слот `item-content`.
 */
@Component({
	selector: 'div[so-accordion], [so-accordion]',
	imports: [NgTemplateOutlet, SlotDirective, TAccordionItemComponent],
	providers: [provideElevator()],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './accordion.component.html',
})
export class TAccordionComponent extends TAccordionSurface<IAccordion> {
	constructor() {
		super((ctrl, inputs) => setupAccordion(ctrl, inputs, this.engine), {
			strategy: 'host',
			sets: ['attrs'],
		})
	}
}
