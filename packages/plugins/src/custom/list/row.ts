import { isScrollable } from '../../utils'
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
 * темы: правило одно на клавиатуру списка (с чьего узла пришла клавиша),
 * календарь (куда ставить фокус списку панели выбора), узел фокуса ListBox
 * (`focusTarget` плагина действия), предел строк (`closestList`) и границу
 * прокрутки списка (`scrollContainerOf`): у ListBox и у Select блок класса
 * свой, а роль списка одна.
 */
const LIST_SELECTOR = '[role="listbox"]'

/**
 * Граница прокрутки списка — узел с ролью списка: `listbox` у ListBox и
 * Select, `menu` у панели меню и подменю. Выше него прокрутка списку не
 * принадлежит: там панель, страница или меню над подменю.
 */
const LIST_BOUNDARY_SELECTOR = `${LIST_SELECTOR}, [role="menu"]`

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
 *
 * Она же узел фокуса элемента — ListBox.Item и пунктов меню (`focusTarget`
 * плагина действия в дескрипторе): запись `focused = true` ставит фокус на
 * строку, а не на обёртку элемента. Опции Select её не дают: у комбобокса
 * фокус остаётся на поле. Tags.Item — тоже: у строки тега без выбора
 * `tabindex` нет, и узел фокуса тега — его остановка (`tagStopIn`).
 */
export function rowIn(node: Element | null): Element | null {
	return node?.querySelector(ROW_SELECTOR) ?? null
}

/**
 * Узел списка ListBox — ребёнок его корня с ролью `listbox`. `null` — корня
 * нет или узла списка в нём нет.
 *
 * Он же узел фокуса ListBox: запись `focused = true` ставит фокус на него, а
 * не на поле или кнопку шапки (`focusTarget` плагина действия в дескрипторе).
 */
export function listOf(root: Element | null): Element | null {
	if (!root) return null

	for (const child of root.children) {
		if (child.matches(LIST_SELECTOR)) return child
	}

	return null
}

/**
 * Узел списка, в котором стоит элемент, — ближайший предок с ролью
 * `listbox`: узел списка ListBox и список панели Select. `null` — элемент не в
 * списке.
 *
 * Не родитель элемента: у элемента группы (`ListBox.Group`, `Select.Group`)
 * родитель — группа, а предел строк держит список вокруг групп.
 */
export function closestList(element: Element): Element | null {
	return element.closest(LIST_SELECTOR)
}

/**
 * Прокрутка списка, в котором стоит элемент, — ближайший предок его узла,
 * который прокручивается по вертикали, не выше узла с ролью списка (`listbox`,
 * `menu`). `null` — своей прокрутки у списка нет: элементы помещаются, список
 * скрыт или прокручивает его только страница.
 *
 * У ListBox и Select это сам узел с ролью `listbox` — ему предел строк ставит
 * `TListHeightPlugin`. У меню прокручивается список пунктов внутри панели с
 * ролью `menu` (`.so-menu__list`), и `closestList` его не находит. Не
 * родитель элемента: у элемента группы родитель — группа, а прокручивается
 * список вокруг групп.
 */
export function scrollContainerOf(element: Element): HTMLElement | null {
	for (let current = element.parentElement; current; current = current.parentElement) {
		if (isScrollable(current, 'y')) return current
		if (current.matches(LIST_BOUNDARY_SELECTOR)) return null
	}

	return null
}
