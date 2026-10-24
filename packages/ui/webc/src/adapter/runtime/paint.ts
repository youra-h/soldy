/**
 * Раскладка того, что библиотека пишет на узел: атрибуты наборов, классы,
 * стиль и скрытие. Написанное потребителем главнее: по каждому имени память
 * помнит своё значение, своё пишет и снимает, чужое не трогает, — кроме
 * атрибутов-входов пропов (`disabled`), их значение ядра верно всегда. Память —
 * у узла, а не у связки: связка новая на каждое подключение. AGENTS.md (Web
 * Components), «Раскладка на узел».
 */

type TAppliedAttribute = {
	readonly value: string
	readonly input: boolean
}

export type TAppliedAttributes = ReadonlyMap<string, TAppliedAttribute>

export type TAppliedClasses = ReadonlySet<string>

/** Имя свойства, как в CSS (`z-index`, `--*`), → значение. */
export type TRootStyles = ReadonlyMap<string, string>

/** Узел нормализует значение: чужое ли свойство — по прочитанному, нужна ли запись — по своему. */
type TAppliedStyle = {
	readonly value: string
	readonly written: string
}

export type TAppliedStyles = ReadonlyMap<string, TAppliedStyle>

/** `display` до скрытия; `undefined` — узел базой не скрыт. */
export type THiddenDisplay = string | undefined

const NO_INPUTS: ReadonlySet<string> = new Set()
const NO_SET: object = Object.freeze({})
const NO_CLASSES: readonly string[] = Object.freeze([])

/**
 * Стиль из слоёв снизу вверх. Число — строкой, пустая строка и не строки
 * свойства не задают. Слои читаются из состояния по имени, вид не на веру.
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

/** Место элемента в ряду коллекции, как `:style="{ order }"` у Vue. */
export function orderOf(value: unknown): object | undefined {
	return typeof value === 'number' ? { order: value } : undefined
}

export function setOf(value: unknown): object {
	return typeof value === 'object' && value !== null ? value : NO_SET
}

export function classesOf(value: unknown): readonly string[] {
	return Array.isArray(value) && value.every((name): name is string => typeof name === 'string')
		? value
		: NO_CLASSES
}

export function applyAttributes(
	element: Element,
	wanted: TAppliedAttributes,
	applied: TAppliedAttributes,
): TAppliedAttributes {
	const next = new Map<string, TAppliedAttribute>()

	for (const [name, attribute] of wanted) {
		const current = element.getAttribute(name)

		if (current !== null && current !== applied.get(name)?.value && !attribute.input) continue

		if (current !== attribute.value) element.setAttribute(name, attribute.value)

		next.set(name, attribute)
	}

	// Вход пропа снимается при любом значении: ядро его уже приняло
	for (const [name, { value, input }] of applied) {
		if (next.has(name)) continue

		if (input || element.getAttribute(name) === value) element.removeAttribute(name)
	}

	return next
}

export function applyClasses(
	element: Element,
	classes: readonly string[],
	applied: TAppliedClasses,
): TAppliedClasses {
	const next = new Set<string>()

	for (const name of classes) {
		if (element.classList.contains(name) && !applied.has(name)) continue

		element.classList.add(name)
		next.add(name)
	}

	for (const name of applied) {
		if (!next.has(name)) element.classList.remove(name)
	}

	return next
}

export function applyStyles(
	element: ElementCSSInlineStyle,
	styles: TRootStyles,
	applied: TAppliedStyles,
): TAppliedStyles {
	const { style } = element
	const next = new Map<string, TAppliedStyle>()

	for (const [name, value] of styles) {
		const own = applied.get(name)
		const current = style.getPropertyValue(name)

		if (current !== '') {
			if (own === undefined || current !== own.written) continue

			if (own.value === value) {
				next.set(name, own)
				continue
			}
		}

		style.setProperty(name, value)

		const written = style.getPropertyValue(name)

		// Значение, которое узел не принял, своим считать нечего
		if (written !== '') next.set(name, { value, written })
	}

	for (const [name, { written }] of applied) {
		if (!next.has(name) && style.getPropertyValue(name) === written) style.removeProperty(name)
	}

	return next
}

