/**
 * Шаблон опции Select.
 *
 * Корень — сам `<div is="so-select-item">`: классы, `attrs`, `dataset` (тема
 * читает с него `data-content-fit`) и место в коллекции (`order`) раскладывает
 * на него база (`ElementBase`). Здесь — строка, как у Vue.
 *
 * - Строка — Button на `span`, деталь
 *   `<span is="so-button-span" embedded="select.row" tabindex="-1">`, узел поля
 *   корня: на неё база переносит статические атрибуты разметки опции, а шаблон
 *   кладёт `aria` и `dataset` опции верхним слоем её раскладчика. Тег строки —
 *   `span`, как `tag="span"` у Vue: под него ядро пишет опции ARIA
 *   (`TSelectItem._ariaTag`). Вся ARIA опции — на строке: `role="option"` от
 *   ядра, `id` и `aria-selected` от коллекции, — она перекрывает `role="button"`,
 *   который кнопка на `span` пишет себе сама, и узел с ролью у опции один.
 *   `tabindex="-1"` — статика детали, как у Vue: фокус остаётся на поле Select,
 *   а на опцию ссылается его `aria-activedescendant`. Тот же `dataset`, что на
 *   корне: выбор и подсветку тема красит на `.so-button`. Вида у строки нет —
 *   строку опции тема красит по контексту (`.so-select-item`); размер, вариант
 *   и `disabled` — опции. Слоты опции — свет строки: точки `leading`,
 *   `default` и `trailing` ведут в её одноимённые слоты (свет детали), а без
 *   `default` строке уходит текст опции (`text`).
 * - Выбор — клик по строке, как у ListBox: команда коллекции
 *   (`adapters.select.choose()` контекста элемента фасада текущей связки) с
 *   учётом режима и `closeOnSelect` поля. Выключенной опции отказывает она.
 * - Отметка выбранного — обёртка `span.so-select-item__indicator` под
 *   `aria-hidden` (состояние объявляет `aria-selected`). Стоит, пока
 *   `indicator` поля не `none`, и у невыбранных тоже: она резервирует место,
 *   иначе строка прыгала бы при выборе. Обёртка — край строки: при `start` —
 *   первым узлом её `leading`, при `end` — последним `trailing` (`lend`). В
 *   обёртке — слот `indicator-icon` или иконка роли `check`,
 *   `<span is="so-icon" embedded="select.indicator">`, — у выбранной.
 *
 * Scope у слотов нет, как у всех слотов Web Components: текст и выбор
 * содержимое слота берёт у элемента (`el.ctrl`, `el.state.selected`). Поэтому
 * слот `indicator-icon` — отметка выбранной, как своя иконка: его выводит
 * привязка (`showSlot`) только у выбранной опции.
 */

import type { ISelectItem, TListIndicator, TSelectItemCollectionFacade } from '@soldy-ui/core'
import { DEFAULT_SLOT } from '@soldy-ui/setup'
import { bind, createDetail, lend, ownerAttributes, type ITemplate, patch } from '../../../adapter'
import { registerButtonTag, type TButtonElementProps } from '../../button'
import { TIconElement, type TIconElementProps } from '../../icon'

/** Строка — Button на `span`: регистрирует его фабрика кнопки, здесь тег нужен впервые. */
const TButtonSpanElement = registerButtonTag('span')

/** Части опции — одни на всё время жизни элемента. */
type TOptionParts = {
	readonly row: TButtonElementProps<HTMLSpanElement>
	/** Обёртка отметки выбранного — край строки по `indicator`. */
	readonly indicator: HTMLElement
	/** Иконка отметки — без слота `indicator-icon`. */
	readonly icon: TIconElementProps | null
}

const parts = new WeakMap<HTMLElement, TOptionParts>()

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

export const selectItemTemplate: ITemplate<ISelectItem, TSelectItemCollectionFacade> = {
	create: (root, ctx) => {
		const { hasSlot } = ctx

		const { ownerDocument } = root
		const row = createDetail(ownerDocument, TButtonSpanElement, {
			embedded: 'select.row',
			attributes: { tabindex: '-1' },
		})
		const indicator = ownerDocument.createElement('span')

		indicator.className = 'so-select-item__indicator'
		indicator.setAttribute('aria-hidden', 'true')

		// Своя иконка отметки — только без слота `indicator-icon`: заданный слот
		// заменяет её целиком
		let icon: TIconElementProps | null = null

		if (!hasSlot('indicator-icon')) {
			icon = createDetail(ownerDocument, TIconElement, { embedded: 'select.indicator' })
			icon.icon = 'check'
		}

		row.addEventListener('click', () => {
			ctx.facade?.context?.adapters.select.choose()
		})

		root.appendChild(row)
		parts.set(root, { row, indicator, icon })

		return {
			slots: {
				leading: { mode: 'append', node: row, slot: 'leading' },
				'indicator-icon': { mode: 'append', node: indicator },
				default: { mode: 'append', node: row, slot: DEFAULT_SLOT },
				trailing: { mode: 'append', node: row, slot: 'trailing' },
			},
			control: row,
		}
	},

	bindings: [
		// Пропсы строки и иконки — только сменившиеся: каждая запись дошла бы до
		// ядра строки и до её отрисовки
		bind(['disabled', 'size', 'variant'], ({ root, state }) => {
			const own = parts.get(root)

			if (!own) return

			const { row, icon } = own
			const disabled = state.disabled === true

			patch(row, { disabled, size: state.size, variant: state.variant })
			if (icon && icon.size !== state.size) icon.size = state.size
		}),

		bind(['aria', 'dataset'], ({ root, state }) => {
			const row = parts.get(root)?.row

			if (row) ownerAttributes(row, { ...state.aria, ...state.dataset })
		}),

		// Текст опции — строке, пока содержимое не задано слотом `default`
		bind('text', ({ root, state, hasSlot }) => {
			const row = parts.get(root)?.row
			const text = state.text ?? ''

			if (row && !hasSlot(DEFAULT_SLOT) && row.text !== text) row.text = text
		}),

		bind('indicator', ({ root, state }) => {
			const own = parts.get(root)

			if (own) placeIndicator(own.row, own.indicator, state.indicator)
		}),

		// Отметка — у выбранной: своя иконка или слот `indicator-icon`
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
