/**
 * Шаблон Popover.
 *
 * Корень — сам `<span is="so-popover">`: классы, `attrs` и `dataset`
 * (`data-open` — для темы и для потребителя, который красит свой триггер по
 * контексту) раскладывает на него база (`ElementBase`). ARIA на корне нет:
 * она у панели и у триггера (`sets` в описании корня). Здесь — то же, что в
 * разметке Vue, в том же порядке.
 *
 * - Триггер — содержимое потребителя в слоте `trigger`, в корне перед панелью.
 *   Нажатие по открытому триггеру — нажатие внутри владельца, и панель не
 *   мигает. Scope у слотов нет, и связку с панелью (`aria-haspopup`,
 *   `aria-expanded`, `aria-controls`) и вид «нажат» (`data-selected`)
 *   потребитель привязать не может. Поэтому оба набора — `triggerAria` и
 *   `triggerDataset` — шаблон кладёт на первый элемент слота (узлы слота
 *   отдаёт контекст, `slotted`) одним слоем владельца: два вызова затёрли бы
 *   набор друг друга. Триггер — тот же узел, что написал потребитель, и набор
 *   на нём сменяется на месте.
 * - Панель — деталь Frame
 *   `<div is="so-frame" embedded="popover.frame" tabindex="-1">` с классом
 *   `so-popover__panel`: телепорт, слой, привязка к корню, пометка
 *   владельцем. `tabindex="-1"` — фокус встаёт на саму панель, когда внутри
 *   нечего фокусировать. В цель и обратно (`contained`) панель уводит база
 *   самого Frame. Якорь — корень поповера (`anchor_anchor`), место — `fixed`
 *   в 8 px от него, сторону у края окна выбирает `TAnchorPlugin` поверх
 *   `placement`; неизменное шаблон пишет панели при построении, как оно
 *   стоит в разметке Vue. Открытость — `visible` панели, а не `rendered`:
 *   закрытие её прячет. `rendered` панели шаблон не пишет: до панели,
 *   увезённой в цель, скрытие корня не доходит, и прячет её база Frame по
 *   признаку поддерева поповера (`ElementBase`, «Поддерево») — так же, как
 *   слои в его содержимом; у остальных адаптеров `rendered=false` снимает её
 *   вместе с корнем. На панель — `aria` поповера (`role="dialog"`, `id`, на
 *   который ссылается `aria-controls` триггера, имя от `TAriaPlugin`),
 *   `panelDataset` (`data-swiping`, у панели в контейнере — `data-edge`) и
 *   пометка владельцем `dismiss_ownerAttribute` — одним слоем владельца, в
 *   порядке Vue. Открытость для темы (`data-open`) Frame пишет сам: это
 *   видимость его слоя, а `data-open` корня до телепортированной панели не
 *   доходит.
 * - В панели по порядку — свет детали (`lend`): полоса жеста
 *   `div.so-popover__handle` под `aria-hidden`, пока жест включён
 *   (`handleRendered`), — первой; обёртка содержимого
 *   `div.so-popover__content` со слотом `default`; крестик — последним.
 *   Содержимое в DOM раньше крестика: фокус при открытии встаёт на первый
 *   фокусируемый элемент содержимого, а крестик — последняя остановка Tab.
 *   `lazyMount` действует только на слот (`contentRendered` — `showSlot`):
 *   обёртка остаётся, а содержимое до первого открытия вне документа, и
 *   элементы soldy в нём не собираются.
 * - Крестик — деталь `<button is="so-button" embedded="popover.close"
 *   type="button">` с классом `so-popover__close`, в панели — пока
 *   `closable`. Имя — набор `closeAria` (от локали, пишет плагин имён),
 *   верхним слоем её раскладчика. Нажатие только пишет `open = false`
 *   инстансу текущей связки: куда вернуть фокус, решает плагин фокуса. В
 *   кнопке — слот `close-icon` или иконка роли `close`,
 *   `<span is="so-icon" embedded="popover.close-icon">`. Вида и размера у
 *   крестика нет: значения вида объявляет тема, и красит его она по контексту.
 *
 * Пропсы детали Frame пишутся, только когда сменились. Обработчиков открытия и
 * закрытия, кроме крестика, у шаблона нет: клик по триггеру, нажатие и фокус
 * мимо, Escape и Tab — плагины поповера.
 *
 * Scope у слотов нет, как у всех слотов Web Components: открытость и команды
 * содержимое слота берёт у элемента (`el.ctrl`).
 */

