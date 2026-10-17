import type { TCollectionElements } from '../collection'

/**
 * Строка элемента внутри его узла. Корень элемента — обёртка для темы, а фокус
 * держит вложенная строка: на ней набор `aria` элемента, и в него коллекция
 * пишет `tabindex="-1"` (ListBox, меню). Из-за этого атрибута строка и может
 * держать фокус. Строка — первый узел элемента с этим атрибутом: роль у неё
 * своя у каждого списка (`option` против `menuitem`), а `tabindex` — общий.
 */
const ROW_SELECTOR = '[tabindex]'

/**
 * Строка элемента коллекции — узел, который держит фокус внутри узла
 * элемента. `null` — элемента нет в документе.
 *
 * Одна на клавиатуру ListBox (с чьей строки пришла клавиша) и меню (куда
 * ставить фокус подсвеченному пункту): строку оба ищут одним правилом.
 */
export function rowOf(elements: TCollectionElements | null, uid: string | number): Element | null {
	return elements?.getElementByUid(uid)?.querySelector(ROW_SELECTOR) ?? null
}
