import { Component, ChangeDetectionStrategy } from '@angular/core'
import { NgTemplateOutlet } from '@angular/common'
import type { IMenuItem, TMenuItemCollectionFacade } from '@soldy-ui/core'
import { AttributesDirective, type TBinding } from '../../../adapter'
import { TButtonComponent } from '../../button'
import { MenuItemInputNames, TMenuItemSurface } from './base.component'
import { setupMenuItem } from './setup.component'

/**
 * TMenuItemComponent — пункт-действие меню, как `Menu.Item` у Vue.
 *
 * Селектор атрибутный, как у элемента ListBox: `<div so-menu-item>`. Корень —
 * сам элемент потребителя, а написанное на нём делится между корнем и
 * строкой, как у поля. Корень несёт классы (модификаторы размера меню и своего
 * варианта), `attrs` и `dataset` — состояние для темы (`data-highlighted`,
 * `data-disabled`), — их раскладывает `TComponentBase` (стратегия `'host'`), а
 * строка красится от него: носитель `dataset` один. Строка — Button на `div`
 * (`#control`): на ней ARIA пункта (роль `menuitem`, `tabindex="-1"` от меню)
 * и DOM-фокус, когда пункт подсвечен; кладёт её директива набора поверх того,
 * что кнопка пишет себе сама. Всё, что потребитель записал на пункт, кроме
 * `class` и `style`, доходит до строки (`control`): статику переносит база,
 * привязки и слушатели — рендерер адаптера (`provideAttrs()`). Места в
 * коллекции (`order`) на корне нет, как у Vue: пункты стоят порядком разметки.
 *
 * Нажатие — клик строки: Enter и пробел на ней превращает в клик сама строка
 * (`TActionPlugin`), и путь у мыши и клавиатуры один. Решает меню
 * (`adapters.menu.choose()` через контекст фасада): выключенному пункту оно
 * отказывает, а доступный выполняет и закрывается.
 *
 * Слоты: `leading` (значок) и `trailing` (подсказка сочетания) проецируются в
 * обёртки колонок (`<span slot="leading">`), пустую обёртку тема прячет по
 * `:empty`; `default` (scope `{ text }`) — проекцией или шаблоном
 * (`<ng-template slot="default" let-text="text">`), без него — текст. Шаблоны
 * слотов уходят в слив в конце шаблона: в основной проекции они сняли бы
 * запасной текст.
 *
 * `div[so-menu-item]` стоит первым: по первому селектору Angular выбирает тег
 * хоста, когда создаёт компонент сам (`createComponent`), — это тег ядра по
 * умолчанию.
 *
 * Selector: div[so-menu-item], [so-menu-item]
 */
@Component({
	selector: 'div[so-menu-item], [so-menu-item]',
	standalone: true,
	imports: [NgTemplateOutlet, AttributesDirective, TButtonComponent],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './menu-item.component.html',
})
export class TMenuItemComponent extends TMenuItemSurface<IMenuItem> {
	constructor() {
		super(MenuItemInputNames, { strategy: 'host', sets: ['attrs', 'dataset'], control: true })
	}

	protected createBinding(
		ctrl: IMenuItem | undefined,
		inputs: object,
	): TBinding<IMenuItem, TMenuItemCollectionFacade> {
		return setupMenuItem(ctrl, inputs)
	}

	/** Клик по строке: нажатие через меню — выключенному оно откажет. */
	protected choose(): void {
		this.facade()?.context?.adapters.menu.choose()
	}
}
