import { Component, ChangeDetectionStrategy } from '@angular/core'
import { NgTemplateOutlet } from '@angular/common'
import type { ITabs } from '@soldy-ui/core'
import { AttributesDirective, SlotDirective, provideElevator } from '../../adapter'
import { TTabsItemComponent } from './item'
import { TTabsSurface } from '../../generated/tabs.metadata'
import { setupTabs } from './setup.component'

/**
 * TTabsComponent — набор вкладок: список табов и панели под ним.
 *
 * Селектор атрибутный, как у Button: `<div so-tabs>`. Корень — сам элемент
 * потребителя, а написанное на нём делится, как у поля. Классы, `attrs`,
 * `dataset` и скрытие раскладывает на него `TComponentBase` (стратегия
 * `'host'`): выключенный набор тема гасит корнем, вместе с панелями
 * (`data-disabled`). Набор `aria` владельца — это список табов
 * (`role="tablist"`, `aria-orientation`, имя из `aria_label`), и на
 * `.so-tabs__list` его кладёт директива набора: на корне рядом со списком
 * лежат панели. Всё, что потребитель записал на набор, кроме `class` и
 * `style`, доходит до списка табов (`control`): статику переносит база,
 * привязки и слушатели — рендерер адаптера (`provideAttrs()`). `aria-label` и
 * `id` называют список, а не корень без роли.
 *
 * Контекстов два — свой и фасада коллекции (`setupTabs`), и входы фасада
 * (`items`, `engine`, `trackBy`) — входы того же элемента. Свой слой лифта
 * набор отдаёт поддереву провайдером (`provideElevator()`): табы и панели —
 * его содержимое — и табы из данных в его шаблоне прочтут из слоя движок
 * этого набора.
 *
 * Табы — содержимое (`<div so-tabs-item>`), а без него — показанные элементы
 * коллекции (`shown`), запасным содержимым. Панели — слот `content`
 * (`<div so-tabs-content slot="content" value="a">`): `default` лежит внутри
 * `[role=tablist]`, и панель, попав туда, оказалась бы в списке табов.
 *
 * `div[so-tabs]` стоит первым: по первому селектору Angular выбирает тег
 * хоста, когда создаёт компонент сам (`createComponent`), — это тег ядра по
 * умолчанию.
 *
 * Selector: div[so-tabs], [so-tabs]
 */
@Component({
	selector: 'div[so-tabs], [so-tabs]',
	imports: [NgTemplateOutlet, AttributesDirective, SlotDirective, TTabsItemComponent],
	providers: [provideElevator()],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './tabs.component.html',
})
export class TTabsComponent extends TTabsSurface<ITabs> {
	constructor() {
		super((ctrl, inputs) => setupTabs(ctrl, inputs, this.engine), {
			strategy: 'host',
			sets: ['attrs', 'dataset'],
			control: true,
		})
	}
}
