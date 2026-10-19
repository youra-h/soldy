/**
 * Шаблон элемента ListBox.
 *
 * Корень — сам `<div is="so-list-box-item">`: классы, `attrs`, `dataset` (тема
 * читает с него `data-content-fit`) и место в коллекции (`order`) раскладывает
 * на него база (`SoldyElement`). Здесь — строка, как у Vue и Angular.
 *
 * - Строка — Button на `div`, деталь
 *   `<div is="so-button-div" embedded="list-box.row">`, узел поля корня: на неё
 *   база переносит статические атрибуты разметки элемента, а шаблон кладёт
 *   `aria` и `dataset` элемента верхним слоем её раскладчика. Тег строки —
 *   `div`, а не `button`: у выключенного пункта списка остаются фокус и клик,
 *   а нативная кнопка с `disabled` теряет оба, и под строку на `div` ядро пишет
 *   элементу ARIA (`TListBoxItem._ariaTag`). `role`, `tabindex` и
 *   `aria-disabled` кнопка на `div` пишет себе сама, а набор элемента главнее:
 *   `role="option"` элемента, `tabindex="-1"` и `aria-selected` списка — на
 *   строке, и строка и есть опция. Тот же `dataset`, что на корне: выбор и
 *   подсветку тема красит на `.so-button`. Слоты элемента — свет строки: точки
 *   `leading`, `default` и `trailing` ведут в её одноимённые слоты (свет
 *   детали), а без `default` строке уходит текст элемента (`text`).
 * - Клик по строке выбирает через контекст элемента фасада текущей связки
 *   (`adapters.list.choose()`), а не `selection.toggle()`: выключенному
 *   элементу отказывает список, тем же путём, что и клавиатура. `click`, а не
 *   `so:action:press`: фокус после клика остаётся на строке, и Enter дал бы два
 *   переключения — нажатие строки и клавиатуру списка. Слушатель потребителя
 *   на корне слышит клик следом: клик всплывает со строки.
 * - Отметка выбранного — обёртка `span.so-list-box-item__indicator` под
 *   `aria-hidden` (состояние объявляет `aria-selected`). Стоит, пока
 *   `indicator` списка не `none`, и у невыбранных тоже: она резервирует место,
 *   иначе строка прыгала бы при выборе. Обёртка — край строки: при `start` —
 *   первым узлом её `leading`, при `end` — последним `trailing` (`lend`).
 *   Сторона логическая: `dir` стоит на корне, а строка — flex. В обёртке —
 *   слот `indicator-icon` или иконка роли `check`,
 *   `<span is="so-icon" embedded="list-box.indicator">`, — у выбранного.
 *
 * Scope у слотов нет, как у всех слотов Web Components: текст и выбор
 * содержимое слота берёт у элемента (`el.ctrl`, `el.state.selected`). Поэтому
 * слот `indicator-icon` — отметка выбранного, как своя иконка: его выводит
 * привязка (`showSlot`) только у выбранного элемента, у остальных он вне
 * документа.
 */

import type { IListBoxItem, TListBoxItemCollectionFacade, TListIndicator } from '@soldy-ui/core'
import { DEFAULT_SLOT } from '@soldy-ui/setup'
import { bind, createDetail, lend, ownerAttributes, type ITemplate } from '../../../adapter'
import { registerButtonTag, type TButtonElementProps } from '../../button'
import { TIconElement, type TIconElementProps } from '../../icon'

/** Строка — Button на `div`: регистрирует его фабрика кнопки, здесь тег нужен впервые. */
const TButtonDivElement = registerButtonTag('div')

/** Части элемента — одни на всё время жизни элемента. */
type TItemParts = {
	readonly row: TButtonElementProps<HTMLDivElement>
	/** Обёртка отметки выбранного — край строки по `indicator`. */
	readonly indicator: HTMLElement
	/** Иконка отметки — без слота `indicator-icon`. */
	readonly icon: TIconElementProps | null
}

const parts = new WeakMap<HTMLElement, TItemParts>()

