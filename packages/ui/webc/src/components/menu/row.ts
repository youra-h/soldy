/**
 * Строка пункта меню — Button на `div` (`menu.row`), одна у пунктов всех видов.
 * Тег `div`, а не `button`: у выключенного пункта остаются фокус и подсветка.
 * DOM-фокус подсвеченного пункта — на строке: клавиатура меню находит её по
 * `tabindex` (`rowIn`). docs/architecture.md, Layer 8d, «Меню».
 *
 * Строка — деталь над экземпляром пункта (`row`, `TItemRow`): размер и
 * выключенность ей пишет пункт, а роль и `tabindex="-1"` — его набор `aria`,
 * слоем владельца.
 */

import type { IMenuItem, TComponentSize } from '@soldy-ui/core'
import { bind, createDetail, ownerAttributes, type ITemplateBinding } from '../../adapter'
import { registerButtonTag, type TButtonElementProps } from '../button'
import { TIconElement, type TIconElementProps } from '../icon'

/** `div` — тег экземпляра строки: под него ядро пишет пункту ARIA (`TMenuItem._ariaTag`). */
const TButtonDivElement = registerButtonTag('div')

export type TMenuRow = TButtonElementProps<HTMLDivElement>

/** Строка каждого пункта — одна на всё время жизни элемента. */
const rows = new WeakMap<HTMLElement, TMenuRow>()

/**
 * Строка — первой в корне. Нажатие — клик: Enter и пробел в клик превращает
 * сама строка (`TActionPlugin`), и путь у мыши и клавиатуры один.
 */
export function createRow(root: HTMLElement, press: () => void): TMenuRow {
	const row = createDetail(root.ownerDocument, TButtonDivElement, { embedded: 'menu.row' })

	row.addEventListener('click', press)
	root.appendChild(row)
	rows.set(root, row)

	return row
}

/**
 * Обёртка части строки. Пустую тема прячет по `:empty`. Немая (`hidden`) —
 * отметка и стрелка: состояние объявляет ARIA строки.
 */
export function partOf(owner: Document, className: string, hidden = false): HTMLElement {
	const part = owner.createElement('span')

	part.className = className

	if (hidden) part.setAttribute('aria-hidden', 'true')

	return part
}

export function roleIconOf(owner: Document, embedded: string, role: string): TIconElementProps {
	const icon = createDetail(owner, TIconElement, { embedded })

	icon.icon = role

	return icon
}

/** `textSlot` — `default`, а у пунктов со своей панелью `header`: `default` у них — панель. */
export function rowBindings(textSlot: string): readonly ITemplateBinding<IMenuItem>[] {
	return [
		// На каждое подключение: в построении инстанса ещё нет, а строка собирается
		// после пункта и берёт свой экземпляр при подключении. Размер и
		// выключенность строке пишет сам пункт — в её экземпляр; вида и варианта
		// она не получает — их даёт тема по контексту
		bind<IMenuItem>([], ({ root, ctrl }) => {
			const row = rows.get(root)

			if (row && ctrl && row.ctrl !== ctrl.row) row.ctrl = ctrl.row
		}),

		bind<IMenuItem>('aria', ({ root, state }) => {
			const row = rows.get(root)

			if (row) ownerAttributes(row, state.aria)
		}),

		bind<IMenuItem>('text', ({ root, state, hasSlot }) => {
			const row = rows.get(root)
			const text = state.text ?? ''

			if (row && !hasSlot(textSlot) && row.text !== text) row.text = text
		}),
	]
}

export function iconSize(icon: TIconElementProps | null, size: TComponentSize | undefined): void {
	if (icon && icon.size !== size) icon.size = size
}

/** Отметка — только у отмеченного; `mark === null` — задан слот `indicator-icon`. */
export function placeMark(indicator: HTMLElement, mark: Element | null, selected: boolean): void {
	if (!mark) return

	if (!selected) {
		mark.remove()
	} else if (mark.parentNode !== indicator) {
		indicator.appendChild(mark)
	}
}
