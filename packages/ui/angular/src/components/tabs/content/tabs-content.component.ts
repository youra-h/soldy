import { Component, ChangeDetectionStrategy } from '@angular/core'
import type { ITabsContent } from '@soldy-ui/core'
import { TTabsContentSurface } from '../../../generated/tabs-content.metadata'
import { setupTabsContent } from './setup.component'

/**
 * TTabsContentComponent — панель таба. Видна, когда активен связанный по
 * `value` таб.
 *
 * Обёртки нет: корень — сам элемент потребителя, `<div so-tabs-content>`, в
 * слоте `content` набора (`slot="content"`). Классы, `attrs` и `aria` панели
 * (`role="tabpanel"`, `id` и `aria-labelledby` от её таба) раскладывает на
 * него `TComponentBase` (стратегия `'host'`).
 *
 * Неактивная панель скрыта: описание корня называет выход `active` фасада, без
 * которого корня нет (`shownBy`), — убрать элемент потребителя компонент не
 * может. Содержимое неактивной панели в документ не вставляется (`@if`
 * вокруг `<ng-content>`), но компоненты в нём Angular создаёт всё равно: их
 * создаёт тот, кто написал содержимое, — как `mat-tab` без ленивого шаблона.
 * `rendered` остаётся за потребителем — он может выключить панель совсем.
 *
 * `div[so-tabs-content]` стоит первым: по первому селектору Angular выбирает
 * тег хоста, когда создаёт компонент сам (`createComponent`), — это тег ядра
 * по умолчанию.
 *
 * Selector: div[so-tabs-content], [so-tabs-content]
 */
@Component({
	selector: 'div[so-tabs-content], [so-tabs-content]',
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './tabs-content.component.html',
})
export class TTabsContentComponent extends TTabsContentSurface<ITabsContent> {
	constructor() {
		super(setupTabsContent, {
			strategy: 'host',
			sets: ['attrs', 'aria'],
			shownBy: 'active',
		})
	}
}
