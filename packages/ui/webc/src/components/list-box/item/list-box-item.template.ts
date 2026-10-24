/**
 * Шаблон элемента ListBox: строка — деталь Button на `div`, на ней `aria` и
 * `dataset` элемента (тема красит выбор на `.so-button`); отметка выбранного —
 * край строки. docs/architecture.md, Layer 8d, «Коллекция».
 *
 * Строка — деталь над экземпляром элемента (`row`, `TItemRow`): размер,
 * вариант, выключенность и вид ей пишет элемент, а роль и `tabindex="-1"` —
 * его набор `aria`, слоем владельца.
 */

import type { IListBoxItem, TListBoxItemCollectionFacade, TListIndicator } from '@soldy-ui/core'
import { DEFAULT_SLOT } from '@soldy-ui/setup'
import { bind, createDetail, lend, ownerAttributes, type ITemplate } from '../../../adapter'
import { registerButtonTag, type TButtonElementProps } from '../../button'
import { TIconElement, type TIconElementProps } from '../../icon'

/**
 * На `<button>` выключенный пункт терял бы фокус и клик. `div` — тег экземпляра
 * строки: под него ядро пишет элементу ARIA (`TListBoxItem._ariaTag`).
 */
const TButtonDivElement = registerButtonTag('div')

type TItemParts = {
	readonly row: TButtonElementProps<HTMLDivElement>
	/** Стоит и у невыбранных: резервирует место, иначе строка прыгала бы при выборе. */
	readonly indicator: HTMLElement
	readonly icon: TIconElementProps | null
}

const parts = new WeakMap<HTMLElement, TItemParts>()

/** Край — свет строки: до её сборки обёртка встаёт в слот, после — ребёнком кнопки (`lend`). */
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
	create: (root, ctx) => {
		const { hasSlot } = ctx

		const { ownerDocument } = root
		const row = createDetail(ownerDocument, TButtonDivElement, { embedded: 'list-box.row' })
		const indicator = ownerDocument.createElement('span')

		indicator.className = 'so-list-box-item__indicator'
		indicator.setAttribute('aria-hidden', 'true')

		let icon: TIconElementProps | null = null

		if (!hasSlot('indicator-icon')) {
			icon = createDetail(ownerDocument, TIconElement, { embedded: 'list-box.indicator' })
			icon.icon = 'check'
		}

		// Через список, а не `selection.toggle()`: выключенному отказывает он, как
		// клавиатуре. `click`, а не `so:action:press`: Enter дал бы два переключения
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
		// На каждое подключение: в построении инстанса ещё нет, а строка собирается
		// после элемента и берёт свой экземпляр при подключении
		bind([], ({ root, ctrl }) => {
			const row = parts.get(root)?.row

			if (row && ctrl && row.ctrl !== ctrl.row) row.ctrl = ctrl.row
		}),

		// Иконке — явно, от элемента она не наследует. Строке размер пишет сам
		// элемент — в её экземпляр
		bind('size', ({ root, state }) => {
			const icon = parts.get(root)?.icon

			if (icon && icon.size !== state.size) icon.size = state.size
		}),

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
