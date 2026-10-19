/**
 * Шаблон заголовка колонки (`Table.Column`), как у Vue.
 *
 * Корень — сам `<th is="so-table-column">`: классы, наборы колонки
 * (`aria-sort`, `aria-labelledby`, `data-sort`, `data-align`, `data-sized`…),
 * ширину переменной `--so-table-column-width` (стиль-выход `widthStyle`) и
 * скрытие раскладывает на него база (`SoldyElement`). Обработчиков на ячейке
 * нет: протяжку ловит плагин ручки на корне, клавиши и жест скринридера — он
 * же на поле. Нажатие по ячейке не сортирует: у `th` нет фокуса, и действие на
 * нём с клавиатуры было бы недоступно.
 *
 * - Содержимое — ряд `span.so-table-column__content`: подпись, а у сортируемой
 *   колонки за ней кнопка сортировки. Где ряд стоит в ячейке и с какой стороны
 *   подписи кнопка, решает тема по `data-align`.
 * - Подпись — `span.so-table-column__text` с набором `textAria`: им названы
 *   заголовок и поле ручки. Содержимое — слот `default`, в него таблица кладёт
 *   копию своего образца `header`, а без него — текст колонки. Свой контрол в
 *   подписи — кнопка, триггер — и есть своё действие по заголовку. Scope у
 *   слотов Web Components нет: колонку копия находит у заголовка — `el.ctrl`
 *   ближайшего `<th is="so-table-column">`.
 * - Кнопка сортировки — деталь Button
 *   `<button is="so-button" embedded="table.sort" type="button">`, только у
 *   `sortable`: её рисует колонка, а не таблица через слот — кнопка в подписи
 *   дописала бы своё имя к имени заголовка. Нажатие (`so:action:press`) —
 *   просьба колонки, `toggleSort()` инстанса текущей связки: сортирует
 *   расширение коллекции строк по своим правилам. Выключена вместе с
 *   таблицей — `disabled` колонке пишет таблица. Текста у кнопки нет: имя ей с
 *   подписью колонки пишет плагин имён от локали (`sortAria`), и на кнопку его
 *   кладёт шаблон верхним слоем её раскладчика. В ней — обёртка стрелки
 *   `span.so-table-column__sort-icon` под `aria-hidden` (направление
 *   скринридер объявляет по `aria-sort` заголовка) с иконкой роли
 *   `arrowUpward`, `<span is="so-icon" embedded="table.sort-icon">`: вниз её
 *   поворачивает тема. Вида и размера разметка кнопке не передаёт — колонка не
 *   знает размера таблицы, а значения вида объявляет тема: их даёт тема по
 *   контексту.
 * - Ручка ширины — полоса `span.so-table-column__resizer` у края заголовка,
 *   пока она есть (`resizerRendered`: колонка `resizable`, не выключена, и
 *   ширина известна). Разметка, а не часть: потребитель её не адресует. Поле в
 *   ней — нативный `range`, как поле ручки Slider: мобильные скринридеры
 *   двигают его своим жестом. Ход и ширина — значение ядра (`resizer`), имя —
 *   ссылка на подпись (`resizerAria`). Границы хода поле получает раньше
 *   значения: ширина за краем хода по умолчанию (0–100) иначе прижалась бы к
 *   нему. Значение привязка пишет, только когда оно разошлось с узлом: ширину
 *   ведёт ядро, и тянет её плагин ручки, а не браузер.
 */

import type { ITableColumn } from '@soldy-ui/core'
import { DEFAULT_SLOT } from '@soldy-ui/setup'
import {
	bind,
	createDetail,
	ownerAttributes,
	type ITemplate,
	type ITemplateContext,
} from '../../../adapter'
import { TButtonElement, type TButtonElementProps } from '../../button'
import { TIconElement, type TIconElementProps } from '../../icon'

/** Части заголовка — одни на всё время жизни элемента: ряд содержимого и подпись. */
type TColumnParts = {
	readonly content: HTMLElement
	readonly text: HTMLElement
}

/** Ручка ширины — полоса и поле в ней. */
type TResizer = {
	readonly strip: HTMLElement
	readonly field: HTMLInputElement
}

const parts = new WeakMap<HTMLElement, TColumnParts>()

/** Кнопка сортировки каждого заголовка — строится с первым `sortable` и остаётся за ним. */
const sorts = new WeakMap<HTMLElement, TButtonElementProps>()

