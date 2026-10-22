import { Component, ChangeDetectionStrategy } from '@angular/core'
import { NgTemplateOutlet } from '@angular/common'
import type { IMenuSubmenu, TMenuCollectionFacade, TMenuItemCollectionFacade } from '@soldy-ui/core'
import {
	AttributesDirective,
	RoleIconDirective,
	SlotDirective,
	SlotOutletDirective,
	provideElevator,
	type TBinding,
} from '../../../adapter'
import { TButtonComponent } from '../../button'
import { TFrameComponent } from '../../frame'
import { TIconComponent } from '../../icon'
import { TMenuItemComponent } from '../item'
import { TMenuGroupComponent } from '../group'
import { TMenuSeparatorComponent } from '../separator'
import { MenuSubmenuInputNames, TMenuSubmenuSurface } from './base.component'
import { setupMenuSubmenu, type TMenuSubmenuOutputs } from './setup.component'

/**
 * TMenuSubmenuComponent — пункт с подменю: строка пункта в меню над ним и своя
 * панель с пунктами, как `Menu.Submenu` у Vue.
 *
 * Корень и строка — как у пункта-действия (`TMenuItemComponent`): корень —
 * элемент потребителя (`<div so-menu-submenu>`) с классами, `attrs` и
 * `dataset` (`data-highlighted`, `data-disabled`, `data-open` — открытый пункт
 * горит, пока открыта его панель), строка — Button на `div` (`#control`) с
 * ARIA пункта: роль `menuitem`, `aria-haspopup="menu"`, `aria-expanded`, `id` и
 * `aria-controls` на панель, `tabindex="-1"` от меню. Корень — якорь панели:
 * его прямоугольник — строка.
 *
 * Нажатие строки открывает подменю, а не переключает: открытое наведением клик
 * не закроет. Решает меню над ним (`adapters.menu.open()` через контекст
 * фасада пункта): выключенному отказывает. Стрелку к концу строки, Enter и
 * пробел клавиатура пункта гасит сама и открывает подменю на первом пункте —
 * клика из них нет.
 *
 * Панель — Frame в шаблоне, слоем выше панели меню над ним: телепорт, привязка
 * к корню пункта у конца строки (`end-start`), пометка владельцем. На неё
 * ложится набор панели (`panelAria`: `role="menu"`, `id` и `aria-labelledby`
 * на строку) и пометка `dismiss_ownerAttribute`. Открытость — `visible`
 * панели, `rendered` подменю панель получает сама, как у меню. Классы —
 * привязка `[class]` из `panelClasses`: блок панели меню с размером подменю и
 * вариантом его панели — своим вариантом, а без него вариантом меню над ним.
 *
 * Контекстов три — свой, фасад пункта и фасад меню (`setupMenuSubmenu`):
 * свойства фасада меню (`sections`, `submenus`) шаблон читает из того же
 * `state()`, а `facade()` — фасад пункта, через него строка зовёт нажатие.
 * Входы фасада меню (`items`, `engine`, `trackBy`, `groupBy`, `groups`) — входы
 * того же элемента. Свой слой лифта подменю отдаёт поддереву провайдером
 * (`provideElevator()`): в него фасад меню опускает свою коллекцию, а фасад
 * пункта читает слой над подменю.
 *
 * Слоты: `leading` проецируется; `header` (scope `{ text, open }`) — шаблоном
 * или проекцией (`<span slot="header">`), без него — текст пункта;
 * `arrow-icon` — шаблоном, без него — иконка роли `arrowRight`; `default` —
 * пункты подменю, группы и разделители, а без них — свои пункты из данных
 * (`items`) по секциям, как у меню; `default` бывает и шаблоном — так меню над
 * ним отдаёт подменю из данных свой `item-content`, и шаблон рисуется вместо
 * пунктов из данных; `item` и `item-*` — слоты пунктов из данных, как у меню:
 * подменю следующего уровня оно отдаёт их под теми же именами, а
 * `item-content` — его шаблоном `default`, выводом с инжектором места
 * (`[so-slot-outlet]`). Следующий уровень — сам компонент: автономный
 * компонент Angular видит себя в своём шаблоне без `imports`.
 *
 * Selector: div[so-menu-submenu], [so-menu-submenu]
 */
@Component({
	selector: 'div[so-menu-submenu], [so-menu-submenu]',
	standalone: true,
	imports: [
		NgTemplateOutlet,
		AttributesDirective,
		RoleIconDirective,
		SlotDirective,
		SlotOutletDirective,
		TButtonComponent,
		TFrameComponent,
		TIconComponent,
		TMenuItemComponent,
		TMenuGroupComponent,
		TMenuSeparatorComponent,
	],
	providers: [provideElevator()],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './menu-submenu.component.html',
})
export class TMenuSubmenuComponent extends TMenuSubmenuSurface<IMenuSubmenu> {
	constructor() {
		super(MenuSubmenuInputNames, {
			strategy: 'host',
			sets: ['attrs', 'dataset'],
			control: true,
		})
	}

	protected createBinding(
		ctrl: IMenuSubmenu | undefined,
		inputs: object,
	): TBinding<
		IMenuSubmenu,
		TMenuItemCollectionFacade,
		TMenuSubmenuOutputs,
		TMenuCollectionFacade
	> {
		return setupMenuSubmenu(ctrl, inputs, this.engine)
	}

	/** Клик по строке: подменю открывает меню над ним — выключенному оно откажет. */
	protected openPanel(): void {
		this.facade()?.context?.adapters.menu.open()
	}
}
