/**
 * Шаблон опции Select: строка — `span`, под него ядро пишет ARIA опции
 * (`TSelectItem._ariaTag`), и `role="option"` перекрывает `role="button"`
 * кнопки — узел с ролью у опции один. `tabindex="-1"`: фокус остаётся на поле
 * Select, опцию объявляет его `aria-activedescendant`.
 */

import type { ISelectItem, TListIndicator, TSelectItemCollectionFacade } from '@soldy-ui/core'
import { DEFAULT_SLOT } from '@soldy-ui/setup'
import { bind, createDetail, lend, ownerAttributes, type ITemplate, patch } from '../../../adapter'
import { registerButtonTag, type TButtonElementProps } from '../../button'
import { TIconElement, type TIconElementProps } from '../../icon'

const TButtonSpanElement = registerButtonTag('span')

type TOptionParts = {
	readonly row: TButtonElementProps<HTMLSpanElement>
	/** Стоит и у невыбранной: резервирует место, иначе строка прыгала бы при выборе. */
	readonly indicator: HTMLElement
	readonly icon: TIconElementProps | null
}

const parts = new WeakMap<HTMLElement, TOptionParts>()

/** Край — свет строки: `lend` ставит туда же и до её сборки, и после. */
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
		// Состояние объявляет `aria-selected`
		indicator.setAttribute('aria-hidden', 'true')

		let icon: TIconElementProps | null = null

		if (!hasSlot('indicator-icon')) {
			icon = createDetail(ownerDocument, TIconElement, { embedded: 'select.indicator' })
			icon.icon = 'check'
		}

		// Выключенной опции отказывает команда коллекции
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
		bind(['disabled', 'size', 'variant'], ({ root, state }) => {
			const own = parts.get(root)

			if (!own) return

			const { row, icon } = own
			const disabled = state.disabled === true

			patch(row, { disabled, size: state.size, variant: state.variant })
			if (icon && icon.size !== state.size) icon.size = state.size
		}),

		// Тот же `dataset`, что на корне: выбор и подсветку тема красит на `.so-button`
		bind(['aria', 'dataset'], ({ root, state }) => {
			const row = parts.get(root)?.row

			if (row) ownerAttributes(row, { ...state.aria, ...state.dataset })
		}),

		bind('text', ({ root, state, hasSlot }) => {
			const row = parts.get(root)?.row
			const text = state.text ?? ''

			if (row && !hasSlot(DEFAULT_SLOT) && row.text !== text) row.text = text
		}),

		bind('indicator', ({ root, state }) => {
			const own = parts.get(root)

			if (own) placeIndicator(own.row, own.indicator, state.indicator)
		}),

		// Scope нет, и слот `indicator-icon` — отметка выбранной, как своя иконка
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
