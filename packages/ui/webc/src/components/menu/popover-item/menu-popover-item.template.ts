/**
 * Шаблон пункта с панелью, как `Menu.PopoverItem` у Vue: строка открывает
 * сбоку свою панель с любым содержимым — календарём, полями, палитрой.
 *
 * Корень — сам `<div is="so-menu-popover-item">`: классы (размер меню и свой
 * вариант), `attrs` и `dataset` — `data-highlighted`, `data-disabled` и
 * `data-open` (панель открыта) — раскладывает на него база, и строка красится
 * от него. Корень — якорь панели: его прямоугольник — строка.
 *
 * - Строка — Button на `div` (`menu.row`, см. `row.ts`): на ней `aria`
 *   пункта — `menuitem`, `aria-haspopup="dialog"`, `aria-expanded`, `id` и
 *   `aria-controls` на панель. Нажатие открывает панель, а не выполняет
 *   действие: меню остаётся открытым, а открытую панель повторное нажатие не
 *   закрывает. Решает меню (`adapters.menu.open()`): выключенному отказывает.
 *   Стрелку к концу строки клавиатура пункта гасит и открывает панель сама.
 * - Значок — слот `leading` в обёртке `span.so-menu-item__icon`, текст строки —
 *   слот `header` (`default` — содержимое панели), без него — текст пункта.
 *   Стрелка — у конца строки, в обёртке `span.so-menu-item__arrow` под
 *   `aria-hidden`: слот `arrow-icon` или иконка роли `arrowRight`,
 *   `<span is="so-icon" embedded="menu.arrow">`. Подсказки сочетания у этого
 *   пункта нет.
 * - Панель — деталь Frame
 *   `<div is="so-frame" embedded="menu.popover-item-frame" tabindex="-1">` с
 *   классом `so-menu-item__panel`: телепорт в `body`, слой поверх панели меню
 *   (нажатие и фокус в ней меню мимо не считает), привязка к корню пункта и
 *   пометка владельцем. Встаёт у конца строки, верхом вровень с ней, без зазора
 *   (`end-start`). На панель — набор `panelAria` (`role="dialog"`, `id`,
 *   `aria-labelledby` на строку) и пометка владельцем — одним слоем владельца.
 *   Модификаторов размера и варианта у неё нет: содержимое красится само.
 *   Открытость — `visible` панели. `rendered` панели шаблон не пишет: корень
 *   Web Components только прячется, и увезённую панель прячет база Frame по
 *   признаку поддерева пункта (`ElementBase`, «Поддерево») — и у скрытого
 *   меню над ним тоже.
 * - В панели — обёртка `div.so-menu-item__content` со слотом `default`: то,
 *   что прокручивается. `lazyMount` действует только на слот
 *   (`contentRendered` — `showSlot`): обёртка остаётся, а содержимое до первого
 *   открытия вне документа, и элементы soldy в нём не собираются. Крестика и
 *   полосы жеста нет: панель закрывают Escape, нажатие мимо и другой пункт.
 *
 * Scope у слотов нет, как у всех слотов Web Components: текст и открытость
 * содержимое слота берёт у элемента (`el.ctrl`).
 */

import type { IMenuPopoverItem, TMenuItemCollectionFacade } from '@soldy-ui/core'
import { DEFAULT_SLOT } from '@soldy-ui/setup'
import { bind, createDetail, lend, ownerAttributes, type ITemplate } from '../../../adapter'
import { TFrameElement, type TFrameElementProps } from '../../frame'
import type { TIconElementProps } from '../../icon'
import { createRow, iconSize, partOf, roleIconOf, rowBindings } from '../row'
import type { TMenuPopoverItemOutputs } from './setup.component'

/** Части пункта с панелью — одни на всё время жизни элемента. */
type TPopoverItemParts = {
	readonly panel: TFrameElementProps
	/** Своя стрелка; со слотом `arrow-icon` — `null`. */
	readonly arrow: TIconElementProps | null
}

const parts = new WeakMap<HTMLElement, TPopoverItemParts>()

export const menuPopoverItemTemplate: ITemplate<
	IMenuPopoverItem,
	TMenuItemCollectionFacade,
	TMenuPopoverItemOutputs
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
		const panel = createDetail(ownerDocument, TFrameElement, {
			embedded: 'menu.popover-item-frame',
			attributes: { tabindex: '-1' },
		})
		const content = ownerDocument.createElement('div')

		if (arrow) arrowPart.appendChild(arrow)

		panel.className = 'so-menu-item__panel'
		panel.position = 'fixed'
		panel.anchor_anchor = root
		panel.anchor_placement = 'end-start'
		content.className = 'so-menu-item__content'

		lend(row, 'leading', icon)
		lend(row, 'trailing', arrowPart)
		// Сначала обёртка содержимого в панель, потом панель в корень: они входят
		// в документ одной вставкой и собираются по одному разу
		lend(panel, DEFAULT_SLOT, content)
		root.appendChild(panel)
		parts.set(root, { panel, arrow })

		return {
			slots: {
				leading: { mode: 'append', node: icon },
				header: { mode: 'append', node: row, slot: DEFAULT_SLOT },
				'arrow-icon': { mode: 'append', node: arrowPart },
				default: { mode: 'append', node: content },
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

		// Наборы панели — одним слоем владельца, в порядке Vue
		bind(['panelAria', 'dismiss_ownerAttribute'], ({ root, state }) => {
			const panel = parts.get(root)?.panel

			if (panel)
				ownerAttributes(panel, { ...state.panelAria, ...state.dismiss_ownerAttribute })
		}),

		// `lazyMount`: содержимое — в документе с первого открытия (см. шапку)
		bind('contentRendered', ({ state, showSlot }) => {
			showSlot(DEFAULT_SLOT, state.contentRendered === true)
		}),
	],
}
