import { Component, ChangeDetectionStrategy } from '@angular/core'
import { NgTemplateOutlet } from '@angular/common'
import type { IAccordionItem } from '@soldy-ui/core'
import { AttributesDirective, RoleIconDirective } from '../../../adapter'
import { TButtonComponent } from '../../button'
import { TIconComponent } from '../../icon'
import { TAccordionItemSurface } from '../../../generated/accordion-item.metadata'
import { setupAccordionItem } from './setup.component'

/**
 * Секция аккордеона: заголовок — Button (`#control`), под ним панель.
 * Класс стрелки — на обёртке: тема поворачивает её у раскрытой секции, и иконка
 * из слота поворачивается так же.
 */
@Component({
	selector: 'div[so-accordion-item], [so-accordion-item]',
	imports: [
		NgTemplateOutlet,
		AttributesDirective,
		RoleIconDirective,
		TButtonComponent,
		TIconComponent,
	],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './accordion-item.component.html',
})
export class TAccordionItemComponent extends TAccordionItemSurface<IAccordionItem> {
	constructor() {
		super(setupAccordionItem, {
			strategy: 'host',
			sets: ['attrs', 'dataset'],
			control: true,
			order: 'order',
		})
	}
}
