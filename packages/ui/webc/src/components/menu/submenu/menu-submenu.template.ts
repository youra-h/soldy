/**
 * Шаблон пункта с подменю, как `Menu.Submenu` у Vue: строка пункта в меню над
 * ним и своя панель с пунктами.
 *
 * Корень — сам `<div is="so-menu-submenu">`: классы (размер меню и свой
 * вариант), `attrs` и `dataset` — `data-highlighted`, `data-disabled` и
 * `data-open`: открытый пункт горит, пока открыта его панель, — раскладывает на
 * него база. Корень — якорь панели: его прямоугольник — строка.
 *
 * - Строка — Button на `div` (`menu.row`, см. `row.ts`): на ней `aria` пункта
 *   — `menuitem`, `aria-haspopup="menu"`, `aria-expanded`, `id` и
 *   `aria-controls` на панель. Нажатие открывает подменю, а не переключает:
 *   открытое наведением клик не закроет. Решает меню над ним
 *   (`adapters.menu.open()` фасада пункта): выключенному отказывает. Стрелку к
 *   концу строки, Enter и пробел клавиатура пункта гасит сама и открывает
 *   подменю на первом пункте — клика из них нет.
 * - Значок — слот `leading` в обёртке `span.so-menu-item__icon`, текст — слот
 *   `header`, без него — текст пункта (`text`). Стрелка — у конца строки, в
 *   обёртке `span.so-menu-item__arrow` под `aria-hidden`, которая держит её
 *   место и зеркалит её в RTL: слот `arrow-icon` или иконка роли `arrowRight`,
 *   `<span is="so-icon" embedded="menu.arrow">`.
 * - Панель — деталь Frame
 *   `<div is="so-frame" embedded="menu.submenu-frame" tabindex="-1">`, как у
 *   меню: телепорт, слой выше панели меню над ним (нажатие в ней меню мимо не
 *   считает), привязка к корню пункта и пометка владельцем. Встаёт у конца
 *   строки, верхом вровень с ней, без зазора (`end-start`); у края окна
 *   привязка переводит её к началу строки, в RTL — наоборот. На панель —
 *   набор `panelAria` (`role="menu"`, `id`, `aria-labelledby` на строку — имя
 *   подменю) и пометка владельцем `dismiss_ownerAttribute` — одним слоем
 *   владельца. Классы — свой набор (`panelClasses`): блок панели меню с
 *   размером подменю и вариантом его панели. Открытость — `visible` панели, а
 *   не `rendered`: пункты входят в коллекцию подменю при монтировании, и
 *   закрытие не должно её вычищать. `rendered` панели шаблон не пишет: корень
 *   Web Components только прячется, до увезённой панели это скрытие не
 *   доходит, и прячет её база Frame по признаку поддерева пункта
 *   (`ElementBase`, «Поддерево») — и у скрытого меню над ним тоже.
 * - В панели — список `div.so-menu__list`: то, что прокручивается. В нём —
 *   слот `default`, пункты подменю разметкой, а без них — свои пункты из
 *   данных по секциям (`items.ts`). Пункты списка — в коллекции подменю: лифт
 *   отдаёт им ближайшую, а поиск вверх от увезённой панели идёт к её якорю, в
 *   корень подменю.
 * - `item`, `item-leading`, `item-trailing`, `item-header`, `item-arrow-icon`,
 *   `item-content` — образцы слотов пунктов из данных, как у меню: у подменю из
 *   данных их отдаёт меню над ним, под теми же именами.
 *
 * Пропсы детали Frame пишутся, только когда сменились. Клавиш, подсветки,
 * фокуса и закрытия в шаблоне нет — это плагины подменю и меню над ним.
 */

import type { IMenuSubmenu, TMenuCollectionFacade, TMenuItemCollectionFacade } from '@soldy-ui/core'
import { DEFAULT_SLOT } from '@soldy-ui/setup'
import {
	bind,
	createDetail,
	lend,
	ownerAttributes,
	ownerClasses,
	type ITemplate,
} from '../../../adapter'
import { TFrameElement, type TFrameElementProps } from '../../frame'
import type { TIconElementProps } from '../../icon'
import { drawItems, drawItemsIn } from '../items'
import { createRow, iconSize, partOf, roleIconOf, rowBindings } from '../row'
import type { TMenuSubmenuOutputs } from './setup.component'

