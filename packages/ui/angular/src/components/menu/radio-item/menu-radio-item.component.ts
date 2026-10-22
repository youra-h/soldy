import { Component, ChangeDetectionStrategy } from '@angular/core'
import { NgTemplateOutlet } from '@angular/common'
import type { IMenuRadioItem, TMenuItemCollectionFacade } from '@soldy-ui/core'
import { AttributesDirective, type TBinding } from '../../../adapter'
import { TButtonComponent } from '../../button'
import { MenuRadioItemInputNames, TMenuRadioItemSurface } from './base.component'
import { setupMenuRadioItem } from './setup.component'

/**
 * TMenuRadioItemComponent — переключатель меню: строка пункта с отметкой-точкой
 * в начале, как `Menu.RadioItem` у Vue. Стоит в группе переключателей
 * (`<div so-menu-radio-group>`): в ней отмечен один.
 *
 * Корень и строка — как у флажка (`TMenuCheckboxItemComponent`): на строке —
 * ARIA переключателя (роль `menuitemradio`, `aria-checked` и `tabindex="-1"`
 * от меню). Отметка — выбор коллекции меню: вход `selected` и выход
 * `(soChangeSelected)` — у фасада переключателя, значение — у группы.
 *
 * Нажатие — клик строки, решает меню (`adapters.menu.check()`): выключенному
 * отказывает, а доступный отмечает — с остальных переключателей группы отметка
 * снимается — и остаётся открытым. Отмеченный нажатием не снимается.
 *
 * Обёртка отметки — у неотмеченного переключателя тоже, точка внутри — только
 * у отмеченного; её рисует тема (`so-menu-item__dot`), без иконки, а шаблон
 * слота `indicator-icon` (scope `{ selected }`) её подменяет.
 *
 * Selector: div[so-menu-radio-item], [so-menu-radio-item]
 */
@Component({
	selector: 'div[so-menu-radio-item], [so-menu-radio-item]',
	standalone: true,
	imports: [NgTemplateOutlet, AttributesDirective, TButtonComponent],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './menu-radio-item.component.html',
})
export class TMenuRadioItemComponent extends TMenuRadioItemSurface<IMenuRadioItem> {
	constructor() {
		super(MenuRadioItemInputNames, {
			strategy: 'host',
			sets: ['attrs', 'dataset'],
			control: true,
		})
	}

	protected createBinding(
		ctrl: IMenuRadioItem | undefined,
		inputs: object,
	): TBinding<IMenuRadioItem, TMenuItemCollectionFacade> {
		return setupMenuRadioItem(ctrl, inputs)
	}

	/** Клик по строке: отметка через меню — выключенному оно откажет. */
	protected check(): void {
		this.facade()?.context?.adapters.menu.check()
	}
}
