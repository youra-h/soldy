/**
 * Шаблон Menu.
 *
 * Корень — сам `<span is="so-menu">`: классы, `attrs` и `dataset` (`data-open`
 * — для потребителя, который красит свой триггер по контексту) раскладывает на
 * него база (`ElementBase`). ARIA на корне нет: она у панели и у триггера
 * (`sets` в описании корня). Здесь — то же, что в разметке Vue, в том же
 * порядке.
 *
 * - Триггер — содержимое потребителя в слоте `trigger`, в корне перед
 *   панелью: кнопка («…», «Действия»), а у контекстного меню
 *   (`openOn: 'contextmenu'`) — область, строка, файл, картинка. Нажатие по
 *   открытому триггеру — нажатие внутри владельца, и панель не мигает. Scope у
 *   слотов нет, и связку с панелью (`aria-haspopup="menu"`, `aria-expanded`,
 *   `id`, `aria-controls`) и вид «нажат» (`data-selected`) потребитель
 *   привязать не может. Поэтому оба набора — `triggerAria` и `triggerDataset`
 *   — шаблон кладёт на первый элемент слота (узлы слота отдаёт контекст,
 *   `slotted`) одним слоем владельца, как у Popover. У области контекстного
 *   меню связка пуста, и слой владельца на ней снимается.
 * - Панель — деталь Frame
 *   `<div is="so-frame" embedded="menu.frame" tabindex="-1">`: телепорт, слой,
 *   привязка к корню (`TAnchorPlugin`, отступ 4 px, как у Select) и пометка
 *   владельцем для закрытия по нажатию мимо. `tabindex="-1"` — фокус встаёт
 *   на саму панель, пока ни один пункт не подсвечен. Место — `fixed`;
 *   неизменное шаблон пишет панели при построении, как оно стоит в разметке
 *   Vue. У контекстного меню панель встаёт у точки вызова (`point` →
 *   `anchor_point`): точка главнее корня, пока задана, и выбирает между ними
 *   якорь, а не шаблон. Открытость — `visible` панели, а не `rendered`: пункты
 *   входят в коллекцию при монтировании, и закрытие не должно её вычищать.
 *   `rendered` панели шаблон не пишет: корень Web Components только прячется,
 *   до увезённой панели это скрытие не доходит, и прячет её база Frame по
 *   признаку поддерева меню (`ElementBase`, «Поддерево»), а с ней — и панели
 *   подменю и пунктов с панелью. На панель — `aria` меню (`role="menu"`, `id`,
 *   на который ссылается `aria-controls` триггера, и `aria-labelledby` на
 *   триггер — имя меню) и пометка владельцем `dismiss_ownerAttribute` — одним
 *   слоем владельца. Классы — свой набор меню (`panelClasses`): блок
 *   `so-menu__panel` с размером и вариантом меню — модификаторы корня до
 *   телепортированной панели не доходят.
 * - В панели — список `div.so-menu__list`: то, что прокручивается. Роли у
 *   него нет: фокус без подсветки держит панель, и узел с ролью и фокусом
 *   один. В списке — слот `default`, пункты разметкой, группы и разделители, а
 *   без них — пункты из данных по секциям (`items.ts`).
 * - `item`, `item-leading`, `item-trailing`, `item-header`, `item-arrow-icon`,
 *   `item-content` — образцы слотов пунктов из данных
 *   (`<template slot="item-leading">`): scope у слотов Web Components нет, и
 *   копию одного образца получает каждый пункт. Данные копия берёт у пункта
 *   (`el.ctrl`).
 *
 * Пропсы детали Frame пишутся, только когда сменились. Клавиш, подсветки,
 * фокуса и закрытия в шаблоне нет: открытие и наведение —
 * `TMenuPointerPlugin` и `TMenuHoverPlugin`, клавиши — `TMenuKeyboardPlugin`,
 * фокус, Escape и Tab — `TMenuFocusPlugin`, нажатие мимо — `TDismissPlugin`.
 *
 * Scope у слотов нет, как у всех слотов Web Components: открытость и команды
 * содержимое слота берёт у элемента (`el.ctrl`).
 */

import type { IMenu, TMenuCollectionFacade } from '@soldy-ui/core'
import { DEFAULT_SLOT } from '@soldy-ui/setup'
import {
	bind,
	createDetail,
	lend,
	ownerAttributes,
	ownerClasses,
	type ITemplate,
} from '../../adapter'
import { TFrameElement, type TFrameElementProps } from '../frame'
import { drawItems, drawItemsIn } from './items'
import type { TMenuOutputs } from './setup.component'

/** Панель каждого меню — одна на всё время жизни элемента. */
const panels = new WeakMap<HTMLElement, TFrameElementProps>()

function isFrame(node: Element): node is TFrameElementProps {
	return node instanceof TFrameElement
}

/** Триггер — первый элемент слота: текст вокруг него набора не несёт. */
function triggerOf(nodes: readonly ChildNode[]): Element | undefined {
	return nodes.find((node): node is Element => node instanceof Element)
}

export const menuTemplate: ITemplate<IMenu, TMenuCollectionFacade, TMenuOutputs> = {
	create: (root, { hasSlot }) => {
		const { ownerDocument } = root
		const panel = createDetail(
			ownerDocument,
			'div',
			{ is: 'so-frame', embedded: 'menu.frame', attributes: { tabindex: '-1' } },
			isFrame,
		)
		const list = ownerDocument.createElement('div')

		panel.position = 'fixed'
		panel.anchor_anchor = root
		panel.anchor_offset = 4
		list.className = 'so-menu__list'

		// Сначала список в панель, потом панель в корень: они входят в документ
		// одной вставкой и собираются по одному разу
		lend(panel, DEFAULT_SLOT, list)
		root.appendChild(panel)

		// Пункты разметки — сами пункты меню: петли из данных при них нет
		if (!hasSlot(DEFAULT_SLOT)) drawItemsIn(root, list)

		panels.set(root, panel)

		return {
			slots: {
				trigger: { mode: 'before', node: panel },
				default: { mode: 'append', node: list },
				item: { mode: 'sample' },
				'item-leading': { mode: 'sample' },
				'item-trailing': { mode: 'sample' },
				'item-header': { mode: 'sample' },
				'item-arrow-icon': { mode: 'sample' },
				'item-content': { mode: 'sample' },
			},
		}
	},

	bindings: [
		// Пропсы панели — только сменившиеся
		bind(['open', 'placement', 'point'], ({ root, state }) => {
			const panel = panels.get(root)

			if (!panel) return

			const visible = state.open === true
			const point = state.point ?? null

			if (panel.visible !== visible) panel.visible = visible
			if (panel.anchor_placement !== state.placement) {
				panel.anchor_placement = state.placement
			}
			if (panel.anchor_point !== point) panel.anchor_point = point
		}),

		bind('panelClasses', ({ root, state }) => {
			const panel = panels.get(root)

			if (panel) ownerClasses(panel, state.panelClasses)
		}),

		// Наборы панели — одним слоем владельца, в порядке Vue
		bind(['aria', 'dismiss_ownerAttribute'], ({ root, state }) => {
			const panel = panels.get(root)

			if (panel) ownerAttributes(panel, { ...state.aria, ...state.dismiss_ownerAttribute })
		}),

		// Связка и вид «нажат» — триггеру, одним слоем владельца (см. шапку)
		bind(['triggerAria', 'triggerDataset'], ({ state, slotted }) => {
			const trigger = triggerOf(slotted('trigger'))

			if (trigger) ownerAttributes(trigger, { ...state.triggerAria, ...state.triggerDataset })
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
