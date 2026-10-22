import { Component, ChangeDetectionStrategy } from '@angular/core'
import { NgTemplateOutlet } from '@angular/common'
import type { IMenuPopoverItem, TMenuItemCollectionFacade } from '@soldy-ui/core'
import { AttributesDirective, RoleIconDirective, type TBinding } from '../../../adapter'
import { TButtonComponent } from '../../button'
import { TFrameComponent } from '../../frame'
import { TIconComponent } from '../../icon'
import { MenuPopoverItemInputNames, TMenuPopoverItemSurface } from './base.component'
import { setupMenuPopoverItem, type TMenuPopoverItemOutputs } from './setup.component'

/**
 * TMenuPopoverItemComponent — пункт с панелью: строка пункта в меню и своя
 * панель сбоку с любым содержимым — календарём, полями, палитрой, — как
 * `Menu.PopoverItem` у Vue.
 *
 * Корень и строка — как у пункта-действия (`TMenuItemComponent`): корень —
 * элемент потребителя (`<div so-menu-popover-item>`) с классом блока пункта,
 * общим с действием, модификаторами размера меню и своего варианта, `attrs` и
 * `dataset` (`data-highlighted`, `data-disabled`, `data-open` — панель
 * открыта), строка — Button на `div` (`#control`) с ARIA пункта: роль
 * `menuitem`, `aria-haspopup="dialog"`, `aria-expanded`, `id` и
 * `aria-controls` на панель, `tabindex="-1"` от меню.
 *
 * Нажатие строки открывает панель, а не выполняет действие: меню остаётся
 * открытым, а открытую панель повторное нажатие не закрывает. Решает меню
 * (`adapters.menu.open()` через контекст фасада): выключенному отказывает.
 *
 * Панель — Frame в шаблоне, у самого конца строки (`end-start`), слоем поверх
 * панели меню: нажатие и фокус в ней меню мимо не считает. Класс —
 * `so-menu-item__panel`, без модификаторов размера и варианта: содержимое
 * красится само. На неё ложится набор панели (`panelAria`: `role="dialog"`,
 * `id` и `aria-labelledby` на строку) и пометка `dismiss_ownerAttribute`.
 * Открытость — `visible` панели, `rendered` пункта панель получает сама, как у
 * меню. Содержимое — основная проекция в обёртке `.so-menu-item__content`;
 * `lazyMount` убирает его из документа до первого открытия, но компоненты в
 * нём Angular создаёт всё равно — их создаёт тот, кто написал содержимое, как в
 * панели поповера.
 *
 * Слоты: `leading` проецируется; `header` (scope `{ text, open }`) — шаблоном
 * или проекцией, без него — текст пункта; `arrow-icon` — шаблоном, без него —
 * иконка роли `arrowRight`; `default` — содержимое панели.
 *
 * Selector: div[so-menu-popover-item], [so-menu-popover-item]
 */
@Component({
	selector: 'div[so-menu-popover-item], [so-menu-popover-item]',
	standalone: true,
	imports: [
		NgTemplateOutlet,
		AttributesDirective,
		RoleIconDirective,
		TButtonComponent,
		TFrameComponent,
		TIconComponent,
	],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './menu-popover-item.component.html',
})
export class TMenuPopoverItemComponent extends TMenuPopoverItemSurface<IMenuPopoverItem> {
	constructor() {
		super(MenuPopoverItemInputNames, {
			strategy: 'host',
			sets: ['attrs', 'dataset'],
			control: true,
		})
	}

	protected createBinding(
		ctrl: IMenuPopoverItem | undefined,
		inputs: object,
	): TBinding<IMenuPopoverItem, TMenuItemCollectionFacade, TMenuPopoverItemOutputs> {
		return setupMenuPopoverItem(ctrl, inputs)
	}

	/** Клик по строке: панель открывает меню — выключенному оно откажет. */
	protected openPanel(): void {
		this.facade()?.context?.adapters.menu.open()
	}
}
