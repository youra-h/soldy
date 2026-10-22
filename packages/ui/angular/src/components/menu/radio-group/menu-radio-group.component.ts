import { Component, ChangeDetectionStrategy } from '@angular/core'
import type { IMenuRadioGroup } from '@soldy-ui/core'
import { AttributesDirective, provideElevator } from '../../../adapter'
import { TMenuRadioGroupSurface } from '../../../generated/menu-radio-group.metadata'
import { setupMenuRadioGroup } from './setup.component'

/**
 * TMenuRadioGroupComponent — переключатели меню под общей подписью и со своим
 * значением, как `Menu.RadioGroup` у Vue.
 *
 * Разметка — как у группы меню (`TMenuGroupComponent`): корень — сам элемент
 * потребителя (`<div so-menu-radio-group>`) с тремя наборами ядра,
 * `role="group"` и `aria-labelledby` на подпись. Роли `radiogroup` нет: в меню
 * группа переключателей — `group` (APG). Переключатели входят в коллекцию меню
 * сквозь группу.
 *
 * Значение — `value` отмеченного переключателя, вход `value` и выход
 * `(soChangeValue)`; `null` — ни одного. Свой слой лифта группа отдаёт
 * поддереву провайдером (`provideElevator()`): в него проводки опускают ключ
 * группы — пунктам в группировку — и саму группу — переключателям.
 *
 * Selector: div[so-menu-radio-group], [so-menu-radio-group]
 */
@Component({
	selector: 'div[so-menu-radio-group], [so-menu-radio-group]',
	imports: [AttributesDirective],
	providers: [provideElevator()],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './menu-radio-group.component.html',
})
export class TMenuRadioGroupComponent extends TMenuRadioGroupSurface<IMenuRadioGroup> {
	constructor() {
		super(setupMenuRadioGroup, { strategy: 'host' })
	}
}
