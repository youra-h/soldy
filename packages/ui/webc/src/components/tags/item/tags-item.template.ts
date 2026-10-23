/**
 * Шаблон тега.
 *
 * Корень — сам `<div is="so-tags-item">`, пилюля тега: классы, `attrs`,
 * `dataset` (выбранный тег тема красит по `data-selected` корня) и место в
 * коллекции (`order`) раскладывает на него база (`ElementBase`). Вид набора
 * рисует корень, а не строка: фон, рамка, наведение и выбор обязаны покрывать
 * и крестик, а он стоит рядом со строкой, — поэтому строке и крестику вида
 * разметка не передаёт, части тега тема красит по контексту (`.so-tags-item`).
 * Здесь — строка и кнопка закрытия рядом с ней, как у Vue.
 *
 * - Строка — Button на `div`, деталь
 *   `<div is="so-button-div" embedded="tags.row">`, узел поля корня: на неё база
 *   переносит статические атрибуты разметки тега, а шаблон кладёт `aria` тега
 *   верхним слоем её раскладчика — роль по режиму набора (`listitem` без
 *   выбора, `option` с выбором), `aria-selected` и `tabindex` от коллекции. Он
 *   главнее того, что кнопка на `div` пишет себе сама: с выбором весь набор —
 *   одна остановка Tab, без выбора у строк `-1`. Тег строки — `div`: под него
 *   ядро пишет тегу ARIA (`TTagsItem._ariaTag`). Направление письма, размер,
 *   вариант и `disabled` — тега, явно: строка — свой узел. Слоты тега — свет
 *   строки: точки `leading`, `default` и `trailing` ведут в её одноимённые
 *   слоты (свет детали), а без `default` строке уходит текст тега (`text`).
 * - Выбор — по `so:action:press` строки, а не по клику: строка держит фокус
 *   сама, и клик из Enter и пробела на ней делает её `TActionPlugin`. `press`
 *   не приходит на выключенный тег, а выбор (`selection.toggle()` контекста
 *   элемента фасада текущей связки) выключенность не проверяет — на клик
 *   выключенный тег выбирался бы.
 * - Кнопка закрытия — сосед строки, а не её часть: потомки опции для
 *   скринридера презентационны, и подпись крестика приклеилась бы к названию
 *   тега. Деталь `<button is="so-button" embedded="tags.close" type="button">`
 *   с классом `so-tags-item__close` стоит в теге, только пока его можно
 *   закрыть (`tag_closable` фасада: выключенный тег не закрывается), сразу
 *   после строки. Имя и `tabindex` (с выбором `-1`: тег закрывает Delete) —
 *   набор `closeAria`, верхним слоем её раскладчика. Размер и `disabled` —
 *   явно: от строки она их не наследует. Клик закрывает тег
 *   (`tags.close()`) и не всплывает, как `@click.stop` у Vue: корни тега и
 *   набора слушают нативный клик (`TActionPlugin`), а поле Select, в котором
 *   стоят теги, открыло бы по нему панель. В кнопке — слот `close-icon` или
 *   иконка роли `close`, `<span is="so-icon" embedded="tags.close-icon">`.
 *
 * Scope у слотов нет, как у всех слотов Web Components: текст и выбор
 * содержимое слота берёт у элемента (`el.ctrl`, `el.state.selected`).
 */

import type { ITagsItem, TTagsItemCollectionFacade } from '@soldy-ui/core'
import { DEFAULT_SLOT } from '@soldy-ui/setup'
import { bind, createDetail, lend, ownerAttributes, type ITemplate } from '../../../adapter'
import { TButtonElement, registerButtonTag, type TButtonElementProps } from '../../button'
import { TIconElement, type TIconElementProps } from '../../icon'

/** Строка — Button на `div`: регистрирует его фабрика кнопки. */
const TButtonDivElement = registerButtonTag('div')

