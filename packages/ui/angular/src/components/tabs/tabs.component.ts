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
 * Селектор — элементный, `<so-tabs>`: атрибуты потребителя у набора делятся,
 * как у поля, и корнем служит сам элемент компонента. Классы, `attrs`,
 * `dataset` и скрытие раскладывает на него `TComponentBase` (стратегия
 * `'host'`): выключенный набор тема гасит корнем, вместе с панелями
 * (`data-disabled`). Набор `aria` владельца — это список табов (`role="tablist"`, `aria-orientation`,
 * имя из `aria_label`), и на `.so-tabs__list` его кладёт директива набора: на
 * корне рядом со списком лежат панели. Статические атрибуты, которые
 * потребитель записал на набор, кроме `class` и `style`, база переносит на
 * список табов (`control`): `aria-label` и `id` называют список, а не корень
 * без роли.
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
 * Selector: so-tabs
 */
@Component({
	selector: 'so-tabs',
	standalone: true,
	imports: [NgTemplateOutlet, AttributesDirective, SlotDirective, TTabsItemComponent],
	providers: [provideElevator()],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './tabs.component.html',
})
export class TTabsComponent extends TTabsSurface<ITabs> {
	constructor() {
		super(TabsInputNames, { strategy: 'host', sets: ['attrs', 'dataset'], control: true })
	}

	protected createBinding(
		ctrl: ITabs | undefined,
		inputs: object,
	): TBinding<ITabs, TTabsCollectionFacade> {
		return setupTabs(ctrl, inputs, this.engine)
	}
}
