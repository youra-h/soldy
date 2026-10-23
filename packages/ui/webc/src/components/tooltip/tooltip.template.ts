/**
 * Шаблон Tooltip.
 *
 * Корень — сам `<span is="so-tooltip">`: классы, `attrs` и `dataset`
 * раскладывает на него база (`ElementBase`). ARIA на корне нет: она у панели
 * и у триггера (`sets` в описании корня). Здесь — то же, что в разметке Vue, в
 * том же порядке.
 *
 * - Триггер — элемент потребителя в слоте `trigger`, в корне перед панелью.
 *   Фокус остаётся на нём и в панель не уходит. Scope у слотов нет, и ссылку
 *   на панель — `aria-describedby` или, при `type="label"`,
 *   `aria-labelledby` — потребитель привязать не может. Поэтому набор
 *   `triggerAria` шаблон кладёт на первый элемент слота (узлы слота отдаёт
 *   контекст, `slotted`) слоем владельца — всегда, а не только у открытой:
 *   панель в документе с первой отрисовки, и описание не запаздывает за
 *   фокусом. Триггер — тот же узел, что написал потребитель, и ссылка на нём
 *   сменяется на месте.
 * - Панель — деталь Frame `<div is="so-frame" embedded="tooltip.frame">` с
 *   классом `so-tooltip__panel`: телепорт, слой, привязка к корню, пометка
 *   владельцем, по которой панель находят плагины. Панель не фокусируется,
 *   кнопки закрытия в ней нет. В цель её уводит база самого Frame. Якорь —
 *   корень подсказки (`anchor_anchor`), место — `fixed` в 6 px от него, по
 *   умолчанию над триггером по центру, сторону у края окна выбирает
 *   `TAnchorPlugin` поверх `placement`; неизменное шаблон пишет панели при
 *   построении, как оно стоит в разметке Vue. Открытость — `visible` панели:
 *   закрытая спрятана, а не убрана, и ссылка триггера ведёт на неё всегда.
 *   `rendered` панели шаблон не пишет: до панели, увезённой в цель, скрытие
 *   корня не доходит, и прячет её база Frame по признаку поддерева подсказки
 *   (`ElementBase`, «Поддерево»); у остальных адаптеров `rendered=false`
 *   снимает её вместе с корнем. На панель — `aria` подсказки (`role="tooltip"`
 *   и `id`, на который ссылается триггер) и пометка владельцем
 *   `dismiss_ownerAttribute` — одним слоем владельца.
 * - Обёртка `div.so-tooltip__content` в панели — свет детали (`lend`) со
 *   слотом `default`: держит ширину панели по тексту, до потолка темы, где бы
 *   у края окна панель ни стояла.
 *
 * Пропсы детали Frame пишутся, только когда сменились. Обработчиков у шаблона
 * нет: когда показывать и прятать, решает `TTooltipTriggerPlugin`, нажатие
 * мимо — `TDismissPlugin`.
 */

import type { ITooltip } from '@soldy-ui/core'
import { DEFAULT_SLOT } from '@soldy-ui/setup'
import { bind, createDetail, lend, ownerAttributes, type ITemplate, patch } from '../../adapter'
import { TFrameElement, type TFrameElementProps } from '../frame'
import type { TTooltipOutputs } from './setup.component'

/** Панель подсказки каждого элемента — одна на всё время его жизни. */
const panels = new WeakMap<HTMLElement, TFrameElementProps>()

/** Триггер — первый элемент слота: текст вокруг него ссылки не несёт. */
function triggerOf(nodes: readonly ChildNode[]): Element | undefined {
	return nodes.find((node): node is Element => node instanceof Element)
}

export const tooltipTemplate: ITemplate<ITooltip, unknown, TTooltipOutputs> = {
	create: (root) => {
		const { ownerDocument } = root
		const panel = createDetail(ownerDocument, TFrameElement, { embedded: 'tooltip.frame' })
		const content = ownerDocument.createElement('div')

		panel.className = 'so-tooltip__panel'
		panel.position = 'fixed'
		panel.anchor_anchor = root
		panel.anchor_offset = 6
		content.className = 'so-tooltip__content'

		// Сначала обёртка в панель, потом панель в корень: одной вставкой
		lend(panel, DEFAULT_SLOT, content)
		root.appendChild(panel)
		panels.set(root, panel)

		return {
			slots: {
				trigger: { mode: 'before', node: panel },
				default: { mode: 'append', node: content },
			},
		}
	},

	bindings: [
		// Пропсы панели — только сменившиеся
		bind(['open', 'placement'], ({ root, state }) => {
			const panel = panels.get(root)

			if (!panel) return

			const visible = state.open === true

			patch(panel, { visible, anchor_placement: state.placement })
		}),

		// Наборы панели — одним слоем владельца
		bind(['aria', 'dismiss_ownerAttribute'], ({ root, state }) => {
			const panel = panels.get(root)

			if (panel) ownerAttributes(panel, { ...state.aria, ...state.dismiss_ownerAttribute })
		}),

		// Ссылка на панель — триггеру, слоем владельца (см. шапку)
		bind('triggerAria', ({ state, slotted }) => {
			const trigger = triggerOf(slotted('trigger'))

			if (trigger) ownerAttributes(trigger, state.triggerAria)
		}),
	],
}