import type { IPopover } from '@soldy-ui/core'
import { DEFAULT_SLOT } from '@soldy-ui/setup'
import { bind, createDetail, lend, ownerAttributes, type ITemplate, patch } from '../../adapter'
import { lendRoleIcon } from '../common/icon-button'
import { TButtonElement, type TButtonElementProps } from '../button'
import { TFrameElement, type TFrameElementProps } from '../frame'
import type { TPopoverOutputs } from './setup.component'

/** Части поповера — одни на всё время жизни элемента. */
type TPopoverParts = {
	readonly panel: TFrameElementProps
	readonly handle: HTMLElement
	readonly close: TButtonElementProps
}

const parts = new WeakMap<HTMLElement, TPopoverParts>()

/** Триггер — первый элемент слота: текст вокруг него набора не несёт. */
function triggerOf(nodes: readonly ChildNode[]): Element | undefined {
	return nodes.find((node): node is Element => node instanceof Element)
}

export const popoverTemplate: ITemplate<IPopover, unknown, TPopoverOutputs> = {
	create: (root, ctx) => {
		const { hasSlot } = ctx

		const { ownerDocument } = root
		const panel = createDetail(ownerDocument, TFrameElement, {
			embedded: 'popover.frame',
			attributes: { tabindex: '-1' },
		})
		const handle = ownerDocument.createElement('div')
		const content = ownerDocument.createElement('div')
		const close = createDetail(ownerDocument, TButtonElement, {
			embedded: 'popover.close',
			attributes: { type: 'button' },
		})

		panel.className = 'so-popover__panel'
		panel.position = 'fixed'
		panel.anchor_anchor = root
		panel.anchor_offset = 8
		handle.className = 'so-popover__handle'
		handle.setAttribute('aria-hidden', 'true')
		content.className = 'so-popover__content'
		close.className = 'so-popover__close'

		// Своя иконка крестика — только без слота `close-icon`: заданный слот
		// заменяет её целиком
		if (!hasSlot('close-icon')) {
			lendRoleIcon(close, 'close', 'popover.close-icon')
		}

		close.addEventListener('click', () => {
			const popover = ctx.ctrl

			if (popover) popover.open = false
		})

		// Сначала содержимое и крестик в панель, потом панель в корень: они входят
		// в документ одной вставкой и собираются по одному разу
		lend(panel, DEFAULT_SLOT, content)
		lend(panel, DEFAULT_SLOT, close)
		root.appendChild(panel)
		parts.set(root, { panel, handle, close })

		return {
			slots: {
				trigger: { mode: 'before', node: panel },
				default: { mode: 'append', node: content },
				'close-icon': { mode: 'append', node: close, slot: DEFAULT_SLOT },
			},
		}
	},

	bindings: [
		// Пропсы панели — только сменившиеся
		bind(['open', 'contained', 'placement'], ({ root, state }) => {
			const panel = parts.get(root)?.panel

			if (!panel) return

			const visible = state.open === true
			const contained = state.contained === true

			patch(panel, { visible, contained, anchor_placement: state.placement })
		}),

		// Наборы панели — одним слоем владельца, в порядке Vue
		bind(['aria', 'panelDataset', 'dismiss_ownerAttribute'], ({ root, state }) => {
			const panel = parts.get(root)?.panel

			if (panel) {
				ownerAttributes(panel, {
					...state.aria,
					...state.panelDataset,
					...state.dismiss_ownerAttribute,
				})
			}
		}),

		// Связка и вид «нажат» — триггеру, одним слоем владельца (см. шапку)
		bind(['triggerAria', 'triggerDataset'], ({ state, slotted }) => {
			const trigger = triggerOf(slotted('trigger'))

			if (trigger) ownerAttributes(trigger, { ...state.triggerAria, ...state.triggerDataset })
		}),

		// Полоса жеста — первой в панели, пока жест включён
		bind('handleRendered', ({ root, state }) => {
			const own = parts.get(root)

			if (!own) return

			const { panel, handle } = own

			if (state.handleRendered !== true) {
				handle.remove()
			} else if (handle.parentNode !== panel) {
				lend(panel, DEFAULT_SLOT, handle, 'start')
			}
		}),

		// Крестик — последним в панели, пока поповер можно закрыть им
		bind(['closable', 'closeAria'], ({ root, state }) => {
			const own = parts.get(root)

			if (!own) return

			const { panel, close } = own

			ownerAttributes(close, state.closeAria)

			if (state.closable !== true) {
				close.remove()
			} else if (close.parentNode !== panel) {
				lend(panel, DEFAULT_SLOT, close)
			}
		}),

		// `lazyMount`: содержимое — в документе с первого открытия (см. шапку)
		bind('contentRendered', ({ state, showSlot }) => {
			showSlot(DEFAULT_SLOT, state.contentRendered === true)
		}),
	],
}
