import { Component, ChangeDetectionStrategy } from '@angular/core'
import { NgTemplateOutlet } from '@angular/common'
import type { IAccordionItem } from '@soldy-ui/core'
import { AttributesDirective, RoleIconDirective } from '../../../adapter'
import { TButtonComponent } from '../../button'
import { TIconComponent } from '../../icon'
import { TAccordionItemSurface } from '../../../generated/accordion-item.metadata'
import { setupAccordionItem } from './setup.component'

/**
 * TAccordionItemComponent — секция аккордеона: заголовок — Button — и панель
 * под ним, как у Vue.
 *
 * Селектор атрибутный, как у Button: `<div so-accordion-item>`. Корень — сам
 * элемент потребителя, а написанное на нём делится между корнем и
 * заголовком, как у элемента ListBox. Корень несёт классы, `attrs`, `dataset`
 * и место в коллекции (`order`) — тема раскрывает панель по `data-selected`
 * на нём. Заголовок несёт `aria` (`aria-expanded`, `id` и `aria-controls` на
 * панель) — её кладёт директива набора; на панель — `contentAria`
 * (`role="region"`, `id`, `aria-labelledby`). Всё, что потребитель записал на
 * секцию, кроме `class` и `style`, доходит до заголовка (`control`): статику
 * переносит база, привязки и слушатели — рендерер адаптера (`provideAttrs()`).
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
 * `div[so-accordion-item]` стоит первым: по первому селектору Angular выбирает
 * тег хоста, когда создаёт компонент сам (`createComponent`), — это тег ядра
 * по умолчанию.
 *
 * Selector: div[so-accordion-item], [so-accordion-item]
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
