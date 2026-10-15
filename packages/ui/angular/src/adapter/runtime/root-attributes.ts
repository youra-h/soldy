/**
 * Раскладка того, что ядро пишет на корень-хост: наборы `aria`, `attrs`,
 * `dataset` (`applyAttributes` — раскладчиком элемента `TElementAttributes`),
 * классы (`applyClasses`) и стиль (`applyStyles`).
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
 * Память — своя у классов и у стиля, а у атрибутов одна на элемент — у
 * раскладчика элемента (`TElementAttributes`): атрибуты на него пишут
 * несколько писателей — наборы ядра корня и набор, который на тот же элемент
 * кладёт разметка владельца (`AttributesDirective`), — и общая память не даёт
 * одному снять атрибут, поставленный другим.
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
 * (`fractionStyle` у ProgressSpinner) и место элемента коллекции (`orderOf`).
 * Из одноимённых свойств действует верхний слой.
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
 * Слой стиля с местом элемента коллекции — `order` фасада: ряд коллекции —
 * флексбокс, и элемент встаёт по номеру в коллекции, а не по месту в разметке.
 * Номера нет — слоя нет: у компонента своего места нет.
 */
export function orderOf(value: unknown): object | undefined {
	return typeof value === 'number' ? { order: value } : undefined
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

/**
 * Слои атрибутов элемента — кто их пишет, снизу вверх:
 *
 * - `attrs`, `aria`, `dataset` — наборы ядра компонента, чей корень этот
 *   элемент (база, `TComponentBase`), в порядке шаблона Vue;
 * - `markup` — набор, который на элемент кладёт разметка компонента-владельца
 *   (`AttributesDirective`): `aria` поля — на `<input>`, `clearAria` поля — на
 *   вложенную кнопку очистки.
 */
export const ATTRIBUTE_LAYERS = ['attrs', 'aria', 'dataset', 'markup'] as const

/** Слой атрибутов элемента — см. `ATTRIBUTE_LAYERS`. */
export type TAttributeLayer = (typeof ATTRIBUTE_LAYERS)[number]

/** Раскладчики по элементам: один на элемент, кто бы на него ни писал. */
const LAID_OUT = new WeakMap<Element, TElementAttributes>()

/**
 * Атрибуты элемента от всех, кто их на него пишет, — слоями
 * (`ATTRIBUTE_LAYERS`), одной раскладкой и одной памятью.
 *
 * На элемент пишут двое, когда он корень вложенного компонента: база этого
 * компонента — его наборы ядра — и разметка владельца — свой набор поверх
 * (`<button so-button [so-attributes]="state()['clearAria']">`). Набор
 * владельца главнее на общем имени, как атрибут снаружи у Vue и React:
 * `role="option"` строки перекрывает `role="button"`, который кнопка на `div`
 * пишет себе сама. Порядок, в каком они пишут, не задан — разметка владельца
 * пишет в проходе своего шаблона, база вложенного — эффектом, — поэтому каждый
 * пишет только свой слой, а на элемент раскладчик кладёт их сумму, верхний
 * поверх нижних. Две раскладки со своей памятью спорили бы за общее имя:
 * снимая своё, одна снимала бы и значение другой.
 *
 * Правило раскладки — `applyAttributes`: что называет хоть один слой, —
 * раскладчика, остальное на элементе он не трогает. Значение не строкой
 * (`null` у наборов ядра) имя не называет и нижний слой не перекрывает.
 */
export class TElementAttributes {
	/** Раскладчик элемента: тот же у всех, кто на него пишет. */
	static of(element: Element): TElementAttributes {
		let attributes = LAID_OUT.get(element)

		if (!attributes) {
			attributes = new TElementAttributes(element)
			LAID_OUT.set(element, attributes)
		}

		return attributes
	}

	private readonly _layers = new Map<TAttributeLayer, object>()
	private _applied: TAppliedAttributes = new Map()

	private constructor(private readonly _element: Element) {}

	/** Слой `layer` теперь — `set`; на элементе — сумма слоёв. */
	set(layer: TAttributeLayer, set: object): void {
		this._layers.set(layer, set)
		this._applied = applyAttributes(this._element, this._sum(), this._applied)
	}

	/** Слои снизу вверх: из одноимённых действует верхний, `null` не перекрывает. */
	private _sum(): Record<string, string> {
		const sum: Record<string, string> = {}

		for (const layer of ATTRIBUTE_LAYERS) {
			for (const [name, value] of Object.entries(this._layers.get(layer) ?? NO_ATTRIBUTES)) {
				if (typeof value === 'string') sum[name] = value
			}
		}

		return sum
	}
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