function isRow(node: Element): node is TButtonElementProps<HTMLDivElement> {
	return node instanceof TButtonDivElement
}

function isIcon(node: Element): node is TIconElementProps {
	return node instanceof TIconElement
}

/**
 * Обёртка отметки — на краю строки со стороны `side` или вне её. Край — свет
 * строки: до её сборки обёртка встаёт в слот (`leading`, `trailing`), после —
 * первым или последним ребёнком кнопки, то есть туда же (`lend`).
 */
function placeIndicator(
	row: HTMLElement,
	indicator: HTMLElement,
	side: TListIndicator | undefined,
): void {
	if (side === 'start') {
		if (row.firstChild !== indicator) lend(row, 'leading', indicator, 'start')
	} else if (side === 'end') {
		if (row.lastChild !== indicator) lend(row, 'trailing', indicator, 'end')
	} else {
		indicator.remove()
	}
}

export const listBoxItemTemplate: ITemplate<IListBoxItem, TListBoxItemCollectionFacade> = {
	create: (root, hasSlot, ctx) => {
		const { ownerDocument } = root
		const row = createDetail(
			ownerDocument,
			'div',
			{ is: 'so-button-div', embedded: 'list-box.row' },
			isRow,
		)
		const indicator = ownerDocument.createElement('span')

		indicator.className = 'so-list-box-item__indicator'
		indicator.setAttribute('aria-hidden', 'true')

		// Своя иконка отметки — только без слота `indicator-icon`: заданный слот
		// заменяет её целиком
		let icon: TIconElementProps | null = null

		if (!hasSlot('indicator-icon')) {
			icon = createDetail(
				ownerDocument,
				'span',
				{ is: 'so-icon', embedded: 'list-box.indicator' },
				isIcon,
			)
			icon.icon = 'check'
		}

		row.addEventListener('click', () => {
			ctx.facade?.context?.adapters.list.choose()
		})

		root.appendChild(row)
		parts.set(root, { row, indicator, icon })

		return {
			slots: {
				leading: { mode: 'append', node: row, slot: 'leading' },
				default: { mode: 'append', node: row, slot: DEFAULT_SLOT },
				trailing: { mode: 'append', node: row, slot: 'trailing' },
				'indicator-icon': { mode: 'append', node: indicator },
			},
			control: row,
		}
	},

	bindings: [
		// Пропсы деталей — только сменившиеся: каждая запись дошла бы до ядра
		// строки и до её отрисовки
		bind(['view', 'disabled', 'size', 'variant'], ({ root, state }) => {
			const own = parts.get(root)

			if (!own) return

			const { row, icon } = own
			const disabled = state.disabled === true

			if (row.view !== state.view) row.view = state.view
			if (row.disabled !== disabled) row.disabled = disabled
			if (row.size !== state.size) row.size = state.size
			if (row.variant !== state.variant) row.variant = state.variant
			if (icon && icon.size !== state.size) icon.size = state.size
		}),

		bind(['aria', 'dataset'], ({ root, state }) => {
			const row = parts.get(root)?.row

			if (row) ownerAttributes(row, { ...state.aria, ...state.dataset })
		}),

		// Текст элемента — строке, пока содержимое не задано слотом `default`
		bind('text', ({ root, state, hasSlot }) => {
			const row = parts.get(root)?.row
			const text = state.text ?? ''

			if (row && !hasSlot(DEFAULT_SLOT) && row.text !== text) row.text = text
		}),

		bind('indicator', ({ root, state }) => {
			const own = parts.get(root)

			if (own) placeIndicator(own.row, own.indicator, state.indicator)
		}),

		// Отметка — у выбранного: своя иконка или слот `indicator-icon`
		bind('selected', ({ root, state, showSlot }) => {
			const own = parts.get(root)
			const selected = state.selected === true

			showSlot('indicator-icon', selected)

			if (!own?.icon) return

			if (!selected) {
				own.icon.remove()
			} else if (own.icon.parentNode !== own.indicator) {
				own.indicator.appendChild(own.icon)
			}
		}),
	],
}
