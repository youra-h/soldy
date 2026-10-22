/**
 * Раскладка ядра на элемент: наборы атрибутов, классы, стиль.
 *
 * Правило — как у привязки хоста `[attr.x]`: что называет ядро, за базой
 * всегда, чего не называет — не трогается. Узел не читается: раскладка помнит,
 * что поставила сама, поэтому после гидратации первая раскладка берёт своим
 * напечатанное сервером. AGENTS.md (Angular), «Корень-хост ведёт базовый
 * `TComponentBase`».
 */

export type TAppliedAttributes = ReadonlyMap<string, string>
export type TAppliedClasses = ReadonlySet<string>
/** Стиль: имя свойства, как в CSS (`z-index`, `--*`), → значение. */
export type TRootStyles = ReadonlyMap<string, string>
export type TAppliedStyles = TRootStyles

// Пустые значения — одни на всех: тот же объект не будит эффект зря
export const NO_ATTRIBUTES: object = Object.freeze({})
const NO_CLASSES: readonly string[] = Object.freeze([])

/** Набор из состояния — объект, иначе пустой: база читает состояние по именам. */
export function attributesOf(value: unknown): object {
	return typeof value === 'object' && value !== null ? value : NO_ATTRIBUTES
}

/** Классы из состояния — снимок `TClasses`, иначе пусто. */
export function classesOf(value: unknown): readonly string[] {
	return Array.isArray(value) && value.every((name): name is string => typeof name === 'string')
		? value
		: NO_CLASSES
}

/**
 * Наборы снизу вверх: из одноимённых действует верхний. Значение не строкой
 * (`null` у наборов ядра) имя не называет и нижний слой не перекрывает.
 */
export function sumLayers(layers: Iterable<object>): Record<string, string> {
	const sum: Record<string, string> = {}

	for (const layer of layers) {
		for (const [name, value] of Object.entries(layer)) {
			if (typeof value === 'string') sum[name] = value
		}
	}

	return sum
}

/**
 * Стиль из слоёв снизу вверх. Число уходит строкой, пустая строка и прочее
 * свойства не задают: у иконки без размера плагин отдаёт `width: ''`.
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

/** Место элемента коллекции в свойстве стиля `property` (CSS `order`, `--so-toasts-depth`). */
export function orderOf(property: string | undefined, value: unknown): object | undefined {
	return property !== undefined && typeof value === 'number' ? { [property]: value } : undefined
}

/** Пишет сменившееся, снимает ушедшее; возвращает новую память. */
function reconcile(
	next: ReadonlyMap<string, string>,
	applied: ReadonlyMap<string, string>,
	write: (name: string, value: string) => void,
	erase: (name: string) => void,
): ReadonlyMap<string, string> {
	for (const [name, value] of next) {
		if (applied.get(name) !== value) write(name, value)
	}

	for (const name of applied.keys()) {
		if (!next.has(name)) erase(name)
	}

	return next
}

export function applyAttributes(
	element: Element,
	set: object,
	applied: TAppliedAttributes,
): TAppliedAttributes {
	return reconcile(
		new Map(Object.entries(sumLayers([set]))),
		applied,
		(name, value) => element.setAttribute(name, value),
		(name) => element.removeAttribute(name),
	)
}

export function applyClasses(
	element: Element,
	classes: readonly string[],
	applied: TAppliedClasses,
): TAppliedClasses {
	const next = new Set(classes)

	for (const name of next) {
		if (!applied.has(name)) element.classList.add(name)
	}

	for (const name of applied) {
		if (!next.has(name)) element.classList.remove(name)
	}

	return next
}

export function applyStyles(
	element: Element,
	styles: TRootStyles,
	applied: TAppliedStyles,
): TAppliedStyles {
	if (!hasInlineStyle(element)) return applied

	const { style } = element

	return reconcile(
		styles,
		applied,
		(name, value) => style.setProperty(name, value),
		(name) => style.removeProperty(name),
	)
}

function hasInlineStyle(element: Element): element is Element & ElementCSSInlineStyle {
	return 'style' in element
}

/**
 * Слои атрибутов элемента снизу вверх: наборы ядра его компонента, выходы
 * плагинов на корне, набор разметки владельца (`[so-attributes]`), набор,
 * который хост отдал своему узлу (`TForwardedHost`). Внешний главнее, как
 * атрибут снаружи у Vue и React.
 */
export const ATTRIBUTE_LAYERS = [
	'attrs',
	'aria',
	'dataset',
	'plugins',
	'markup',
	'forwarded',
] as const

export type TAttributeLayer = (typeof ATTRIBUTE_LAYERS)[number]

const LAID_OUT = new WeakMap<Element, TElementAttributes>()

/**
 * Атрибуты элемента от всех, кто на него пишет, — одной памятью: две раскладки
 * со своей памятью, снимая своё, снимали бы и значение другой. Порядок записи
 * слоёв не важен.
 */
export class TElementAttributes {
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

	set(layer: TAttributeLayer, set: object): void {
		this._layers.set(layer, set)

		const layers = ATTRIBUTE_LAYERS.map((name) => this._layers.get(name) ?? NO_ATTRIBUTES)

		this._applied = applyAttributes(this._element, sumLayers(layers), this._applied)
	}
}