/** Как `v-show`: `display: none` поверх `display` потребителя, показ возвращает прежнее. */
export function applyHidden(
	element: ElementCSSInlineStyle,
	hidden: boolean,
	saved: THiddenDisplay,
): THiddenDisplay {
	if (hidden) {
		if (saved !== undefined) return saved

		const display = element.style.display

		element.style.display = 'none'

		return display
	}

	if (saved !== undefined && element.style.display === 'none') element.style.display = saved

	return undefined
}

/**
 * Слои атрибутов снизу вверх: наборы ядра компонента, чей это корень; набор
 * разметки владельца (`ownerAttributes`); набор, который владелец положил на
 * деталь с полем, — он уходит на её поле.
 */
export const ATTRIBUTE_LAYERS = ['attrs', 'aria', 'dataset', 'owner', 'detail'] as const

export type TAttributeLayer = (typeof ATTRIBUTE_LAYERS)[number]

type TLayer = {
	readonly set: object
	readonly inputs: ReadonlySet<string>
}

const LAID_OUT = new WeakMap<Element, TElementAttributes>()

/**
 * Атрибуты узла от всех, кто их пишет, — слоями, одной суммой и одной памятью:
 * две раскладки со своей памятью спорили бы за общее имя.
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

	private readonly _layers = new Map<TAttributeLayer, TLayer>()
	private _applied: TAppliedAttributes = new Map()

	/** Раскладчик поля; `null` — поле ещё не построено; `undefined` — поля нет. */
	private _field: TElementAttributes | null | undefined = undefined
	private _held: object = NO_SET

	private constructor(private readonly _element: Element) {}

	set(layer: TAttributeLayer, set: object, inputs: ReadonlySet<string> = NO_INPUTS): void {
		if (layer === 'owner' && this._field !== undefined) {
			this._held = set
			this._field?.set('detail', set)

			return
		}

		this._layers.set(layer, { set, inputs })
		this._applied = applyAttributes(this._element, this._sum(), this._applied)
	}

	/**
	 * Значение атрибута, которое ставит раскладка, — сумма слоёв; `undefined` —
	 * имени она не называет. Слои новые ещё до записи в узел, поэтому колбэк
	 * атрибута, пришедший посреди раскладки, видит уже то, что она пишет.
	 */
	wanted(name: string): string | undefined {
		return this._sum().get(name)?.value
	}

	/** У узла есть поле: слой владельца ждёт его построения. */
	awaitField(): void {
		if (this._field === undefined) this._field = null
	}

	bindField(field: Element): void {
		const target = TElementAttributes.of(field)

		this._field = target
		target.set('detail', this._held)
	}

	/** Имя называет только строка: `null` нижний слой не перекрывает. */
	private _sum(): TAppliedAttributes {
		const sum = new Map<string, TAppliedAttribute>()

		for (const name of ATTRIBUTE_LAYERS) {
			const layer = this._layers.get(name)

			if (!layer) continue

			for (const [attribute, value] of Object.entries(layer.set)) {
				if (typeof value === 'string')
					sum.set(attribute, { value, input: layer.inputs.has(attribute) })
			}
		}

		return sum
	}
}

/** Кто пишет классы и стиль узла: его база или разметка владельца. */
export type TPaintLayer = 'own' | 'owner'

const PAINTED = new WeakMap<HTMLElement, TPaint>()

/** Память классов, стиля и скрытия узла — по слоям, у самого узла. */
export class TPaint {
	static of(element: HTMLElement): TPaint {
		let paint = PAINTED.get(element)

		if (!paint) {
			paint = new TPaint(element)
			PAINTED.set(element, paint)
		}

		return paint
	}

	private readonly _classes = new Map<TPaintLayer, TAppliedClasses>()
	private readonly _styles = new Map<TPaintLayer, TAppliedStyles>()
	private _display: THiddenDisplay = undefined

	private constructor(private readonly _element: HTMLElement) {}

	classes(layer: TPaintLayer, names: readonly string[]): void {
		this._classes.set(
			layer,
			applyClasses(this._element, names, this._classes.get(layer) ?? new Set()),
		)
	}

	styles(layer: TPaintLayer, styles: TRootStyles): void {
		this._styles.set(
			layer,
			applyStyles(this._element, styles, this._styles.get(layer) ?? new Map()),
		)
	}

	hidden(hidden: boolean): void {
		this._display = applyHidden(this._element, hidden, this._display)
	}
}
