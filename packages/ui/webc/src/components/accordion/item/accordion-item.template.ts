/**
 * Шаблон секции Accordion.
 *
 * Корень — сам `<div is="so-accordion-item">`: классы, `attrs`, `dataset`
 * (тема раскрывает панель по `data-selected`) и место в коллекции (`order`)
 * раскладывает на него база (`ElementBase`). Здесь — заголовок и панель под
 * ним, как у Vue.
 *
 * - Заголовок — деталь
 *   `<button is="so-button" embedded="accordion.header" type="button">` с
 *   классом `so-accordion-item__header`, узел поля корня: на неё база
 *   переносит статические атрибуты разметки секции, а шаблон кладёт `aria`
 *   секции (`aria-expanded`, `id` и `aria-controls` на панель) верхним слоем
 *   её раскладчика. Слоты секции — свет заголовка (свет детали): `leading` —
 *   его `leading`, `header` — его `default`, `trailing` — его `trailing`, а без
 *   `header` заголовку уходит текст секции (`text`). Клик раскрывает или
 *   сворачивает секцию — через контекст элемента фасада текущей связки.
 * - Стрелка — в обёртке `span.so-accordion-item__arrow`, и класс стрелки на
 *   обёртке, а не на иконке: тема поворачивает стрелку раскрытой секции по
 *   ней, и иконка, подменённая слотом `leading-icon` или `trailing-icon`,
 *   поворачивается так же. Обёртка — край заголовка: в начале — первым узлом
 *   его `leading`, в конце — последним `trailing`; тема ждёт её ребёнком
 *   заголовка. Стоит обёртка, пока на её стороне стрелка по умолчанию
 *   (`arrowPlacement`) или задан её слот; без слота в ней — иконка роли
 *   `arrowRight`, `<span is="so-icon" embedded="accordion.arrow">`.
 * - Панель — `.so-accordion-item__body > .so-accordion-item__content` со
 *   слоем `contentAria` (`role="region"`, `id`, `aria-labelledby`): в ней слот
 *   `default`, содержимое секции.
 *
 * Scope у слотов нет, как у всех слотов Web Components: текст и раскрытость
 * содержимое слота берёт у элемента (`el.ctrl`, `el.state.selected`).
 */

import type { IAccordionItem, TAccordionItemCollectionFacade } from '@soldy-ui/core'
import { DEFAULT_SLOT } from '@soldy-ui/setup'
import {
	bind,
	createDetail,
	lend,
	ownerAttributes,
	type ITemplate,
	type TLendAt,
	patch,
} from '../../../adapter'
import { TButtonElement, type TButtonElementProps } from '../../button'
import { TIconElement, type TIconElementProps } from '../../icon'

/** Обёртка стрелки на краю заголовка и стрелка по умолчанию в ней (без слота — `null`). */
type TArrow = {
	readonly wrapper: HTMLElement
	readonly icon: TIconElementProps | null
}

/** Части секции — одни на всё время жизни элемента. */
type TSectionParts = {
	readonly header: TButtonElementProps
	readonly start: TArrow
	readonly end: TArrow
	readonly content: HTMLElement
}

const parts = new WeakMap<HTMLElement, TSectionParts>()

/** Обёртка стрелки; без слота её стороны — со стрелкой роли `arrowRight` внутри. */
function arrowOf(owner: Document, slotted: boolean): TArrow {
	const wrapper = owner.createElement('span')

	wrapper.className = 'so-accordion-item__arrow'

	if (slotted) return { wrapper, icon: null }

	const icon = createDetail(owner, TIconElement, { embedded: 'accordion.arrow' })

	icon.icon = 'arrowRight'
	wrapper.appendChild(icon)

	return { wrapper, icon }
}

/**
 * Обёртка стрелки на краю заголовка — или её нет. Край — свет заголовка: до
 * его сборки обёртка встаёт в слот (`leading`, `trailing`), после — первым или
 * последним ребёнком кнопки, то есть туда же (`lend`).
 */
function edge(
	header: TButtonElementProps,
	arrow: TArrow,
	shown: boolean,
	slot: string,
	at: TLendAt,
): void {
	if (!shown) {
		arrow.wrapper.remove()

		return
	}

	if (arrow.wrapper.parentNode !== header) lend(header, slot, arrow.wrapper, at)
}

export const accordionItemTemplate: ITemplate<IAccordionItem, TAccordionItemCollectionFacade> = {
	create: (root, ctx) => {
		const { hasSlot } = ctx

		const { ownerDocument } = root
		const header = createDetail(ownerDocument, TButtonElement, {
			embedded: 'accordion.header',
			attributes: { type: 'button' },
		})
		const start = arrowOf(ownerDocument, hasSlot('leading-icon'))
		const end = arrowOf(ownerDocument, hasSlot('trailing-icon'))
		const body = ownerDocument.createElement('div')
		const content = ownerDocument.createElement('div')

		header.className = 'so-accordion-item__header'
		body.className = 'so-accordion-item__body'
		content.className = 'so-accordion-item__content'
		body.appendChild(content)

		header.addEventListener('click', () => {
			ctx.facade?.context?.adapters.selection.toggle()
		})

		root.append(header, body)
		parts.set(root, { header, start, end, content })

		return {
			slots: {
				'leading-icon': { mode: 'append', node: start.wrapper },
				leading: { mode: 'append', node: header, slot: 'leading' },
				header: { mode: 'append', node: header, slot: DEFAULT_SLOT },
				trailing: { mode: 'append', node: header, slot: 'trailing' },
				'trailing-icon': { mode: 'append', node: end.wrapper },
				default: { mode: 'append', node: content },
			},
			control: header,
		}
	},

	bindings: [
		// Пропсы деталей — только сменившиеся: `disabled` кнопки нативный, и
		// каждая запись прошла бы через его атрибут
		bind(['view', 'disabled', 'size', 'variant'], ({ root, state }) => {
			const own = parts.get(root)

			if (!own) return

			const { header, start, end } = own
			const disabled = state.disabled === true

			patch(header, { view: state.view, disabled, size: state.size, variant: state.variant })

			for (const { icon } of [start, end]) {
				if (icon && icon.size !== state.size) icon.size = state.size
			}
		}),

		bind('aria', ({ root, state }) => {
			const header = parts.get(root)?.header

			if (header) ownerAttributes(header, state.aria)
		}),

		bind('contentAria', ({ root, state }) => {
			const content = parts.get(root)?.content

			if (content) ownerAttributes(content, state.contentAria)
		}),

		// Текст секции — заголовку, пока он не задан слотом `header`
		bind('text', ({ root, state, hasSlot }) => {
			const header = parts.get(root)?.header
			const text = state.text ?? ''

			if (header && !hasSlot('header') && header.text !== text) header.text = text
		}),

		bind('arrowPlacement', ({ root, state, hasSlot }) => {
			const own = parts.get(root)

			if (!own) return

			const { header, start, end } = own
			const placement = state.arrowPlacement

			edge(
				header,
				start,
				hasSlot('leading-icon') || placement === 'start',
				'leading',
				'start',
			)
			edge(header, end, hasSlot('trailing-icon') || placement === 'end', 'trailing', 'end')
		}),
	],
}
