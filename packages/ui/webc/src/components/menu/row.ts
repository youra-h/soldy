/**
 * Строка пункта меню — одна у пунктов всех видов: действия, флажка,
 * переключателя, пункта с подменю и пункта с панелью, как `Button` на `div`
 * (`menu.row`) в разметке каждого из них у Vue.
 *
 * - Строка — деталь `<div is="so-button-div" embedded="menu.row">`, первая в
 *   корне пункта и узел его поля: статические атрибуты разметки пункта база
 *   переносит на неё, а шаблон кладёт `aria` пункта — роль, `tabindex="-1"` от
 *   меню, у флажка и переключателя `aria-checked`, у пунктов со своей панелью
 *   `aria-haspopup`, `aria-expanded`, `id` и `aria-controls` — верхним слоем
 *   её раскладчика, поверх `role="button"` и остановки Tab, которые кнопка на
 *   `div` пишет себе сама. Тег — `div`, а не `button`: у выключенного пункта
 *   остаются фокус и подсветка, как у элемента ListBox. На ней же DOM-фокус,
 *   когда пункт подсвечен: строку внутри узла пункта клавиатура меню находит
 *   по `tabindex` (`rowIn`).
 * - Размер и `disabled` — пункта: размер ему пишет меню. Вида и варианта
 *   строка не получает: вид ей даёт тема по контексту, а цвет она берёт с
 *   пункта и панели.
 * - Нажатие — клик строки: Enter и пробел на ней превращает в клик сама
 *   строка (`TActionPlugin`), и путь у мыши и клавиатуры один. Что делает
 *   нажатие, решает меню — командой item-адаптера `menu`, которую шаблон
 *   пункта зовёт через контекст фасада пункта текущей связки.
 * - Края строки — обёртки частей пункта (`partOf`), её свет (`lend`):
 *   значок, подсказка сочетания, отметка, стрелка. Пустую обёртку значка и
 *   подсказки тема прячет по `:empty`, поэтому внутри без содержимого пусто.
 * - Текст — слот текста пункта (`default` или `header`), а без него — текст
 *   пункта строке (`text`).
 */

import type { IMenuItem, TComponentSize } from '@soldy-ui/core'
import { bind, createDetail, ownerAttributes, type ITemplateBinding, patch } from '../../adapter'
import { registerButtonTag, type TButtonElementProps } from '../button'
import { TIconElement, type TIconElementProps } from '../icon'

/** Строка — Button на `div`: регистрирует его фабрика кнопки, здесь тег нужен впервые. */
const TButtonDivElement = registerButtonTag('div')

/** Строка пункта: Button на `div`. */
export type TMenuRow = TButtonElementProps<HTMLDivElement>

/** Строка каждого пункта — одна на всё время жизни элемента. */
const rows = new WeakMap<HTMLElement, TMenuRow>()

/**
 * Строка пункта — первой в корне. Нажатие — `press`: команда меню через
 * контекст шаблона, который обработчик читает в момент клика.
 */
export function createRow(root: HTMLElement, press: () => void): TMenuRow {
	const row = createDetail(root.ownerDocument, TButtonDivElement, { embedded: 'menu.row' })

	row.addEventListener('click', press)
	root.appendChild(row)
	rows.set(root, row)

	return row
}

/**
 * Обёртка части строки — значка, подсказки, отметки, стрелки. Немая
 * (`hidden`) — отметка и стрелка: состояние объявляет ARIA строки.
 */
export function partOf(owner: Document, className: string, hidden = false): HTMLElement {
	const part = owner.createElement('span')

	part.className = className

	if (hidden) part.setAttribute('aria-hidden', 'true')

	return part
}

/** Иконка роли в части строки — отметка флажка, стрелка пункта со своей панелью. */
export function roleIconOf(owner: Document, embedded: string, role: string): TIconElementProps {
	const icon = createDetail(owner, TIconElement, { embedded })

	icon.icon = role

	return icon
}

/**
 * Привязки строки — одни у пунктов всех видов. `textSlot` — слот текста
 * строки: `default` у действия, флажка и переключателя, `header` у пунктов со
 * своей панелью (`default` у них — панель).
 */
export function rowBindings(textSlot: string): readonly ITemplateBinding<IMenuItem>[] {
	return [
		// Пропсы строки — только сменившиеся: каждая запись дошла бы до ядра
		// строки и до её отрисовки
		bind<IMenuItem>(['size', 'disabled'], ({ root, state }) => {
			const row = rows.get(root)

			if (!row) return

			const disabled = state.disabled === true

			patch(row, { size: state.size, disabled })
		}),

		bind<IMenuItem>('aria', ({ root, state }) => {
			const row = rows.get(root)

			if (row) ownerAttributes(row, state.aria)
		}),

		// Текст пункта — строке, пока он не задан слотом
		bind<IMenuItem>('text', ({ root, state, hasSlot }) => {
			const row = rows.get(root)
			const text = state.text ?? ''

			if (row && !hasSlot(textSlot) && row.text !== text) row.text = text
		}),
	]
}

/** Размер пункта — иконке в его строке: отметке или стрелке. */
export function iconSize(icon: TIconElementProps | null, size: TComponentSize | undefined): void {
	if (icon && icon.size !== size) icon.size = size
}

/**
 * Своя отметка флажка и переключателя — иконка роли `check`, точка темы — в
 * обёртке отметки, только у отмеченного. Своей нет (`null`) — задан слот
 * `indicator-icon`, и его выводит привязка.
 */
export function placeMark(indicator: HTMLElement, mark: Element | null, selected: boolean): void {
	if (!mark) return

	if (!selected) {
		mark.remove()
	} else if (mark.parentNode !== indicator) {
		indicator.appendChild(mark)
	}
}