/** Ручка ширины каждого заголовка — строится, когда ручка впервые нужна, и остаётся за ним. */
const resizers = new WeakMap<HTMLElement, TResizer>()

function isButton(node: Element): node is TButtonElementProps {
	return node instanceof TButtonElement
}

function isIcon(node: Element): node is TIconElementProps {
	return node instanceof TIconElement
}

/**
 * Кнопка сортировки — деталь разметки заголовка, со стрелкой в обёртке.
 * Нажатие — просьба колонки той связки, что живёт сейчас: контекст шаблона
 * отдаёт её инстанс в момент обращения.
 */
function sortOf(ctx: ITemplateContext<ITableColumn>): TButtonElementProps {
	const known = sorts.get(ctx.root)

	if (known) return known

	const { ownerDocument } = ctx.root
	const button = createDetail(
		ownerDocument,
		'button',
		{ is: 'so-button', embedded: 'table.sort', attributes: { type: 'button' } },
		isButton,
	)
	const arrow = ownerDocument.createElement('span')
	const icon = createDetail(
		ownerDocument,
		'span',
		{ is: 'so-icon', embedded: 'table.sort-icon' },
		isIcon,
	)

	button.className = 'so-table-column__sort'
	arrow.className = 'so-table-column__sort-icon'
	arrow.setAttribute('aria-hidden', 'true')
	icon.icon = 'arrowUpward'
	arrow.appendChild(icon)
	button.appendChild(arrow)
	button.addEventListener('so:action:press', () => ctx.ctrl?.toggleSort())
	sorts.set(ctx.root, button)

	return button
}

/** Ручка ширины заголовка: полоса и нативное поле `range` в ней. */
function resizerOf(root: HTMLElement): TResizer {
	const known = resizers.get(root)

	if (known) return known

	const { ownerDocument } = root
	const strip = ownerDocument.createElement('span')
	const field = ownerDocument.createElement('input')

	strip.className = 'so-table-column__resizer'
	field.className = 'so-table-column__input'
	field.type = 'range'
	strip.appendChild(field)

	const resizer = { strip, field }

	resizers.set(root, resizer)

	return resizer
}

export const tableColumnTemplate: ITemplate<ITableColumn> = {
	create: (root) => {
		const { ownerDocument } = root
		const content = ownerDocument.createElement('span')
		const text = ownerDocument.createElement('span')

		content.className = 'so-table-column__content'
		text.className = 'so-table-column__text'
		content.appendChild(text)
		root.appendChild(content)
		parts.set(root, { content, text })

		return {
			slots: {
				default: { mode: 'append', node: text },
			},
		}
	},

	bindings: [
		bind('textAria', ({ root, state }) => {
			const text = parts.get(root)?.text

			if (text) ownerAttributes(text, state.textAria)
		}),

		// Текст колонки — подписи, пока она не задана слотом `default`
		bind('text', ({ root, state, hasSlot }) => {
			const text = parts.get(root)?.text
			const value = state.text ?? ''

			if (text && !hasSlot(DEFAULT_SLOT) && text.textContent !== value) {
				text.textContent = value
			}
		}),

		bind(['sortable', 'disabled', 'sortAria'], (ctx) => {
			const { root, state } = ctx
			const own = parts.get(root)

			if (!own) return

			if (state.sortable !== true) {
				sorts.get(root)?.remove()

				return
			}

			const button = sortOf(ctx)
			const disabled = state.disabled === true

			// `disabled` кнопки нативный: запись прошла бы через его атрибут
			if (button.disabled !== disabled) button.disabled = disabled

			ownerAttributes(button, state.sortAria)

			// За подписью, в ряду содержимого
			if (button.parentNode !== own.content) own.content.appendChild(button)
		}),

		bind(['resizerRendered', 'resizer', 'resizerAria'], ({ root, state }) => {
			const { resizer } = state

			if (state.resizerRendered !== true || !resizer) {
				resizers.get(root)?.strip.remove()

				return
			}

			const { strip, field } = resizerOf(root)
			const value = String(resizer.value)

			// Ход — раньше значения, значение — только разошедшееся с узлом
			field.min = String(resizer.min)
			field.max = String(resizer.max)

			if (field.value !== value) field.value = value

			ownerAttributes(field, state.resizerAria)

			// У края заголовка — ребёнком корня: там полосу ищет плагин ручки
			if (strip.parentNode !== root) root.appendChild(strip)
		}),
	],
}
