import { Component, ChangeDetectionStrategy } from '@angular/core'
import type { TMenuSeparator } from '@soldy-ui/core'
import type { TBinding } from '../../../adapter'
import { MenuSeparatorInputNames, TMenuSeparatorSurface } from './base.component'
import { setupMenuSeparator } from './setup.component'

/**
 * TMenuSeparatorComponent — линия между группами пунктов меню, как
 * `Menu.Separator` у Vue.
 *
 * Корень — сам элемент потребителя (`<div so-menu-separator>`) с тремя наборами
 * ядра: `role="separator"` пишет ядро. Навигация его пропускает — в коллекцию
 * меню разделитель не входит. Внутри ничего не рисуется: написанное в элементе
 * не выводится. Ставит его и меню само — между секциями групп из данных, пока
 * их просит `groupSeparators`; ручной разделитель разметки свойство не трогает.
 *
 * Selector: div[so-menu-separator], [so-menu-separator]
 */
@Component({
	selector: 'div[so-menu-separator], [so-menu-separator]',
	standalone: true,
	changeDetection: ChangeDetectionStrategy.OnPush,
	template: '',
})
export class TMenuSeparatorComponent extends TMenuSeparatorSurface<TMenuSeparator> {
	constructor() {
		super(MenuSeparatorInputNames, { strategy: 'host' })
	}

	protected createBinding(
		ctrl: TMenuSeparator | undefined,
		inputs: object,
	): TBinding<TMenuSeparator> {
		return setupMenuSeparator(ctrl, inputs)
	}
}
