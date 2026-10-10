/**
 * Раскладка того, что ядро пишет на корень-хост: наборы `aria`, `attrs`,
 * `dataset` (`applyAttributes`) и классы (`applyClasses`).
 *
 * Корень компонента в Angular — элемент, который написал потребитель
 * (`<button so-button>`, см. `TComponentBase`), и атрибуты на нём ставит не
 * только база: статические атрибуты разметки потребителя, его `[attr.x]`,
 * `class`, `[class.x]`, `[ngClass]`. Атрибуты потребителя главнее наборов
 * ядра, как во Vue и React (`docs/agents/a11y.md`, «Атрибуты снаружи — поверх
 * наборов»): `tabindex="-1"` на `<div so-button>` переживает смену
 * `disabled`, `role="link"` на `<a so-button>` — роль кнопки, которую пишет
 * ядро.
 *
 * Чей атрибут, база узнаёт по значению: по каждому имени она помнит значение,
 * которое поставила сама. Атрибута нет или стоит её значение — она пишет своё
 * и снимает своё. Стоит другое — это атрибут потребителя: база его не трогает
 * и своим больше не считает. Наблюдатель за элементом для этого не нужен:
 * статический атрибут стоит на элементе ещё до конструктора компонента, а
 * `[attr.x]` Angular пишет поверх, и следующая раскладка видит его значение.
 * Класс — по тому же правилу, по имени: свой база ставит и снимает, а класс,
 * который уже стоял, когда ядро его назвало, — потребителя.
 *
 * Неразличим один случай: потребитель поставил ровно то, что у ядра, — то же
 * значение атрибута или тот же класс уже после базы. Тогда он выглядит своим,
 * и, сняв своё, база снимет и его.
 *
 * Память — своя у каждого набора и у классов: `aria`, `attrs` и `dataset` по
 * именам не пересекаются, и раздельная память не даёт одному набору снять
 * атрибут, поставленный другим.
 */

/** Что поставила база в прошлый раз: имя → значение. */
export type TAppliedAttributes = ReadonlyMap<string, string>

/** Какие классы поставила база в прошлый раз. */
export type TAppliedClasses = ReadonlySet<string>

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
 * Раскладывает набор на элемент и возвращает новую память базы. Строка —
 * значение атрибута, всё остальное (`null` у наборов ядра) — «атрибута нет».
 */
export function applyAttributes(
	element: Element,
	set: object,
	applied: TAppliedAttributes,
): TAppliedAttributes {
	const next = new Map<string, string>()

	for (const [name, value] of Object.entries(set)) {
		if (typeof value !== 'string') continue

		const current = element.getAttribute(name)

		// Чужое значение — атрибут потребителя
		if (current !== null && current !== applied.get(name)) continue

		if (current !== value) element.setAttribute(name, value)

		next.set(name, value)
	}

	// Ушло из набора — снимается, если на элементе ещё своё значение: у
	// выключенной кнопки на `div` из набора пропадает `tabindex`
	for (const [name, value] of applied) {
		if (!next.has(name) && element.getAttribute(name) === value) element.removeAttribute(name)
	}

	return next
}

/** Раскладывает классы ядра на элемент и возвращает новую память базы. */
export function applyClasses(
	element: Element,
	classes: readonly string[],
	applied: TAppliedClasses,
): TAppliedClasses {
	const next = new Set<string>()

	for (const name of classes) {
		// Стоял до того, как ядро его назвало, — класс потребителя
		if (element.classList.contains(name) && !applied.has(name)) continue

		element.classList.add(name)
		next.add(name)
	}

	// Ушёл из списка — снимается: смена `size` меняет модификатор
	for (const name of applied) {
		if (!next.has(name)) element.classList.remove(name)
	}

	return next
}
