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
 * Узел списка ListBox внутри его корня. Корень — рамка для темы: в нём рядом
 * со списком стоят шапка и подвал, а в `listbox` ARIA пускает только опции.
 * Фокус, клавиатуру и набор `aria` списка держит его узел — ребёнок корня с
 * ролью из этого набора.
 *
 * По роли, а не по `tabindex`, как строка: шапка и подвал — тоже дети корня, и
 * в них бывают свои остановки Tab (кнопка на `div` пишет себе `tabindex`), а
 * роль `listbox` среди детей корня — только у узла списка. И не по классу
 * темы: правило одно на клавиатуру списка (с чьего узла пришла клавиша) и
 * календарь (куда ставить фокус списку панели выбора).
 */
const LIST_SELECTOR = '[role="listbox"]'

/**
 * Строка элемента коллекции — узел, который держит фокус внутри узла
 * элемента. `null` — элемента нет в документе.
 *
 * Одна на клавиатуру ListBox (с чьей строки пришла клавиша) и меню (куда
 * ставить фокус подсвеченному пункту): строку оба ищут одним правилом.
 */
export function rowOf(elements: TCollectionElements | null, uid: string | number): Element | null {
	return rowIn(elements?.getElementByUid(uid) ?? null)
}

/**
 * Строка внутри узла элемента — тем же правилом, что `rowOf`, когда узел уже
 * на руках: свой корень у пункта с подменю — узел пункта в меню над ним.
 */
export function rowIn(node: Element | null): Element | null {
	return node?.querySelector(ROW_SELECTOR) ?? null
}

/**
 * Узел списка ListBox — ребёнок его корня с ролью `listbox`. `null` — корня
 * нет или узла списка в нём нет.
 */
export function listOf(root: Element | null): Element | null {
	if (!root) return null

	for (const child of root.children) {
		if (child.matches(LIST_SELECTOR)) return child
	}

	return null
}
