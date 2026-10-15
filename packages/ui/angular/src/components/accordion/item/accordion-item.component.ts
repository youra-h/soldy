import { Component, ChangeDetectionStrategy } from '@angular/core'
import { NgTemplateOutlet } from '@angular/common'
import type { IAccordionItem, TAccordionItemCollectionFacade } from '@soldy-ui/core'
import { AttributesDirective, RoleIconDirective, type TBinding } from '../../../adapter'
import { TButtonComponent } from '../../button'
import { TIconComponent } from '../../icon'
import { AccordionItemInputNames, TAccordionItemSurface } from './base.component'
import { setupAccordionItem } from './setup.component'

/**
 * TAccordionItemComponent — секция аккордеона: заголовок — Button — и панель
 * под ним, как у Vue.
 *
 * Селектор — элементный, `<so-accordion-item>`: атрибуты потребителя у секции
 * делятся между корнем и заголовком, как у элемента ListBox. Корень несёт
 * классы, `attrs`, `dataset` и место в коллекции (`order`) — тема раскрывает
 * панель по `data-selected` на нём. Заголовок несёт `aria`
 * (`aria-expanded`, `id` и `aria-controls` на панель) — её кладёт директива
 * набора; на панель — `contentAria` (`role="region"`, `id`,
 * `aria-labelledby`). Статические атрибуты, которые потребитель записал на
 * секцию, кроме `class` и `style`, база переносит на заголовок (`control`).
 *
 * Стрелка — в обёртке, и класс стрелки на обёртке, а не на иконке: тема
 * поворачивает стрелку раскрытой секции по `.so-accordion-item__arrow`, и
 * иконка, подменённая слотом, поворачивается так же. Обёртка стоит, пока на
 * её стороне стрелка по умолчанию или задан слот.
 *
 * Слоты: `leading` и `trailing` проецируются, `default` — панель;
 * `header` (scope `{ text, selected }`) — проекцией или шаблоном, без него —
 * текст; `leading-icon` и `trailing-icon` — шаблоном
 * (`<ng-template slot="leading-icon">`): по ним секция решает, рисовать ли
 * обёртку стрелки, а есть ли что-то в `<ng-content>`, Angular не сообщает.
 *
 * Selector: so-accordion-item
 */
@Component({
	selector: 'so-accordion-item',
	standalone: true,
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
		super(AccordionItemInputNames, {
			strategy: 'host',
			sets: ['attrs', 'dataset'],
			control: true,
			order: true,
		})
	}

	protected createBinding(
		ctrl: IAccordionItem | undefined,
		inputs: object,
	): TBinding<IAccordionItem, TAccordionItemCollectionFacade> {
		return setupAccordionItem(ctrl, inputs)
	}

	/** Клик по заголовку: раскрыть или свернуть секцию через выбор коллекции. */
	protected toggle(): void {
		this.facade()?.context?.adapters.selection.toggle()
	}
}