/** Части пункта с подменю — одни на всё время жизни элемента. */
type TSubmenuParts = {
	readonly panel: TFrameElementProps
	/** Своя стрелка; со слотом `arrow-icon` — `null`. */
	readonly arrow: TIconElementProps | null
}

const parts = new WeakMap<HTMLElement, TSubmenuParts>()

function isFrame(node: Element): node is TFrameElementProps {
	return node instanceof TFrameElement
}

export const menuSubmenuTemplate: ITemplate<
	IMenuSubmenu,
	TMenuItemCollectionFacade,
	TMenuSubmenuOutputs,
	TMenuCollectionFacade
> = {
	create: (root, ctx) => {
		const { hasSlot } = ctx

		const { ownerDocument } = root
		const row = createRow(root, () => ctx.facade?.context?.adapters.menu.open())
		const icon = partOf(ownerDocument, 'so-menu-item__icon')
		const arrowPart = partOf(ownerDocument, 'so-menu-item__arrow', true)
		// Своя стрелка — только без слота `arrow-icon`: заданный слот заменяет её
		// целиком
		const arrow = hasSlot('arrow-icon')
			? null
			: roleIconOf(ownerDocument, 'menu.arrow', 'arrowRight')
		const panel = createDetail(
			ownerDocument,
			'div',
			{ is: 'so-frame', embedded: 'menu.submenu-frame', attributes: { tabindex: '-1' } },
			isFrame,
		)
		const list = ownerDocument.createElement('div')

		if (arrow) arrowPart.appendChild(arrow)

		panel.position = 'fixed'
		panel.anchor_anchor = root
		panel.anchor_placement = 'end-start'
		list.className = 'so-menu__list'

		lend(row, 'leading', icon)
		lend(row, 'trailing', arrowPart)
		// Сначала список в панель, потом панель в корень: они входят в документ
		// одной вставкой и собираются по одному разу
		lend(panel, DEFAULT_SLOT, list)
		root.appendChild(panel)

		// Пункты разметки — сами пункты подменю: петли из данных при них нет
		if (!hasSlot(DEFAULT_SLOT)) drawItemsIn(root, list)

		parts.set(root, { panel, arrow })

		return {
			slots: {
				leading: { mode: 'append', node: icon },
				header: { mode: 'append', node: row, slot: DEFAULT_SLOT },
				'arrow-icon': { mode: 'append', node: arrowPart },
				default: { mode: 'append', node: list },
				item: { mode: 'sample' },
				'item-leading': { mode: 'sample' },
				'item-trailing': { mode: 'sample' },
				'item-header': { mode: 'sample' },
				'item-arrow-icon': { mode: 'sample' },
				'item-content': { mode: 'sample' },
			},
			control: row,
		}
	},

	bindings: [
		...rowBindings('header'),

		bind('size', ({ root, state }) => iconSize(parts.get(root)?.arrow ?? null, state.size)),

		// Пропсы панели — только сменившиеся
		bind('open', ({ root, state }) => {
			const panel = parts.get(root)?.panel
			const visible = state.open === true

			if (panel && panel.visible !== visible) panel.visible = visible
		}),

		bind('panelClasses', ({ root, state }) => {
			const panel = parts.get(root)?.panel

			if (panel) ownerClasses(panel, state.panelClasses)
		}),

		// Наборы панели — одним слоем владельца, в порядке Vue
		bind(['panelAria', 'dismiss_ownerAttribute'], ({ root, state }) => {
			const panel = parts.get(root)?.panel

			if (panel)
				ownerAttributes(panel, { ...state.panelAria, ...state.dismiss_ownerAttribute })
		}),

		bind(['sections', 'submenus', 'groupSeparators'], (ctx) => {
			drawItems(
				ctx,
				ctx.state.sections,
				ctx.state.submenus,
				ctx.state.groupSeparators === true,
			)
		}),
	],
}
