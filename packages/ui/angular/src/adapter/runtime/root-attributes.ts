/**
 * Раскладка того, что ядро пишет на корень-хост: наборы `aria`, `attrs`,
 * `dataset` (`applyAttributes`), классы (`applyClasses`) и стиль
 * (`applyStyles`).
 *
 * Корень компонента в Angular — элемент, который написал потребитель
 * (`<button so-button>`, см. `TComponentBase`), и на нём стоит не только то,
 * что пишет база: статические атрибуты разметки потребителя, его `[attr.x]`,
 * `class`, `[class.x]`, `style`, `[style.x]`, а после гидратации — всё, что
 * напечатал сервер.
 *
 * Правило одно, как у привязки хоста `[attr.x]` или `[class.x]`: всё, что
 * называет ядро, — имя атрибута в наборе, класс, свойство стиля, — база
 * считает своим всегда. Своё она пишет поверх того, что стоит на элементе, —
 * статического атрибута потребителя, значения сервера, — а снимает, когда
 * ядро перестало его называть, что бы на элементе ни стояло. Узел она не
 * читает: по каждому имени помнит значение, которое поставила сама, и пишет,
 * когда оно сменилось, — первая раскладка пишет всё. Поэтому гидратации не
 * нужно ни признака, ни метки на корне: первая раскладка в браузере берёт
 * своим всё, что напечатал сервер, и смена `size` после неё меняет
 * модификатор, а не добавляет второй.
 *
 * Чего ядро не называет, база не трогает вовсе: атрибуты, классы и свойства
 * стиля потребителя под другими именами, свойства, которые плагин пишет в
 * узел сам, мимо раскладки (`--s-swipe-offset` смахиваемой панели), и
 * скрытие — привязку хоста `[style.display]` базы. Значение потребителя под
 * именем, которое называет ядро, остаётся, только пока ядро это имя не
 * назвало: `tabindex="-1"` на `<div so-button>` ядро перепишет своим `0`, а
 * `dir` потребителя переживёт ядро только с `direction="inherit"`, при
 * котором ядро `dir` не пишет.
 *
 * Память — своя у каждого набора, у классов и у стиля: `aria`, `attrs` и
 * `dataset` по именам не пересекаются, и раздельная память не даёт одному
 * набору снять атрибут, поставленный другим.
 */

/** Что поставила база в прошлый раз: имя → значение. */
export type TAppliedAttributes = ReadonlyMap<string, string>

/** Какие классы поставила база в прошлый раз. */
export type TAppliedClasses = ReadonlySet<string>

/** Стиль корня: имя свойства, как в CSS (`z-index`, `--*`), → значение. */
export type TRootStyles = ReadonlyMap<string, string>

/** Что из стиля поставила база в прошлый раз — стиль её прошлой раскладки. */
export type TAppliedStyles = TRootStyles

/** Пустой набор — один на всех: тот же объект не будит эффект набора зря. */
const NO_ATTRIBUTES: object = Object.freeze({})

/** Нет классов — тот же пустой список, по той же причине. */
const NO_CLASSES: readonly string[] = Object.freeze([])

/**
 * Набор из состояния компонента — объект `имя → значение`, а чего нет —
 * пустой набор. База не знает инстанса компонента и читает его состояние по
 * именам, поэтому вид значения проверяет здесь, а не берёт на веру.
 */
export function attributesOf(value: unknown): object {
	return typeof value === 'object' && value !== null ? value : NO_ATTRIBUTES
}

/**
 * Классы из состояния компонента — снимок `TClasses`, список имён. Тот же
 * массив, что в состоянии: пока классы не сменились, эффекту нечего делать.
 */
export function classesOf(value: unknown): readonly string[] {
	return Array.isArray(value) && value.every((name): name is string => typeof name === 'string')
		? value
		: NO_CLASSES
}

/**
 * Стиль корня из слоёв состояния — снизу вверх: выход плагина раскладки
 * (`layout_styles`), поверх него стиль-выход самого компонента
 * (`fractionStyle` у ProgressSpinner). Из одноимённых свойств действует
 * верхний слой.
 *
 * Слой — объект `имя → значение` с именами, как в CSS: так их пишут плагины и
 * ядро. Число уходит строкой как есть (`z-index: 3`). Пустая строка и всё, что
 * не строка и не число, свойства не задают: у иконки без размера плагин
 * отдаёт `width: ''`, и ширину ядро не называет. Слоя нет — он пуст: плагин
 * раскладки есть не у всех, стиль-выход — тоже. Вид значения проверяется
 * здесь по той же причине, что у наборов: база читает состояние по именам.
 */
export function stylesOf(...layers: readonly unknown[]): TRootStyles {
	const styles = new Map<string, string>()

	for (const layer of layers) {
		if (typeof layer !== 'object' || layer === null) continue

		for (const [name, value] of Object.entries(layer)) {
			if (typeof value === 'number') styles.set(name, String(value))
			else if (typeof value === 'string' && value !== '') styles.set(name, value)
		}
	}

	return styles
}

/**
 * Раскладывает набор на элемент и возвращает новую память базы. Строка —
 * значение атрибута, всё остальное (`null` у наборов ядра) — «ядро имя не
 * называет».
 */
export function applyAttributes(
	element: Element,
	set: object,
	applied: TAppliedAttributes,
): TAppliedAttributes {
	const next = new Map<string, string>()

	for (const [name, value] of Object.entries(set)) {
		if (typeof value !== 'string') continue

		// Своё пишется поверх того, что стоит на элементе
		if (applied.get(name) !== value) element.setAttribute(name, value)

		next.set(name, value)
	}

	// Ушло из набора — снимается: у выключенной кнопки на `div` из набора
	// пропадает `tabindex`
	for (const name of applied.keys()) {
		if (!next.has(name)) element.removeAttribute(name)
	}

	return next
}

/** Раскладывает классы ядра на элемент и возвращает новую память базы. */
export function applyClasses(
	element: Element,
	classes: readonly string[],
	applied: TAppliedClasses,
): TAppliedClasses {
	const next = new Set(classes)

	for (const name of next) {
		if (!applied.has(name)) element.classList.add(name)
	}

	// Ушёл из списка — снимается: смена `size` меняет модификатор
	for (const name of applied) {
		if (!next.has(name)) element.classList.remove(name)
	}

	return next
}

/**
 * Раскладывает стиль на элемент и возвращает новую память базы: свойство,
 * которое ядро называет, пишет поверх того, что стоит на узле, когда оно
 * сменилось, а ушедшее из стиля снимает. Остальных свойств узла база не
 * касается вовсе.
 */
export function applyStyles(
	element: Element,
	styles: TRootStyles,
	applied: TAppliedStyles,
): TAppliedStyles {
	if (!hasInlineStyle(element)) return applied

	const { style } = element

	for (const [name, value] of styles) {
		if (applied.get(name) !== value) style.setProperty(name, value)
	}

	for (const name of applied.keys()) {
		if (!styles.has(name)) style.removeProperty(name)
	}

	return styles
}

/** Узел со своим инлайновым стилем — HTML и SVG. */
function hasInlineStyle(element: Element): element is Element & ElementCSSInlineStyle {
	return 'style' in element
}