/** Части тега — одни на всё время жизни элемента. */
type TTagParts = {
	readonly row: TButtonElementProps<HTMLDivElement>
	readonly close: TButtonElementProps
	/** Иконка крестика — без слота `close-icon`. */
	readonly icon: TIconElementProps | null
}

const parts = new WeakMap<HTMLElement, TTagParts>()

function isRow(node: Element): node is TButtonElementProps<HTMLDivElement> {
	return node instanceof TButtonDivElement
}

function isButton(node: Element): node is TButtonElementProps {
	return node instanceof TButtonElement
}

function isIcon(node: Element): node is TIconElementProps {
	return node instanceof TIconElement
}

export const tagsItemTemplate: ITemplate<ITagsItem, TTagsItemCollectionFacade> = {
	create: (root, ctx) => {
		const { hasSlot } = ctx

		const { ownerDocument } = root
		const row = createDetail(
			ownerDocument,
			'div',
			{ is: 'so-button-div', embedded: 'tags.row' },
			isRow,
		)
		const close = createDetail(
			ownerDocument,
			'button',
			{ is: 'so-button', embedded: 'tags.close', attributes: { type: 'button' } },
			isButton,
		)

		close.className = 'so-tags-item__close'

		// Своя иконка крестика — только без слота `close-icon`: заданный слот
		// заменяет её целиком
		let icon: TIconElementProps | null = null

		if (!hasSlot('close-icon')) {
			icon = createDetail(
				ownerDocument,
				'span',
				{ is: 'so-icon', embedded: 'tags.close-icon' },
				isIcon,
			)
			icon.icon = 'close'
			lend(close, DEFAULT_SLOT, icon)
		}

		row.addEventListener('so:action:press', () => {
			ctx.facade?.context?.adapters.selection.toggle()
		})

		close.addEventListener('click', (event) => {
			event.stopPropagation()
			ctx.facade?.context?.adapters.tags.close()
		})

		root.appendChild(row)
		parts.set(root, { row, close, icon })

		return {
			slots: {
				leading: { mode: 'append', node: row, slot: 'leading' },
				default: { mode: 'append', node: row, slot: DEFAULT_SLOT },
				trailing: { mode: 'append', node: row, slot: 'trailing' },
				'close-icon': { mode: 'append', node: close, slot: DEFAULT_SLOT },
			},
			control: row,
		}
	},

	bindings: [
		// Пропсы деталей — только сменившиеся: `disabled` кнопки нативный, и
		// каждая запись прошла бы через его атрибут
		bind(['direction', 'disabled', 'size', 'variant'], ({ root, state }) => {
			const own = parts.get(root)

			if (!own) return

			const { row, close, icon } = own
			const disabled = state.disabled === true

			if (row.direction !== state.direction) row.direction = state.direction
			if (row.disabled !== disabled) row.disabled = disabled
			if (row.size !== state.size) row.size = state.size
			if (row.variant !== state.variant) row.variant = state.variant
			if (close.disabled !== disabled) close.disabled = disabled
			if (close.size !== state.size) close.size = state.size
			if (icon && icon.size !== state.size) icon.size = state.size
		}),

		bind('aria', ({ root, state }) => {
			const row = parts.get(root)?.row

			if (row) ownerAttributes(row, state.aria)
		}),

		// Текст тега — строке, пока содержимое не задано слотом `default`
		bind('text', ({ root, state, hasSlot }) => {
			const row = parts.get(root)?.row
			const text = state.text ?? ''

			if (row && !hasSlot(DEFAULT_SLOT) && row.text !== text) row.text = text
		}),

		// Крестик — сразу за строкой, пока тег можно закрыть
		bind(['tag_closable', 'closeAria'], ({ root, state }) => {
			const own = parts.get(root)

			if (!own) return

			const { row, close } = own

			ownerAttributes(close, state.closeAria)

			if (state.tag_closable !== true) {
				close.remove()
			} else if (close.previousSibling !== row) {
				row.after(close)
			}
		}),
	],
}
