import { Component, ChangeDetectionStrategy } from '@angular/core'
import { NgTemplateOutlet } from '@angular/common'
import type { ITabs, TTabsCollectionFacade } from '@soldy-ui/core'
import { AttributesDirective, SlotDirective, provideElevator, type TBinding } from '../../adapter'
import { TTabsItemComponent } from './item'
import { TabsInputNames, TTabsSurface } from './base.component'
import { setupTabs } from './setup.component'

/**
 * TTabsComponent — набор вкладок: список табов и панели под ним.
 *
 * Обёртки нет: корень — сам элемент потребителя, `<div so-tabs>`. Классы,
 * `attrs` и скрытие раскладывает на него `TComponentBase` (стратегия
 * `'host'`); набор `aria` владельца — это список табов (`role="tablist"`,
 * `aria-orientation`, имя из `aria_label`), и на `.s-tabs__list` его кладёт
 * директива набора: на корне рядом со списком лежат панели.
 *
 * Контекстов два — свой и фасада коллекции (`setupTabs`), и входы фасада
 * (`items`, `engine`, `trackBy`) — входы того же элемента. Свой слой лифта
 * набор отдаёт поддереву провайдером (`provideElevator()`): табы и панели —
 * его содержимое — и табы из данных в его шаблоне прочтут из слоя движок
 * этого набора.
 *
 * Табы — содержимое (`<so-tabs-item>`), а без него — показанные элементы
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
	standalone: true,
	imports: [NgTemplateOutlet, AttributesDirective, SlotDirective, TTabsItemComponent],
	providers: [provideElevator()],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './tabs.component.html',
})
export class TTabsComponent extends TTabsSurface<ITabs> {
	constructor() {
		super(TabsInputNames, { strategy: 'host', sets: ['attrs'] })
	}

	protected createBinding(
		ctrl: ITabs | undefined,
		inputs: object,
	): TBinding<ITabs, TTabsCollectionFacade> {
		return setupTabs(ctrl, inputs, this.engine)
	}
}
