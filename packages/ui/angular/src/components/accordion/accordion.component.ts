import { Component, ChangeDetectionStrategy } from '@angular/core'
import { NgTemplateOutlet } from '@angular/common'
import type { IAccordion } from '@soldy-ui/core'
import { SlotDirective, provideElevator } from '../../adapter'
import { TAccordionItemComponent } from './item'
import { TAccordionSurface } from '../../generated/accordion.metadata'
import { setupAccordion } from './setup.component'

/**
 * TAccordionComponent — набор раскрывающихся секций.
 *
 * Обёртки нет: корень — сам элемент потребителя, `<div so-accordion>`. Классы,
 * `attrs` и скрытие раскладывает на него `TComponentBase` (стратегия
 * `'host'`).
 *
 * Контекстов два — свой и фасада коллекции (`setupAccordion`), и входы фасада
 * (`items`, `mode`, `engine`, `trackBy`) — входы того же элемента. Свой слой
 * лифта аккордеон отдаёт поддереву провайдером (`provideElevator()`): секции
 * разметки и секции из данных прочтут из слоя движок этого аккордеона, а
 * список в панели секции — свой, из своего слоя.
 *
 * Секции — содержимое (`<div so-accordion-item>`), а без него — показанные
 * элементы коллекции (`shown`), запасным содержимым. Панели у секции нет
 * отдельной частью: она внутри элемента, и содержимое секции из данных — слот
 * `item-content`.
 *
 * `div[so-accordion]` стоит первым: по первому селектору Angular выбирает тег
 * хоста, когда создаёт компонент сам (`createComponent`), — это тег ядра по
 * умолчанию.
 *
 * Selector: div[so-accordion], [so-accordion]
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
