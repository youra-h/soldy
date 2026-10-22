import { Component, ChangeDetectionStrategy } from '@angular/core'
import { NgTemplateOutlet } from '@angular/common'
import type { IMenuCheckboxItem, TMenuItemCollectionFacade } from '@soldy-ui/core'
import { AttributesDirective, RoleIconDirective, type TBinding } from '../../../adapter'
import { TButtonComponent } from '../../button'
import { TIconComponent } from '../../icon'
import { MenuCheckboxItemInputNames, TMenuCheckboxItemSurface } from './base.component'
import { setupMenuCheckboxItem } from './setup.component'

/**
 * TMenuCheckboxItemComponent — флажок меню: строка пункта с отметкой в начале,
 * как `Menu.CheckboxItem` у Vue.
 *
 * Корень и строка — как у пункта-действия (`TMenuItemComponent`): корень
 * несёт классы, `attrs` и `dataset` (`data-highlighted`, `data-disabled`,
 * `data-selected`), строка — Button на `div` (`#control`) с ARIA флажка (роль
 * `menuitemcheckbox`, `aria-checked` и `tabindex="-1"` от меню), и написанное
 * на флажке, кроме класса и стиля, доходит до строки.
 *
 * Отметка — выбор коллекции меню, а не своё состояние: вход `selected` и выход
 * `(soChangeSelected)` — у фасада флажка. Нажатие — клик строки, решает меню
 * (`adapters.menu.toggle()`): выключенному отказывает, а доступному
 * переключает отметку и остаётся открытым.
 *
 * Обёртка отметки (`so-menu-item__indicator`) — у неотмеченного флажка тоже: она
 * держит колонку, а её наличие в списке тема читает как «у меню есть колонка
 * отметок». Рисунок внутри — только у отмеченного: шаблон слота
 * `indicator-icon` (scope `{ selected }`) или иконка роли `check`. Обёртка
 * скрыта от скринридера: состояние объявляет `aria-checked`.
 *
 * Слоты: `leading` и `trailing` проецируются, `default` (scope
 * `{ text, selected }`) — проекцией или шаблоном, без него — текст;
 * `indicator-icon` — шаблоном: есть ли что-то в `<ng-content>`, Angular не
 * сообщает, а без слота флажок рисует свою отметку.
 *
 * Selector: div[so-menu-checkbox-item], [so-menu-checkbox-item]
 */
@Component({
	selector: 'div[so-menu-checkbox-item], [so-menu-checkbox-item]',
	standalone: true,
	imports: [
		NgTemplateOutlet,
		AttributesDirective,
		RoleIconDirective,
		TButtonComponent,
		TIconComponent,
	],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './menu-checkbox-item.component.html',
})
export class TMenuCheckboxItemComponent extends TMenuCheckboxItemSurface<IMenuCheckboxItem> {
	constructor() {
		super(MenuCheckboxItemInputNames, {
			strategy: 'host',
			sets: ['attrs', 'dataset'],
			control: true,
		})
	}

	protected createBinding(
		ctrl: IMenuCheckboxItem | undefined,
		inputs: object,
	): TBinding<IMenuCheckboxItem, TMenuItemCollectionFacade> {
		return setupMenuCheckboxItem(ctrl, inputs)
	}

	/** Клик по строке: отметка через меню — выключенному оно откажет. */
	protected toggle(): void {
		this.facade()?.context?.adapters.menu.toggle()
	}
}
